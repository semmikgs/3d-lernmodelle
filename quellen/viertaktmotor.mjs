// Erzeugt modelle/viertaktmotor.glb – aufgeschnittener Viertakt-Ottomotor mit Animation.
// Aufruf: node viertaktmotor.mjs <Ausgabeordner>
// benötigt: npm i three ; npm i --legacy-peer-deps three-bvh-csg three-mesh-bvh
// Oberste Gruppe "motor"; Clips: viertakt (ganzes Arbeitsspiel), ansaugen, verdichten, arbeiten, ausstossen.
// Kinematik: Kurbelradius R, Pleuellänge L; Kurbelwinkel θ (0° = oberer Totpunkt, Beginn Ansaugtakt).
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Brush, Evaluator, SUBTRACTION, ADDITION, INTERSECTION } from 'three-bvh-csg';
import fs from 'fs';

globalThis.FileReader = class {
  readAsArrayBuffer(b) { b.arrayBuffer().then(r => { this.result = r; this.onloadend && this.onloadend(); }); }
  readAsDataURL(b) { b.arrayBuffer().then(r => { this.result = 'data:application/octet-stream;base64,' + Buffer.from(r).toString('base64'); this.onloadend && this.onloadend(); }); }
};
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const C = h => new THREE.Color(h);
const rad = THREE.MathUtils.degToRad;
function rausch(x, y, z) { return (Math.sin(x * 3.1 + y * 1.7 + 0.3) * Math.cos(z * 2.3 - x * 0.7) + Math.sin(x * 7.3 - z * 5.1 + y * 2.9) * 0.5 + Math.sin(y * 11.1 + z * 9.7) * 0.25) / 1.75; }

// ---------- Maße ----------
const R = 1.0, L = 3.2;                  // Kurbelradius, Pleuellänge
const KOLBEN_OBEN = 0.95, KOLBEN_UNTEN = 0.62, BOHRUNG = 1.0;
const DECKE = R + L + KOLBEN_OBEN + 0.35; // Brennraumdecke (Verdichtung ≈ 1 : 6,7)
const KOPF_OBEN = DECKE + 1.5, DECKEL_OBEN = KOPF_OBEN + 1.6;
const NEIG = rad(15);                     // Ventilneigung
const SITZ_X = 0.45;

// ---------- Farben & Materialien (Farben pro Ecke eingebacken) ----------
const FARBE = {
  alu: p => C(0x8e98a3).multiplyScalar(1 + 0.05 * rausch(p.x * 3, p.y * 3, p.z * 3)),
  schnitt: p => C(0xd3dae2).multiplyScalar(1 + 0.04 * rausch(p.x * 6, p.y * 6, p.z * 6)),
  guss: p => C(0x6f7882).multiplyScalar(1 + 0.06 * rausch(p.x * 4, p.y * 4, p.z * 4)),
  kolben: () => C(0xe6e9ec), ring: () => C(0x3b4148), stahl: () => C(0xa9b3bd), dunkelstahl: () => C(0x5f6873),
  schwung: p => C(0x56606b).multiplyScalar(1 + 0.05 * rausch(p.x * 3, p.y * 3, p.z * 3)), marke: () => C(0xf4b400),
  ventil: () => C(0xcfd3d7), feder: () => C(0x3a6fb0), nocke: () => C(0x8a939d),
  keramik: () => C(0xf5f5f0), kerzenmetall: () => C(0xa8acb1),
  wasser: () => C(0x4fa3e0), oel: () => C(0xc98a1c),
  einlass: () => C(0x9fb3c8), auspuff: p => C(0x8d5a3b).multiplyScalar(1 + 0.1 * rausch(p.x * 5, p.y * 5, p.z * 5)),
  frisch: () => C(0x4fc3f7), verdichtet: () => C(0x7e57c2), brand: () => C(0xffa000), heiss: () => C(0xe65100), abgas: () => C(0x5d5047),
  pfeilE: () => C(0x29b6f6), pfeilA: () => C(0x9e9e9e), kraft: () => C(0xd50000), funke: () => C(0xfff176),
};
const MAT = {
  standard: {}, glanz: { metalness: 0.2, roughness: 0.35 },
  gas: { transparent: true, opacity: 0.72, roughness: 0.4, depthWrite: false },
  glut: { emissive: 0xff6d00, emissiveIntensity: 0.9, transparent: true, opacity: 0.85 },
  wasser: { transparent: true, opacity: 0.6, roughness: 0.2 }, oel: { transparent: true, opacity: 0.75, roughness: 0.2 },
  leucht: { emissive: 0xffffff, emissiveIntensity: 0.12 }, funke: { emissive: 0xffee58, emissiveIntensity: 1 },
};
const ART = { kolben: 'glanz', stahl: 'glanz', dunkelstahl: 'glanz', ventil: 'glanz', nocke: 'glanz', kerzenmetall: 'glanz', ring: 'glanz',
  frisch: 'gas', verdichtet: 'gas', abgas: 'gas', brand: 'glut', heiss: 'glut', wasser: 'wasser', oel: 'oel',
  pfeilE: 'leucht', pfeilA: 'leucht', kraft: 'leucht', funke: 'funke', marke: 'leucht' };
