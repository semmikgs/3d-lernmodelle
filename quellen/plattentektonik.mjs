// Erzeugt modelle/plattentektonik.glb – Blockbilder mit Animationen (Klasse 6).
// Aufruf: node plattentektonik.mjs <Ausgabeordner>
// benötigt: npm i three ; npm i --legacy-peer-deps three-bvh-csg three-mesh-bvh
// Oberste Gruppen (= Teile im Viewer): erde, divergenz, subduktion, kollision, transform.
// Je Teil ein Animationsclip mit gleichem Namen (10 s, Endlosschleife).
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg';
import fs from 'fs';

globalThis.FileReader = class {
  readAsArrayBuffer(b) { b.arrayBuffer().then(r => { this.result = r; this.onloadend && this.onloadend(); }); }
  readAsDataURL(b) { b.arrayBuffer().then(r => { this.result = 'data:application/octet-stream;base64,' + Buffer.from(r).toString('base64'); this.onloadend && this.onloadend(); }); }
};

const FARBEN = {
  mantel: [0xd9662b], mantelHell: [0xeb8a47], kontinent: [0xa0784c], gras: [0x6f9b4a], ozeankruste: [0x55606e],
  wasser: [0x3a7fd0, { transparent: true, opacity: 0.55, roughness: 0.2 }], magma: [0xff5a1f, { emissive: 0xff3a00, emissiveIntensity: 0.8 }],
  gebirge: [0x8a7560], schnee: [0xf5f5f5], pfeil: [0xffffff, { emissive: 0x666666 }], strom: [0xffd166, { emissive: 0x996600 }],
  beben: [0xffeb3b, { emissive: 0xffc400, emissiveIntensity: 0.9 }], strasse: [0x444444], linie: [0xffffff], zaun: [0x7a4a24],
  kruste: [0x8b6b4a], kernAussen: [0xf2a63a], kernInnen: [0xffe066, { emissive: 0x806000, emissiveIntensity: 0.4 }],
  oberflaeche: [0xffffff, { vertexColors: true }], baum: [0x2e6b2e], stamm: [0x6b4a2a], rauch: [0x9e9e9e, { transparent: true, opacity: 0.8 }],
};
const cache = {};
function mat(k) { if (!cache[k]) { const [c, o = {}] = FARBEN[k]; cache[k] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, name: k, ...o }); } return cache[k]; }

class Bau {
  constructor() { this.t = {}; }
  add(k, g, M) { g.deleteAttribute('uv'); if (M) g.applyMatrix4(M); (this.t[k] ||= []).push(g.index ? g : mergeVertices(g)); return this; }
  box(k, x0, x1, y0, y1, z0, z1) { const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return this.add(k, g); }
  bauen(name) {
    const grp = new THREE.Group(); grp.name = name;
    for (const [k, gs] of Object.entries(this.t)) { const m = new THREE.Mesh(mergeGeometries(gs), mat(k)); m.name = name + '_' + k; grp.add(m); }
    return grp;
  }
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);
// Prisma aus 2D-Umriss (x,y) mit Tiefe z0..z1
function prisma(pkte, z0, z1) {
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(pkte.map(([x, y]) => new THREE.Vector2(x, y))), { depth: z1 - z0, bevelEnabled: false, curveSegments: 16 });
  g.translate(0, 0, z0); return g;
}
// Pfeil (flach) auf der Vorderseite: Schaft + Spitze, zeigt in Richtung dir (2D)
function pfeil(b, k, x, y, z, dir, len = 0.8, flach = false) {
  const w = Math.atan2(dir[1], dir[0]);
  // flach: dir = [dx, dz] auf dem Boden (xz-Ebene), sonst dir = [dx, dy] auf der Vorderseite
  const q = flach
    ? new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), -w).multiply(new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), -Math.PI / 2))
    : new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), w);
  const M = new THREE.Matrix4().compose(V(x, y, z), q, V(1.3, 1.3, 1.3));
  b.add(k, prisma([[-len / 2, -0.06], [len / 2 - 0.2, -0.06], [len / 2 - 0.2, -0.16], [len / 2, 0], [len / 2 - 0.2, 0.16], [len / 2 - 0.2, 0.06], [-len / 2, 0.06]], 0, 0.04), M);
}

