// Erzeugt modelle/villa.glb – römisches Stadthaus (Domus), Maße in Metern.
// Aufruf: node villa.mjs <Ausgabeordner>   (benötigt npm-Paket "three")
// Oberste Gruppen = Raum-IDs für den Viewer: fauces, atrium, cubicula, latrina, tablinum,
// triclinium, culina, peristyl, tabernae, sowie dach und umgebung.
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'fs';

globalThis.FileReader = class {
  readAsArrayBuffer(b) { b.arrayBuffer().then(r => { this.result = r; this.onloadend && this.onloadend(); }); }
  readAsDataURL(b) { b.arrayBuffer().then(r => { this.result = 'data:application/octet-stream;base64,' + Buffer.from(r).toString('base64'); this.onloadend && this.onloadend(); }); }
};

// ---------- Materialien ----------
const FARBEN = {
  putzRot: [0x9b2d20], putzHell: [0xeadfc4], putzGelb: [0xd9a441], holz: [0x7a4a24],
  stoffRot: [0xa83232], stoffBlau: [0x2f5d8a], stein: [0xbdb4a3], marmor: [0xf1ece0],
  mosaikW: [0xf2eee4], mosaikS: [0x262626], ziegel: [0xb5562f], wasser: [0x3f86c6, { roughness: 0.15 }],
  gras: [0x5c8a3a], blatt: [0x3f6f2a], ton: [0xc27a4a], bronze: [0x9c7a3c, { metalness: 0.6, roughness: 0.4 }],
  feuer: [0xff7a1a, { emissive: 0xff5a00, emissiveIntensity: 1 }], dunkel: [0x2a2622], lehm: [0x8b7d6b],
  boden: [0xc9b48f], strasse: [0x77746c], weg: [0xcfc2a2], papyrus: [0xe9dcb0], bluete: [0xd94f8a],
};
const matCache = {};
function mat(k) {
  if (!matCache[k]) {
    const [c, o = {}] = FARBEN[k];
    // Nur Dachflächen beidseitig; sonst Vorderseiten (verhindert Flackern durch aufeinanderliegende Rückseiten)
    matCache[k] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0, side: k === 'ziegel' ? THREE.DoubleSide : THREE.FrontSide, name: k, ...o });
  }
  return matCache[k];
}

// ---------- Baukasten: sammelt Geometrien je Material, verschmilzt sie am Ende ----------
class Bau {
  constructor() { this.teile = {}; }
  add(k, g) { g.deleteAttribute('uv'); (this.teile[k] ||= []).push(g.index ? g.toNonIndexed() : g); }
  box(k, x0, x1, y0, y1, z0, z1) {
    const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); this.add(k, g);
  }
  zyl(k, x, z, r, y0, y1, seg = 16, rOben = r) {
    const g = new THREE.CylinderGeometry(rOben, r, y1 - y0, seg); g.translate(x, (y0 + y1) / 2, z); this.add(k, g);
  }
  kugel(k, x, y, z, r, det = 1) { const g = new THREE.IcosahedronGeometry(r, det); g.translate(x, y, z); this.add(k, g); }
  bauen(name) {
    const grp = new THREE.Group(); grp.name = name;
    for (const [k, gs] of Object.entries(this.teile)) {
      const m = new THREE.Mesh(mergeGeometries(gs), mat(k)); m.name = name + '_' + k; grp.add(m);
    }
    return grp;
  }
}

