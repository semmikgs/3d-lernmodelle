// Erzeugt modelle/plattentektonik.glb – Blockbilder mit Animationen (Klasse 6).
// Aufruf: node plattentektonik.mjs <Ausgabeordner>
// benötigt: npm i three ; npm i --legacy-peer-deps three-bvh-csg three-mesh-bvh
// Oberste Gruppen (= Teile im Viewer): erde, divergenz, subduktion, kollision, transform.
// Je Teil ein Animationsclip mit gleichem Namen (10 s, Endlosschleife).
// Farben werden pro Ecke eingebacken (Gesteinsschichten, Geländehöhe, leichte Unregelmäßigkeit).
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg';
import fs from 'fs';

globalThis.FileReader = class {
  readAsArrayBuffer(b) { b.arrayBuffer().then(r => { this.result = r; this.onloadend && this.onloadend(); }); }
  readAsDataURL(b) { b.arrayBuffer().then(r => { this.result = 'data:application/octet-stream;base64,' + Buffer.from(r).toString('base64'); this.onloadend && this.onloadend(); }); }
};

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const C = (h) => new THREE.Color(h);

// ---------- Rauschen & Farbfunktionen ----------
function rausch(x, y, z) {
  return (Math.sin(x * 3.1 + y * 1.7 + 0.3) * Math.cos(z * 2.3 - x * 0.7) + Math.sin(x * 7.3 - z * 5.1 + y * 2.9) * 0.5 + Math.sin(y * 11.1 + z * 9.7) * 0.25) / 1.75;
}
const mix = (a, b, t) => a.clone().lerp(b, Math.min(1, Math.max(0, t)));
const FARBE = {
  kontinent: p => { // Sedimentschichten in Brauntönen
    const band = Math.floor((p.y + 5) * 3.2) % 3;
    const b = [C(0x9b7653), C(0x86623f), C(0xb08a60)][band];
    return b.multiplyScalar(1 + 0.08 * rausch(p.x, p.y, p.z));
  },
  basalt: p => C(0x3e464f).multiplyScalar(1 + 0.12 * rausch(p.x * 2, p.y * 2, p.z * 2)),
  mantel: p => mix(C(0xb3321a), C(0xf2903e), (p.y + 3.2) / 2.6).multiplyScalar(1 + 0.05 * rausch(p.x, p.y, p.z)),
  mantelKern: p => C(0xd9662b),
  magma: p => mix(C(0xffe082), C(0xff5722), Math.min(1, Math.abs(p.x - (p.__mx || 0)) * 3)).multiplyScalar(1),
  wasser: () => C(0x2f7fd6),
  pfeil: () => C(0xffffff),
  stroemung: () => C(0xfff1d6),
  beben: () => C(0xffd600),
  rauch: p => mix(C(0x5f5f5f), C(0xbdbdbd), (p.y - 1.5) / 1.5),
  strasse: () => C(0x3d3d3d), linie: () => C(0xf5f5f5), holz: () => C(0x7a4a24),
  baum: p => C(0x2f6b2f).multiplyScalar(1 + 0.15 * rausch(p.x * 4, p.y * 4, p.z * 4)), stamm: () => C(0x5d4027),
  gelaende: null, // Farben kommen aus der Geometrie
};
// Geländefarbe nach Höhe über Grund
function gelaendeFarbe(p, hRel, schneeAb = 99) {
  const n = rausch(p.x * 1.5, 0, p.z * 1.5);
  if (hRel > schneeAb + 0.1 * n) return C(0xf3f5f7);
  if (hRel > 0.55 + 0.15 * n) return mix(C(0x8d8272), C(0x756a5c), n * 0.5 + 0.5);
  return mix(C(0x5f9e45), C(0x7fb35a), n * 0.5 + 0.5).lerp(C(0x8d8272), Math.max(0, (hRel - 0.35) * 2));
}

// ---------- Materialien: Farbe steckt in den Ecken ----------
const MAT = {
  standard: {}, wasser: { transparent: true, opacity: 0.62, roughness: 0.15, metalness: 0.1 },
  magma: { emissive: 0xff4500, emissiveIntensity: 0.55 }, pfeil: { emissive: 0x777777, roughness: 0.4 },
  stroemung: { emissive: 0x806040, roughness: 0.4 }, beben: { emissive: 0xffb300, emissiveIntensity: 0.9 },
  rauch: { transparent: true, opacity: 0.85 },
};
const matCache = {};
function mat(k) {
  const art = MAT[k] ? k : 'standard';
  return matCache[art] ||= new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.8, name: art, ...MAT[art] });
}
const materialArt = k => (MAT[k] ? k : 'standard');

