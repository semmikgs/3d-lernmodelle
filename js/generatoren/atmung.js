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

// ---------- Brustraum (Maße in cm, Ansicht von vorne: rechte Körperseite im Bild links) ----------
const KARINA = 3.5;                                        // Gabelung der Luftröhre
// Zwerchfell: zwei Kuppeln (rechts höher, wegen der Leber), Mitte tiefer (Herz liegt darauf), Ränder tief an den Rippen
const kuppel = (x, z, a = 0) => {
  const r = Math.exp(-(((x + 5) / 4.6) ** 2) - ((z + 0.5) / 5.5) ** 2), l = Math.exp(-(((x - 5) / 4.6) ** 2) - ((z + 0.5) / 5.5) ** 2);
  const rand = Math.max(0, ((x / 11.5) ** 2 + ((z + 0.5) / 8.5) ** 2) - 0.45);
  return -12.5 + 5.6 * r + 4.9 * l + 2.8 * Math.exp(-((x / 3) ** 2) - (z / 5) ** 2) - 6 * rand - a * 2.4 * (r + l) * 0.9;
};
// Lungenflügel aus einer Kugel geformt: Spitze oben schmal, Basis breit und hohl über der Zwerchfellkuppel,
// innen (zum Herzen) abgeflacht, links mit Herzbucht
function lungenGeo(s) {
  const g = new THREE.SphereGeometry(1, 72, 56), P = g.attributes.position, cx = s * 6.3;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    const f = 1 - 0.22 * Math.max(0, y);                    // nach oben etwas schmaler, Spitze bleibt rund
    let X = x * 5.9 * f, Z = z * 7.6 * f, Y = 1.2 + y * 11.2;
    if (-s * X > 0) X *= 0.5;                               // innere Fläche (zum Mittelfell) flach
    if (s > 0 && X < -0.5 && Z > 1 && y < 0) X += 1.6 * Math.min(1, -y * 2) * Math.min(1, (Z - 1) / 3);   // Herzbucht links
    const wx = cx + X, boden = kuppel(wx, Z) + 0.35;
    P.setXYZ(i, wx, Math.max(Y, boden), Z);
  }
  g.computeVertexNormals(); return g;
}
// Spaltlinien (Fissuren) als Schnitt der Lungenoberfläche mit einer Ebene
function spaltLinien(geo, eben, nur = () => true) {
  const P = geo.attributes.position, I = geo.index.array, pts = [];
  const v = k => V(P.getX(k), P.getY(k), P.getZ(k));
  for (let t = 0; t < I.length; t += 3) {
    const e = [I[t], I[t + 1], I[t + 2]], w = e.map(k => eben(v(k))), sp = [];
    for (let a = 0; a < 3; a++) { const b = (a + 1) % 3; if ((w[a] > 0) !== (w[b] > 0)) { const u = w[a] / (w[a] - w[b]); sp.push(v(e[a]).lerp(v(e[b]), u)); } }
    if (sp.length === 2 && nur(sp[0])) pts.push(sp[0], sp[1]);
  }
  return pts;
}

