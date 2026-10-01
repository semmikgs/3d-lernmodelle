// Erzeugt modelle/zweitaktmotor.glb – aufgeschnittener Zweitakt-Ottomotor (Kurbelkastenspülung) mit Animation.
// Aufruf: node zweitaktmotor.mjs <Ausgabeordner>
// (Grundgerüst und Bauteile wie quellen/viertaktmotor.mjs)
// benötigt: npm i three ; npm i --legacy-peer-deps three-bvh-csg three-mesh-bvh
// Oberste Gruppe "motor"; Clips: zweitakt (ganzes Arbeitsspiel), aufwaerts (1. Takt), abwaerts (2. Takt).
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

// ================= Bauteile (Zweitakt) =================
FARBE.vergaser = () => C(0x5f6b78); FARBE.filter = () => C(0x37474f); FARBE.kgFrisch = () => C(0x81d4fa); FARBE.kgDicht = () => C(0x2196f3);
ART.kgFrisch = 'gas'; ART.kgDicht = 'gas';
const motor = new THREE.Group(); motor.name = 'motor';

// Lage der Steuerschlitze in der Zylinderwand (y-Bereiche)
const AUSLASS = [3.12, 4.05], UEBER = [3.12, 3.62], EINLASS = [2.2, 2.75];

// --- Zylinder mit Schlitzen, Überströmkanal und Kühlrippen ---
{
  const b = new Bau();
  let blk = pinsel(kasten(-1.65, 1.65, 1.2, DECKE, -1.65, 1.65), 'alu');
  blk = csg.evaluate(blk, pinsel((() => { const g = zyl(BOHRUNG, DECKE + 1, 48); g.translate(0, (DECKE + 1) / 2 + 0.6, 0); return g; })(), 'schnitt'), SUBTRACTION);
  for (const g of [
    kasten(0.8, 2.0, AUSLASS[0], AUSLASS[1], -0.55, 0.55),          // Auslassschlitz + Kanal (rechts oben)
    kasten(0.8, 2.0, EINLASS[0], EINLASS[1], -0.45, 0.45),          // Einlassschlitz (rechts unten)
    kasten(-1.48, -1.12, 0.9, UEBER[1], -0.5, 0.5),                 // Überströmkanal (links, senkrecht)
    kasten(-1.48, -0.8, UEBER[0], UEBER[1], -0.5, 0.5),             // Überströmschlitz
  ]) blk = csg.evaluate(blk, pinsel(g, 'schnitt'), SUBTRACTION);
  blk = csg.evaluate(blk, vorneWeg('schnitt'), SUBTRACTION);
  csgNach(b, blk);
  // Kühlrippen (Luftkühlung)
  for (let y = 3.0; y < DECKE - 0.05; y += 0.3) b.add('alu', kasten(-2.35, -1.65, y, y + 0.1, -1.65, 0));
  for (let y = 4.35; y < DECKE - 0.05; y += 0.3) b.add('alu', kasten(1.65, 2.35, y, y + 0.1, -1.65, 0));
  for (let y = 1.35; y < 2.05; y += 0.3) b.add('alu', kasten(1.65, 2.35, y, y + 0.1, -1.65, 0));
  // Kurbelgehäuse (klein und dicht: hier wird das Frischgas vorverdichtet)
  let kg = pinsel(kasten(-2.0, 2.0, -1.95, 1.2, -1.65, 1.65), 'guss');
  kg = csg.evaluate(kg, pinsel(kasten(-1.6, 1.6, -1.6, 1.4, -1.3, 1.3), 'schnitt'), SUBTRACTION);
  kg = csg.evaluate(kg, pinsel(zylZ(0.35, -3, 3), 'schnitt'), SUBTRACTION);
  kg = csg.evaluate(kg, vorneWeg('schnitt'), SUBTRACTION);
  csgNach(b, kg);
  motor.add(b.bauen('block'));
}
// --- Zylinderkopf mit Rippen und Zündkerze ---
{
  const b = new Bau();
  let kopf = pinsel(kasten(-1.65, 1.65, DECKE, DECKE + 0.9, -1.65, 1.65), 'alu');
  { const g = zyl(0.2, 3, 24); g.translate(0, DECKE + 1.4, 0); kopf = csg.evaluate(kopf, pinsel(g, 'schnitt'), SUBTRACTION); }
  kopf = csg.evaluate(kopf, vorneWeg('schnitt'), SUBTRACTION);
  csgNach(b, kopf);
  for (let i = 0; i < 4; i++) { const y = DECKE + 1.0 + i * 0.28, w = 1.95 - i * 0.18; b.add('alu', kasten(-w, -0.32, y, y + 0.1, -1.65, 0)); b.add('alu', kasten(0.32, w, y, y + 0.1, -1.65, 0)); }
  const kz = new Bau();
  kz.add('kerzenmetall', (() => { const g = zyl(0.17, 0.9, 20); g.translate(0, DECKE + 0.45, 0); return g; })());
  kz.add('kerzenmetall', (() => { const g = new THREE.CylinderGeometry(0.28, 0.28, 0.3, 6); g.translate(0, DECKE + 1.1, 0); return g; })());
  kz.add('keramik', (() => { const g = new THREE.CylinderGeometry(0.12, 0.16, 1.4, 20); g.translate(0, DECKE + 1.9, 0); return g; })());
  kz.add('kerzenmetall', (() => { const g = zyl(0.07, 0.35, 12); g.translate(0, DECKE + 2.7, 0); return g; })());
  kz.add('kerzenmetall', kasten(-0.03, 0.12, DECKE - 0.12, DECKE, -0.03, 0.03));
  for (const [art, gs] of Object.entries(kz.t)) (b.t[art] ||= []).push(...gs);
  motor.add(b.bauen('kopf'));
}
// --- Ansaugrohr mit Vergaser und Luftfilter, Resonanzauspuff ---
{
  const b = new Bau();
  const halbRohr = (p0, p1, r, k) => { const d = p1.clone().sub(p0); const g = new THREE.CylinderGeometry(r, r, d.length(), 32, 1, true, Math.PI / 2, Math.PI); g.applyMatrix4(M(p0.clone().add(p1).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize()))); b.add(k, g); };
  const yE = (EINLASS[0] + EINLASS[1]) / 2, yA = (AUSLASS[0] + AUSLASS[1]) / 2;
  halbRohr(V(1.65, yE, 0), V(2.75, yE, 0), 0.27, 'einlass');
  b.add('vergaser', kasten(2.75, 3.45, yE - 0.55, yE + 0.6, -0.55, 0));     // Vergaser
  b.add('vergaser', kasten(2.85, 3.35, yE + 0.6, yE + 1.05, -0.4, 0));      // Schwimmerkammer-Deckel
  b.add('filter', kasten(3.45, 4.25, yE - 0.75, yE + 0.75, -0.8, 0));       // Luftfilter
  halbRohr(V(1.65, yA, 0), V(2.6, yA, 0), 0.4, 'auspuff');
  // Resonanzauspuff: aufgeweiteter, zur Seite abfallender Topf (hintere Hälfte, innen sichtbar)
  const profil = [[0.4, 0], [0.5, 0.45], [0.66, 0.95], [0.7, 1.45], [0.55, 2.0], [0.3, 2.4], [0.22, 2.8]].map(([r, y]) => new THREE.Vector2(r, y));
  const topf = new THREE.LatheGeometry(profil, 40, Math.PI / 2, Math.PI);
  topf.applyMatrix4(M(V(2.6, yA, 0), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), V(1, 0.3, 0).normalize())));
  b.add('auspuff', topf);
  motor.add(b.bauen('rohre'));
}
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
{ const b = blockpfeil('kraft', 1.1, 0.26); const n = b.bauen('kraftpfeil'); motor.add(n); }
// Drehrichtungspfeil am Schwungrad
{ const b = new Bau(); const pts = []; for (let i = 0; i <= 30; i++) { const a = Math.PI * 0.35 - i / 30 * Math.PI * 0.6; pts.push(V(2.35 * Math.cos(a), 2.35 * Math.sin(a), -2.57)); }
  b.add('marke', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.06, 8));
  const e = pts[pts.length - 1], t = pts[pts.length - 1].clone().sub(pts[pts.length - 2]).normalize(); const kg = new THREE.ConeGeometry(0.16, 0.36, 16); kg.translate(0, 0.18, 0); b.add('marke', kg, M(e, new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), t)));
  motor.add(b.bauen('drehpfeil')); }

