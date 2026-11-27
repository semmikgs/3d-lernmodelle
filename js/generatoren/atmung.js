// Atmung-Generator: Atemwege und Lunge (Ansicht von vorne, Maße in cm; die rechte Körperseite ist im Bild links)
// mit Atembewegung (Zwerchfell und Rippen), sowie Lungenbläschen mit Gasaustausch (stark vergrößert).
// Werte: Atemfrequenz in Ruhe 12–16/min (hier verlangsamt), Atemzugvolumen ca. 0,5 l, rund 300 Mio. Lungenbläschen
// mit zusammen etwa 100 m² Fläche; Trennwand Luft–Blut ca. 0,001 mm.
import * as THREE from 'three';
import { textSprite, entsorge as entsorgeObj, stil, zufall } from './hilfen.js';

export const ANSICHTEN = { lunge: 'Atemwege und Lunge', blaeschen: 'Lungenbläschen und Gasaustausch' };
export const standard = () => ({ ansicht: 'lunge', bewegung: false, beschriftung: false, rippen: true });
const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const T = 5;                                               // Atemzug: 2 s ein, 3 s aus (verlangsamt)
const atem = t => { t = ((t % T) + T) % T; return t < 2 ? 0.5 - 0.5 * Math.cos(Math.PI * t / 2) : 0.5 + 0.5 * Math.cos(Math.PI * (t - 2) / 3); };   // 0 = ausgeatmet, 1 = eingeatmet
const ein = t => (((t % T) + T) % T) < 2;