function lungeAnsicht(wurzel, st, schild, zf) {
  const mat = (farbe, o = {}) => new THREE.MeshStandardMaterial({ color: farbe, roughness: 0.6, ...o });
  const bewegt = [];
  // ---------- Lungenflügel mit Lappen (Farbtöne) und Spaltlinien ----------
  const ebenen = {
    schraegR: p => (p.y - 2.5) + 0.75 * (p.z + 3),          // schräge Spalte: hinten oben → vorne unten
    waagR: p => p.y - 0.6,                                    // waagerechte Spalte (nur rechts, vorne)
    schraegL: p => (p.y - 3.2) + 0.8 * (p.z + 3),
  };
  const lungen = [];
  for (const s of [-1, 1]) {
    const geo = lungenGeo(s), P = geo.attributes.position, col = [];
    for (let i = 0; i < P.count; i++) {
      const p = V(P.getX(i), P.getY(i), P.getZ(i)), n = 0.5 + 0.5 * Math.sin(p.x * 3.1 + p.y * 2.3) * Math.cos(p.z * 2.7 - p.y);
      let c;
      if (s < 0) c = ebenen.schraegR(p) < 0 ? new THREE.Color(0xe9989a) : ebenen.waagR(p) < 0 && p.z > -2 ? new THREE.Color(0xf2b3a6) : new THREE.Color(0xf0a4ad);
      else c = ebenen.schraegL(p) < 0 ? new THREE.Color(0xe9989a) : new THREE.Color(0xf0a4ad);
      c.multiplyScalar(0.92 + 0.12 * n); col.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const m = new THREE.Mesh(geo, mat(0xffffff, { vertexColors: true, transparent: true, opacity: 0.36, depthWrite: false, roughness: 0.75 }));
    m.renderOrder = 2; wurzel.add(m);
    const linien = s < 0 ? [...spaltLinien(geo, ebenen.schraegR), ...spaltLinien(geo, ebenen.waagR, p => p.z > -1.5 && ebenen.schraegR(p) > 0)] : spaltLinien(geo, ebenen.schraegL);
    const lg = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(linien), new THREE.LineBasicMaterial({ color: 0x9f2d3a })); wurzel.add(lg);
    lungen.push({ m, geo, basis: P.array.slice(), lg, lbasis: lg.geometry.attributes.position.array.slice() });
  }
  // Lunge folgt dem Zwerchfell nach unten und dehnt sich etwas nach außen und vorne
  const dehne = (a, x, y, z) => { const w = Math.max(0, Math.min(1, (6 - y) / 14)); return [x * (1 + 0.045 * a), y - 2.2 * a * w * w, z * (1 + 0.06 * a)]; };
  bewegt.push(a => { for (const L of [...lungen]) for (const [g, B] of [[L.geo, L.basis], [L.lg.geometry, L.lbasis]]) { const A = g.attributes.position; for (let i = 0; i < A.count; i++) { const [x, y, z] = dehne(a, B[3 * i], B[3 * i + 1], B[3 * i + 2]); A.setXYZ(i, x, y, z); } A.needsUpdate = true; } for (const L of lungen) L.geo.computeVertexNormals(); });
  // ---------- Kehlkopf, Luftröhre mit Knorpelspangen, Bronchialbaum ----------
  const knorpel = mat(0xeee6d6), wand = mat(0xe3c6b8);
  { const k = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.15, 3.2, 24), mat(0xe0d4bf)); k.position.y = KARINA + 12.4; wurzel.add(k);
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 10.5, 24), wand); r.position.y = KARINA + 5.4; wurzel.add(r);
    for (let i = 0; i < 15; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.14, 8, 28, Math.PI * 1.6), knorpel); t.rotation.x = Math.PI / 2; t.rotation.z = Math.PI * 0.7; t.position.y = KARINA + 0.6 + i * 0.68; wurzel.add(t); } }
  const innen = p => { for (const s of [-1, 1]) { const q = V(p.x - s * 6.3, p.y - 1.2, p.z); if ((q.x / 5.3) ** 2 + (q.y / 10.2) ** 2 + (q.z / 6.9) ** 2 < 1 && p.y > kuppel(p.x, p.z) + 0.9 && s * p.x > 1.4) return true; } return false; };
  const knoten = [{ p: V(0, KARINA + 11, 0), eltern: -1 }, { p: V(0, KARINA, 0), eltern: 0 }], baumGr = new THREE.Group(); wurzel.add(baumGr);
  const rohr = (a, b, r) => { const d = b.clone().sub(a), c = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.85, r, d.length(), 10), wand); c.position.copy(a).addScaledVector(d, 0.5); c.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); baumGr.add(c); const k = new THREE.Mesh(new THREE.SphereGeometry(r * 0.95, 10, 8), wand); k.position.copy(b); baumGr.add(k); };
  const spitzen = [];
  const wachse = (von, dir, len, r, tiefe, ziel) => {
    let b = knoten[von].p.clone().addScaledVector(dir, len);
    if (!innen(b)) { dir = dir.clone().lerp(ziel.clone().sub(knoten[von].p).normalize(), 0.7).normalize(); b = knoten[von].p.clone().addScaledVector(dir, len * 0.7); if (!innen(b)) { b = knoten[von].p.clone().addScaledVector(dir, len * 0.35); if (!innen(b)) return; } }
    rohr(knoten[von].p, b, r); knoten.push({ p: b, eltern: von }); const k = knoten.length - 1;
    if (tiefe <= 0) { spitzen.push(k); return; }
    for (const sg of [-1, 1]) {
      const zu = ziel.clone().sub(b).normalize(), quer = V(zf() - 0.5, zf() - 0.5, zf() - 0.5).cross(dir).normalize();
      const neu = dir.clone().multiplyScalar(0.5).addScaledVector(zu, 0.25).addScaledVector(quer, sg * 0.6).normalize();
      wachse(k, neu, len * 0.8, r * 0.72, tiefe - 1, ziel);
    }
  };
  rohr(knoten[0].p, knoten[1].p, 0.95);
  // Hauptbronchien: rechts kurz, steil und weit – links länger und flacher (unter dem Aortenbogen)
  const hb = (s, dir, len, r) => { const a = knoten[1].p.clone().addScaledVector(dir, len); rohr(knoten[1].p, a, r); knoten.push({ p: a, eltern: 1 }); return knoten.length - 1; };
  const hbR = hb(-1, V(-0.45, -1, 0).normalize(), 2.6, 0.75), hbL = hb(1, V(0.75, -1, 0).normalize(), 4.6, 0.62);
  // Lappenbronchien: rechts Ober-, Mittel-, Unterlappen; links Ober- und Unterlappen
  for (const [von, dir, len, r, ziel] of [
    [hbR, V(-0.8, 0.7, -0.1), 2.2, 0.5, V(-6.8, 8, -0.5)], [hbR, V(-0.5, -0.6, 0.7), 2.4, 0.45, V(-7, -1.5, 4)], [hbR, V(-0.3, -1, -0.4), 3.0, 0.52, V(-6.5, -5, -2.5)],
    [hbL, V(0.7, 0.8, 0.2), 2.4, 0.48, V(6.6, 7.5, 0.5)], [hbL, V(0.35, -1, -0.3), 3.0, 0.5, V(6.5, -5, -2)],
  ]) { const k0 = knoten.length; const a = knoten[von].p.clone().addScaledVector(dir.normalize(), len); rohr(knoten[von].p, a, r); knoten.push({ p: a, eltern: von }); for (const sg of [-1, 1]) for (const zv of [-1, 1]) wachse(k0, dir.clone().applyAxisAngle(V(0, 0, 1), sg * 0.45).applyAxisAngle(V(1, 0, 0), zv * 0.35).normalize(), len * 0.95, r * 0.72, 5, ziel); }
  // Lungenbläschen (Trauben) an einigen Endästen, stark vergrößert
  const blM = mat(0xf7b2b8);
  for (const k of spitzen.filter((_, i) => i % 3 === 0)) for (let j = 0; j < 5; j++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), blM); b.position.copy(knoten[k].p).add(V(zf() - 0.5, zf() - 0.5, zf() - 0.5).multiplyScalar(0.45)); baumGr.add(b); }
  bewegt.push(a => { baumGr.scale.set(1 + 0.03 * a, 1 + 0.04 * a, 1 + 0.03 * a); baumGr.position.y = -KARINA * 0.04 * a; });
  // ---------- Herz mit Lungenarterie (blau) und Lungenvenen (rot) zu den Lungenwurzeln ----------
  { const umr = [[-4.7, 3.8], [-1.5, 4.7], [1.5, 4.7], [4.9, 3.6], [5.9, 0.5], [5.7, -3.2], [4.5, -6.4], [2.9, -8.4], [0.4, -7.6], [-2.2, -5.7], [-4.5, -2.7], [-5.3, 0.6]];
    const f = new THREE.Shape(new THREE.CatmullRomCurve3(umr.map(([x, y]) => V(x, y)), true).getSpacedPoints(80).map(p => new THREE.Vector2(p.x * 0.72, p.y * 0.72)));
    const g = new THREE.ExtrudeGeometry(f, { depth: 2.8, bevelEnabled: true, bevelThickness: 1.4, bevelSize: 0.8, bevelSegments: 6 }); g.translate(0, 0, -1.4);
    const h = new THREE.Mesh(g, mat(0xb3403a, { roughness: 0.45 })); h.position.set(1.0, -3.6, 1.4); h.rotation.z = 0.12; wurzel.add(h); h.renderOrder = 1; }
  const gefaess = (pts, r, farbe) => wurzel.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, r, 12), mat(farbe, { roughness: 0.4 })));
  gefaess([V(0.2, 0.6, 3.2), V(0.4, 3.2, 1.6), V(0, 4.4, 0.4)], 0.9, 0x3a5bc7);
  gefaess([V(0, 4.4, 0.4), V(-2.5, 3.6, 0.2), V(-4.4, 2.4, 0.4)], 0.55, 0x3a5bc7); gefaess([V(0, 4.4, 0.4), V(2.5, 3.9, 0.4), V(4.6, 2.8, 0.4)], 0.55, 0x3a5bc7);
  for (const s of [-1, 1]) for (const y of [0.6, -1.2]) gefaess([V(s * 4.3, y, -0.6), V(s * 2.0, y - 0.4, -0.8), V(s * 0.8, -0.6, -0.4)], 0.42, 0xc4302b);
  gefaess([V(1.2, 0.8, 2.0), V(1.0, 6.0, 0.8), V(2.4, 7.6, -0.8), V(3.6, 6.0, -2.6), V(3.2, -12, -3.4)], 0.95, 0xc4302b);   // Aorta
  // ---------- Zwerchfell (zwei Kuppeln, Sehnenspiegel in der Mitte) ----------
  const zwGeo = new THREE.RingGeometry(0.001, 1, 96, 36); zwGeo.rotateX(-Math.PI / 2); zwGeo.scale(10.8, 1, 8.2); zwGeo.translate(0, 0, -0.5);
  const zwP = zwGeo.attributes.position, zwFarbe = [];
  for (let i = 0; i < zwP.count; i++) { const x = zwP.getX(i), z = zwP.getZ(i), sehne = Math.exp(-((x / 3.2) ** 2) - ((z - 0.5) / 3.5) ** 2), c = new THREE.Color(0xc96a55).lerp(new THREE.Color(0xeadfce), sehne * 0.85); zwFarbe.push(c.r, c.g, c.b); }
  zwGeo.setAttribute('color', new THREE.Float32BufferAttribute(zwFarbe, 3));
  const zwMesh = new THREE.Mesh(zwGeo, mat(0xffffff, { vertexColors: true, side: THREE.DoubleSide, roughness: 0.7, transparent: true, opacity: 0.82, depthWrite: false })); wurzel.add(zwMesh);
  bewegt.push(a => { for (let i = 0; i < zwP.count; i++) { const x = zwP.getX(i), z = zwP.getZ(i); zwP.setY(i, kuppel(x, z, a)); } zwP.needsUpdate = true; zwGeo.computeVertexNormals(); });
  // ---------- Brustkorb: 12 Rippenpaare, Rippenknorpel, Brustbein, Wirbelsäule, Schlüsselbeine ----------
  const korb = new THREE.Group(); wurzel.add(korb); korb.visible = st.rippen;
  const knochen = mat(0xf1e9d6, { roughness: 0.5 }), knorpelM = mat(0xcfe0e8, { roughness: 0.4 });
  const brustbein = new THREE.Group(); korb.add(brustbein);
  for (const [y0, y1, w] of [[11.6, 8.4, 2.6], [8.4, -2.4, 1.9], [-2.4, -4.2, 0.8]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, y0 - y1, 0.7), knochen); b.position.set(0, (y0 + y1) / 2, 7.6); brustbein.add(b); }
  for (let i = 1; i <= 12; i++) {
    const yb = 12.2 - i * 1.65, ax = 4.2 + Math.min(i, 7) * 1.05 - Math.max(0, i - 9) * 0.5, az = 6.8 + Math.min(i, 6) * 0.25, fall = 2.2 + i * 0.5;
    const wEnde = i <= 10 ? Math.PI * (0.86 - i * 0.008) : Math.PI * 0.55;
    for (const s of [-1, 1]) {
      const rippe = new THREE.Group(); rippe.position.set(0, yb, -az + 0.4); korb.add(rippe);
      const pts = []; for (let k = 0; k <= 30; k++) { const w = 0.12 + (wEnde - 0.12) * k / 30; pts.push(V(s * (1.3 + ax * Math.sin(w)), -fall * (1 - Math.cos(w)) / 2, az * (1 - Math.cos(w)) - 0.4 + 0.4)); }
      rippe.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.3, 6), knochen));
      // Rippenknorpel: Rippen 1–7 zum Brustbein, 8–10 zum Knorpel darüber
      const ende = pts[pts.length - 1];
      if (i <= 10) { const ziel = i <= 7 ? V(s * 1.0, (9.6 - i * 1.55) - yb, 7.2 + az) : V(s * (2.6 + (i - 8) * 0.8), -3.6 - (i - 8) * 1.1 - yb, 6.4 - (i - 8) * 0.8 + az - 0.4);
        rippe.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([ende, ende.clone().lerp(ziel, 0.5).add(V(0, 0.3, 0.3)), ziel]), 12, 0.26, 6), knorpelM)); }
      bewegt.push(a => { rippe.rotation.x = -0.07 * a * (1 - i / 16); rippe.scale.x = 1 + 0.03 * a; });
    }
  }
  bewegt.push(a => { brustbein.position.set(0, 0.5 * a, 0.45 * a); });
  for (let k = 0; k < 16; k++) { const w = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 1.3, 14), knochen); w.position.set(0, 13 - k * 1.55, -8.6); korb.add(w); const d = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.0, 1.6), knochen); d.position.set(0, 12.8 - k * 1.55, -10); korb.add(d); }
  for (const s of [-1, 1]) korb.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(s * 1.6, 11.6, 7.4), V(s * 5, 12.6, 6), V(s * 9, 12.4, 2.2), V(s * 12.5, 13.2, -1)]), 30, 0.42, 8), knochen));
  // ---------- Luftteilchen: strömen beim Einatmen bis in die Endäste, beim Ausatmen zurück ----------
  const pfade = spitzen.map(k => { const w = []; let j = k; while (j >= 0) { w.unshift(knoten[j].p); j = knoten[j].eltern; } return new THREE.CatmullRomCurve3(w); });
  const luftM = new THREE.MeshBasicMaterial({ color: 0x38bdf8 }), luft = [];
  for (let i = 0; i < 46; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), luftM); wurzel.add(m); luft.push({ m, k: pfade[Math.floor(zf() * pfade.length)], u: zf() }); }
  bewegt.push((a, t, dt) => { const v = ein(t) ? 0.42 : -0.28; for (const l of luft) { l.u += v * dt; if (l.u > 1) { l.u = 0; l.k = pfade[Math.floor(Math.random() * pfade.length)]; } if (l.u < 0) { l.u = 1; l.k = pfade[Math.floor(Math.random() * pfade.length)]; } l.m.position.copy(l.k.getPointAt(l.u)); } });
  // ---------- Beschriftung ----------
  schild('Kehlkopf', V(-1.6, KARINA + 12.4, 0), V(-10, KARINA + 13.5, 0));
  schild('Luftröhre mit\nKnorpelspangen', V(-1.1, KARINA + 6, 0), V(-11, KARINA + 9.5, 0));
  schild('Bronchien', V(-1.6, KARINA - 1.6, 0), V(-14, 5.5, 0));
  schild('rechter Lungenflügel\n(3 Lappen)', V(-8.5, -1, 4), V(-16, -1.5, 0));
  schild('linker Lungenflügel\n(2 Lappen)', V(9, 2, 4), V(16, 6, 0));
  schild('Herz', V(3, -5, 5), V(15, -5, 0));
  schild('Zwerchfell', V(-6, -8, 3), V(-15, -10.5, 0));
  schild('Lungenbläschen\n(vergrößert)', knoten[spitzen[0]].p, V(-15, 9.5, 0));
  if (st.rippen) { schild('Rippen', V(9.5, -3, 3), V(16, -11, 0)); schild('Brustbein', V(0, 2, 7.8), V(6, 15.5, 2)); }
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