const cache = {};
const mat = art => cache[art] ||= new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.7, metalness: 0.15, name: art, ...MAT[art] });

function faerben(g, k) {
  if (g.attributes.color) return g;
  const P = g.attributes.position, f = FARBE[k], col = [], p = V(0, 0, 0);
  for (let i = 0; i < P.count; i++) { p.set(P.getX(i), P.getY(i), P.getZ(i)); const c = f(p); col.push(c.r, c.g, c.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); return g;
}
class Bau {
  constructor() { this.t = {}; }
  add(k, g, M) {
    if (g.attributes.uv) g.deleteAttribute('uv');
    if (M) g.applyMatrix4(M);
    faerben(g, k);
    const art = ART[k] || 'standard';
    (this.t[art] ||= []).push(g.index ? g : mergeVertices(g)); return this;
  }
  bauen(name) {
    const grp = new THREE.Group(); grp.name = name;
    for (const [art, gs] of Object.entries(this.t)) { const m = new THREE.Mesh(mergeGeometries(gs), mat(art)); m.name = name + '_' + art; grp.add(m); }
    return grp;
  }
}
const zyl = (r, h, seg = 32) => new THREE.CylinderGeometry(r, r, h, seg);
const zylZ = (r, z0, z1, seg = 32) => { const g = zyl(r, z1 - z0, seg); g.rotateX(Math.PI / 2); g.translate(0, 0, (z0 + z1) / 2); return g; };
const kasten = (x0, x1, y0, y1, z0, z1) => { const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return g; };
const M = (pos, q = new THREE.Quaternion()) => new THREE.Matrix4().compose(pos, q, V(1, 1, 1));
const qz = a => new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), a);

// ---------- Schnittberechnung: Außenflächen „alu“, Schnittflächen „schnitt“ ----------
const csg = new Evaluator(); csg.attributes = ['position', 'normal']; csg.useGroups = true;
const mNamen = {};
const pinsel = (g, k) => { g = g.index ? g : mergeVertices(g); if (g.attributes.uv) g.deleteAttribute('uv'); const m = mNamen[k] ||= new THREE.MeshBasicMaterial({ name: k }); const b = new Brush(g, m); b.updateMatrixWorld(); return b; };
function csgNach(b, brush, umbenennen = {}) {
  const g = brush.geometry.index ? brush.geometry.toNonIndexed() : brush.geometry;
  const mats = Array.isArray(brush.material) ? brush.material : [brush.material];
  const gruppen = brush.geometry.groups.length ? brush.geometry.groups : [{ start: 0, count: g.attributes.position.count, materialIndex: 0 }];
  for (const gr of gruppen) {
    const t = new THREE.BufferGeometry();
    for (const n of ['position', 'normal']) t.setAttribute(n, new THREE.BufferAttribute(g.attributes[n].array.slice(gr.start * 3, (gr.start + gr.count) * 3), 3));
    const k = mats[gr.materialIndex].name; b.add(umbenennen[k] || k, t);
  }
}
const vorneWeg = k => pinsel(kasten(-9, 9, -9, 20, 0, 9), k);   // alles vor z = 0 entfernen (Schnitt)

// ================= Bauteile =================
const motor = new THREE.Group(); motor.name = 'motor';