// ---------- Animationshilfen ----------
const DAUER = 10;
const spur = [];   // Tracks des aktuellen Clips
function pos(name, zeiten, werte) { spur.push(new THREE.VectorKeyframeTrack(name + '.position', zeiten, werte.flat())); }
function skal(name, zeiten, werte) { spur.push(new THREE.VectorKeyframeTrack(name + '.scale', zeiten, werte.map(v => Array.isArray(v) ? v : [v, v, v]).flat())); }
function clip(name) { const c = new THREE.AnimationClip(name, DAUER, spur.splice(0)); return c; }
// Markierung läuft endlos entlang eines Pfades f(u), u∈[0,1]; an den Enden unsichtbar
function laeufer(name, f, periode, phase, schritte = 40) {
  const zt = [], zp = [], zs = [];
  for (let i = 0; i <= schritte; i++) {
    const t = DAUER * i / schritte, u = ((t / periode + phase) % 1 + 1) % 1;
    zt.push(t); zp.push(f(u).toArray());
    zs.push(u < 0.06 || u > 0.94 ? 0.001 : 1);
  }
  pos(name, zt, zp); skal(name, zt, zs);
}
const knoten = (name, bau) => bau.bauen(name);
function kugelKnoten(name, k, r, det = 1) { const b = new Bau(); b.add(k, new THREE.IcosahedronGeometry(r, det)); return b.bauen(name); }

const teile = [], clips = [];

// ============ Aufbau der Erde ============
{
  const g = new THREE.Group(); g.name = 'erde';
  const csg = new Evaluator(); csg.attributes = ['position', 'normal']; csg.useGroups = true;
  const kugel = (r, k) => { const s = new THREE.SphereGeometry(r, 64, 44); s.deleteAttribute('uv'); const b = new Brush(s, mat(k)); b.updateMatrixWorld(); return b; };
  const keil = (k) => { const s = new THREE.BoxGeometry(5, 5, 5); s.translate(2.5, 0, 2.5); s.deleteAttribute('uv'); const b = new Brush(s, mat(k)); b.updateMatrixWorld(); return b; };
  const schichten = [[2.0, 1.9, 'kruste'], [1.9, 1.12, 'mantel'], [1.12, 0.62, 'kernAussen'], [0.62, 0, 'kernInnen']];
  const b = new Bau();
  for (const [ra, ri, k] of schichten) {
    let s = kugel(ra, k);
    if (ri > 0) s = csg.evaluate(s, kugel(ri, k), SUBTRACTION);
    s = csg.evaluate(s, keil(k), SUBTRACTION);
    const geo = s.geometry.index ? s.geometry.toNonIndexed() : s.geometry, t = new THREE.BufferGeometry();
    t.setAttribute('position', geo.attributes.position); t.setAttribute('normal', geo.attributes.normal);
    b.add(k, mergeVertices(t));
  }
  // Oberfläche mit Kontinenten (Farben pro Ecke), Viertel ausgeschnitten
  const o = new THREE.SphereGeometry(2.01, 96, 64, Math.PI, 1.5 * Math.PI), P = o.attributes.position, farben = [];
  const d = new THREE.Vector3(), c = new THREE.Color();
  for (let i = 0; i < P.count; i++) {
    d.set(P.getX(i), P.getY(i), P.getZ(i)).normalize();
    const land = Math.sin(2.1 * d.x + 0.3) * Math.cos(1.7 * d.z - 0.4) + 0.6 * Math.sin(3.3 * d.y + 1.1) + 0.35 * Math.sin(5.1 * d.x * d.z + 2);
    if (Math.abs(d.y) > 0.88) c.set(0xf4f7fb); else if (land > 0.45) c.set(land > 0.9 ? 0x9c8a5a : 0x5f9a45); else c.set(0x2f6fb8);
    farben.push(c.r, c.g, c.b);
  }
  o.setAttribute('color', new THREE.Float32BufferAttribute(farben, 3));
  b.add('oberflaeche', o);
  g.add(b.bauen('erde_koerper'));
  // Strömungen im Mantel: Punkte kreisen auf den Schnittflächen
  let n = 0;
  const zellen = [[0.45, 0], [1.15, 0], [-0.45, 0], [-1.15, 0]];
  for (const [ebene, zs] of [['z', 0.03], ['x', 0.03]]) {
    for (const [wy, ] of zellen) {
      const r0 = 1.51, winkelMitte = Math.asin(wy / r0), mx = r0 * Math.cos(winkelMitte), my = wy;
      for (let j = 0; j < 4; j++) {
        const name = 'erde_strom' + (n++);
        const k = kugelKnoten(name, 'strom', 0.075, 1); g.add(k);
        const dreh = (my > 0 ? 1 : -1);
        laeufer(name, u => { const w = dreh * u * Math.PI * 2; const a = mx + 0.3 * Math.cos(w), bb = my + 0.28 * Math.sin(w); return ebene === 'z' ? V(a, bb, zs) : V(zs, bb, a); }, 5, j / 4, 60);
      }
    }
  }
  { // dünne Ringe zeigen die Bahnen der Strömungswalzen
    const b = new Bau();
    for (const ebene of ['z', 'x']) for (const [wy] of zellen) {
      const r0 = 1.51, mx = r0 * Math.cos(Math.asin(wy / r0));
      const ring = new THREE.TorusGeometry(1, 0.018, 6, 48); ring.scale(0.3, 0.28, 1);
      if (ebene === 'z') ring.translate(mx, wy, 0.025); else { ring.rotateY(Math.PI / 2); ring.translate(0.025, wy, mx); }
      b.add('mantelHell', ring);
    }
    g.add(b.bauen('erde_bahnen'));
  }
  // Kreisbahn: Sichtbarkeit immer an
  for (const s of spur) if (s.name.endsWith('.scale')) s.values.fill(1);
  teile.push(g); clips.push(clip('erde'));
}