function lungeAnsicht(wurzel, st, schild, zf) {
  const mat = o => new THREE.MeshStandardMaterial({ roughness: 0.6, ...o });
  const bewegt = [];
  // ---------- Luftröhre mit Knorpelspangen, Kehlkopf ----------
  const knorpel = mat({ color: 0xe9e4d8 }), schleim = mat({ color: 0xd98b8b, side: THREE.DoubleSide });
  const roehre = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 11, 24, 1, true), schleim); roehre.position.y = 5.5; wurzel.add(roehre);
  for (let i = 0; i < 16; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.16, 8, 24, Math.PI * 1.6), knorpel); r.rotation.x = Math.PI / 2; r.rotation.z = Math.PI * 0.7; r.position.y = 0.6 + i * 0.66; wurzel.add(r); }
  { const k = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.15, 3.2, 20), mat({ color: 0xe0d6c2 })); k.position.y = 12.6; wurzel.add(k); }
  // ---------- Bronchialbaum (rekursiv) ----------
  const bronchM = mat({ color: 0xe8cfc0 });
  const ast = (a, richtung, laenge, r, tiefe, ziel) => {
    const b = a.clone().addScaledVector(richtung, laenge);
    const d = b.clone().sub(a), c = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.8, r, d.length(), 10), bronchM);
    c.position.copy(a).addScaledVector(d, 0.5); c.quaternion.setFromUnitVectors(V(0, 1, 0), d.clone().normalize()); ziel.add(c);
    if (tiefe <= 0) return;
    for (const s of [-1, 1]) {
      const q = new THREE.Quaternion().setFromAxisAngle(V(zf() - 0.5, zf() - 0.5, zf() - 0.5).normalize(), 0.15);
      const neu = richtung.clone().applyAxisAngle(V(0, 0, 1), s * (0.42 + zf() * 0.2)).applyQuaternion(q).add(V(0, -0.25, (zf() - 0.5) * 0.6)).normalize();
      ast(b, neu, laenge * 0.7, r * 0.72, tiefe - 1, ziel);
    }
  };
  // Lungenflügel als Gruppen (atmen mit)
  const fluegel = [];
  for (const s of [-1, 1]) {                                     // −1: rechter Lungenflügel (im Bild links)
    const g = new THREE.Group(); g.position.set(s * 1.2, 0, 0); wurzel.add(g); fluegel.push(g);
    // Hauptbronchus: rechts kürzer, steiler und weiter
    const hb = s < 0 ? V(-0.55, -1, 0).normalize() : V(0.85, -1, 0).normalize();
    ast(V(-s * 1.2, 0, 0), hb, s < 0 ? 2.0 : 3.0, s < 0 ? 0.72 : 0.62, 5, g);
    // Lungengewebe: verformte Halbkugel, halb durchsichtig; links mit Herzbucht
    const geo = new THREE.SphereGeometry(1, 48, 36), P = geo.attributes.position;
    for (let i = 0; i < P.count; i++) {
      let x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      const spitz = y > 0 ? 1 - 0.45 * y : 1;                    // Lungenspitze schmaler
      x *= 5.6 * spitz; z *= 7 * spitz; y = y > 0 ? y * 9.5 : y * 9;
      if (-s * x > 2.6) x = -s * (2.6 + (-s * x - 2.6) * 0.15);  // innen (zum Herzen) abgeflacht
      if (s > 0 && x < -1 && y < -2 && z > 0) x += 1.6 * Math.min(1, (-y - 2) / 3);   // Herzbucht links
      const boden = -8 + 1.8 * (1 - (x / 6) ** 2);              // unten auf dem Zwerchfell
      if (y < boden) y = boden;
      P.setXYZ(i, x + s * 3.6, y - 3.2, z);
    }
    geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, mat({ color: 0xf3a6a6, transparent: true, opacity: 0.38, depthWrite: false, roughness: 0.5 })));
    // Lappengrenzen: rechts zwei Spalten (3 Lappen), links eine (2 Lappen)
    const spalt = (y0, y1) => { const pts = []; for (let i = 0; i <= 30; i++) { const u = i / 30, x = s * (1.4 + 4.6 * u), y = y0 + (y1 - y0) * u; pts.push(V(x - s * 1.2, y, 6.2 * Math.sqrt(Math.max(0, 1 - ((x - s * 3.6) / 6) ** 2)))); } g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x9f3a3a }))); };
    if (s < 0) { spalt(1.5, -6.5); spalt(-2.0, -3.0); } else spalt(2.0, -7);
  }
  // Herz (zur Orientierung) und Zwerchfell
  const herz = new THREE.Mesh(new THREE.SphereGeometry(3.2, 28, 20), mat({ color: 0xb91c1c, transparent: true, opacity: 0.7 })); herz.scale.set(1, 1.2, 0.9); herz.rotation.z = 0.5; herz.position.set(1.6, -7.5, 1.8); wurzel.add(herz);
  const zwerch = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat({ color: 0xb45f4a, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }));
  zwerch.scale.set(11, 3.4, 8); zwerch.position.y = -14; wurzel.add(zwerch);
  // Rippen (Brustkorb), Wirbelsäule, Brustbein
  const rippen = new THREE.Group(); wurzel.add(rippen); rippen.visible = st.rippen;
  const knochen = mat({ color: 0xf1ead8, roughness: 0.5 });
  for (let i = 0; i < 10; i++) {
    const y = 7.5 - i * 2.3, rx = 6.2 + Math.min(i, 5) * 0.9, rz = 6.8 + Math.min(i, 5) * 0.4, pts = [];
    for (let k = 0; k <= 40; k++) { const w = -Math.PI / 2 + Math.PI * 2 * k / 40; pts.push(V(rx * Math.sin(w) * 0.98, -1.9 * (1 - Math.cos(w)) / 2, -rz * Math.cos(w))); }
    const rp = new THREE.Group(); rp.position.set(0, y, 0);
    rp.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 60, 0.24, 6, true), knochen));
    rippen.add(rp); bewegt.push(a => { rp.rotation.x = -0.07 * a; rp.scale.set(1 + 0.04 * a, 1, 1 + 0.05 * a); });
  }
  { const b = new THREE.Mesh(new THREE.BoxGeometry(1.4, 13, 0.5), knochen); b.position.set(0, 0.5, 7.4); rippen.add(b); const w = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 22, 12), knochen); w.position.set(0, -2, -8.6); rippen.add(w); }
  // Atembewegung
  bewegt.push(a => { zwerch.position.y = -14 - 1.6 * a; zwerch.scale.y = 3.4 - 1.2 * a; for (const g of fluegel) g.scale.set(1 + 0.05 * a, 1 + 0.08 * a, 1 + 0.06 * a); });
  // Luftteilchen in Luftröhre und Bronchien
  const luftM = new THREE.MeshBasicMaterial({ color: 0x38bdf8 }), luft = [];
  for (let i = 0; i < 28; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), luftM); wurzel.add(m); luft.push({ m, u: zf(), s: zf() < 0.5 ? -1 : 1, d: V(zf() - 0.5, 0, zf() - 0.5).multiplyScalar(0.9) }); }
  const weg = (u, s) => u < 0.55 ? V(0, 13 - u / 0.55 * 13, 0) : V(-s * 0 + s * (u - 0.55) / 0.45 * 4.5, -(u - 0.55) / 0.45 * 5, 0);
  bewegt.push((a, t, dt) => { const v = ein(t) ? 0.35 : -0.23; for (const l of luft) { l.u = (l.u + v * dt + 1) % 1; l.m.position.copy(weg(l.u, l.s)).add(l.d); } });
  schild('Kehlkopf', V(-1.6, 12.6, 0), V(-9, 14, 0));
  schild('Luftröhre mit\nKnorpelspangen', V(-1.1, 8, 0), V(-10, 10, 0));
  schild('Bronchien', V(-2.4, -1.4, 0), V(-12, 4, 0));
  schild('rechter Lungenflügel\n(3 Lappen)', V(-7, 1, 3), V(-14.5, -2, 0));
  schild('linker Lungenflügel\n(2 Lappen)', V(8, 1, 3), V(14.5, 4, 0));
  schild('Herz', V(2.5, -8, 3), V(13, -6, 0));
  schild('Zwerchfell', V(-6, -12.5, 2), V(-13, -14, 0));
  if (st.rippen) schild('Rippen', V(7.5, -4, 4), V(14.5, -10, 0));
  return bewegt;
}