// --- Zylinderblock mit Bohrung und Kühlwassermantel ---
{
  const b = new Bau();
  let blk = pinsel(kasten(-1.65, 1.65, 1.2, DECKE, -1.65, 1.65), 'alu');
  blk = csg.evaluate(blk, pinsel((() => { const g = zyl(BOHRUNG, DECKE + 1, 48); g.translate(0, (DECKE + 1) / 2 + 0.6, 0); return g; })(), 'schnitt'), SUBTRACTION);
  const mantel = csg.evaluate(pinsel((() => { const g = zyl(1.38, DECKE - 2.2, 48); g.translate(0, (DECKE + 2.0) / 2, 0); return g; })(), 'schnitt'),
    pinsel((() => { const g = zyl(1.16, DECKE, 48); g.translate(0, DECKE / 2 + 1, 0); return g; })(), 'schnitt'), SUBTRACTION);
  blk = csg.evaluate(blk, mantel, SUBTRACTION);
  blk = csg.evaluate(blk, vorneWeg('schnitt'), SUBTRACTION);
  csgNach(b, blk);
  // Kühlwasser im Mantel (nur hintere Hälfte)
  const wasser = csg.evaluate(mantel, vorneWeg('wasser'), SUBTRACTION);
  csgNach(b, wasser, { schnitt: 'wasser' });
  // Kurbelgehäuse
  let kg = pinsel(kasten(-2.3, 2.3, -2.3, 1.2, -1.65, 1.65), 'guss');
  kg = csg.evaluate(kg, pinsel(kasten(-2.0, 2.0, -2.0, 1.5, -1.35, 1.35), 'schnitt'), SUBTRACTION);
  kg = csg.evaluate(kg, pinsel((() => { const g = zylZ(0.35, -3, 3); return g; })(), 'schnitt'), SUBTRACTION);
  kg = csg.evaluate(kg, vorneWeg('schnitt'), SUBTRACTION);
  csgNach(b, kg);
  b.add('oel', kasten(-1.98, 1.98, -1.98, -1.55, -1.33, -0.02));
  motor.add(b.bauen('block'));
}