// Gemeinsamer Unterbau: Mantel mit Strömungspfeilen auf der Vorderseite
function mantel(g, prefix, x0, x1, yOben, zellen) {
  const b = new Bau();
  b.box('mantel', x0, x1, -3.2, yOben, -2, 2);
  b.box('mantelHell', x0, x1, yOben - 0.35, yOben, -2, 2.001);
  g.add(b.bauen(prefix + '_mantel'));
  // Strömungswalzen: Punkte laufen auf Ellipsen (vorne sichtbar)
  let n = 0;
  for (const [cx, dreh] of zellen) {
    for (let j = 0; j < 5; j++) {
      const name = `${prefix}_strom${n++}`; g.add(kugelKnoten(name, 'strom', 0.09, 1));
      laeufer(name, u => { const w = dreh * u * Math.PI * 2; return V(cx + 1.6 * Math.cos(w), (yOben - 3.2) / 2 + 0.2 + 0.85 * Math.sin(w), 2.06); }, 6, j / 5, 60);
    }
  }
  for (const s of spur) if (s.name.startsWith(prefix + '_strom') && s.name.endsWith('.scale')) s.values.fill(1);
}

// ============ Auseinanderdriften ============
{
  const g = new THREE.Group(); g.name = 'divergenz';
  mantel(g, 'div', -6.5, 6.5, -0.8, [[-2.2, 1], [2.2, -1]]);   // aufsteigend in der Mitte
  for (const [s, name] of [[-1, 'div_platteL'], [1, 'div_platteR']]) {
    const b = new Bau();
    const xa = s < 0 ? -4.6 : 0.02, xb = s < 0 ? -0.02 : 4.6;
    b.box('kontinent', xa, xb, -0.8, 0.1, -2, 2);
    b.box('gras', xa, xb, 0.1, 0.22, -2, 2);
    // Randgebirge / Bruchstufe an der Innenkante
    const kante = s < 0 ? xb : xa;
    b.add('kontinent', prisma([[kante, 0.22], [kante - s * 0.9, 0.22], [kante - s * 0.3, 0.7]], -2, 2));
    for (const z of [-1.4, -0.3, 0.9]) { const t = new THREE.ConeGeometry(0.22, 0.6, 10); t.translate(s * 2.8, 0.52, z); b.add('baum', t); }
    g.add(b.bauen(name));
  }
  // neuer Meeresboden (wächst in der Mitte), Mittelozeanischer Rücken, Magma, Wasser
  { const b = new Bau(); b.box('ozeankruste', -0.5, 0.5, -0.8, -0.3, -2, 2); g.add(b.bauen('div_kruste')); }
  { const b = new Bau(); b.add('ozeankruste', prisma([[-0.9, -0.3], [0.9, -0.3], [0.15, 0.05], [0, -0.05], [-0.15, 0.05]], -2, 2)); g.add(b.bauen('div_ruecken')); }
  { const b = new Bau(); b.add('magma', prisma([[-0.9, -3.0], [0.9, -3.0], [0.25, -0.8], [0.08, -0.1], [-0.08, -0.1], [-0.25, -0.8]], -1.2, 1.2 + 0.85)); g.add(b.bauen('div_magma')); }
  { const b = new Bau(); b.box('wasser', -0.5, 0.5, -0.3, 0.15, -2, 2); g.add(b.bauen('div_wasser')); }
  { const b = new Bau(); pfeil(b, 'pfeil', -2.4, 0.3, 0, [-1, 0], 1.3, true); pfeil(b, 'pfeil', 2.4, 0.3, 0, [1, 0], 1.3, true); g.add(b.bauen('div_pfeile')); }
  const T = [0, 1, 8, 10];
  pos('div_platteL', T, [[0, 0, 0], [0, 0, 0], [-2, 0, 0], [-2, 0, 0]]);
  pos('div_platteR', T, [[0, 0, 0], [0, 0, 0], [2, 0, 0], [2, 0, 0]]);
  skal('div_kruste', T, [[0.001, 1, 1], [0.001, 1, 1], [4, 1, 1], [4, 1, 1]]);
  skal('div_wasser', [0, 3, 8, 10], [[0.001, 0.001, 1], [2.4, 0.3, 1], [4, 1, 1], [4, 1, 1]]);
  skal('div_ruecken', [0, 2, 8, 10], [[1, 0.001, 1], [1, 0.3, 1], [1, 1, 1], [1, 1, 1]]);
  skal('div_magma', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [0.3, 1, 0.9, 1.05, 0.9, 1.05, 0.9, 1.05, 0.95, 0.95, 0.3].map(v => [v, v, 1]));
  skal('div_pfeile', [0, 0.5, 8, 8.8, 10], [0.001, 1, 1, 0.001, 0.001]);
  teile.push(g); clips.push(clip('divergenz'));
}