function blaeschenAnsicht(wurzel, st, schild, zf) {
  const mat = o => new THREE.MeshStandardMaterial({ roughness: 0.55, ...o });
  const bewegt = [];
  // Bronchiole und Alveolargang; Lungenbläschen als Traube; ein großes Bläschen vorne aufgeschnitten
  const bm = mat({ color: 0xe8cfc0 });
  const rohr = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 7, 20), bm); rohr.position.set(0, 9.5, 0); wurzel.add(rohr);
  const blM = mat({ color: 0xf4b4b4, transparent: true, opacity: 0.88 });
  const zentren = [];
  for (let i = 0; i < 14; i++) { const w = i * 2.4, h = 5.2 - i * 0.42, r = 2.6 + 0.6 * Math.sin(i), c = V(r * Math.cos(w), h, r * Math.sin(w) - 0.8); if (c.distanceTo(V(0, -3.5, 0)) > 4.9) zentren.push(c); }
  for (const c of zentren) { if (c.z > 1.2) continue; const s = new THREE.Mesh(new THREE.SphereGeometry(1.45, 28, 20), blM); s.position.copy(c); wurzel.add(s); }
  // Großes aufgeschnittenes Bläschen (Schnittfläche z = 0)
  const R = 3.6, C = V(0, -3.5, 0);
  { const h = new THREE.Mesh(new THREE.SphereGeometry(R, 48, 32, Math.PI, Math.PI), mat({ color: 0xf4b4b4, side: THREE.DoubleSide, transparent: true, opacity: 0.55, depthWrite: false })); h.position.copy(C); wurzel.add(h);
    const ring = new THREE.Mesh(new THREE.RingGeometry(R - 0.12, R + 0.02, 64), mat({ color: 0xc2410c, side: THREE.DoubleSide })); ring.position.copy(C).setZ(0.01); wurzel.add(ring); }
  // Kapillarnetz: Gefäße auf der Oberfläche, Farbe von blau (sauerstoffarm) nach rot (sauerstoffreich)
  const kapillaren = [];
  const netz = (c, r, n, vorneWeg) => {
    for (let k = 0; k < n; k++) {
      const a = V(zf() - 0.5, zf() - 0.5, zf() - 0.5).normalize(), b = V(zf() - 0.5, zf() - 0.5, zf() - 0.5).normalize(), pts = [];
      for (let i = 0; i <= 24; i++) { const p = a.clone().lerp(b, i / 24).normalize(); if (vorneWeg && p.z > -0.05) { pts.length = 0; break; } pts.push(c.clone().addScaledVector(p, r + 0.18)); }
      if (pts.length < 10) continue;
      const kurve = new THREE.CatmullRomCurve3(pts), g = new THREE.TubeGeometry(kurve, 40, 0.13, 6), farben = [];
      const blau = new THREE.Color(0x3b5fc0), rot = new THREE.Color(0xd62828), P = g.attributes.position;
      for (let i = 0; i < P.count; i++) { const u = Math.floor(i / 7) / 40; const f = blau.clone().lerp(rot, u); farben.push(f.r, f.g, f.b); }
      g.setAttribute('color', new THREE.Float32BufferAttribute(farben, 3));
      wurzel.add(new THREE.Mesh(g, mat({ vertexColors: true }))); kapillaren.push(kurve);
    }
  };
  for (const c of zentren) if (c.z <= 1.2) netz(c, 1.45, 3, false);
  netz(C, R, 16, true);
  // Rote Blutkörperchen in den Kapillaren des großen Bläschens (wechseln die Farbe)
  const blutGeo = new THREE.TorusGeometry(0.16, 0.1, 6, 12);
  for (const [i, k] of kapillaren.slice(-12).entries()) for (let j = 0; j < 2; j++) {
    const m = new THREE.Mesh(blutGeo, mat({ color: 0xffffff })), ph = j / 2 + i * 0.1; wurzel.add(m);
    bewegt.push((a, t) => { const u = (t * 0.12 + ph) % 1; m.position.copy(k.getPointAt(u)); m.material.color.setRGB(0.45 + 0.4 * u, 0.12, 0.25 - 0.15 * u); });
  }
  // Gasaustausch: O₂ von innen nach außen ins Blut, CO₂ aus dem Blut ins Bläschen (in der Schnittebene)
  const o2M = new THREE.MeshBasicMaterial({ color: 0x0ea5e9 }), co2M = new THREE.MeshBasicMaterial({ color: 0x57534e });
  for (let i = 0; i < 22; i++) {
    const o2 = i % 2 === 0, w = Math.PI * (1 + zf()), ph = zf(), m = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), o2 ? o2M : co2M); wurzel.add(m);
    if (!o2) { const z2 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), co2M); z2.position.x = 0.2; m.add(z2); } else { const z2 = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), o2M); z2.position.x = 0.22; m.add(z2); }
    bewegt.push((a, t) => { const u = (t * 0.18 + ph) % 1, r = o2 ? R * (0.35 + 0.95 * u) : R * (1.3 - 0.95 * u); m.position.set(C.x + r * Math.cos(w), C.y + r * Math.sin(w), 0.25); });
  }
  schild('Bronchiole (feinster Luftweg)', V(0.9, 10, 0), V(8, 12, 0));
  schild('Lungenbläschen', V(3, 3.5, 0), V(10.5, 6, 0));
  schild('Haargefäße (Kapillaren)', V(-4.5, 3, -1), V(-10.5, 6, 0));
  schild('rote Blutkörperchen nehmen\nSauerstoff auf (blau → rot)', V(-2.8, -6, -1.8), V(-11, -9.5, 0));
  schild('O₂ aus der Luft ins Blut', V(-1.4, -2.2, 0.3), V(-11, 0.5, 0), '#0369a1');
  schild('CO₂ aus dem Blut in die Luft', V(1.8, -5.6, 0.3), V(10.5, -9, 0), '#44403c');
  schild('Trennwand nur ca. 0,001 mm', V(R * 0.7, -3.5 + R * 0.7, 0), V(11, -1.5, 0));
  return bewegt;
}