// ---------- Baukasten ----------
function faerben(g, k) {
  if (g.attributes.color) return g;
  const P = g.attributes.position, f = FARBE[k], col = [];
  const p = new THREE.Vector3();
  for (let i = 0; i < P.count; i++) { p.set(P.getX(i), P.getY(i), P.getZ(i)); const c = f(p); col.push(c.r, c.g, c.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}
class Bau {
  constructor() { this.t = {}; }
  add(k, g, M) {
    if (g.attributes.uv) g.deleteAttribute('uv');
    if (M) g.applyMatrix4(M);
    faerben(g, k);
    const art = materialArt(k);
    (this.t[art] ||= []).push(g.index ? g : mergeVertices(g));
    return this;
  }
  box(k, x0, x1, y0, y1, z0, z1, dichte = 5) {
    const s = v => Math.max(1, Math.round(v * dichte));
    const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0, s(x1 - x0), s(y1 - y0), s(z1 - z0));
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return this.add(k, g);
  }
  bauen(name) {
    const grp = new THREE.Group(); grp.name = name;
    for (const [art, gs] of Object.entries(this.t)) { const m = new THREE.Mesh(mergeGeometries(gs), mat(art)); m.name = name + '_' + art; grp.add(m); }
    return grp;
  }
}
function prisma(pkte, z0, z1, seg = 16) {
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(pkte.map(([x, y]) => new THREE.Vector2(x, y))), { depth: z1 - z0, bevelEnabled: false, curveSegments: seg });
  g.translate(0, 0, z0); return g;
}
// Geländeblock: Oberfläche mit Relief h(x,z) über yOben, Seitenwände bis yUnten; Farben: oben nach Höhe, Seiten nach Schichtfunktion
function relief(x0, x1, z0, z1, yUnten, yOben, h, { dichte = 6, seite = FARBE.kontinent, schneeAb = 99, hMax = 1 } = {}) {
  const nx = Math.max(2, Math.round((x1 - x0) * dichte)), nz = Math.max(2, Math.round((z1 - z0) * dichte));
  const teile = [];
  // Oberfläche
  {
    const pos = [], col = [], idx = [];
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
      const x = x0 + (x1 - x0) * i / nx, z = z0 + (z1 - z0) * j / nz, hh = h(x, z), y = yOben + hh;
      pos.push(x, y, z); const c = gelaendeFarbe(V(x, y, z), hh / hMax, schneeAb); col.push(c.r, c.g, c.b);
    }
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals(); teile.push(g);
  }
  // Seitenwände (vorne, hinten, links, rechts)
  const ny = Math.max(4, Math.round((yOben - yUnten + hMax) * 5));
  const wand = (n, punkt, aussen) => {
    const pos = [], col = [], idx = [];
    for (let i = 0; i <= n; i++) {
      const [x, z] = punkt(i / n), top = yOben + h(x, z);
      for (let j = 0; j <= ny; j++) { const y = yUnten + (top - yUnten) * j / ny; pos.push(x, y, z); const c = seite(V(x, y, z)); col.push(c.r, c.g, c.b); }
    }
    for (let i = 0; i < n; i++) for (let j = 0; j < ny; j++) {
      const a = i * (ny + 1) + j, b = a + 1, c = a + ny + 1, d = c + 1;
      if (aussen) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
  };
  teile.push(wand(nx, u => [x0 + (x1 - x0) * u, z1], true));
  teile.push(wand(nx, u => [x0 + (x1 - x0) * u, z0], false));
  teile.push(wand(nz, u => [x0, z0 + (z1 - z0) * u], true));
  teile.push(wand(nz, u => [x1, z0 + (z1 - z0) * u], false));
  // Boden
  const bo = new THREE.PlaneGeometry(x1 - x0, z1 - z0); bo.rotateX(Math.PI / 2); bo.translate((x0 + x1) / 2, yUnten, (z0 + z1) / 2); bo.deleteAttribute('uv'); faerben(bo, 'kontinent'); teile.push(bo);
  return teile;
}
const huegel = (amp = 0.12, f = 1) => (x, z) => amp * (0.6 + 0.4 * rausch(x * f, 0, z * f));