// --- Zylinderkopf mit Kanälen, Ventildeckel, Zündkerze, Krümmer ---
const dirE = V(-Math.sin(NEIG), Math.cos(NEIG), 0), dirA = V(Math.sin(NEIG), Math.cos(NEIG), 0);
const sitzE = V(-SITZ_X, DECKE, 0), sitzA = V(SITZ_X, DECKE, 0);
const kanalE = [V(-SITZ_X, DECKE + 0.05, 0), V(-1.0, DECKE + 0.55, 0), V(-2.0, DECKE + 0.75, 0)];
const kanalA = kanalE.map(p => V(-p.x, p.y, 0));
function kanal(punkte, r) {
  const teile = [];
  for (let i = 0; i < punkte.length - 1; i++) {
    const a = punkte[i], c = punkte[i + 1], d = c.clone().sub(a), g = zyl(r, d.length() + r * 0.9, 32);
    g.applyMatrix4(M(a.clone().add(c).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize())));
    teile.push(g);
  }
  const s = new THREE.SphereGeometry(r, 24, 16); s.translate(punkte[1].x, punkte[1].y, 0); teile.push(s);
  return mergeGeometries(teile.map(t => { if (t.attributes.uv) t.deleteAttribute('uv'); return t.index ? t.toNonIndexed() : t; }));
}
{
  const b = new Bau();
  let kopf = pinsel(kasten(-1.65, 1.65, DECKE, KOPF_OBEN, -1.65, 1.65), 'alu');
  for (const k of [kanal(kanalE, 0.3), kanal(kanalA, 0.3)]) kopf = csg.evaluate(kopf, pinsel(k, 'schnitt'), SUBTRACTION);
  // Ventilführungen und Kerzenloch
  for (const [s, d] of [[sitzE, dirE], [sitzA, dirA]]) { const g = zyl(0.08, 3, 16); g.applyMatrix4(M(s.clone().addScaledVector(d, 1.5), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d))); kopf = csg.evaluate(kopf, pinsel(g, 'schnitt'), SUBTRACTION); }
  { const g = zyl(0.2, 3, 24); g.translate(0, DECKE + 1.4, 0); kopf = csg.evaluate(kopf, pinsel(g, 'schnitt'), SUBTRACTION); }
  kopf = csg.evaluate(kopf, vorneWeg('schnitt'), SUBTRACTION);
  csgNach(b, kopf);
  // Ventildeckel (hohl)
  let deckel = pinsel(kasten(-1.75, 1.75, KOPF_OBEN, DECKEL_OBEN, -1.65, 1.65), 'alu');
  deckel = csg.evaluate(deckel, pinsel(kasten(-1.55, 1.55, KOPF_OBEN - 0.1, DECKEL_OBEN - 0.18, -1.45, 1.45), 'schnitt'), SUBTRACTION);
  { const g = zyl(0.22, 1, 24); g.translate(0, DECKEL_OBEN, 0); deckel = csg.evaluate(deckel, pinsel(g, 'schnitt'), SUBTRACTION); }
  deckel = csg.evaluate(deckel, vorneWeg('schnitt'), SUBTRACTION);
  csgNach(b, deckel);
  // Zündkerze
  const kz = new Bau();
  kz.add('kerzenmetall', (() => { const g = zyl(0.17, 0.9, 20); g.translate(0, DECKE + 0.45, 0); return g; })());
  kz.add('kerzenmetall', (() => { const g = new THREE.CylinderGeometry(0.28, 0.28, 0.3, 6); g.translate(0, DECKE + 1.1, 0); return g; })());
  kz.add('keramik', (() => { const g = new THREE.CylinderGeometry(0.12, 0.16, 1.4, 20); g.translate(0, DECKE + 1.9, 0); return g; })());
  kz.add('kerzenmetall', (() => { const g = zyl(0.07, 0.35, 12); g.translate(0, DECKE + 2.7, 0); return g; })());
  kz.add('kerzenmetall', (() => { const g = kasten(-0.03, 0.12, DECKE - 0.12, DECKE, -0.03, 0.03); return g; })());
  for (const [art, gs] of Object.entries(kz.t)) (b.t[art] ||= []).push(...gs);
  // Ansaugrohr und Auspuffkrümmer (hintere Hälfte, damit die Strömung sichtbar bleibt)
  const rohr = (p0, p1, r, k) => { const d = p1.clone().sub(p0); const g = new THREE.CylinderGeometry(r, r, d.length(), 32, 1, true, Math.PI / 2, Math.PI); g.applyMatrix4(M(p0.clone().add(p1).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize()))); const g2 = g.clone(); g2.scale(0.999, 0.999, 0.999); return [g, g2]; };
  for (const g of rohr(V(-1.6, DECKE + 0.75, 0), V(-3.4, DECKE + 0.75, 0), 0.34, 'einlass')) b.add('einlass', g);
  for (const g of rohr(V(1.6, DECKE + 0.75, 0), V(3.0, DECKE + 0.75, 0), 0.34, 'auspuff')) b.add('auspuff', g);
  for (const g of rohr(V(2.95, DECKE + 0.75, 0), V(3.6, DECKE - 0.3, 0), 0.34, 'auspuff')) b.add('auspuff', g);
  // Luftfilterkasten am Einlass
  b.add('guss', kasten(-4.3, -3.4, DECKE + 0.2, DECKE + 1.3, -0.8, 0.0));
  motor.add(b.bauen('kopf'));
}
// Innenseiten der offenen Rohre doppelseitig darstellen
for (const art of ['standard']) cache[art] && (cache[art].side = THREE.DoubleSide);