// ---------- Wände ----------
const H = 3.5, T = 0.2, TUER = 2.4, SOCKEL = 1.1;
function wandStueck(b, achse, a0, a1, c, y0, y1, k) {
  if (a1 - a0 < 0.01) return;
  if (achse === 'x') b.box(k, a0, a1, y0, y1, c - T / 2, c + T / 2);
  else b.box(k, c - T / 2, c + T / 2, y0, y1, a0, a1);
}
function wand(b, achse, a0, a1, c, tueren = []) {
  let cur = a0; const voll = [];
  for (const [d0, d1] of [...tueren].sort((p, q) => p[0] - q[0])) {
    voll.push([cur, d0]); cur = d1;
    wandStueck(b, achse, d0, d1, c, TUER, H, 'putzHell'); // Sturz über der Tür
  }
  voll.push([cur, a1]);
  for (const [s0, s1] of voll) {
    wandStueck(b, achse, s0, s1, c, 0, SOCKEL, 'putzRot');   // pompejanisch roter Sockel
    wandStueck(b, achse, s0, s1, c, SOCKEL, H, 'putzHell');
  }
}
// Raum mit Boden und vier Wänden (innen eingerückt). Seite = false → keine Wand, Array → Türöffnungen.
function raum(b, { x0, x1, z0, z1, boden = 'boden', vorne = [], hinten = [], links = [], rechts = [] }) {
  b.box(boden, x0, x1, 0, 0.05, z0, z1);
  if (vorne !== false) wand(b, 'x', x0, x1, z1 - T / 2, vorne);
  if (hinten !== false) wand(b, 'x', x0, x1, z0 + T / 2, hinten);
  if (links !== false) wand(b, 'z', z0 + T, z1 - T, x0 + T / 2, links);
  if (rechts !== false) wand(b, 'z', z0 + T, z1 - T, x1 - T / 2, rechts);
}
function mosaikRand(b, x0, x1, z0, z1, s = 0.5, ein = 0.45) {
  const X0 = x0 + ein, Z0 = z0 + ein;
  const nx = Math.floor((x1 - ein - X0) / s), nz = Math.floor((z1 - ein - Z0) / s);
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    if (i > 0 && i < nx - 1 && j > 0 && j < nz - 1) continue;
    b.box((i + j) % 2 ? 'mosaikS' : 'mosaikW', X0 + i * s, X0 + (i + 1) * s, 0.05, 0.1, Z0 + j * s, Z0 + (j + 1) * s);
  }
}

// ---------- Dachflächen: Viereck aus 4 Eckpunkten [x,y,z] (Oberseite) ----------
function flaeche(b, k, p00, p10, p01, p11, t = 0.15) {
  const g = new THREE.BoxGeometry(1, 1, 1), P = g.attributes.position;
  const l = (a, c, s) => a.map((ai, i) => ai + (c[i] - ai) * s);
  for (let i = 0; i < P.count; i++) {
    const u = P.getX(i) + 0.5, v = P.getZ(i) + 0.5, w = P.getY(i) + 0.5;
    const p = l(l(p00, p10, u), l(p01, p11, u), v);
    P.setXYZ(i, p[0], p[1] - (1 - w) * t, p[2]);
  }
  g.computeVertexNormals(); b.add(k, g);
}
// Dach, das von einem äußeren Rechteck nach innen zu einer Öffnung abfällt (Atrium, Säulengang)
function innenDach(b, [ax0, ax1, az0, az1, hA], [ix0, ix1, iz0, iz1, hI]) {
  flaeche(b, 'ziegel', [ax0, hA, az0], [ax1, hA, az0], [ix0, hI, iz0], [ix1, hI, iz0]);          // hinten
  flaeche(b, 'ziegel', [ix0, hI, iz1], [ix1, hI, iz1], [ax0, hA, az1], [ax1, hA, az1]);          // vorne
  flaeche(b, 'ziegel', [ax0, hA, az0], [ix0, hI, iz0], [ax0, hA, az1], [ix0, hI, iz1]);          // links
  flaeche(b, 'ziegel', [ix1, hI, iz0], [ax1, hA, az0], [ix1, hI, iz1], [ax1, hA, az1]);          // rechts
}
// Satteldach mit First parallel zur x-Achse, plus Giebeldreiecke
function satteldach(b, x0, x1, z0, z1, hTrauf, hFirst, u = 0.3) {
  const zr = (z0 + z1) / 2;
  flaeche(b, 'ziegel', [x0 - u, hTrauf, z0 - u], [x1 + u, hTrauf, z0 - u], [x0 - u, hFirst, zr], [x1 + u, hFirst, zr]);
  flaeche(b, 'ziegel', [x0 - u, hFirst, zr], [x1 + u, hFirst, zr], [x0 - u, hTrauf, z1 + u], [x1 + u, hTrauf, z1 + u]);
  for (const x of [x0, x1 - T]) {
    const s = new THREE.Shape([new THREE.Vector2(-z0, H), new THREE.Vector2(-z1, H), new THREE.Vector2(-zr, hFirst - 0.15)]);
    const g = new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: false });
    g.rotateY(Math.PI / 2); g.translate(x, 0, 0); b.add('putzHell', g);
  }
}