// --- Frischgas im Kurbelgehäuse und Überströmkanal (hintere Hälfte); hell = angesaugt, kräftig = vorverdichtet ---
for (const [name, k] of [['kgas_frisch', 'kgFrisch'], ['kgas_dicht', 'kgDicht']]) {
  const b = new Bau();
  b.add(k, kasten(-1.58, 1.58, -1.58, 1.2, -1.28, -0.01));
  b.add(k, kasten(-1.46, -1.14, 1.2, UEBER[1], -0.48, -0.01));
  motor.add(b.bauen(name));
}
// Frischgas unter dem Kolben im Zylinder (Höhe wechselt mit dem Kolben): Boden bei y = 1.2, Höhe 1
for (const [name, k] of [['ugas_frisch', 'kgFrisch'], ['ugas_dicht', 'kgDicht']]) {
  const b = new Bau(), r = BOHRUNG - 0.02;
  const g = new THREE.CylinderGeometry(r, r, 1, 40, 1, false, Math.PI / 2, Math.PI); g.translate(0, 0.5, 0); b.add(k, g);
  b.add(k, kasten(-r, r, 0, 1, -0.005, 0.0));
  const n = b.bauen(name); n.position.y = 1.2; motor.add(n);
}
for (let i = 0; i < 3; i++) {
  motor.add(blockpfeil('pfeilE').bauen('pfeil_einlass' + i));
  motor.add(blockpfeil('pfeilE').bauen('pfeil_ueber' + i));
  motor.add(blockpfeil('pfeilA').bauen('pfeil_auslass' + i));
}