// --- Kurbelwelle mit Schwungrad ---
{
  const b = new Bau();
  b.add('dunkelstahl', zylZ(0.34, -2.7, 1.9, 32));                                        // Hauptlager-Zapfen
  for (const z of [-0.55, 0.55]) {                                                          // Kurbelwangen mit Gegengewicht
    const f = new THREE.Shape(); f.absarc(0, 0, 0.62, 0, Math.PI * 2, false);
    const w = new THREE.Shape(); w.moveTo(-0.45, 0); w.lineTo(-0.4, R); w.absarc(0, R, 0.4, Math.PI, 0, true); w.lineTo(0.45, 0);
    w.absarc(0, 0, 0.95, 0, -Math.PI, true);
    const g = new THREE.ExtrudeGeometry(w, { depth: 0.26, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2, curveSegments: 24 });
    g.translate(0, 0, z - 0.13); b.add('stahl', g);
  }
  { const g = zylZ(0.27, -0.45, 0.45, 32); g.translate(0, R, 0); b.add('dunkelstahl', g); }   // Hubzapfen
  { const g = zylZ(2.0, -2.75, -2.4, 64); b.add('schwung', g); }                           // Schwungrad
  { const g = zylZ(2.03, -2.72, -2.43, 64); g.scale(1, 1, 1); b.add('dunkelstahl', new THREE.TorusGeometry(2.0, 0.06, 8, 96).translate(0, 0, -2.4)); }
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; const g = zylZ(0.28, -2.42, -2.38, 20); g.translate(1.25 * Math.cos(a), 1.25 * Math.sin(a), 0); b.add('dunkelstahl', g); }
  b.add('marke', kasten(-0.12, 0.12, 1.3, 1.95, -2.39, -2.36));                             // Markierung: zeigt die Drehung
  motor.add(b.bauen('kurbelwelle'));
}
// --- Pleuel (Ursprung am Kolbenbolzen, zeigt nach unten) ---
{
  const b = new Bau();
  const auge = (r, ri, y, dz) => { const s = new THREE.Shape(); s.absarc(0, 0, r, 0, Math.PI * 2, false); const h = new THREE.Path(); h.absarc(0, 0, ri, 0, Math.PI * 2, true); s.holes.push(h); const g = new THREE.ExtrudeGeometry(s, { depth: dz, bevelEnabled: false, curveSegments: 28 }); g.translate(0, y, -dz / 2); return g; };
  b.add('stahl', auge(0.3, 0.14, 0, 0.42));
  b.add('stahl', auge(0.5, 0.28, -L, 0.4));
  b.add('stahl', kasten(-0.13, 0.13, -L + 0.45, -0.25, -0.12, 0.12));
  b.add('stahl', kasten(-0.2, 0.2, -L + 0.45, -0.25, -0.2, -0.13)); b.add('stahl', kasten(-0.2, 0.2, -L + 0.45, -0.25, 0.13, 0.2));
  motor.add(b.bauen('pleuel'));
}
// --- Kolben mit Ringen und Bolzen (Ursprung am Bolzen) ---
{
  const b = new Bau();
  let k = pinsel((() => { const g = zyl(BOHRUNG - 0.03, KOLBEN_OBEN + KOLBEN_UNTEN, 48); g.translate(0, (KOLBEN_OBEN - KOLBEN_UNTEN) / 2, 0); return g; })(), 'kolben');
  k = csg.evaluate(k, pinsel((() => { const g = zyl(BOHRUNG - 0.18, KOLBEN_OBEN + KOLBEN_UNTEN, 40); g.translate(0, (KOLBEN_OBEN - KOLBEN_UNTEN) / 2 - 0.35, 0); return g; })(), 'kolben'), SUBTRACTION);
  csgNach(b, k);
  for (const y of [0.78, 0.62, 0.46]) b.add('ring', new THREE.TorusGeometry(BOHRUNG - 0.03, 0.035, 8, 48).rotateX(Math.PI / 2).translate(0, y, 0));
  b.add('dunkelstahl', zylZ(0.14, -0.8, 0.8, 20));
  motor.add(b.bauen('kolben'));
}
// --- Ventile (Ursprung am Ventilsitz, bewegen sich entlang der Achse) mit Federteller ---
function ventil(name, d) {
  const b = new Bau(), q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d);
  const teller = new THREE.CylinderGeometry(0.26, 0.36, 0.1, 32); teller.translate(0, -0.03, 0); b.add('ventil', teller, M(V(0, 0, 0), q));
  const schaft = zyl(0.065, 2.0, 12); schaft.translate(0, 1.0, 0); b.add('ventil', schaft, M(V(0, 0, 0), q));
  const ft = zyl(0.2, 0.06, 20); ft.translate(0, 1.72, 0); b.add('stahl', ft, M(V(0, 0, 0), q));        // Federteller
  const tassen = zyl(0.24, 0.2, 24); tassen.translate(0, 1.92, 0); b.add('stahl', tassen, M(V(0, 0, 0), q));  // Tassenstößel
  const n = b.bauen(name); return n;
}
const vE = ventil('ventil_e', dirE); vE.position.copy(sitzE); motor.add(vE);
const vA = ventil('ventil_a', dirA); vA.position.copy(sitzA); motor.add(vA);
// --- Ventilfedern: Halter (fest, geneigt) + Feder (wird zusammengedrückt) ---
const FEDER_UNTEN = 1.12, FEDER_LAENGE = 0.6;
function feder(name, sitz, d) {
  const halter = new THREE.Group(); halter.name = name + '_halter';
  halter.position.copy(sitz.clone().addScaledVector(d, FEDER_UNTEN)); halter.quaternion.setFromUnitVectors(V(0, 1, 0), d);
  const pts = []; for (let i = 0; i <= 160; i++) { const a = i / 160 * Math.PI * 2 * 6; pts.push(V(0.17 * Math.cos(a), i / 160 * FEDER_LAENGE, 0.17 * Math.sin(a))); }
  const b = new Bau(); b.add('feder', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 320, 0.028, 6));
  halter.add(b.bauen(name)); motor.add(halter);
}
feder('feder_e', sitzE, dirE); feder('feder_a', sitzA, dirA);
// --- Nockenwellen (drehen mit halber Drehzahl) ---
const NOCKE_ABST = 2.02 + 0.28 + 0.02;
function nockenwelle(name, sitz, d) {
  const b = new Bau();
  const s = new THREE.Shape(); const n = 48;
  for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2; const hub = 0.3 * Math.pow(Math.max(0, Math.cos(a)), 2.2); const r = 0.28 + hub; const x = -r * Math.sin(a), y = r * Math.cos(a); i ? s.lineTo(x, y) : s.moveTo(x, y); }
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.36, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 }); g.translate(0, 0, -0.18); b.add('nocke', g);
  b.add('dunkelstahl', zylZ(0.15, -1.6, 0.4, 20));
  const k = b.bauen(name); k.position.copy(sitz.clone().addScaledVector(d, NOCKE_ABST)); motor.add(k);
}
nockenwelle('nocke_e', sitzE, dirE); nockenwelle('nocke_a', sitzA, dirA);

