// Erdbahn-Generator: Jahreszeiten durch die geneigte Erdachse. Umlaufbahn mit Sonne oder Erde im Sonnenlicht (Nahansicht).
// Erdkarte: Natural Earth (gemeinfrei), daraus erzeugt: hintergruende/erde.jpg (mit Äquator, Wende- und Polarkreisen, Schwarmstedt).
// Achsneigung 23,44°, Achse zeigt immer in dieselbe Richtung. Größen und Abstände nicht maßstäblich.
import * as THREE from 'three';
import { textSprite, entsorge as entsorgeObj, stil } from './hilfen.js';

const EPS = THREE.MathUtils.degToRad(23.44), ORT = { name: 'Schwarmstedt', lat: 52.67, lon: 9.62 };
const R_BAHN = 6, R_ERDE = 0.6, R_SONNE = 1.3, R_NAH = 2.2;
const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const TAGE = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export const DATUM = { jahr: 'Jahreslauf (animiert)', alle: 'Vier Stellungen', m03: '21. März', m06: '21. Juni', m09: '23. September', m12: '21. Dezember' };
const TAG_VON = { m03: 80, m06: 172, m09: 266, m12: 355 };
export const DARSTELLUNGEN = { bahn: 'Umlaufbahn um die Sonne', nah: 'Erde im Sonnenlicht' };
export const standard = () => ({ darstellung: 'bahn', datum: 'jahr', beschriftung: false, bewegung: false });

// Winkel θ auf der Bahn: 0 = Sommeranfang, gegen den Uhrzeigersinn (von Norden gesehen).
// Aus dem Tag des Jahres über die ekliptikale Länge der Sonne (mit Mittelpunktsgleichung, Perihel Anfang Januar).
function thetaVon(tag) {
  const M = THREE.MathUtils.degToRad(0.9856 * (tag - 3.5));
  const lambda = M + THREE.MathUtils.degToRad(1.915 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 282.94);
  return lambda - Math.PI / 2;
}
const bahnPos = theta => new THREE.Vector3(Math.cos(theta) * R_BAHN, 0, -Math.sin(theta) * R_BAHN);
const ACHSE = new THREE.Vector3(-Math.sin(EPS), Math.cos(EPS), 0);   // zeigt immer hierhin (Richtung Polarstern)
const dekl = theta => Math.asin(Math.sin(EPS) * Math.cos(theta));    // Breite, über der die Sonne mittags senkrecht steht
function datumText(tag) {
  // tag: 1 = 1. Januar
  let t = Math.round(tag) - 1, m = 0; while (t >= TAGE[m]) { t -= TAGE[m]; m = (m + 1) % 12; }
  return `${t + 1}. ${MONATE[m]}`;
}
const gradText = (x, d = 1) => x.toFixed(d).replace('.', ',') + '°';
function tageslaenge(lat, d) {
  const c = -Math.tan(THREE.MathUtils.degToRad(lat)) * Math.tan(d);
  if (c <= -1) return 24; if (c >= 1) return 0;
  return 2 * THREE.MathUtils.radToDeg(Math.acos(c)) / 15;
}
const uhr = h => `${Math.floor(h)} h ${String(Math.round((h % 1) * 60)).padStart(2, '0')} min`;