// Block-Pfeil (3D), flach auf dem Boden (Richtung in xz) oder aufrecht auf der Vorderseite (Richtung in xy)
function blockpfeil(b, k, x, y, z, dir, len = 1.3, flach = true, breite = 0.22) {
  const sp = 0.42;
  const s = [[-len / 2, -breite / 2], [len / 2 - sp, -breite / 2], [len / 2 - sp, -breite * 1.3], [len / 2, 0], [len / 2 - sp, breite * 1.3], [len / 2 - sp, breite / 2], [-len / 2, breite / 2]];
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(s.map(([a, c]) => new THREE.Vector2(a, c))), { depth: 0.1, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 });
  g.translate(0, 0, -0.05);
  const w = Math.atan2(dir[1], dir[0]);
  const q = flach ? new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), -w).multiply(new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), -Math.PI / 2))
    : new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), w);
  b.add(k, g, new THREE.Matrix4().compose(V(x, y, z), q, V(1, 1, 1)));
}
// Gebogener Pfeil auf dem Einheitskreis (für Strömungswalzen), Bogen von a0 nach a1 (Radiant)
function bogenpfeil(b, k, a0, a1, r = 1, dicke = 0.07) {
  const pts = []; for (let i = 0; i <= 24; i++) { const a = a0 + (a1 - a0) * i / 24; pts.push(V(r * Math.cos(a), r * Math.sin(a), 0)); }
  const kurve = new THREE.CatmullRomCurve3(pts);
  b.add(k, new THREE.TubeGeometry(kurve, 16, dicke, 6));
  const ende = pts[pts.length - 1], tang = kurve.getTangent(1);
  const kegel = new THREE.ConeGeometry(dicke * 2.6, dicke * 5, 12); kegel.translate(0, dicke * 2.5, 0);
  b.add(k, kegel, new THREE.Matrix4().compose(ende, new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), tang), V(1, 1, 1)));
}
// Blitz-Symbol (Erdbeben)
function blitz(b, k, s = 1) {
  b.add(k, prisma([[-0.3, 0.45], [0.08, 0.06], [-0.1, 0.02], [0.3, -0.45], [-0.04, -0.04], [0.14, 0.0], [-0.1, 0.45]].map(([x, y]) => [x * s, y * s]), -0.04, 0.04));
}

// ---------- Animation ----------
const DAUER = 10;
const spur = [];
const pos = (n, t, w) => spur.push(new THREE.VectorKeyframeTrack(n + '.position', t, w.flat()));
const skal = (n, t, w) => spur.push(new THREE.VectorKeyframeTrack(n + '.scale', t, w.map(v => Array.isArray(v) ? v : [v, v, v]).flat()));
const rot = (n, t, qs) => spur.push(new THREE.QuaternionKeyframeTrack(n + '.quaternion', t, qs.map(q => q.toArray()).flat()));
const clip = name => new THREE.AnimationClip(name, DAUER, spur.splice(0));
// Drehung um eine Achse, gleichmäßig, nahtlos
function drehung(n, achse, umdrehungen) {
  const schritte = Math.round(Math.abs(umdrehungen) * 8), t = [], q = [];
  for (let i = 0; i <= schritte; i++) { t.push(DAUER * i / schritte); q.push(new THREE.Quaternion().setFromAxisAngle(achse, Math.sign(umdrehungen) * i * Math.PI / 4)); }
  rot(n, t, q);
}
// Läufer entlang Pfad mit Ausrichtung an der Tangente (in der xy-Ebene); an den Enden unsichtbar
function laeufer(n, f, periode, phase, schritte = 60) {
  const zt = [], zp = [], zq = [], zs = [];
  for (let i = 0; i <= schritte; i++) {
    const t = DAUER * i / schritte, u = ((t / periode + phase) % 1 + 1) % 1;
    const p = f(u), p2 = f(Math.min(1, u + 0.01)), p1 = f(Math.max(0, u - 0.01));
    zt.push(t); zp.push(p.toArray()); zq.push(new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), Math.atan2(p2.y - p1.y, p2.x - p1.x)));
    zs.push(u < 0.05 || u > 0.95 ? 0.001 : 1);
  }
  pos(n, zt, zp); rot(n, zt, zq); skal(n, zt, zs);
}
// Strömungswalze: drei gebogene Pfeile, drehen sich langsam
function walze(g, name, cx, cy, z, r, dreh, ebene = 'z') {
  const b = new Bau();
  for (let i = 0; i < 3; i++) { const a = i * 2 * Math.PI / 3; bogenpfeil(b, 'stroemung', dreh > 0 ? a : a + 1.5, dreh > 0 ? a + 1.5 : a, 1, 0.075); }
  const innen = b.bauen(name);
  const aussen = new THREE.Group(); aussen.name = name + '_halter'; aussen.add(innen);
  aussen.position.set(cx, cy, z); aussen.scale.setScalar(r);
  if (ebene === 'x') aussen.rotation.y = Math.PI / 2;
  g.add(aussen);
  drehung(name, V(0, 0, 1), dreh * 2);
}
// Mantel-Block mit Farbverlauf und Strömungswalzen auf der Vorderseite
function mantel(g, pre, x0, x1, yOben, walzen, zVorn = 2) {
  const b = new Bau(); b.box('mantel', x0, x1, -3.2, yOben, -zVorn, zVorn, 1.5); g.add(b.bauen(pre + '_mantel'));
  walzen.forEach(([cx, dreh], i) => walze(g, `${pre}_walze${i}`, cx, (yOben - 3.2) / 2, zVorn + 0.03, Math.min(1.05, (yOben + 3.2) / 2 - 0.2), dreh));
}