// --- Gasfüllung im Zylinder: je Zustand ein Körper (hintere Hälfte + Schnittfläche), Höhe 1, Boden bei y = 0 ---
function gas(name, k) {
  const b = new Bau(), r = BOHRUNG - 0.02;
  const g = new THREE.CylinderGeometry(r, r, 1, 40, 1, false, Math.PI / 2, Math.PI); g.translate(0, 0.5, 0); b.add(k, g);
  b.add(k, kasten(-r, r, 0, 1, -0.005, 0.0));
  motor.add(b.bauen(name));
}
for (const [n, k] of [['gas_frisch', 'frisch'], ['gas_verdichtet', 'verdichtet'], ['gas_brand', 'brand'], ['gas_heiss', 'heiss'], ['gas_abgas', 'abgas']]) gas(n, k);
// --- Zündfunke ---
{ const b = new Bau(); const st = new THREE.Shape(); for (let i = 0; i <= 16; i++) { const a = i / 16 * Math.PI * 2, r = i % 2 ? 0.14 : 0.42; i ? st.lineTo(r * Math.cos(a), r * Math.sin(a)) : st.moveTo(r * Math.cos(a), r * Math.sin(a)); }
  b.add('funke', new THREE.ExtrudeGeometry(st, { depth: 0.04, bevelEnabled: false })); const n = b.bauen('funke'); n.position.set(0.05, DECKE - 0.2, 0.08); motor.add(n); }