export function erzeuge(st) {
  const wurzel = new THREE.Group(), etik = new THREE.Group(), zf = zufall(17); wurzel.add(etik);
  const schild = (txt, a, z, farbe = '#1f2937') => { const s = textSprite(txt, farbe, st.ansicht === 'lunge' ? 1.05 : 0.85); s.position.copy(z); etik.add(s); const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, z]), new THREE.LineBasicMaterial({ color: 0x334155, depthTest: false })); l.renderOrder = 9; etik.add(l); };
  const lunge = st.ansicht === 'lunge';
  const bewegt = lunge ? lungeAnsicht(wurzel, st, schild, zf) : blaeschenAnsicht(wurzel, st, schild, zf);
  etik.visible = st.beschriftung;
  // Phasenanzeige
  const phase = new THREE.Sprite(new THREE.SpriteMaterial({ depthTest: false, transparent: true })); phase.renderOrder = 12; phase.position.set(0, lunge ? -19.5 : -10.5, 0); phase.visible = st.beschriftung; wurzel.add(phase);
  let letzte = null;
  const zeigePhase = e => {
    if (e === letzte) return; letzte = e;
    const txt = lunge ? (e ? 'Einatmen: Zwerchfell zieht sich zusammen und wird flacher,\nRippen heben sich – der Brustraum wird größer, Luft strömt ein'
      : 'Ausatmen: Zwerchfell und Zwischenrippenmuskeln entspannen sich,\nder Brustraum wird kleiner – Luft strömt aus') : 'Gasaustausch durch Diffusion: Stoffe wandern von hoher zu niedriger Konzentration';
    const s = textSprite(txt, e ? '#0369a1' : '#7c2d12', 0.7); if (phase.material.map) phase.material.map.dispose();
    phase.material.map = s.material.map; phase.scale.copy(s.scale); phase.material.needsUpdate = true;
  };
  let t = st._zeit || 0;
  const schritt = dt => { const a = atem(t); for (const f of bewegt) f(a, t, dt); zeigePhase(lunge ? ein(t) : true); };
  schritt(0);
  const info = lunge
    ? 'Beim Einatmen strömt Luft durch Nase oder Mund, Rachen, Kehlkopf und Luftröhre in die Bronchien. Sie verzweigen sich wie ein umgedrehter Baum immer feiner bis zu den Bronchiolen, die in den Lungenbläschen enden. Die Lunge selbst hat keine Muskeln: Das <b>Zwerchfell</b> und die <b>Zwischenrippenmuskeln</b> vergrößern den Brustraum (Bauch- und Brustatmung), die Lunge folgt und Luft wird eingesogen. In Ruhe atmen Erwachsene 12–16-mal pro Minute, je etwa 0,5 l Luft (hier verlangsamt). Knorpelspangen halten die Luftröhre offen.'
    : 'Am Ende der feinsten Bronchien sitzen rund 300 Millionen <b>Lungenbläschen</b> (je etwa 0,2 mm groß) – zusammen etwa 100 m² Fläche, so viel wie ein halbes Tennisfeld. Jedes ist von einem Netz feinster Blutgefäße umsponnen. Die Trennwand zwischen Luft und Blut ist nur etwa 0,001 mm dünn. Sauerstoff wandert aus der Luft ins Blut und wird von den roten Blutkörperchen gebunden; Kohlenstoffdioxid wandert aus dem Blut in die Luft und wird ausgeatmet. Eingeatmete Luft enthält ca. 21 % Sauerstoff und 0,04 % CO₂, ausgeatmete ca. 16 % Sauerstoff und 4 % CO₂. Stark vergrößert dargestellt.';
  return {
    objekt: wurzel, radius: lunge ? 20 : 13.5, titel: `Atmung – ${ANSICHTEN[st.ansicht]}`, info: `<b>Atmung</b><br><i>${info}</i>`,
    update: dt => { if (!st.bewegung) return; dt = Math.min(dt, 0.1); t += dt; st._zeit = t; schritt(dt); },
  };
}
export const entsorge = entsorgeObj;
export function ausUrl(p) { const st = standard(); if (ANSICHTEN[p.get('v')]) st.ansicht = p.get('v'); return st; }
export const zuUrl = st => `&v=${st.ansicht}`;
export function bedienung(ort, st, neu) {
  stil(); ort.innerHTML = '';
  const s = document.createElement('select'); for (const [k, v] of Object.entries(ANSICHTEN)) s.add(new Option(v, k)); ort.appendChild(s);
  const knopf = t => { const b = document.createElement('button'); b.textContent = t; ort.appendChild(b); return b; };
  const bR = knopf('Brustkorb'), bB = knopf('Bewegung'), bS = knopf('Beschriftung');
  const auff = () => { s.value = st.ansicht; bR.hidden = st.ansicht !== 'lunge'; bR.classList.toggle('on', st.rippen); bB.classList.toggle('on', st.bewegung); bS.classList.toggle('on', st.beschriftung); };
  s.onchange = () => { st.ansicht = s.value; auff(); neu(); };
  bR.onclick = () => { st.rippen = !st.rippen; auff(); neu(); };
  bB.onclick = () => { st.bewegung = !st.bewegung; auff(); };
  bS.onclick = () => { st.beschriftung = !st.beschriftung; auff(); neu(); };
  auff();
}