const teile = [], clips = [];

// ============ Aufbau der Erde ============
{
  const g = new THREE.Group(); g.name = 'erde';
  const csg = new Evaluator(); csg.attributes = ['position', 'normal']; csg.useGroups = false;
  const kugel = r => { const s = new THREE.SphereGeometry(r, 44, 30); s.deleteAttribute('uv'); const b = new Brush(s); b.updateMatrixWorld(); return b; };
  const keil = () => { const s = new THREE.BoxGeometry(5, 5, 5); s.translate(2.5, 0, 2.5); s.deleteAttribute('uv'); const b = new Brush(s); b.updateMatrixWorld(); return b; };
  const schichtFarbe = {
    kruste: p => C(0x8b6b4a).multiplyScalar(1 + 0.1 * rausch(p.x * 5, p.y * 5, p.z * 5)),
    mantel: p => { const r = p.length(); return mix(C(0xf0903a), C(0xb3321a), (1.9 - r) / 0.8).multiplyScalar(1 + 0.05 * rausch(p.x * 3, p.y * 3, p.z * 3)); },
    kernA: p => { const r = p.length(); return mix(C(0xffb03a), C(0xf28c28), (1.12 - r) / 0.5); },
    kernI: p => mix(C(0xfff59d), C(0xffd54f), p.length() / 0.62),
  };
  const b = new Bau();
  for (const [ra, ri, k] of [[2.0, 1.9, 'kruste'], [1.9, 1.12, 'mantel'], [1.12, 0.62, 'kernA'], [0.62, 0, 'kernI']]) {
    let s = kugel(ra); if (ri > 0) s = csg.evaluate(s, kugel(ri), SUBTRACTION); s = csg.evaluate(s, keil(), SUBTRACTION);
    const quelle = s.geometry.index ? s.geometry.toNonIndexed() : s.geometry;
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', quelle.attributes.position); geo.setAttribute('normal', quelle.attributes.normal);
    const P = geo.attributes.position, col = [], p = V(0, 0, 0);
    for (let i = 0; i < P.count; i++) { p.set(P.getX(i), P.getY(i), P.getZ(i)); const c = schichtFarbe[k](p); col.push(c.r, c.g, c.b); }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    b.add('standard', mergeVertices(geo));
  }
  // Oberfläche mit Kontinenten und Eiskappen
  const o = new THREE.SphereGeometry(2.012, 80, 54, Math.PI, 1.5 * Math.PI), P = o.attributes.position, farben = [];
  const d = V(0, 0, 0);
  for (let i = 0; i < P.count; i++) {
    d.set(P.getX(i), P.getY(i), P.getZ(i)).normalize();
    const land = Math.sin(2.1 * d.x + 0.3) * Math.cos(1.7 * d.z - 0.4) + 0.6 * Math.sin(3.3 * d.y + 1.1) + 0.35 * Math.sin(5.1 * d.x * d.z + 2) + 0.15 * rausch(d.x * 4, d.y * 4, d.z * 4);
    let c;
    if (Math.abs(d.y) > 0.9) c = C(0xf4f7fb);
    else if (land > 0.45) c = land > 0.95 ? C(0xa08a5c) : mix(C(0x4f8f3a), C(0x7aa650), (land - 0.45) * 2);
    else c = mix(C(0x1f5fa8), C(0x3b86d0), land + 0.4);
    farben.push(c.r, c.g, c.b);
  }
  o.setAttribute('color', new THREE.Float32BufferAttribute(farben, 3));
  b.add('standard', o);
  g.add(b.bauen('erde_koerper'));
  // Strömungswalzen im Mantel auf beiden Schnittflächen
  let n = 0;
  for (const ebene of ['z', 'x']) for (const [wy, dreh] of [[0.62, 1], [-0.62, -1], [1.25, -1], [-1.25, 1]]) {
    const r0 = 1.5, mx = Math.sqrt(Math.max(0, r0 * r0 - wy * wy));
    if (ebene === 'z') walze(g, 'erde_walze' + n++, mx, wy, 0.03, 0.3, dreh, 'z');
    else walze(g, 'erde_walze' + n++, 0.03, wy, mx, 0.3, dreh, 'x');
  }
  teile.push(g); clips.push(clip('erde'));
}