// ================= Kinematik & Steuerzeiten (aus der Geometrie) =================
const hubY = th => R * Math.cos(th) + Math.sqrt(L * L - Math.pow(R * Math.sin(th), 2));
const pleuelWinkel = th => Math.atan2(R * Math.sin(th), hubY(th) - R * Math.cos(th));
const krone = th => hubY(th) + KOLBEN_OBEN, schaft = th => hubY(th) - KOLBEN_UNTEN;
const winkelBei = (f, ziel) => { for (let g = 0; g <= 180; g += 0.25) if (f(rad(g)) <= ziel) return g; return 180; };
const AUS_AUF = winkelBei(krone, AUSLASS[1]);               // Auslass öffnet (nach OT)
const UEB_AUF = winkelBei(krone, UEBER[1]);                 // Überströmen öffnet
const EIN_ZU = winkelBei(schaft, EINLASS[1]);             // Einlass schließt (Kolbenschaft verdeckt den Schlitz)
console.log(`Steuerzeiten: Auslass ${AUS_AUF.toFixed(0)}°–${(360 - AUS_AUF).toFixed(0)}°, Überströmen ${UEB_AUF.toFixed(0)}°–${(360 - UEB_AUF).toFixed(0)}°, Einlass ${(360 - EIN_ZU).toFixed(0)}°–${EIN_ZU.toFixed(0)}°`);

const pfadE = new THREE.CatmullRomCurve3([V(4.1, 2.475, 0), V(2.9, 2.475, 0), V(1.6, 2.475, 0), V(0.75, 2.3, 0), V(0.35, 1.4, 0), V(0.5, 0.2, 0)]);
const pfadU = new THREE.CatmullRomCurve3([V(-0.8, 0.0, 0), V(-1.3, 0.9, 0), V(-1.3, 2.5, 0), V(-1.15, 3.4, 0), V(-0.6, 3.75, 0), V(-0.1, 4.6, 0)]);
const pfadA = new THREE.CatmullRomCurve3([V(-0.3, 4.4, 0), V(0.4, 3.75, 0), V(1.3, 3.58, 0), V(2.5, 3.6, 0), V(3.6, 3.93, 0), V(5.0, 4.35, 0)]);

function zustand(grad) {
  const th = rad(grad), g = ((grad % 360) + 360) % 360, yp = hubY(th), k = krone(th), s = schaft(th);
  const z = {};
  z.kurbel = qz(-th); z.pleuelPos = V(0, yp, 0); z.pleuelRot = qz(pleuelWinkel(th)); z.kolben = V(0, yp, 0);
  const ausOffen = k < AUSLASS[1], uebOffen = k < UEBER[1], einOffen = s > EINLASS[1];
  const an = (a, b) => g >= a && g < b;
  // Zustand über dem Kolben
  z.gas = {
    gas_brand: g >= 345 || g < 22, gas_heiss: an(22, AUS_AUF), gas_abgas: an(AUS_AUF, UEB_AUF),
    gas_frisch: an(UEB_AUF, 240), gas_verdichtet: an(240, 345),
  };
  z.gasPos = V(0, k, 0); z.gasHoehe = Math.max(0.01, DECKE - k);
  // Zustand unter dem Kolben: vorverdichtet, solange der Kolben abwärts läuft und der Einlass zu ist
  const dicht = an(EIN_ZU, 180);
  z.kgas = { kgas_frisch: !dicht, kgas_dicht: dicht, ugas_frisch: !dicht, ugas_dicht: dicht };
  z.ugasHoehe = Math.max(0.01, s - 1.2);
  z.funke = (g >= 338 && g <= 356) ? 1 + 0.3 * Math.sin(g * 1.3) : 0.001;
  z.kraft = an(6, AUS_AUF - 4) ? 1 : 0.001; z.kraftPos = V(0, k + Math.min(DECKE - k, 1.2) * 0.5 + 0.2, 0.12);
  z.pfeile = [];
  const lauf = (name, kurve, aktiv, i, tempo) => {
    const u = ((g / 360 * tempo + i / 3) % 1 + 1) % 1, p = kurve.getPoint(u).add(V(0, 0, 0.1)), t = kurve.getTangent(u);
    z.pfeile.push({ name, p, q: qz(Math.atan2(t.y, t.x)), s: aktiv && u > 0.05 && u < 0.95 ? 1 : 0.001 });
  };
  for (let i = 0; i < 3; i++) {
    lauf('pfeil_einlass' + i, pfadE, einOffen, i, 7);
    lauf('pfeil_ueber' + i, pfadU, uebOffen, i, 9);
    lauf('pfeil_auslass' + i, pfadA, ausOffen, i, 8);
  }
  return z;
}