// ---------- Möbel ----------
function bett(b, x0, x1, z0, z1) {
  b.box('holz', x0, x1, 0.05, 0.45, z0, z1);
  b.box('stoffBlau', x0 + 0.05, x1 - 0.05, 0.45, 0.6, z0 + 0.05, z1 - 0.05);
  const lang = (z1 - z0) > (x1 - x0);
  if (lang) b.box('stoffRot', x0 + 0.15, x1 - 0.15, 0.6, 0.72, z1 - 0.45, z1 - 0.1);
  else b.box('stoffRot', x1 - 0.45, x1 - 0.1, 0.6, 0.72, z0 + 0.15, z1 - 0.15);
}
function truhe(b, x0, x1, z0, z1, h = 0.5) { b.box('holz', x0, x1, 0.05, h, z0, z1); b.box('bronze', x0 - 0.01, x1 + 0.01, h - 0.08, h - 0.03, z0 - 0.01, z1 + 0.01); }
function liege(b, x0, x1, z0, z1) {
  b.box('holz', x0, x1, 0.05, 0.5, z0, z1);
  b.box('stoffRot', x0 + 0.04, x1 - 0.04, 0.5, 0.65, z0 + 0.04, z1 - 0.04);
}
function amphore(b, x, z, s = 1) {
  const pts = [[0, 0], [0.06, 0.02], [0.16, 0.25], [0.2, 0.45], [0.18, 0.62], [0.08, 0.72], [0.06, 0.85], [0.08, 0.88], [0, 0.88]]
    .map(([r, y]) => new THREE.Vector2(r * s, y * s));
  const g = new THREE.LatheGeometry(pts, 12); g.translate(x, 0.05, z); b.add('ton', g);
}
function saeule(b, x, z, h = 3.0) {
  b.box('stein', x - 0.25, x + 0.25, 0.05, 0.2, z - 0.25, z + 0.25);
  b.zyl('putzRot', x, z, 0.18, 0.2, 1.1, 14);
  b.zyl('marmor', x, z, 0.18, 1.1, h - 0.15, 14, 0.16);
  b.box('marmor', x - 0.27, x + 0.27, h - 0.15, h, z - 0.27, z + 0.27);
}

// =================== Räume ===================
const teile = [];

// Tabernae – zwei Läden zur Straße (links Weinladen, rechts Bäckerei)
{
  const b = new Bau();
  raum(b, { x0: -8, x1: -1.5, z0: 11, z1: 15, boden: 'lehm', vorne: [[-7.2, -2.3]] });
  b.box('stein', -7.0, -3.0, 0.05, 1.0, 13.2, 13.7);           // Theke
  b.box('putzRot', -7.02, -2.98, 0.2, 0.9, 13.69, 13.72);
  for (const x of [-6.3, -5.0, -3.7]) b.zyl('dunkel', x, 13.45, 0.17, 1.0, 1.01, 12); // eingelassene Vorratsgefäße (Dolia)
  for (const x of [-7.4, -6.8, -6.2, -5.6]) amphore(b, x, 11.55);
  raum(b, { x0: 1.5, x1: 8, z0: 11, z1: 15, boden: 'lehm', vorne: [[2.3, 7.2]] });
  // Backofen (Kuppel) und Getreidemühle
  { const g = new THREE.SphereGeometry(1.0, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2); g.translate(6.4, 0.6, 12.2); b.add('stein', g); }
  b.box('stein', 5.3, 7.5, 0.05, 0.6, 11.2, 13.3);
  b.box('dunkel', 6.05, 6.75, 0.65, 1.1, 13.06, 13.12);
  b.zyl('stein', 3.4, 12.3, 0.45, 0.05, 0.9, 14, 0.12);        // Mühle: unterer Kegel
  b.zyl('stein', 3.4, 12.3, 0.35, 1.15, 1.8, 14, 0.45);        // oberer Läufer
  b.box('holz', 2.4, 4.4, 1.35, 1.45, 12.25, 12.35);          // Griffstange
  b.box('holz', 3.0, 5.0, 0.05, 0.9, 13.7, 14.2);              // Verkaufstisch
  for (const x of [3.3, 3.8, 4.3, 4.7]) b.zyl('ton', x, 13.95, 0.16, 0.9, 1.0, 10, 0.14); // Brote
  teile.push(b.bauen('tabernae'));
}