// ============ Auseinanderdriften ============
{
  const g = new THREE.Group(); g.name = 'divergenz';
  mantel(g, 'div', -6.6, 6.6, -0.8, [[-4.6, -1], [-1.6, 1], [1.6, -1], [4.6, 1]]);
  for (const [s, name] of [[-1, 'div_platteL'], [1, 'div_platteR']]) {
    const xa = s < 0 ? -4.6 : 0.02, xb = s < 0 ? -0.02 : 4.6, kante = s < 0 ? xb : xa;
    // Grabenschulter: zur Bruchkante hin ansteigend
    const h = (x, z) => huegel(0.12, 1.3)(x, z) + 0.55 * Math.exp(-Math.pow((x - kante) / 0.6, 2));
    const b = new Bau();
    for (const t of relief(xa, xb, -2, 2, -0.8, 0.1, h, { hMax: 0.7 })) b.add('gelaende', t);
    for (const [x, z] of [[s * 3.0, -1.3], [s * 3.6, 0.2], [s * 2.6, 1.2], [s * 4.1, 1.5]]) baum(b, x, 0.1 + h(x, z), z);
    g.add(b.bauen(name));
  }
  { const b = new Bau(); b.box('basalt', -0.5, 0.5, -0.8, -0.3, -2, 2, 8); g.add(b.bauen('div_kruste')); }
  { const b = new Bau(); b.add('basalt', prisma([[-0.9, -0.3], [0.9, -0.3], [0.2, 0.02], [0, -0.08], [-0.2, 0.02]], -2, 2)); g.add(b.bauen('div_ruecken')); }
  { const b = new Bau(); const gg = prisma([[-1.0, -3.2], [1.0, -3.2], [0.35, -0.9], [0.1, -0.15], [-0.1, -0.15], [-0.35, -0.9]], -1.6, 2.03, 24); b.add('magma', gg); g.add(b.bauen('div_magma')); }
  { const b = new Bau(); b.box('wasser', -0.5, 0.5, -0.3, 0.12, -2, 2, 2); g.add(b.bauen('div_wasser')); }
  { const b = new Bau(); blockpfeil(b, 'pfeil', -2.6, 0.6, -0.4, [-1, 0], 1.6); blockpfeil(b, 'pfeil', 2.6, 0.6, -0.4, [1, 0], 1.6); g.add(b.bauen('div_pfeile')); }
  const T = [0, 1, 8, 10];
  pos('div_platteL', T, [[0, 0, 0], [0, 0, 0], [-2, 0, 0], [-2, 0, 0]]);
  pos('div_platteR', T, [[0, 0, 0], [0, 0, 0], [2, 0, 0], [2, 0, 0]]);
  pos('div_pfeile', T, [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]]);
  skal('div_kruste', T, [[0.001, 1, 1], [0.001, 1, 1], [4, 1, 1], [4, 1, 1]]);
  skal('div_wasser', [0, 3, 8, 10], [[0.001, 0.001, 1], [2.2, 0.3, 1], [4, 1, 1], [4, 1, 1]]);
  skal('div_ruecken', [0, 2, 8, 10], [[1, 0.001, 1], [1, 0.3, 1], [1, 1, 1], [1, 1, 1]]);
  skal('div_magma', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [0.4, 1, 0.92, 1.05, 0.92, 1.05, 0.92, 1.05, 0.95, 0.95, 0.4].map(v => [v, v, 1]));
  teile.push(g); clips.push(clip('divergenz'));
}

function baum(b, x, y, z, s = 1) {
  const k = new THREE.ConeGeometry(0.2 * s, 0.55 * s, 10); k.translate(x, y + 0.42 * s, z); b.add('baum', k);
  const k2 = new THREE.ConeGeometry(0.15 * s, 0.4 * s, 10); k2.translate(x, y + 0.66 * s, z); b.add('baum', k2);
  const st = new THREE.CylinderGeometry(0.04 * s, 0.05 * s, 0.2 * s, 6); st.translate(x, y + 0.1 * s, z); b.add('stamm', st);
}