// ============ Abtauchen (Subduktion) ============
{
  const g = new THREE.Group(); g.name = 'subduktion';
  mantel(g, 'sub', -5.5, 5.5, -0.9, [[-2.8, -1], [2.6, 1]]);
  // Oberkante der Ozeanplatte: flach, dann abtauchend
  const oben = u => { const x = -5.5 + u * 5.8; return u < 1 ? V(x, -0.4, 0) : V(0, 0, 0); };
  const kurve = new THREE.QuadraticBezierCurve(new THREE.Vector2(0.3, -0.4), new THREE.Vector2(1.6, -0.55), new THREE.Vector2(4.0, -3.1));
  const pfadOben = u => { // u 0..1 über die ganze Platte
    if (u < 0.55) return V(-5.5 + (u / 0.55) * 5.8, -0.4, 0);
    const p = kurve.getPoint((u - 0.55) / 0.45); return V(p.x, p.y, 0);
  };
  {
    const pts = [];
    for (let i = 0; i <= 40; i++) { const p = pfadOben(i / 40); pts.push([p.x, p.y]); }
    const unten = []; for (let i = 40; i >= 0; i--) { const p = pfadOben(i / 40), q = pfadOben(Math.min(1, i / 40 + 0.01)), n = V(q.y - p.y, -(q.x - p.x), 0).normalize(); unten.push([p.x - n.x * 0.5 * -1, p.y - 0.5 * Math.abs(n.y) - 0.0]); }
    const b = new Bau(); b.add('ozeankruste', prisma([...pts, ...unten.map(([x, y]) => [x, y])], -2.01, 2.01));
    g.add(b.bauen('sub_ozeanplatte'));
  }
  { // Kontinent mit Anden und Vulkan
    const b = new Bau();
    b.add('kontinent', prisma([[0.55, 0.3], [5.5, 0.3], [5.5, -1.5], [2.3, -1.5], [0.55, -0.45]], -2, 2));
    b.box('gras', 0.9, 5.5, 0.3, 0.4, -2, 2);
    for (const [x, z, h] of [[1.6, -1.3, 0.9], [2.0, 1.2, 1.1], [3.4, -0.9, 1.0], [3.8, 1.3, 0.8]]) { const k = new THREE.ConeGeometry(0.7, h, 8); k.translate(x, 0.4 + h / 2, z); b.add('gebirge', k); const s = new THREE.ConeGeometry(0.25, h * 0.33, 8); s.translate(x, 0.4 + h * 0.84, z); b.add('schnee', s); }
    const vk = new THREE.CylinderGeometry(0.18, 1.0, 1.5, 16); vk.translate(2.7, 1.15, 0.2); b.add('gebirge', vk);
    const krater = new THREE.CylinderGeometry(0.2, 0.2, 0.05, 16); krater.translate(2.7, 1.9, 0.2); b.add('magma', krater);
    // Magmakanal im Querschnitt (vorne)
    b.add('magma', prisma([[2.45, -1.45], [2.95, -1.45], [2.8, 0.3], [2.6, 0.3]], 1.98, 2.02));
    g.add(b.bauen('sub_kontinent'));
  }
  { const b = new Bau(); b.box('wasser', -5.5, 0.55, -0.4, 0.2, -2, 2); b.add('wasser', prisma([[0.3, -0.4], [0.55, -0.45], [0.9, 0.2], [0.3, 0.2]], -2, 2)); g.add(b.bauen('sub_wasser')); }
  // Markierungen, die mit der Ozeanplatte abtauchen
  for (let j = 0; j < 7; j++) {
    const name = 'sub_mark' + j; const b = new Bau(); b.box('pfeil', -0.15, 0.15, 0, 0.08, -1.2, 1.2); g.add(b.bauen(name));
    laeufer(name, u => pfadOben(0.05 + u * 0.9).add(V(0, 0.01, 0)), 7, j / 7);
  }
  // Magmablasen steigen von der abtauchenden Platte zum Vulkan
  for (let j = 0; j < 5; j++) {
    const name = 'sub_blase' + j; g.add(kugelKnoten(name, 'magma', 0.14, 1));
    laeufer(name, u => V(2.7 + 0.15 * Math.sin(u * 9), -2.0 + u * 3.8, 2.05), 3.5, j / 5);
  }
  // Ausbruch: Rauchwolke pulsiert
  { const b = new Bau(); for (const [x, y, r] of [[0, 0, 0.35], [0.3, 0.35, 0.3], [-0.25, 0.4, 0.28], [0.1, 0.75, 0.32]]) { const k = new THREE.IcosahedronGeometry(r, 1); k.translate(x, y, 0); b.add('rauch', k); } const n = b.bauen('sub_rauch'); n.position.set(2.7, 2.2, 0.2); g.add(n); }
  skal('sub_rauch', [0, 2, 3.5, 5, 7, 8.5, 10], [0.4, 1, 0.7, 1.1, 0.6, 1, 0.4]);
  // Erdbeben-Symbol blitzt an der Nahtstelle
  { const b = new Bau(); b.add('beben', prisma([[-0.3, 0.35], [0.05, 0.05], [-0.1, 0.0], [0.3, -0.35], [-0.02, -0.02], [0.12, 0.03]], 0, 0.06)); const n = b.bauen('sub_beben'); n.position.set(1.1, -0.9, 2.05); g.add(n); }
  skal('sub_beben', [0, 2.9, 3.0, 3.5, 3.6, 7.4, 7.5, 8.0, 8.1, 10], [0.001, 0.001, 1.3, 1.3, 0.001, 0.001, 1.3, 1.3, 0.001, 0.001]);
  { const b = new Bau(); pfeil(b, 'pfeil', -3, 0.25, 0, [1, 0], 1.4, true); g.add(b.bauen('sub_pfeil')); }
  teile.push(g); clips.push(clip('subduktion'));
}