// Fauces – Eingangsflur
{
  const b = new Bau();
  raum(b, { x0: -1.5, x1: 1.5, z0: 11, z1: 15, boden: 'dunkel', vorne: [[-1, 1]], hinten: [[-1, 1]] });
  b.box('marmor', -1, 1, 0.05, 0.1, 14.7, 15);                 // Schwelle
  b.box('mosaikW', -0.9, 0.9, 0.05, 0.07, 12.3, 13.9);         // Mosaikfeld (Wachhund)
  b.box('mosaikS', -0.5, 0.5, 0.07, 0.08, 12.9, 13.3);
  b.box('holz', -1.25, -1.15, 0.05, TUER, 13.9, 14.9);         // offene Türflügel
  b.box('holz', 1.15, 1.25, 0.05, TUER, 13.9, 14.9);
  teile.push(b.bauen('fauces'));
}

// Atrium – Empfangshalle mit Impluvium
{
  const b = new Bau();
  raum(b, {
    x0: -5, x1: 5, z0: 1, z1: 11, boden: 'mosaikW', vorne: [[-1, 1]],
    links: [[3, 4.5], [8, 9.5]], rechts: [[3, 4.5], [8, 9.5]],
    hinten: [[-4.5, -3.2], [-2, 2], [3.2, 4.5]],
  });
  mosaikRand(b, -5, 5, 1, 11);
  // Impluvium (Wasserbecken)
  b.box('stein', -1.5, 1.5, 0.05, 0.3, 4.5, 4.7); b.box('stein', -1.5, 1.5, 0.05, 0.3, 7.3, 7.5);
  b.box('stein', -1.5, -1.3, 0.05, 0.3, 4.7, 7.3); b.box('stein', 1.3, 1.5, 0.05, 0.3, 4.7, 7.3);
  b.box('wasser', -1.3, 1.3, 0.05, 0.2, 4.7, 7.3);
  // Lararium (Hausaltar)
  b.box('stein', -4.8, -4.2, 0.05, 1.0, 5.5, 7.0);
  b.box('putzGelb', -4.8, -4.25, 1.0, 1.8, 5.6, 6.9);
  flaeche(b, 'putzGelb', [-4.85, 2.05, 5.5], [-4.2, 1.8, 5.5], [-4.85, 2.05, 7.0], [-4.2, 1.8, 7.0], 0.1);
  b.zyl('bronze', -4.4, 6.0, 0.06, 1.0, 1.35, 8); b.kugel('bronze', -4.4, 1.42, 6.0, 0.08, 0);
  b.zyl('bronze', -4.4, 6.5, 0.06, 1.0, 1.35, 8); b.kugel('bronze', -4.4, 1.42, 6.5, 0.08, 0);
  // Arca (Geldtruhe)
  truhe(b, 3.9, 4.7, 5.6, 6.6, 0.85);
  // Marmortisch am Becken
  b.box('marmor', -0.8, 0.8, 0.05, 0.8, 3.6, 4.0);
  teile.push(b.bauen('atrium'));
}

// Cubicula – drei Schlafzimmer
{
  const b = new Bau();
  raum(b, { x0: -8, x1: -5, z0: 6, z1: 11, rechts: [[8, 9.5]] });
  bett(b, -7.75, -6.55, 9.0, 10.75); truhe(b, -6.3, -5.6, 10.2, 10.75);
  raum(b, { x0: -8, x1: -5, z0: 1, z1: 6, rechts: [[3, 4.5]] });
  bett(b, -7.75, -6.55, 1.25, 3.0); truhe(b, -7.7, -7.0, 5.1, 5.75);
  raum(b, { x0: 5, x1: 8, z0: 6, z1: 11, links: [[8, 9.5]] });
  bett(b, 6.55, 7.75, 9.0, 10.75); b.zyl('holz', 6.0, 10.4, 0.2, 0.05, 0.45, 10); // Hocker
  teile.push(b.bauen('cubicula'));
}