// ---------- Erdkugel mit Tag/Nacht aus der Sonnenrichtung ----------
let karte = null;
function erdKarte() {
  if (!karte) { karte = new THREE.TextureLoader().load(new URL('../../hintergruende/erde.jpg', import.meta.url).href); karte.anisotropy = 8; }
  return karte;
}
function erdMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { karte: { value: erdKarte() }, sonne: { value: new THREE.Vector3() }, punktlicht: { value: 1 } },
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vP;
      void main() { vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform sampler2D karte; uniform vec3 sonne; uniform float punktlicht; varying vec2 vUv; varying vec3 vN; varying vec3 vP;
      void main() { vec3 s = punktlicht > 0.5 ? normalize(sonne - vP) : normalize(sonne);
        float l = dot(normalize(vN), s); float tag = smoothstep(-0.06, 0.12, l);
        vec3 c = texture2D(karte, vUv).rgb; gl_FragColor = vec4(c * (0.13 + 0.87 * tag * (0.55 + 0.45 * max(l, 0.0))), 1.0); }`,
  });
}
// Erde mit geneigter Achse: aussen (Lage/Neigung) > drehung (Tagesdrehung um die eigene Achse)
function baueErde(r, beschriften, schrift) {
  const aussen = new THREE.Group(), drehung = new THREE.Group();
  aussen.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), ACHSE);
  aussen.add(drehung);
  const mat = erdMaterial();
  const kugel = new THREE.Mesh(new THREE.SphereGeometry(r, 96, 64), mat);
  kugel.onBeforeRender = () => { if (mat.uniforms.punktlicht.value > 0.5 && mat.userData.sonne) mat.userData.sonne.getWorldPosition(mat.uniforms.sonne.value); };
  drehung.add(kugel);
  const achse = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.025, r * 0.025, r * 2.9, 8), new THREE.MeshBasicMaterial({ color: 0x334155 }));
  aussen.add(achse);
  if (beschriften) { const n = textSprite('N', '#111', schrift); n.position.set(0, r * 1.65, 0); aussen.add(n); const s = textSprite('S', '#111', schrift); s.position.set(0, -r * 1.65, 0); aussen.add(s); }
  return { aussen, drehung, mat, kugel };
}
const aufKugel = (r, lat, lon) => { const a = THREE.MathUtils.degToRad(lat), o = THREE.MathUtils.degToRad(lon); return new THREE.Vector3(r * Math.cos(o) * Math.cos(a), r * Math.sin(a), -r * Math.sin(o) * Math.cos(a)); };

// =====================================================================
export function erzeuge(st) {
  const wurzel = new THREE.Group(), etik = new THREE.Group(); wurzel.add(etik);
  let tagNr = st.datum in TAG_VON ? TAG_VON[st.datum] : (st._tag ?? 80), theta = thetaVon(tagNr), spin = 0, infoZeit = 0;
  const animiert = st.datum === 'jahr';
  const schild = (text, farbe, h, pos, eltern = etik) => { const s = textSprite(text, farbe, h); s.position.copy(pos); eltern.add(s); return s; };
  let erg;
  const erden = [];

  if (st.darstellung === 'bahn') {
    // Sonne mit Leuchten
    const sonne = new THREE.Mesh(new THREE.SphereGeometry(R_SONNE, 48, 32), new THREE.MeshBasicMaterial({ color: 0xffc83d }));
    wurzel.add(sonne);
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 10, 64, 64, 64); gr.addColorStop(0, 'rgba(255,210,80,0.9)'); gr.addColorStop(1, 'rgba(255,170,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.scale.setScalar(R_SONNE * 4.2); wurzel.add(glow);
    // Bahn
    const bahn = new THREE.Mesh(new THREE.TorusGeometry(R_BAHN, 0.025, 6, 200), new THREE.MeshBasicMaterial({ color: 0x64748b }));
    bahn.rotation.x = Math.PI / 2; wurzel.add(bahn);
    // Richtungspfeil der Umlaufbewegung
    {
      const t = THREE.MathUtils.degToRad(135), p = bahnPos(t), tg = bahnPos(t + 0.01).sub(p).normalize();
      const k = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.45, 16), new THREE.MeshBasicMaterial({ color: 0x64748b }));
      k.position.copy(p); k.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tg); wurzel.add(k);
    }
    // Stichtage auf der Bahn
    const STICH = [['m03', '21. März\nFrühlingsanfang'], ['m06', '21. Juni\nSommeranfang'], ['m09', '23. September\nHerbstanfang'], ['m12', '21. Dezember\nWinteranfang']];
    for (const [k, text] of STICH) {
      const p = bahnPos(thetaVon(TAG_VON[k]));
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), new THREE.MeshBasicMaterial({ color: 0x334155 })); m.position.copy(p); wurzel.add(m);
      schild(text, '#1f2937', 0.42, p.clone().multiplyScalar(1.33).add(new THREE.Vector3(0, -0.9, 0)));
    }
    schild('Sonne', '#b45309', 0.5, new THREE.Vector3(0, R_SONNE + 0.6, 0));
    schild('(Jahreszeiten der Nordhalbkugel)', '#475569', 0.32, new THREE.Vector3(0, -R_SONNE - 1.3, R_BAHN + 1.6));
    const stellungen = st.datum === 'alle' ? STICH.map(([k]) => thetaVon(TAG_VON[k])) : [theta];
    for (const th of stellungen) {
      const e = baueErde(R_ERDE, st.beschriftung, 0.34); e.mat.userData.sonne = sonne; e.aussen.position.copy(bahnPos(th)); wurzel.add(e.aussen); erden.push(e);
    }
    if (st.datum !== 'alle') schild('Erdachse zeigt immer\nin dieselbe Richtung\n(zum Polarstern)', '#334155', 0.3, new THREE.Vector3(-R_BAHN - 1.5, 2.4, R_BAHN * 0.2), etik).visible = st.beschriftung;
  } else {
    // ---- Erde im Sonnenlicht: Sonne kommt von rechts (+x) ----
    const e = baueErde(R_NAH, st.beschriftung, 0.4); e.mat.uniforms.punktlicht.value = 0; wurzel.add(e.aussen); erden.push(e);
    // Sonnenstrahlen
    const strahlen = new THREE.Group(); wurzel.add(strahlen);
    const pfeilMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    for (let i = -3; i <= 3; i++) {
      const y = i * R_NAH * 0.3, x0 = Math.sqrt(Math.max(R_NAH * R_NAH - y * y, 0));
      const l = 5 - x0 + R_NAH;
      const st_ = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, l, 6), pfeilMat); st_.rotation.z = Math.PI / 2; st_.position.set(x0 + l / 2 + 0.25, y, 0); strahlen.add(st_);
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.25, 12), pfeilMat); sp.rotation.z = Math.PI / 2; sp.position.set(x0 + 0.13, y, 0); strahlen.add(sp);
    }
    schild('Sonnenlicht', '#b45309', 0.45, new THREE.Vector3(R_NAH + 3.4, R_NAH * 1.15, 0));
    // Beschriftung der Breitenkreise und Ort
    const kreisSchilder = [];
    for (const [lat, text, farbe] of [[0, 'Äquator', '#dc2626'], [23.44, 'nördl. Wendekreis', '#d97706'], [-23.44, 'südl. Wendekreis', '#d97706'], [66.56, 'nördl. Polarkreis', '#2563eb'], [-66.56, 'südl. Polarkreis', '#2563eb']]) {
      kreisSchilder.push({ lat, s: schild(text, farbe, 0.3, new THREE.Vector3()) });
    }
    const ortSchild = textSprite(ORT.name, '#b91c1c', 0.32); ortSchild.position.copy(aufKugel(R_NAH * 1.12, ORT.lat, ORT.lon)); e.drehung.add(ortSchild);
    const zenit = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff3d00 })); wurzel.add(zenit);
    const zenitSchild = schild('Sonne steht\nsenkrecht', '#c2410c', 0.28, new THREE.Vector3());
    const tagS = schild('Tag', '#92400e', 0.45, new THREE.Vector3(R_NAH + 0.7, -R_NAH - 0.6, 0)), nachtS = schild('Nacht', '#334155', 0.45, new THREE.Vector3(-R_NAH - 0.9, -R_NAH - 0.6, 0));
    void tagS; void nachtS;
    erden[0].nahUpdate = () => {
      // Sonnenrichtung relativ zur Achse wie am Datum: Bezugssystem so drehen, dass die Sonne rechts (+x) steht
      const d = bahnPos(theta).normalize().negate();                  // Richtung Erde → Sonne
      const w = Math.atan2(-d.z, d.x);
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -w);
      const achse = ACHSE.clone().applyQuaternion(q);
      e.aussen.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), achse);
      e.mat.uniforms.sonne.value.set(1, 0, 0);
      // Breitenkreis-Beschriftungen auf der zum Betrachter (+z) gewandten Seite
      const vorn = new THREE.Vector3(0, 0, 1).addScaledVector(achse, -achse.z).normalize();
      for (const k of kreisSchilder) {
        const a = THREE.MathUtils.degToRad(k.lat);
        k.s.position.copy(vorn.clone().multiplyScalar(Math.cos(a) * R_NAH).addScaledVector(achse, Math.sin(a) * R_NAH)).addScaledVector(vorn, 0.15).add(new THREE.Vector3(-1.6, 0, 0));
      }
      const zp = new THREE.Vector3(1, 0, 0).multiplyScalar(R_NAH + 0.02); zenit.position.copy(zp);
      zenitSchild.position.copy(zp).add(new THREE.Vector3(0.9, -0.55, 0.3));
    };
  }

  function info() {
    const d = dekl(theta), tag = tagNr, dGrad = THREE.MathUtils.radToDeg(d);
    const h = tageslaenge(ORT.lat, d), mittag = 90 - ORT.lat + dGrad;
    const pol = dGrad > 0.3 ? 'Polartag am Nordpol, Polarnacht am Südpol' : dGrad < -0.3 ? 'Polarnacht am Nordpol, Polartag am Südpol' : 'an beiden Polen steht die Sonne am Horizont';
    const z = [];
    if (st.datum !== 'alle') {
      z.push(`<b>${datumText(tag)}</b> · Sonne mittags senkrecht über ${gradText(Math.abs(dGrad))} ${dGrad >= 0 ? 'Nord' : 'Süd'}${Math.abs(Math.abs(dGrad) - 23.44) < 0.3 ? (dGrad > 0 ? ' (nördl. Wendekreis)' : ' (südl. Wendekreis)') : Math.abs(dGrad) < 0.3 ? ' (Äquator)' : ''}`);
      z.push(`${ORT.name}: Tag ${uhr(h)} lang · Sonne mittags ${gradText(mittag, 0)} hoch · ${pol}`);
      z.push('<small>Tageslänge ohne Lichtbrechung der Luft gerechnet – in Wirklichkeit etwa 10–15 min länger.</small>');
    } else {
      z.push(`${ORT.name}: 21. Juni ≈ ${uhr(tageslaenge(ORT.lat, EPS))} Tag, Sonne mittags ${gradText(90 - ORT.lat + 23.44, 0)} hoch · 21. Dezember ≈ ${uhr(tageslaenge(ORT.lat, -EPS))}, ${gradText(90 - ORT.lat - 23.44, 0)} hoch`);
    }
    z.push('<i>Die Erdachse ist um 23,4° geneigt und zeigt das ganze Jahr in dieselbe Richtung. Im Sommer ist die Nordhalbkugel der Sonne zugeneigt: Die Sonne steht mittags hoch, ihre Strahlen treffen steil auf und wärmen stark, und die Tage sind lang. Im Winter ist es umgekehrt. Am Frühlings- und Herbstanfang sind Tag und Nacht überall gleich lang. Nicht der Abstand zur Sonne macht die Jahreszeiten – Anfang Januar ist die Erde der Sonne sogar am nächsten. Größen und Abstände sind nicht maßstäblich: Die Sonne ist 109-mal so groß wie die Erde und 150 Mio. km entfernt.</i>');
    return z.join('<br>');
  }

  erg = {
    objekt: wurzel, radius: st.darstellung === 'bahn' ? R_BAHN + 1.8 : R_NAH + 3.2,
    titel: `Jahreszeiten – ${DARSTELLUNGEN[st.darstellung]}`, info: info(),
    update: dt => {
      if (st.bewegung) {
        if (animiert) { tagNr = (tagNr + dt * 365 / 30 - 1) % 365 + 1; st._tag = tagNr; theta = thetaVon(tagNr); }   // ein Jahr in 30 s
        spin += dt * (animiert && st.darstellung === 'bahn' ? 4 : 0.5);                 // Tagesdrehung (nicht im echten Verhältnis)
      }
      for (const e of erden) e.drehung.rotation.y = spin;
      if (st.darstellung === 'bahn' && animiert) erden[0].aussen.position.copy(bahnPos(theta));
      if (erden[0].nahUpdate) erden[0].nahUpdate();
      if (animiert && st.bewegung && (infoZeit += dt) > 0.5 && erg.beiInfo) { infoZeit = 0; erg.beiInfo(info()); }
    },
  };
  etik.visible = st.beschriftung;
  erg.update(0);
  return erg;
}
export const entsorge = entsorgeObj;   // die Erdkarte bleibt im Speicher und wird wiederverwendet

export function ausUrl(p) {
  const st = standard();
  if (DARSTELLUNGEN[p.get('d')]) st.darstellung = p.get('d');
  if (DATUM[p.get('t')]) st.datum = p.get('t');
  return st;
}
export const zuUrl = st => `&d=${st.darstellung}&t=${st.datum}`;

export function bedienung(ort, st, neu) {
  stil(); ort.innerHTML = '';
  const sel = (opts, titel) => { const s = document.createElement('select'); s.title = titel; for (const [k, v] of Object.entries(opts)) s.add(new Option(v, k)); ort.appendChild(s); return s; };
  const sDar = sel(DARSTELLUNGEN, 'Ansicht'), sDat = sel(DATUM, 'Datum');
  const knopf = t => { const b = document.createElement('button'); b.textContent = t; ort.appendChild(b); return b; };
  const bSchild = knopf('Beschriftung'), bBew = knopf('Bewegung');
  function auffrischen() {
    sDar.value = st.darstellung; sDat.value = st.datum;
    [...sDat.options].find(o => o.value === 'alle').hidden = st.darstellung === 'nah';
    if (st.darstellung === 'nah' && st.datum === 'alle') st.datum = 'm06', sDat.value = 'm06';
    bSchild.classList.toggle('on', st.beschriftung); bBew.classList.toggle('on', st.bewegung);
  }
  const aendern = (f, bauen = true) => () => { f(); auffrischen(); if (bauen) neu(); };
  sDar.onchange = aendern(() => st.darstellung = sDar.value);
  sDat.onchange = aendern(() => st.datum = sDat.value);
  bSchild.onclick = aendern(() => st.beschriftung = !st.beschriftung);
  bBew.onclick = aendern(() => st.bewegung = !st.bewegung, false);
  auffrischen();
}