// --- Pfeile ---
function blockpfeil(k, len = 0.7, breite = 0.14) {
  const sp = 0.28, s = [[-len / 2, -breite / 2], [len / 2 - sp, -breite / 2], [len / 2 - sp, -breite * 1.4], [len / 2, 0], [len / 2 - sp, breite * 1.4], [len / 2 - sp, breite / 2], [-len / 2, breite / 2]];
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(s.map(([a, c]) => new THREE.Vector2(a, c))), { depth: 0.06, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1 });
  return new Bau().add(k, g);
}
for (let i = 0; i < 3; i++) { motor.add(blockpfeil('pfeilE').bauen('stroemung_e' + i)); motor.add(blockpfeil('pfeilA').bauen('stroemung_a' + i)); }
{ const b = blockpfeil('kraft', 1.1, 0.26); const n = b.bauen('kraftpfeil'); motor.add(n); }
// Drehrichtungspfeil am Schwungrad
{ const b = new Bau(); const pts = []; for (let i = 0; i <= 30; i++) { const a = Math.PI * 0.35 - i / 30 * Math.PI * 0.6; pts.push(V(2.35 * Math.cos(a), 2.35 * Math.sin(a), -2.57)); }
  b.add('marke', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.06, 8));
  const e = pts[pts.length - 1], t = pts[pts.length - 1].clone().sub(pts[pts.length - 2]).normalize(); const kg = new THREE.ConeGeometry(0.16, 0.36, 16); kg.translate(0, 0.18, 0); b.add('marke', kg, M(e, new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), t)));
  motor.add(b.bauen('drehpfeil')); }

// ================= Kinematik & Steuerzeiten =================
const hubY = th => R * Math.cos(th) + Math.sqrt(L * L - Math.pow(R * Math.sin(th), 2));     // Kolbenbolzen-Höhe
const pleuelWinkel = th => Math.atan2(R * Math.sin(th), hubY(th) - R * Math.cos(th));
const fenster = (g, a, b) => (g >= a && g <= b) ? Math.pow(Math.sin(Math.PI * (g - a) / (b - a)), 1.6) : 0;
const HUB_V = 0.3;
const liftE = g => HUB_V * fenster(((g % 720) + 720) % 720, 0, 200);          // Einlass offen: Ansaugtakt
const liftA = g => HUB_V * fenster(((g % 720) + 720) % 720, 520, 720);        // Auslass offen: Ausstoßtakt
const PEAK_E = 100, PEAK_A = 620;

function zustand(grad) {
  const th = rad(grad), g = ((grad % 720) + 720) % 720, yp = hubY(th), krone = yp + KOLBEN_OBEN, hoehe = DECKE - krone;
  const z = {};
  z.kurbel = qz(-th);
  z.pleuelPos = V(0, yp, 0); z.pleuelRot = qz(pleuelWinkel(th));
  z.kolben = V(0, yp, 0);
  z.ventilE = sitzE.clone().addScaledVector(dirE, -liftE(grad)); z.ventilA = sitzA.clone().addScaledVector(dirA, -liftA(grad));
  z.federE = (FEDER_LAENGE - liftE(grad)) / FEDER_LAENGE; z.federA = (FEDER_LAENGE - liftA(grad)) / FEDER_LAENGE;
  z.nockeE = qz(Math.PI + NEIG + rad(PEAK_E - grad) / 2); z.nockeA = qz(Math.PI - NEIG + rad(PEAK_A - grad) / 2);
  const an = (a, b) => g >= a && g < b;
  z.gas = { gas_frisch: an(0, 180), gas_verdichtet: an(180, 352), gas_brand: an(352, 430), gas_heiss: an(430, 540), gas_abgas: an(540, 720) };
  z.gasPos = V(0, krone, 0); z.gasHoehe = Math.max(0.01, hoehe);
  z.funke = (g >= 344 && g <= 362) ? 1 + 0.3 * Math.sin(g * 1.3) : 0.001;
  z.kraft = an(365, 520) ? 1 : 0.001; z.kraftPos = V(0, krone + Math.min(hoehe, 1.2) * 0.5 + 0.2, 0.12);
  // Strömungspfeile: durch den Kanal in den Zylinder (Einlass) bzw. hinaus (Auslass)
  const pfadE = [kanalE[2].clone().add(V(-1.3, 0, 0)), kanalE[2], kanalE[1], kanalE[0], V(-0.3, DECKE - 0.8, 0)];
  const pfadA = [V(0.3, DECKE - 0.8, 0), kanalA[0], kanalA[1], kanalA[2], kanalA[2].clone().add(V(1.3, 0, 0))];
  const kE = new THREE.CatmullRomCurve3(pfadE), kA = new THREE.CatmullRomCurve3(pfadA);
  z.stroemung = [];
  for (let i = 0; i < 3; i++) {
    for (const [name, kurve, a, b] of [['stroemung_e' + i, kE, 10, 190], ['stroemung_a' + i, kA, 530, 710]]) {
      const aktiv = g >= a && g <= b, u = ((((g - a) / (b - a)) * 2 + i / 3) % 1 + 1) % 1;
      const p = kurve.getPoint(u).add(V(0, 0, 0.1)), t = kurve.getTangent(u);
      z.stroemung.push({ name, p, q: qz(Math.atan2(t.y, t.x)), s: aktiv && u > 0.04 && u < 0.96 ? 1 : 0.001 });
    }
  }
  return z;
}