// Latrina – Toilette
{
  const b = new Bau();
  raum(b, { x0: 5, x1: 8, z0: 1, z1: 6, boden: 'stein', links: [[3, 4.5]] });
  b.box('stein', 6.9, 7.8, 0.05, 0.5, 1.2, 5.8);               // Sitzbank
  for (const z of [2.0, 3.2, 4.4]) b.zyl('dunkel', 7.3, z, 0.13, 0.5, 0.52, 12);
  b.box('wasser', 6.6, 6.85, 0.05, 0.09, 1.2, 5.8);            // Wasserrinne
  b.box('holz', 6.66, 6.7, 0.1, 0.8, 5.2, 5.24); b.kugel('papyrus', 6.68, 0.85, 5.22, 0.07, 0); // Schwamm am Stock
  teile.push(b.bauen('latrina'));
}

// Tablinum – Arbeitszimmer des Hausherrn
{
  const b = new Bau();
  raum(b, { x0: -2.5, x1: 2.5, z0: -4, z1: 1, boden: 'marmor', vorne: [[-2, 2]], hinten: [[-2, 2]] });
  b.box('holz', -2.3, -1.8, 0.05, 1.8, -3.6, -0.6);            // Schrank
  for (let i = 0; i < 6; i++) {                                // Schriftrollen
    const g = new THREE.CylinderGeometry(0.06, 0.06, 0.45, 8); g.rotateX(Math.PI / 2);
    g.translate(-2.05, 1.86 + (i % 2) * 0.1, -3.2 + i * 0.4); b.add('papyrus', g);
  }
  b.box('holz', 0.6, 2.1, 0.05, 0.8, -2.8, -1.9);              // Schreibtisch
  b.box('papyrus', 1.0, 1.6, 0.8, 0.81, -2.5, -2.1);
  b.box('bronze', 1.1, 1.6, 0.05, 0.45, -1.5, -1.1);           // Klappstuhl
  b.box('marmor', -0.3, 0.3, 0.05, 1.1, -3.7, -3.3);           // Ahnenbüste auf Sockel
  b.kugel('bronze', 0, 1.35, -3.5, 0.22, 1);
  teile.push(b.bauen('tablinum'));
}

// Triclinium – Speisezimmer mit drei Liegen
{
  const b = new Bau();
  raum(b, { x0: -8, x1: -2.5, z0: -4, z1: 1, boden: 'mosaikW', vorne: [[-4.5, -3.2]] });
  mosaikRand(b, -8, -2.5, -4, 1, 0.4, 0.3);
  liege(b, -6.9, -3.6, -3.7, -2.9);                            // hintere Liege
  liege(b, -7.7, -6.9, -3.7, -0.4);                            // linke Liege
  liege(b, -3.6, -2.8, -3.7, -0.4);                            // rechte Liege
  b.zyl('marmor', -5.25, -1.8, 0.08, 0.05, 0.55, 8);           // Tisch
  b.zyl('marmor', -5.25, -1.8, 0.55, 0.55, 0.6, 20);
  b.kugel('ton', -5.4, 0.66, -1.8, 0.07, 0); b.kugel('bluete', -5.15, 0.66, -1.7, 0.07, 0); b.kugel('putzGelb', -5.2, 0.66, -1.95, 0.07, 0);
  teile.push(b.bauen('triclinium'));
}

// Culina – Küche
{
  const b = new Bau();
  raum(b, { x0: 2.5, x1: 8, z0: -4, z1: 1, boden: 'lehm', vorne: [[3.2, 4.5]], hinten: [[5, 6.5]] });
  b.box('stein', 6.9, 7.8, 0.05, 0.9, -3.6, -0.8);             // gemauerter Herd
  for (const z of [-3.0, -1.6]) { b.zyl('feuer', 7.35, z, 0.2, 0.9, 1.2, 8, 0.0); b.box('holz', 7.1, 7.6, 0.9, 0.95, z - 0.05, z + 0.05); }
  b.zyl('bronze', 7.35, -1.6, 0.22, 1.25, 1.55, 14);           // Kessel
  for (const [dx, dz] of [[-0.2, -0.15], [0.2, -0.15], [0, 0.2]]) b.box('dunkel', 7.35 + dx - 0.02, 7.35 + dx + 0.02, 0.9, 1.25, -1.6 + dz - 0.02, -1.6 + dz + 0.02);
  b.zyl('bronze', 7.35, -3.0, 0.3, 1.2, 1.25, 14);             // Pfanne
  for (const z of [-3.5, -3.0, -2.5, -2.0]) amphore(b, 3.0, z);
  b.box('holz', 4.4, 6.0, 0.05, 0.8, -2.3, -1.5);              // Arbeitstisch
  b.zyl('ton', 4.8, -1.9, 0.18, 0.8, 0.95, 12, 0.22); b.box('stoffRot', 5.3, 5.7, 0.8, 0.85, -2.1, -1.7);
  teile.push(b.bauen('culina'));
}