function baueClip(name, von, bis, dauer, pause = 0) {
  const T = [], Z = [], schritte = Math.round((bis - von) / 2);
  for (let i = 0; i <= schritte; i++) { T.push(dauer * i / schritte); Z.push(zustand(von + (bis - von) * i / schritte)); }
  if (pause > 0) { T.push(dauer + pause); Z.push(zustand(bis)); }
  const spur = [];
  const v = (n, f) => spur.push(new THREE.VectorKeyframeTrack(n + '.position', T, Z.flatMap(z => f(z).toArray())));
  const q = (n, f) => spur.push(new THREE.QuaternionKeyframeTrack(n + '.quaternion', T, Z.flatMap(z => f(z).toArray())));
  const s = (n, f) => spur.push(new THREE.VectorKeyframeTrack(n + '.scale', T, Z.flatMap(z => { const w = f(z); return Array.isArray(w) ? w : [w, w, w]; })));
  q('kurbelwelle', z => z.kurbel);
  v('pleuel', z => z.pleuelPos); q('pleuel', z => z.pleuelRot);
  v('kolben', z => z.kolben);
  for (const n of ['gas_frisch', 'gas_verdichtet', 'gas_brand', 'gas_heiss', 'gas_abgas']) { v(n, z => z.gasPos); s(n, z => z.gas[n] ? [1, z.gasHoehe, 1] : [0.001, 0.001, 0.001]); }
  for (const n of ['kgas_frisch', 'kgas_dicht']) s(n, z => z.kgas[n] ? 1 : 0.001);
  for (const n of ['ugas_frisch', 'ugas_dicht']) s(n, z => z.kgas[n] ? [1, z.ugasHoehe, 1] : [0.001, 0.001, 0.001]);
  s('funke', z => z.funke);
  v('kraftpfeil', z => z.kraftPos); q('kraftpfeil', () => qz(-Math.PI / 2)); s('kraftpfeil', z => z.kraft);
  Z[0].pfeile.forEach((p0, i) => { v(p0.name, z => z.pfeile[i].p); q(p0.name, z => z.pfeile[i].q); s(p0.name, z => z.pfeile[i].s); });
  return new THREE.AnimationClip(name, T[T.length - 1], spur);
}
// Arbeitsspiel beginnt am unteren Totpunkt: 1. Takt aufwärts, 2. Takt abwärts
const clips = [baueClip('zweitakt', 180, 540, 9), baueClip('aufwaerts', 180, 360, 4.5, 1), baueClip('abwaerts', 360, 540, 4.5, 1)];
{ const z = zustand(180); motor.getObjectByName('kurbelwelle').quaternion.copy(z.kurbel); const p = motor.getObjectByName('pleuel'); p.position.copy(z.pleuelPos); p.quaternion.copy(z.pleuelRot); motor.getObjectByName('kolben').position.copy(z.kolben); }

const root = new THREE.Group(); root.name = 'zweitaktmotor'; root.add(motor);
const scene = new THREE.Scene(); scene.add(root);
const glb = await new GLTFExporter().parseAsync(scene, { binary: true, animations: clips });
const out = (process.argv[2] || '.') + '/zweitaktmotor.glb';
fs.writeFileSync(out, Buffer.from(glb));
console.log(out, (fs.statSync(out).size / 1024).toFixed(0), 'KB | Clips:', clips.map(c => `${c.name}(${c.duration}s, ${c.tracks.length})`).join(' '));