function baueClip(name, von, bis, dauer, pause = 0) {
  const T = [], Z = [], schritte = Math.round((bis - von) / 3);
  for (let i = 0; i <= schritte; i++) { T.push(dauer * i / schritte); Z.push(zustand(von + (bis - von) * i / schritte)); }
  if (pause > 0) { T.push(dauer + pause); Z.push(zustand(bis)); }
  const spur = [];
  const v = (n, f) => spur.push(new THREE.VectorKeyframeTrack(n + '.position', T, Z.flatMap(z => f(z).toArray())));
  const q = (n, f) => spur.push(new THREE.QuaternionKeyframeTrack(n + '.quaternion', T, Z.flatMap(z => f(z).toArray())));
  const s = (n, f) => spur.push(new THREE.VectorKeyframeTrack(n + '.scale', T, Z.flatMap(z => { const w = f(z); return Array.isArray(w) ? w : [w, w, w]; })));
  q('kurbelwelle', z => z.kurbel);
  v('pleuel', z => z.pleuelPos); q('pleuel', z => z.pleuelRot);
  v('kolben', z => z.kolben);
  v('ventil_e', z => z.ventilE); v('ventil_a', z => z.ventilA);
  s('feder_e', z => [1, z.federE, 1]); s('feder_a', z => [1, z.federA, 1]);
  q('nocke_e', z => z.nockeE); q('nocke_a', z => z.nockeA);
  for (const n of ['gas_frisch', 'gas_verdichtet', 'gas_brand', 'gas_heiss', 'gas_abgas']) {
    v(n, z => z.gasPos); s(n, z => z.gas[n] ? [1, z.gasHoehe, 1] : [0.001, 0.001, 0.001]);
  }
  s('funke', z => z.funke);
  v('kraftpfeil', z => z.kraftPos); q('kraftpfeil', () => qz(-Math.PI / 2)); s('kraftpfeil', z => z.kraft);
  for (let i = 0; i < 6; i++) {
    const n = Z[0].stroemung[i].name;
    v(n, z => z.stroemung[i].p); q(n, z => z.stroemung[i].q); s(n, z => z.stroemung[i].s);
  }
  return new THREE.AnimationClip(name, T[T.length - 1], spur);
}
const clips = [
  baueClip('viertakt', 0, 720, 12),
  baueClip('ansaugen', 0, 180, 4, 1), baueClip('verdichten', 180, 360, 4, 1),
  baueClip('arbeiten', 360, 540, 4, 1), baueClip('ausstossen', 540, 720, 4, 1),
];
// Startlage = Beginn des Ansaugtakts
{ const z = zustand(0); motor.getObjectByName('kurbelwelle').quaternion.copy(z.kurbel); const p = motor.getObjectByName('pleuel'); p.position.copy(z.pleuelPos); p.quaternion.copy(z.pleuelRot); motor.getObjectByName('kolben').position.copy(z.kolben); }

const root = new THREE.Group(); root.name = 'viertaktmotor'; root.add(motor);
const scene = new THREE.Scene(); scene.add(root);
const glb = await new GLTFExporter().parseAsync(scene, { binary: true, animations: clips });
const out = (process.argv[2] || '.') + '/viertaktmotor.glb';
fs.writeFileSync(out, Buffer.from(glb));
console.log(out, (fs.statSync(out).size / 1024).toFixed(0), 'KB | Clips:', clips.map(c => `${c.name}(${c.duration}s, ${c.tracks.length})`).join(' '));