// Peristyl – Garten mit Säulengang
{
  const b = new Bau();
  raum(b, { x0: -8, x1: 8, z0: -15, z1: -4, boden: 'weg', vorne: false });
  b.box('gras', -4.7, 4.7, 0.05, 0.12, -12.2, -6.8);
  // Säulen rund um den Garten
  const pos = new Set();
  for (let x = -5; x <= 5.01; x += 2.5) { pos.add(`${x},-6.5`); pos.add(`${x},-12.5`); }
  for (let z = -12.5; z <= -6.49; z += 2) { pos.add(`-5,${z}`); pos.add(`5,${z}`); }
  for (const p of pos) { const [x, z] = p.split(',').map(Number); saeule(b, x, z); }
  // Brunnen
  b.zyl('stein', 0, -9.5, 0.8, 0.12, 0.5, 20); b.zyl('wasser', 0, -9.5, 0.7, 0.5, 0.52, 20);
  b.zyl('marmor', 0, -9.5, 0.1, 0.5, 1.1, 10); b.zyl('marmor', 0, -9.5, 0.2, 1.1, 1.2, 14, 0.32);
  // Beete mit Hecken und Blüten
  for (const [x0, x1] of [[-4.3, -1.3], [1.3, 4.3]]) for (const [z0, z1] of [[-7.6, -7.1], [-11.9, -11.4]]) {
    b.box('blatt', x0, x1, 0.12, 0.6, z0, z1);
    for (let x = x0 + 0.3; x < x1; x += 0.6) b.kugel('bluete', x, 0.65, (z0 + z1) / 2, 0.1, 0);
  }
  // Bäume
  for (const x of [-3, 3]) { b.zyl('holz', x, -9.5, 0.12, 0.12, 1.7, 8); b.kugel('blatt', x, 2.2, -9.5, 0.8, 1); }
  // Statue
  b.box('marmor', -0.25, 0.25, 0.12, 0.8, -12.0, -11.5); b.zyl('marmor', 0, -11.75, 0.15, 0.8, 1.5, 10); b.kugel('marmor', 0, 1.62, -11.75, 0.12, 1);
  teile.push(b.bauen('peristyl'));
}

// Dach
{
  const b = new Bau();
  satteldach(b, -8, 8, 11, 15, 3.8, 5.2);                                          // Vorderhaus
  innenDach(b, [-8.3, 8.3, 1, 11, 4.3], [-1.5, 1.5, 4.5, 7.5, 3.7]);             // Atrium mit Compluvium
  satteldach(b, -8, 8, -4, 1, 3.8, 5.0);                                           // Hinterhaus
  innenDach(b, [-8.3, 8.3, -15.3, -4, 3.9], [-5.3, 5.3, -12.8, -6.2, 3.2]);      // Säulengang
  teile.push(b.bauen('dach'));
}

// Umgebung – Straße mit Trittsteinen
{
  const b = new Bau();
  b.box('strasse', -9, 9, -0.12, -0.02, -16, 18.5);
  b.box('stein', -9, 9, -0.02, 0.12, 15, 16.2);
  for (const x of [-0.9, 0, 0.9]) b.zyl('stein', x, 17.3, 0.3, -0.02, 0.2, 12);
  teile.push(b.bauen('umgebung'));
}

const root = new THREE.Group(); root.name = 'villa';
for (const t of teile) root.add(t);
const scene = new THREE.Scene(); scene.add(root);
const glb = await new GLTFExporter().parseAsync(scene, { binary: true });
const out = (process.argv[2] || '.') + '/villa.glb';
fs.writeFileSync(out, Buffer.from(glb));
console.log(out, (fs.statSync(out).size / 1024).toFixed(0), 'KB');
