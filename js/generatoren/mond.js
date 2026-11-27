// Mondphasen und Finsternisse. Sonnenlicht kommt parallel von rechts (+x).
// Größen von Erde und Mond im echten Verhältnis (Mond = 0,27 Erdradien), Abstand Erde–Mond auf 1/10 verkürzt (6 statt 60 Erdradien).
// Kern- und Halbschatten werden im Shader berechnet; ihre Öffnung entspricht der scheinbaren Sonnengröße (am Mondabstand
// Erdkernschatten 0,73, Halbschatten 1,27 Erdradien – wie in Wirklichkeit). Mondbahn rechtsläufig (von Norden gesehen gegen den Uhrzeigersinn).
import * as THREE from 'three';
import { textSprite, entsorge as entsorgeObj, stil } from './hilfen.js';

const R_E = 1, R_M = 0.27, D = 6, KEGEL = (1 - 0.73) / 6, MONAT = 29.53;
export const ANSICHTEN = { phasen: 'Mondphasen (animiert)', acht: 'Acht Mondphasen', mofi: 'Mondfinsternis', sofi: 'Sonnenfinsternis', neigung: 'Warum nicht jeden Monat?' };
export const standard = () => ({ ansicht: 'phasen', beschriftung: false, bewegung: false });
const PHASEN = ['Neumond', 'zunehmende Sichel', 'erstes Viertel (zunehmender Halbmond)', 'zunehmender Mond', 'Vollmond', 'abnehmender Mond', 'letztes Viertel (abnehmender Halbmond)', 'abnehmende Sichel'];
const phasenName = th => PHASEN[Math.round(((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) / (Math.PI / 4)) % 8];

// ---------- Texturen ----------
let erdKarte = null, mondKarte = null;
function karten() {
  if (!erdKarte) erdKarte = new THREE.TextureLoader().load(new URL('../../hintergruende/erde.jpg', import.meta.url).href);
  if (!mondKarte) {    // vereinfachte Mondoberfläche: helles Hochland, dunkle Meere auf der erdzugewandten Seite
    const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d');
    g.fillStyle = '#a8a29e'; g.fillRect(0, 0, 1024, 512);
    let s = 3; const z = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
    for (let i = 0; i < 900; i++) { const x = z() * 1024, y = z() * 512, r = 2 + z() * 9; g.fillStyle = `rgba(${z() < 0.5 ? '90,88,85' : '210,206,200'},${0.15 + z() * 0.2})`; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
    // Meere (ungefähre Lage der großen Maria auf der Vorderseite: Mitte der Karte = zur Erde)
    for (const [lon, lat, rx, ry] of [[-15, 33, 70, 50], [17, 28, 40, 34], [30, 8, 45, 35], [55, 15, 28, 22], [-50, 15, 75, 55], [-20, -15, 40, 30], [5, -5, 30, 25], [40, -15, 30, 22], [-35, -22, 30, 20]]) {
      const x = 512 + lon / 180 * 512, y = 256 - lat / 90 * 256; g.fillStyle = 'rgba(70,68,66,0.75)'; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill();
    }
    mondKarte = new THREE.CanvasTexture(c); mondKarte.colorSpace = THREE.NoColorSpace;
  }
}
// Shader: Beleuchtung durch parallele Sonne (+x) und Schatten eines anderen Körpers (Kern- und Halbschatten)
function koerper(karte, radius, rot) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { karte: { value: karte }, pos: { value: new THREE.Vector3() }, rot: { value: new THREE.Matrix3() }, wPos: { value: new THREE.Vector3() }, wR: { value: 1 }, rotTon: { value: rot ? 1 : 0 } },
    vertexShader: `uniform vec3 pos; uniform mat3 rot; varying vec2 vUv; varying vec3 vN; varying vec3 vP;
      void main() { vUv = uv; vN = rot * normal; vP = pos + rot * position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D karte; uniform vec3 wPos; uniform float wR; uniform float rotTon; varying vec2 vUv; varying vec3 vN; varying vec3 vP;
      void main() {
        vec3 s = vec3(1.0, 0.0, 0.0); float l = dot(normalize(vN), s); float tag = smoothstep(-0.04, 0.1, l);
        // Schatten: liegt der Werfer zwischen diesem Punkt und der Sonne?
        vec3 m = wPos - vP; float t = dot(m, s); float licht = 1.0;
        if (t > 0.0) { float d = length(m - s * t); float kern = wR - ${KEGEL.toFixed(4)} * t, halb = wR + ${KEGEL.toFixed(4)} * t; licht = smoothstep(max(kern, 0.0), halb, d); }
        vec3 c = texture2D(karte, vUv).rgb;
        vec3 hell = c * (0.25 + 0.75 * max(l, 0.0)) * mix(0.0, 1.0, licht);
        vec3 rot = c * vec3(0.55, 0.18, 0.08) * (1.0 - licht) * rotTon * tag;   // Mond im Kernschatten: rötlich (Licht durch die Erdatmosphäre)
        gl_FragColor = vec4(hell * tag + rot + c * 0.05, 1.0); }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 96, 64), mat);
  return { mesh, mat };
}
// Mondphase, wie man sie von der Nordhalbkugel sieht, als Bild
function phasenBild(th, groesse = 128, finster = 0) {
  const c = document.createElement('canvas'); c.width = c.height = groesse; const g = c.getContext('2d'), r = groesse * 0.42, m = groesse / 2;
  g.fillStyle = '#1f2937'; g.beginPath(); g.arc(m, m, r + 3, 0, 7); g.fill();
  g.fillStyle = '#374151'; g.beginPath(); g.arc(m, m, r, 0, 7); g.fill();
  const w = ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI), zunehmend = w < Math.PI, k = Math.cos(w);
  g.fillStyle = '#f5f5f4'; g.beginPath();
  // beleuchtete Hälfte (rechts bei zunehmendem, links bei abnehmendem Mond) und Schattengrenze als Halbellipse
  g.arc(m, m, r, -Math.PI / 2, Math.PI / 2, !zunehmend);
  g.ellipse(m, m, Math.abs(k) * r, r, 0, Math.PI / 2, -Math.PI / 2, zunehmend ? k > 0 : k < 0);   // Sichel: Grenze in der hellen Hälfte, sonst in der dunklen
  g.fill();
  if (finster > 0) { g.fillStyle = `rgba(110,28,8,${0.88 * finster})`; g.beginPath(); g.arc(m, m, r, 0, 7); g.fill(); }   // im Erdschatten: kupferrot
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// =====================================================================
export function erzeuge(st) {
  karten();
  const wurzel = new THREE.Group(), etik = new THREE.Group(); wurzel.add(etik);
  const a = st.ansicht, schild = (t, f, h, p) => { const s = textSprite(t, f, h * 2.2); s.position.copy(p); etik.add(s); return s; };
  const neigung = a === 'neigung' ? THREE.MathUtils.degToRad(15) : 0;
  // Erde
  const erde = koerper(erdKarte, R_E, false); wurzel.add(erde.mesh);
  const achse = new THREE.Vector3(-Math.sin(THREE.MathUtils.degToRad(23.4)), Math.cos(THREE.MathUtils.degToRad(23.4)), 0);
  const kipp = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), achse);
  // Mond(e)
  const monde = [];
  const neuerMond = () => { const m = koerper(mondKarte, R_M, true); wurzel.add(m.mesh); monde.push(m); return m; };
  const posMit = th => { const p = new THREE.Vector3(D * Math.cos(th), 0, -D * Math.sin(th)); p.y = Math.sin(neigung) * D * Math.cos(th - Math.PI); return p; };
  // Bahn
  {
    const pts = Array.from({ length: 181 }, (_, i) => posMit(i / 180 * Math.PI * 2));
    wurzel.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: 0x64748b, dashSize: 0.2, gapSize: 0.12 })).computeLineDistances());
    if (neigung) {   // Ebene der Erdbahn zum Vergleich
      const e = new THREE.Mesh(new THREE.RingGeometry(D - 0.6, D + 0.6, 96), new THREE.MeshBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })); e.rotation.x = -Math.PI / 2; wurzel.add(e);
      schild('Ebene der Erdbahn', '#1d4ed8', 0.38, new THREE.Vector3(0, -0.4, D + 1.2));
      schild('Mondbahn (geneigt –\nhier übertrieben, wirklich 5°)', '#475569', 0.34, new THREE.Vector3(-D - 0.5, 1.8, 0));
    }
  }
  // Sonnenlicht: Pfeile von rechts, Sonne als Leuchten
  {
    const pm = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    for (const [y, z] of [[1.6, -2], [0, 0], [-1.6, 2], [0.8, 3.5], [-0.8, -3.5]]) {
      const l = 2.6, s = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, l, 6), pm); s.rotation.z = Math.PI / 2; s.position.set(D + 2.6 + l / 2, y, z); wurzel.add(s);
      const k = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.28, 12), pm); k.rotation.z = Math.PI / 2; k.position.set(D + 2.5, y, z); wurzel.add(k);
    }
    schild('Sonnenlicht\n(Sonne weit entfernt)', '#b45309', 0.36, new THREE.Vector3(D + 4.2, 3.0, 0));
  }
  // Schattenkegel sichtbar machen (nur bei Finsternissen)
  if (a === 'mofi' || a === 'neigung') {
    const L = D + 1.5, kern = new THREE.Mesh(new THREE.CylinderGeometry(R_E, R_E - KEGEL * L, L, 48, 1, true), new THREE.MeshBasicMaterial({ color: 0x111827, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
    kern.rotation.z = Math.PI / 2; kern.position.x = -L / 2; wurzel.add(kern);
    const halb = new THREE.Mesh(new THREE.CylinderGeometry(R_E, R_E + KEGEL * L, L, 48, 1, true), new THREE.MeshBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false }));
    halb.rotation.z = Math.PI / 2; halb.position.x = -L / 2; wurzel.add(halb);
    schild('Kernschatten der Erde', '#111827', 0.36, new THREE.Vector3(-D - 1.6, -1.2, 0));
  }
  // Blick von der Erde: Mondphase als Bild
  const blick = new THREE.Sprite(new THREE.SpriteMaterial({ depthTest: false, transparent: true })); blick.scale.setScalar(3.4); blick.position.set(0, 3.9, 0); blick.renderOrder = 11; wurzel.add(blick);
  const blickText = schild('So sieht man den Mond\nvon der Erde aus:', '#1f2937', 0.3, new THREE.Vector3(0, 6.3, 0));
  let bildFinster = 0, bildTheta = -99, theta = a === 'mofi' ? Math.PI - 0.6 : a === 'sofi' ? -0.5 : a === 'neigung' ? Math.PI - 0.8 : 0.9, spin = 0, phaseAlt = '';
  const acht = a === 'acht';
  if (acht) {
    blick.visible = false; blickText.visible = false;
    for (let i = 0; i < 8; i++) {
      const th = i * Math.PI / 4, m = neuerMond(); m.th = th;
      const bild = new THREE.Sprite(new THREE.SpriteMaterial({ map: phasenBild(th), depthTest: false, transparent: true })); bild.scale.setScalar(1.9);
      const p = posMit(th), aus = p.clone().normalize();
      bild.position.copy(p).addScaledVector(aus, 2.4).add(new THREE.Vector3(0, 1.3, 0)); bild.renderOrder = 11; etik.add(bild);
      schild(PHASEN[i].replace(' (', '\n('), '#1f2937', 0.24, p.clone().addScaledVector(aus, 2.4).add(new THREE.Vector3(0, -0.35, 0)));
    }
  } else neuerMond();
  const setze = () => {
    erde.mesh.quaternion.copy(kipp).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spin));
    const mondBasis = [];
    for (const m of monde) {
      const th = acht ? m.th : theta, p = posMit(th);
      m.mesh.position.copy(p); m.mesh.rotation.set(0, th + Math.PI, 0);          // gebundene Rotation: immer dieselbe Seite zur Erde
      m.mesh.updateMatrix(); m.mat.uniforms.pos.value.copy(p); m.mat.uniforms.rot.value.setFromMatrix4(m.mesh.matrix);
      m.mat.uniforms.wPos.value.set(0, 0, 0); m.mat.uniforms.wR.value = R_E;      // Schattenwerfer für den Mond: die Erde
      mondBasis.push(p);
    }
    erde.mesh.updateMatrix(); erde.mat.uniforms.pos.value.set(0, 0, 0); erde.mat.uniforms.rot.value.setFromMatrix4(erde.mesh.matrix);
    erde.mat.uniforms.wPos.value.copy(acht ? new THREE.Vector3(0, -99, 0) : mondBasis[0]); erde.mat.uniforms.wR.value = R_M;
    if (!acht) {
      const name = phasenName(theta);
      // Wie tief steckt der Mond im Kernschatten der Erde? (0 = gar nicht, 1 = ganz)
      const p = mondBasis[0], kern = R_E - KEGEL * Math.max(-p.x, 0), d = Math.hypot(p.y, p.z);
      const finster = p.x < 0 ? THREE.MathUtils.clamp((kern + R_M - d) / (2 * R_M), 0, 1) : 0;
      if (Math.abs(theta - bildTheta) > 0.03 || Math.abs(finster - bildFinster) > 0.05) {   // Bild nur bei merklicher Änderung neu zeichnen
        bildTheta = theta; bildFinster = finster; if (blick.material.map) blick.material.map.dispose();
        blick.material.map = phasenBild(theta, 128, finster); blick.material.needsUpdate = true;
      }
      if (name !== phaseAlt) { phaseAlt = name; if (erg && erg.beiInfo) erg.beiInfo(info()); }
    }
  };
  // Beschriftung Erde
  schild('Erde', '#1f2937', 0.3, new THREE.Vector3(0, -1.8, 1.2));
  etik.visible = st.beschriftung; if (!st.beschriftung) { blick.visible = blick.visible && true; }

  const TEXT = {
    phasen: 'Der Mond leuchtet nicht selbst – die Sonne beleuchtet immer eine Hälfte von ihm. Während er in rund 29,5 Tagen um die Erde läuft, sehen wir von dieser beleuchteten Hälfte mal nichts (Neumond), mal alles (Vollmond), meist einen Teil. Bei uns auf der Nordhalbkugel: zunehmend rechts hell, abnehmend links hell. Der Mond zeigt uns immer dieselbe Seite.',
    acht: 'Acht Stellungen des Mondes auf seiner Bahn. Bei jeder Stellung ist die sonnenzugewandte Hälfte hell. Die runden Bilder zeigen, wie der Mond dann von der Erde aus aussieht. Zwischen zwei gleichen Phasen vergehen 29,5 Tage.',
    mofi: 'Mondfinsternis: Sonne, Erde und Mond stehen in einer Linie, der Mond tritt in den Kernschatten der Erde – das geht nur bei Vollmond. Ganz dunkel wird er nicht: Die Erdatmosphäre lenkt rotes Licht in den Schatten, der Mond leuchtet kupferrot („Blutmond“). Eine Mondfinsternis sieht man von der ganzen Nachtseite der Erde.',
    sofi: 'Sonnenfinsternis: Der Mond steht genau zwischen Sonne und Erde – das geht nur bei Neumond. Sein kleiner Kernschatten trifft die Erde nur auf einem schmalen Streifen: Nur dort ist die Sonne ganz verdeckt (totale Finsternis). Im großen Halbschatten ringsum ist sie nur teilweise verdeckt.',
    neigung: 'Die Mondbahn ist gegen die Erdbahn um gut 5° geneigt. Deshalb läuft der Mond bei Vollmond meist knapp über oder unter dem Erdschatten vorbei und bei Neumond an der Sonne vorbei. Finsternisse gibt es nur, wenn Voll- oder Neumond genau dort stattfinden, wo sich die beiden Bahnebenen schneiden – das passiert nur etwa zweimal im Jahr.',
  };
  function info() {
    const z = [];
    if (!acht) {
      const w = ((theta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      z.push(`<b>${phasenName(theta)}</b> · Mondalter ${(w / (2 * Math.PI) * MONAT).toFixed(1).replace('.', ',')} Tage · ${Math.round((1 - Math.cos(w)) / 2 * 100)} % der sichtbaren Seite beleuchtet`);
    }
    z.push(`<i>${TEXT[a]} Erde und Mond sind im richtigen Größenverhältnis gezeichnet, ihr Abstand ist auf ein Zehntel verkürzt (wirklich etwa 30 Erddurchmesser).</i>`);
    return z.join('<br>');
  }
  let erg;
  erg = {
    objekt: wurzel, radius: D + 4, titel: `Mond – ${ANSICHTEN[a]}`, info: info(),
    update: dt => {
      if (st.bewegung) {
        spin += dt * 0.6;
        if (!acht) {
          const langsam = (a === 'mofi' && Math.abs(Math.cos(theta) + 1) < 0.1) || (a === 'sofi' && Math.abs(Math.cos(theta) - 1) < 0.02);
          theta += dt * (a === 'phasen' ? 0.3 : langsam ? 0.03 : 0.12);
          if (a === 'mofi' && theta > Math.PI + 0.6) theta = Math.PI - 0.6;
          if (a === 'sofi' && theta > 0.5) theta = -0.5;
          if (a === 'neigung' && theta > Math.PI + 0.8) theta = Math.PI - 0.8;
        }
      }
      setze();
    },
  };
  setze();
  return erg;
}
export const entsorge = o => { o.traverse(x => { if (x.material && x.material.uniforms && x.material.uniforms.karte) x.material.uniforms.karte.value = null; }); entsorgeObj(o); };

export function ausUrl(p) { const st = standard(); if (ANSICHTEN[p.get('v')]) st.ansicht = p.get('v'); return st; }
export const zuUrl = st => `&v=${st.ansicht}`;
export function bedienung(ort, st, neu) {
  stil(); ort.innerHTML = '';
  const s = document.createElement('select'); for (const [k, v] of Object.entries(ANSICHTEN)) s.add(new Option(v, k)); ort.appendChild(s);
  const knopf = t => { const b = document.createElement('button'); b.textContent = t; ort.appendChild(b); return b; };
  const bSchild = knopf('Beschriftung'), bBew = knopf('Bewegung');
  const auff = () => { s.value = st.ansicht; bSchild.classList.toggle('on', st.beschriftung); bBew.classList.toggle('on', st.bewegung); };
  s.onchange = () => { st.ansicht = s.value; auff(); neu(); };
  bSchild.onclick = () => { st.beschriftung = !st.beschriftung; auff(); neu(); };
  bBew.onclick = () => { st.bewegung = !st.bewegung; auff(); };
  auff();
}