// ============ Abtauchen (Subduktion) ============
{
  const g = new THREE.Group(); g.name = 'subduktion';
  mantel(g, 'sub', -5.5, 5.5, -0.9, [[-3.2, -1]]);
  // Oberkante der Ozeanplatte: flach, dann abtauchend
  const kurve = new THREE.QuadraticBezierCurve(new THREE.Vector2(0.4, -0.45), new THREE.Vector2(1.7, -0.6), new THREE.Vector2(4.2, -3.15));
  const oben = u => u < 0.55 ? V(-5.5 + (u / 0.55) * 5.9, -0.45, 0) : (p => V(p.x, p.y, 0))(kurve.getPoint((u - 0.55) / 0.45));
  const DICKE = 0.5;
  const unten = u => { const p = oben(u), q = oben(Math.min(1, u + 0.005)), r = oben(Math.max(0, u - 0.005)); const t = V(q.x - r.x, q.y - r.y, 0).normalize(); return p.clone().add(V(t.y, -t.x, 0).multiplyScalar(DICKE)); };
  {
    const a = [], bb = [];
    for (let i = 0; i <= 60; i++) { const p = oben(i / 60); a.push([p.x, p.y]); }
    for (let i = 60; i >= 0; i--) { const p = unten(i / 60); bb.push([p.x, p.y]); }
    const b = new Bau(); b.add('basalt', prisma([...a, ...bb], -2.0, 2.02, 32)); g.add(b.bauen('sub_ozeanplatte'));
  }
  // Kontinent mit Anden; Vulkan sitzt an der Vorderkante und ist aufgeschnitten
  const VX = 2.6, VZ = 2.0;
  const hK = (x, z) => {
    const vulkan = 1.9 * Math.max(0, 1 - Math.hypot(x - VX, z - VZ) / 1.25) - 0.35 * Math.max(0, 1 - Math.hypot(x - VX, z - VZ) / 0.25);
    const anden = 1.0 * Math.max(0, Math.sin((x - 1.2) / 3.2 * Math.PI)) * (0.7 + 0.3 * rausch(x * 1.4, 0, z * 1.4)) * Math.min(1, Math.max(0, (x - 1.0) / 0.6));
    return Math.max(vulkan, anden, huegel(0.1, 1.2)(x, z));
  };
  {
    const b = new Bau();
    // Kontinentkruste: Relief über Block, unten schräg über der abtauchenden Platte
    for (const t of relief(0.9, 5.5, -2, 2, -0.45, 0.3, hK, { hMax: 1.9, schneeAb: 0.72, dichte: 8 })) b.add('gelaende', t);
    b.add('kontinent', prisma([[0.55, 0.3], [0.9, 0.3], [0.9, -0.45], [5.5, -0.45], [5.5, -1.5], [2.3, -1.5], [0.55, -0.5]], -2, 2));
    // Magmakammer und Schlot im Querschnitt (vorne)
    b.add('magma', prisma([[VX - 0.55, -0.95], [VX + 0.55, -0.95], [VX + 0.45, -0.65], [VX + 0.12, -0.55], [VX + 0.08, 0.3 + 1.55], [VX - 0.08, 0.3 + 1.55], [VX - 0.12, -0.55], [VX - 0.45, -0.65]], VZ - 0.03, VZ + 0.025));
    b.add('magma', prisma([[VX - 0.15, -1.55], [VX + 0.15, -1.55], [VX + 0.1, -0.95], [VX - 0.1, -0.95]], VZ - 0.03, VZ + 0.025));
    g.add(b.bauen('sub_kontinent'));
  }
  { const b = new Bau(); b.box('wasser', -5.5, 0.9, -0.45, 0.22, -2, 2, 2); g.add(b.bauen('sub_wasser')); }
  // Pfeile im Querschnitt der Ozeanplatte zeigen das Abtauchen
  for (let j = 0; j < 5; j++) {
    const name = 'sub_pfeil' + j, b = new Bau(); blockpfeil(b, 'pfeil', 0, 0, 0, [1, 0], 0.7, false, 0.12); g.add(b.bauen(name));
    laeufer(name, u => { const p = oben(0.08 + u * 0.85), q = unten(0.08 + u * 0.85); return p.add(q).multiplyScalar(0.5).setZ(2.1); }, 5, j / 5);
  }
  // Magma steigt von der Platte zur Kammer: Pfeile nach oben
  for (let j = 0; j < 3; j++) {
    const name = 'sub_aufstieg' + j, b = new Bau(); blockpfeil(b, 'magma', 0, 0, 0, [1, 0], 0.45, false, 0.1); g.add(b.bauen(name));
    laeufer(name, u => V(VX + 0.1 * Math.sin(u * 6), -2.1 + u * 1.25, 2.1), 2.5, j / 3);
  }
  // Ausbruch: Lavafontäne und Aschewolke über dem Krater
  { const b = new Bau(); for (const [x, y, s] of [[0, 0, 1], [-0.12, 0.05, 0.7], [0.13, 0.03, 0.8]]) { const k = new THREE.ConeGeometry(0.09 * s, 0.5 * s, 10); k.translate(x, y + 0.25 * s, 0); b.add('magma', k); } const n = b.bauen('sub_lava'); n.position.set(VX, 0.3 + 1.52, VZ - 0.05); g.add(n); }
  skal('sub_lava', [0, 1, 1.5, 2.5, 3, 4, 4.5, 6, 6.5, 7.5, 8, 10], [0.2, 1, 0.5, 1.1, 0.4, 1, 0.5, 1.1, 0.4, 1, 0.3, 0.2].map(v => [1, v, 1]));
  { const b = new Bau(); for (const [x, y, r] of [[0, 0, 0.3], [0.25, 0.3, 0.28], [-0.22, 0.35, 0.25], [0.08, 0.65, 0.33], [0.4, 0.75, 0.22], [-0.3, 0.8, 0.2]]) { const k = new THREE.IcosahedronGeometry(r, 2); k.translate(x, y, 0); b.add('rauch', k); } const n = b.bauen('sub_rauch'); n.position.set(VX, 2.35, VZ - 0.3); g.add(n); }
  skal('sub_rauch', [0, 2, 3.5, 5, 7, 8.5, 10], [0.5, 1, 0.8, 1.1, 0.75, 1, 0.5]);
  pos('sub_rauch', [0, 5, 10], [[VX, 2.35, VZ - 0.3], [VX + 0.2, 2.5, VZ - 0.3], [VX, 2.35, VZ - 0.3]]);
  // Erdbeben: Blitz an der Nahtstelle + kurzes Ruckeln des Kontinents
  { const b = new Bau(); blitz(b, 'beben', 1); const n = b.bauen('sub_beben'); n.position.set(1.0, -0.95, 2.1); g.add(n); }
  skal('sub_beben', [0, 2.9, 3.0, 3.6, 3.7, 7.4, 7.5, 8.1, 8.2, 10], [0.001, 0.001, 1.2, 1.2, 0.001, 0.001, 1.2, 1.2, 0.001, 0.001]);
  { const t = [0, 2.95, 3.0, 3.05, 3.1, 3.15, 3.2, 7.45, 7.5, 7.55, 7.6, 7.65, 7.7, 10], d = [0, 0, 0.05, -0.05, 0.04, -0.03, 0, 0, 0.05, -0.05, 0.04, -0.03, 0, 0];
    pos('sub_kontinent', t, d.map(v => [v, 0, 0])); }
  { const b = new Bau(); blockpfeil(b, 'pfeil', -3.2, 0.35, -0.6, [1, 0], 1.6); g.add(b.bauen('sub_pfeil')); }
  teile.push(g); clips.push(clip('subduktion'));
}