// ============ Zusammenstoßen (Faltengebirge) ============
{
  const g = new THREE.Group(); g.name = 'kollision';
  mantel(g, 'kol', -6, 6, -1.2, [[-2.6, -1], [2.6, 1]]);   // absteigend in der Mitte
  for (const [s, name] of [[-1, 'kol_platteL'], [1, 'kol_platteR']]) {
    const b = new Bau(), xa = s < 0 ? -5.8 : 1.0, xb = s < 0 ? -1.0 : 5.8;
    b.box('kontinent', xa, xb, -1.2, 0.1, -2, 2); b.box('gras', xa, xb, 0.1, 0.2, -2, 2);
    for (const z of [-1.3, 0.2, 1.4]) { const t = new THREE.ConeGeometry(0.2, 0.55, 10); t.translate(s * 4, 0.47, z); b.add('baum', t); }
    g.add(b.bauen(name));
  }
  { const b = new Bau(); b.box('wasser', -1, 1, -0.3, 0.15, -2, 2); b.box('ozeankruste', -1, 1, -0.8, -0.3, -2, 2); g.add(b.bauen('kol_meer')); }
  { // Faltengebirge: mehrere Ketten, gefaltete Schichten im Querschnitt; Schnee getrennt
    const b = new Bau(), sb = new Bau();
    for (const [x, h, w] of [[-1.15, 1.0, 1.0], [-0.4, 1.6, 1.15], [0.4, 1.8, 1.15], [1.15, 1.15, 1.0]]) {
      for (const z of [-1.45, -0.5, 0.5, 1.45]) {
        const hh = h * (0.8 + 0.25 * Math.sin(3 * z + x)); const k = new THREE.ConeGeometry(w, hh, 12); k.translate(x, 0.2 + hh / 2, z); b.add('gebirge', k);
        const sch = new THREE.ConeGeometry(w * 0.3, hh * 0.3, 12); sch.translate(x, 0.2 + hh * 0.85 + 0.01, z); sb.add('schnee', sch);
      }
    }
    for (let i = 0; i < 4; i++) {
      const pts = []; for (let k = 0; k <= 30; k++) { const x = -1.6 + k * 3.2 / 30; pts.push([x, -0.9 + i * 0.28 + 0.35 * Math.cos(x * 2.4) * (1 - Math.abs(x) / 1.9)]); }
      const ob = pts.map(([x, y]) => [x, y + 0.14]).reverse();
      b.add(i % 2 ? 'kontinent' : 'gebirge', prisma([...pts, ...ob], 2.0, 2.04));
    }
    g.add(b.bauen('kol_gebirge')); g.add(sb.bauen('kol_schnee'));
  }
  { const b = new Bau(); const w = new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2); w.scale(1.5, 1.4, 1.9); w.translate(0, -1.2, 0); b.add('kontinent', w); g.add(b.bauen('kol_wurzel')); }
  { const b = new Bau(); pfeil(b, 'pfeil', -3.4, 0.25, 0, [1, 0], 1.3, true); pfeil(b, 'pfeil', 3.4, 0.25, 0, [-1, 0], 1.3, true); g.add(b.bauen('kol_pfeile')); }
  const T = [0, 1, 4.5, 10];
  pos('kol_platteL', T, [[-0.8, 0, 0], [-0.8, 0, 0], [0.05, 0, 0], [0.05, 0, 0]]);
  pos('kol_platteR', T, [[0.8, 0, 0], [0.8, 0, 0], [-0.05, 0, 0], [-0.05, 0, 0]]);
  skal('kol_meer', [0, 1, 4.5, 10], [[1.8, 1, 1], [1.8, 1, 1], [0.001, 0.001, 1], [0.001, 0.001, 1]]);
  skal('kol_gebirge', [0, 3.5, 9, 10], [[0.3, 0.001, 1], [0.6, 0.05, 1], [1, 1, 1], [1, 1, 1]]);
  skal('kol_schnee', [0, 7, 9, 10], [[0.001, 0.001, 0.001], [0.001, 0.001, 0.001], [1, 1, 1], [1, 1, 1]]);
  skal('kol_wurzel', [0, 3.5, 9, 10], [[0.3, 0.001, 1], [0.6, 0.05, 1], [1, 1, 1], [1, 1, 1]]);
  skal('kol_pfeile', [0, 0.5, 8.5, 9.3, 10], [0.001, 1, 1, 0.001, 0.001]);
  teile.push(g); clips.push(clip('kollision'));
}