// ============ Zusammenstoßen (Faltengebirge) ============
{
  const g = new THREE.Group(); g.name = 'kollision';
  mantel(g, 'kol', -6.4, 6.4, -1.2, [[-4.4, 1], [-1.5, -1], [1.5, 1], [4.4, -1]]);
  for (const [s, name] of [[-1, 'kol_platteL'], [1, 'kol_platteR']]) {
    const xa = s < 0 ? -5.8 : 1.0, xb = s < 0 ? -1.0 : 5.8, b = new Bau();
    for (const t of relief(xa, xb, -2, 2, -1.2, 0.1, huegel(0.12, 1.1), { hMax: 0.5 })) b.add('gelaende', t);
    for (const [x, z] of [[s * 3.8, -1.3], [s * 4.4, 0.3], [s * 3.2, 1.4], [s * 5.0, -0.5]]) baum(b, x, 0.1 + huegel(0.12, 1.1)(x, z), z);
    g.add(b.bauen(name));
  }
  { const b = new Bau(); b.box('wasser', -1, 1, -0.3, 0.12, -2, 2, 2); b.box('basalt', -1, 1, -0.8, -0.3, -2, 2, 4); g.add(b.bauen('kol_meer')); }
  // Faltengebirge: Relief mit Graten; im Querschnitt gefaltete Schichten; Ursprung am Fuß → wächst nach oben
  const hG = (x, z) => {
    const breite = Math.max(0, 1 - Math.pow(x / 2.1, 2));
    const grate = 0.55 + 0.45 * Math.abs(Math.sin(x * 2.2 + 0.6 * Math.sin(z * 1.3)));
    return 2.0 * breite * grate * (0.75 + 0.25 * rausch(x * 1.8, 0, z * 1.8));
  };
  const falten = p => { const band = Math.floor((p.y - 0.45 * Math.cos(p.x * 2.3) * Math.max(0, 1 - Math.abs(p.x) / 2.2) + 5) * 3.5) % 3; return [C(0x9b7653), C(0x7d5a3c), C(0xb89468)][band].multiplyScalar(1 + 0.06 * rausch(p.x, p.y, p.z)); };
  {
    const b = new Bau();
    for (const t of relief(-2.1, 2.1, -2, 2, -0.9, 0.0, hG, { hMax: 2.0, schneeAb: 0.62, seite: falten, dichte: 9 })) b.add('gelaende', t);
    const n = b.bauen('kol_gebirge'); n.position.y = 0.1; g.add(n);
  }
  { const b = new Bau(); const w = new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2); w.scale(1.7, 1.5, 1.99); b.add('kontinent', w); const n = b.bauen('kol_wurzel'); n.position.y = -1.2; g.add(n); }
  { const b = new Bau(); blockpfeil(b, 'pfeil', -3.6, 0.55, -0.5, [1, 0], 1.6); blockpfeil(b, 'pfeil', 3.6, 0.55, -0.5, [-1, 0], 1.6); g.add(b.bauen('kol_pfeile')); }
  const T = [0, 1, 4.5, 10];
  pos('kol_platteL', T, [[-0.8, 0, 0], [-0.8, 0, 0], [0.05, 0, 0], [0.05, 0, 0]]);
  pos('kol_platteR', T, [[0.8, 0, 0], [0.8, 0, 0], [-0.05, 0, 0], [-0.05, 0, 0]]);
  skal('kol_meer', T, [[1.8, 1, 1], [1.8, 1, 1], [0.001, 0.001, 1], [0.001, 0.001, 1]]);
  skal('kol_gebirge', [0, 3.5, 9, 10], [[0.5, 0.001, 1], [0.7, 0.04, 1], [1, 1, 1], [1, 1, 1]]);
  skal('kol_wurzel', [0, 3.5, 9, 10], [[0.5, 0.001, 1], [0.7, 0.05, 1], [1, 1, 1], [1, 1, 1]]);
  skal('kol_pfeile', [0, 0.5, 8.5, 9.2, 10], [0.001, 1, 1, 0.001, 0.001]);
  teile.push(g); clips.push(clip('kollision'));
}