// ============ Aneinander vorbeischieben ============
{
  const g = new THREE.Group(); g.name = 'transform';
  { const b = new Bau(); b.box('mantel', -4.5, 4.5, -2.6, -1.0, -3.4, 3.4); b.box('mantelHell', -4.5, 4.5, -1.35, -1.0, -3.4, 3.401); g.add(b.bauen('tr_mantel')); }
  for (const [s, name] of [[-1, 'tr_platteL'], [1, 'tr_platteR']]) {
    const b = new Bau(), xa = s < 0 ? -4.5 : 0.02, xb = s < 0 ? -0.02 : 4.5;
    b.box('kontinent', xa, xb, -1.0, 0.1, -2.6, 2.6); b.box('gras', xa, xb, 0.1, 0.2, -2.6, 2.6);
    b.box('strasse', xa, xb, 0.2, 0.23, -0.35, 0.35); b.box('linie', xa, xb, 0.23, 0.24, -0.03, 0.03);
    for (let x = xa + 0.3; x < xb - 0.2; x += 0.7) b.box('zaun', x - 0.04, x + 0.04, 0.2, 0.7, 1.2, 1.28);
    b.box('zaun', xa, xb, 0.55, 0.6, 1.2, 1.28);
    for (const [x, z] of [[s * 2.5, -1.6], [s * 3.6, 2.0], [s * 1.2, -2.1]]) { const t = new THREE.ConeGeometry(0.25, 0.7, 10); t.translate(x, 0.55, z); b.add('baum', t); const st = new THREE.CylinderGeometry(0.05, 0.05, 0.2, 6); st.translate(x, 0.25, z); b.add('stamm', st); }
    g.add(b.bauen(name));
  }
  // Ruck: lange stillhalten, dann plötzlich verschieben
  const ruck = [[0, 0], [2.0, 0], [2.15, 0.35], [5.0, 0.35], [5.15, 0.7], [8.0, 0.7], [8.15, 1.05], [9.7, 1.05], [10, 0]];
  pos('tr_platteL', ruck.map(r => r[0]), ruck.map(r => [0, 0, r[1]]));
  pos('tr_platteR', ruck.map(r => r[0]), ruck.map(r => [0, 0, -r[1]]));
  // Erdbebenwellen breiten sich aus
  for (let i = 0; i < 3; i++) {
    const b = new Bau(); const ring = new THREE.TorusGeometry(1, 0.05, 6, 48); ring.rotateX(Math.PI / 2); b.add('beben', ring);
    const n = b.bauen('tr_welle' + i); n.position.set(0, 0.35, 0); g.add(n);
    const t0 = [2.0, 5.0, 8.0][i];
    skal('tr_welle' + i, [0, t0, t0 + 0.1, t0 + 1.2, t0 + 1.25, 10], [0.001, 0.001, [0.3, 1, 0.3], [2.8, 1, 2.8], 0.001, 0.001]);
  }
  { const b = new Bau(); b.add('beben', prisma([[-0.3, 0.35], [0.05, 0.05], [-0.1, 0.0], [0.3, -0.35], [-0.02, -0.02], [0.12, 0.03]], 0, 0.06)); const n = b.bauen('tr_beben'); n.position.set(0, 1.4, 0); g.add(n); }
  skal('tr_beben', [0, 1.95, 2.05, 2.8, 2.9, 4.95, 5.05, 5.8, 5.9, 7.95, 8.05, 8.8, 8.9, 10], [0.001, 0.001, 1.6, 1.6, 0.001, 0.001, 1.6, 1.6, 0.001, 0.001, 1.6, 1.6, 0.001, 0.001]);
  { const b = new Bau(); pfeil(b, 'pfeil', -2.2, 0.26, -1.0, [0, 1], 1.3, true); pfeil(b, 'pfeil', 2.2, 0.26, -1.0, [0, -1], 1.3, true); g.add(b.bauen('tr_pfeile')); }
  teile.push(g); clips.push(clip('transform'));
}

const root = new THREE.Group(); root.name = 'plattentektonik';
for (const t of teile) root.add(t);
const scene = new THREE.Scene(); scene.add(root);
const glb = await new GLTFExporter().parseAsync(scene, { binary: true, animations: clips });
const out = (process.argv[2] || '.') + '/plattentektonik.glb';
fs.writeFileSync(out, Buffer.from(glb));
console.log(out, (fs.statSync(out).size / 1024).toFixed(0), 'KB', '| Clips:', clips.map(c => c.name + '(' + c.tracks.length + ')').join(' '));