// ============ Aneinander vorbeischieben ============
{
  const g = new THREE.Group(); g.name = 'transform';
  { const b = new Bau(); b.box('mantel', -4.5, 4.5, -2.6, -1.0, -3.4, 3.4, 3); g.add(b.bauen('tr_mantel')); }
  for (const [s, name] of [[-1, 'tr_platteL'], [1, 'tr_platteR']]) {
    const b = new Bau(), xa = s < 0 ? -4.5 : 0.02, xb = s < 0 ? -0.02 : 4.5;
    const h = (x, z) => 0.1 * (0.6 + 0.4 * rausch(x * 1.2, 0, z * 1.2)) * Math.min(1, Math.abs(z) / 0.6);   // an der Straße flach
    for (const t of relief(xa, xb, -2.6, 2.6, -1.0, 0.1, h, { hMax: 0.5 })) b.add('gelaende', t);
    b.box('strasse', xa, xb, 0.1, 0.16, -0.35, 0.35, 2); b.box('linie', xa, xb, 0.16, 0.17, -0.03, 0.03, 1);
    for (let x = xa + 0.3; x < xb - 0.2; x += 0.6) b.box('holz', x - 0.035, x + 0.035, 0.12, 0.62, 1.2, 1.27, 1);
    b.box('holz', xa, xb, 0.45, 0.5, 1.2, 1.27, 1); b.box('holz', xa, xb, 0.27, 0.31, 1.2, 1.27, 1);
    for (const [x, z] of [[s * 2.5, -1.7], [s * 3.6, 2.0], [s * 1.2, -2.1], [s * 3.9, -0.9]]) baum(b, x, 0.1 + h(x, z), z, 1.3);
    g.add(b.bauen(name));
  }
  // Ruck: lange stillhalten, dann plötzlich verschieben (mit kurzem Zittern)
  const ruckL = [], ruckR = [], tz = [];
  let off = 0;
  const add = (t, v, zit = 0) => { tz.push(t); ruckL.push([zit, 0, v]); ruckR.push([-zit, 0, -v]); };
  add(0, 0);
  for (const t0 of [2.0, 5.0, 8.0]) { add(t0, off); off += 0.35; add(t0 + 0.08, off, 0.04); add(t0 + 0.14, off, -0.04); add(t0 + 0.2, off, 0.03); add(t0 + 0.26, off); }
  add(9.6, off); add(10, 0);
  pos('tr_platteL', tz, ruckL); pos('tr_platteR', tz, ruckR);
  { const b = new Bau(); blitz(b, 'beben', 1.4); const n = b.bauen('tr_beben'); n.position.set(0, 1.3, 0); g.add(n); }
  skal('tr_beben', [0, 1.95, 2.05, 2.8, 2.9, 4.95, 5.05, 5.8, 5.9, 7.95, 8.05, 8.8, 8.9, 10], [0.001, 0.001, 1, 1, 0.001, 0.001, 1, 1, 0.001, 0.001, 1, 1, 0.001, 0.001]);
  { const b = new Bau(); blockpfeil(b, 'pfeil', -2.4, 0.5, -1.0, [0, 1], 1.6); blockpfeil(b, 'pfeil', 2.4, 0.5, 1.0, [0, -1], 1.6); g.add(b.bauen('tr_pfeile')); }
  teile.push(g); clips.push(clip('transform'));
}

const root = new THREE.Group(); root.name = 'plattentektonik';
for (const t of teile) root.add(t);
const scene = new THREE.Scene(); scene.add(root);
const glb = await new GLTFExporter().parseAsync(scene, { binary: true, animations: clips });
const out = (process.argv[2] || '.') + '/plattentektonik.glb';
fs.writeFileSync(out, Buffer.from(glb));
console.log(out, (fs.statSync(out).size / 1024).toFixed(0), 'KB', '| Clips:', clips.map(c => c.name + '(' + c.tracks.length + ')').join(' '));
