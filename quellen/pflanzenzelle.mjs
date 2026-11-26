// Erzeugt modelle/zelle56.glb (Klasse 5–6) und modelle/zelle78.glb (Klasse 7–8):
// Palisadenzelle eines Laubblatts, Maße in Mikrometern (µm), nach Lehrbuch-/Fachangaben:
//   Zelle säulenförmig ca. 20 × 52 µm · Zellwand 0,5 µm · zentrale Vakuole ≈ ¾ des Zellinneren
//   Zellkern wandständig, linsenförmig ca. 6 µm · ca. 40 Chloroplasten an der Wand, je ca. 5,5 × 3 × 2 µm
//   Mitochondrien ca. 1,4 × 0,5 µm (rund 4-mal kürzer als Chloroplasten) · viele Dictyosomen (je ca. 1 µm)
//   ER geht aus der äußeren Kernhülle hervor · Zellmembran (real ca. 0,008 µm) im Modell 0,06 µm dick
// Die Zelle ist vorne der Länge nach aufgeschnitten (Schnittebene z = 0); was die Ebene schneidet, zeigt sein Inneres.
// Aufruf: node pflanzenzelle.mjs <Ausgabeordner>
// npm-Pakete: three@0.160 three-bvh-csg three-mesh-bvh @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions
// Am Ende werden die Dateien verdichtet (Punkte zusammengeführt, Koordinaten quantisiert – KHR_mesh_quantization, lädt ohne Zusatz).
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'fs';
import { Brush, Evaluator, SUBTRACTION, INTERSECTION } from 'three-bvh-csg';
import { NodeIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, quantize } from '@gltf-transform/functions';

globalThis.FileReader = class {
  readAsArrayBuffer(b) { b.arrayBuffer().then(r => { this.result = r; this.onloadend && this.onloadend(); }); }
  readAsDataURL(b) { b.arrayBuffer().then(r => { this.result = 'data:application/octet-stream;base64,' + Buffer.from(r).toString('base64'); this.onloadend && this.onloadend(); }); }
};

let saat = 4711;
const zufall = () => ((saat = (saat * 16807) % 2147483647) / 2147483647);
const zw = (a, b) => a + (b - a) * zufall();
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- Materialien ----------
const D = THREE.DoubleSide;
const FARBEN = {
  wand: [0x8bbf5c, {}], wandSchnitt: [0xc5e1a5, {}], wandKante: [0x6e9e45, {}], tuepfel: [0x3e6b1f, {}],
  membran: [0xf2c14e, {}], membranSchnitt: [0xf7d98a, {}],
  plasma: [0xfff3b0, { transparent: true, opacity: 0.12, depthWrite: false }], plasmaSchnitt: [0xffe680, { transparent: true, opacity: 0.5, depthWrite: false }],
  vakuole: [0x9fd3f5, { transparent: true, opacity: 0.12, roughness: 0.15, depthWrite: false }],
  vakuoleSchnitt: [0xc4e6fb, { transparent: true, opacity: 0.07, depthWrite: false }],
  tonoplast: [0x5aa7e0, { transparent: true, opacity: 0.18, roughness: 0.2, depthWrite: false }],
  kernHuelle: [0x9c6ad6, {}], kernInnen: [0xd9c3f3, { side: D }], kernSchnitt: [0x7d4fb8, {}], kernpore: [0x4a2a7a, {}],
  nucleolus: [0x4a148c, {}], nucleolusSchnitt: [0x6a2cb0, {}], chromatin: [0x7e3fbf, {}],
  chloroHuelle: [0x3d9a40, {}], chloroInnen: [0x9ccc65, { side: D }], chloroSchnitt: [0x1b5e20, {}],
  thylakoid: [0x1b5e20, {}], thylakoidSchnitt: [0x33691e, {}], stromaLamelle: [0x2e7d32, {}], staerke: [0xf5f5f0, {}], plastoglobulus: [0x5d4037, {}],
  mitoHuelle: [0xe8741e, {}], mitoInnen: [0xffd29a, { side: D }], mitoSchnitt: [0xb85a12, {}], cristae: [0xf08a2c, {}],
  er: [0x5c6bc0, {}], ribosom: [0x263238, {}], ribosomKlein: [0x546e7a, {}], mrna: [0xe53935, {}], protein: [0x43a047, {}],
  golgi: [0xec5f98, {}], vesikel: [0xf48fb1, {}], massstab: [0x111111, {}],
};
const matCache = {};
function mat(k) {
  if (!matCache[k]) { const [c, o] = FARBEN[k]; matCache[k] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.65, metalness: 0, name: k, ...o }); }
  return matCache[k];
}

// ---------- Baukasten: sammelt Geometrien je Material, eine Gruppe je Teil ----------
const nurPN = g => { g = g.index ? g.toNonIndexed() : g; for (const a of Object.keys(g.attributes)) if (a !== 'position' && a !== 'normal') g.deleteAttribute(a); if (!g.attributes.normal) g.computeVertexNormals(); return g; };
class Bau {
  constructor() { this.teile = {}; }
  add(k, g, M) { g = nurPN(g.clone()); if (M) g.applyMatrix4(M); (this.teile[k] ||= []).push(g); }
  bauen(name) {
    const grp = new THREE.Group(); grp.name = name;
    for (const [k, gs] of Object.entries(this.teile)) { const m = new THREE.Mesh(mergeVertices(mergeGeometries(gs), 1e-4), mat(k)); m.name = name + '_' + k; grp.add(m); }
    return grp;
  }
}

// ---------- Schnitt (CSG) ----------
const csg = new Evaluator(); csg.useGroups = true; csg.attributes = ['position', 'normal'];
function brush(teile) {           // teile: [[geometrie, materialschlüssel], …] – alle zusammen ein geschlossener Körper
  const g = mergeGeometries(teile.map(([x]) => nurPN(x.clone())), true);
  const b = new Brush(g, teile.map(([, k]) => mat(k))); b.updateMatrixWorld(); return b;
}
function kiste(x0, x1, y0, y1, z0, z1, k) { const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return brush([[g, k]]); }
function nachBau(b, br) {
  const g = br.geometry, mats = Array.isArray(br.material) ? br.material : [br.material];
  const gruppen = g.groups.length ? g.groups : [{ start: 0, count: g.attributes.position.count, materialIndex: 0 }];
  const n = g.index ? g.toNonIndexed() : g;
  for (const gr of gruppen) {
    if (!gr.count) continue;
    const t = new THREE.BufferGeometry();
    for (const a of ['position', 'normal']) t.setAttribute(a, new THREE.BufferAttribute(n.attributes[a].array.slice(gr.start * 3, (gr.start + gr.count) * 3), 3));
    b.add(mats[gr.materialIndex].name, t);
  }
}
const ZC = 0;                                         // Schnittebene: alles mit z > ZC ist weggeschnitten
const vorn = k => kiste(-200, 200, -200, 200, ZC, 200, k);
const schneide = (br, k) => csg.evaluate(br, vorn(k), SUBTRACTION);
const deckelVon = (br, k) => csg.evaluate(br, vorn(k), INTERSECTION);
function lageZurEbene(g) { g.computeBoundingBox(); const bb = g.boundingBox; return bb.max.z <= ZC ? 'hinten' : bb.min.z >= ZC ? 'vorn' : 'quer'; }
// Dünne Dinge (Röhren, Körnchen) nicht rechnen, nur Dreiecke hinter der Ebene behalten
function abschneiden(g) {
  g = nurPN(g.clone()); const p = g.attributes.position, nn = g.attributes.normal, keepP = [], keepN = [];
  for (let i = 0; i < p.count; i += 3) {
    if (Math.max(p.getZ(i), p.getZ(i + 1), p.getZ(i + 2)) > ZC) continue;
    for (let j = 0; j < 3; j++) { keepP.push(p.getX(i + j), p.getY(i + j), p.getZ(i + j)); keepN.push(nn.getX(i + j), nn.getY(i + j), nn.getZ(i + j)); }
  }
  const r = new THREE.BufferGeometry(); r.setAttribute('position', new THREE.Float32BufferAttribute(keepP, 3)); r.setAttribute('normal', new THREE.Float32BufferAttribute(keepN, 3)); return r;
}
function umgedreht(g) {            // Innenfläche einer Schale: Dreiecke und Normalen umdrehen
  g = nurPN(g.clone()); const p = g.attributes.position.array, n = g.attributes.normal.array;
  for (let i = 0; i < p.length; i += 9) for (let j = 0; j < 3; j++) { [p[i + 3 + j], p[i + 6 + j]] = [p[i + 6 + j], p[i + 3 + j]]; [n[i + 3 + j], n[i + 6 + j]] = [n[i + 6 + j], n[i + 3 + j]]; }
  for (let i = 0; i < n.length; i++) n[i] = -n[i];
  return g;
}
const ellipsoid = (a, b, c, seg = 24) => { const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.66)); g.scale(a, b, c); return g; };
const schale = (aussen, innen, kA, kI) => [[aussen, kA], [umgedreht(innen), kI]];
function volumen(g) { g = nurPN(g.clone()); const p = g.attributes.position; let v = 0; const a = V(), b = V(), c = V(); for (let i = 0; i < p.count; i += 3) { a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2); v += a.dot(b.cross(c)) / 6; } return Math.abs(v); }

// ---------- Zellform: Säule mit abgerundetem Querschnitt und runden Enden ----------
const E_QUER = 2.6, E_LAENGS = 4;
const F = (a, b, c) => p => ((Math.abs(p.x / a) ** E_QUER + Math.abs(p.z / c) ** E_QUER) ** (E_LAENGS / E_QUER) + Math.abs(p.y / b) ** E_LAENGS) ** (1 / E_LAENGS);
function beule(d) { return 1 + 0.012 * Math.sin(3.1 * d.x + 1.3) * Math.cos(2.7 * d.y + 0.4) + 0.01 * Math.sin(4.3 * d.z + 0.7); }
function zellform(a, b, c, seg = 84) {
  const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75)), P = g.attributes.position, d = V(), f = F(a, b, c);
  for (let i = 0; i < P.count; i++) { d.fromBufferAttribute(P, i).normalize(); const r = beule(d) / f(d); P.setXYZ(i, d.x * r, d.y * r, d.z * r); }
  g.computeVertexNormals(); return g;
}
// Punkt auf der Fläche in Richtung d und Flächennormale dort
function flaeche(a, b, c, d) {
  const f = F(a, b, c), p = d.clone().normalize(); p.multiplyScalar(beule(p) / f(p));
  const h = 1e-3, n = V((f(V(p.x + h, p.y, p.z)) - f(V(p.x - h, p.y, p.z))), (f(V(p.x, p.y + h, p.z)) - f(V(p.x, p.y - h, p.z))), (f(V(p.x, p.y, p.z + h)) - f(V(p.x, p.y, p.z - h)))).normalize();
  return { p, n };
}

// ---------- Maße (µm) ----------
const A = 10, B = 26, C = 10;                 // Außenkante Zellwand (halbe Breite / Höhe / Tiefe)
const W = 0.5, MEM = 0.06, SCHICHT = 0.7;     // Zellwand, Zellmembran, Plasmaschicht zwischen Membran und Vakuole
const MI = [A - W - MEM, B - W - MEM, C - W - MEM];   // Innenseite der Membran
const VA = MI.map(x => x - SCHICHT);                  // Tonoplast (ohne Dellen)
// Lage in der Plasmaschicht: Punkt in Tiefe t unter der Membran, mit lokalem Achsensystem (x längs, y = Normale nach innen, z quer)
function anDerWand(d, t, drehung = 0) {
  const { p, n } = flaeche(MI[0], MI[1], MI[2], d), innen = n.clone().negate();
  let laengs = V(0, 1, 0).addScaledVector(n, -n.y); if (laengs.lengthSq() < 0.05) laengs = V(1, 0, 0).addScaledVector(n, -n.x);
  laengs.normalize().applyAxisAngle(innen, drehung);
  const quer = V().crossVectors(laengs, innen);
  const pos = p.clone().addScaledVector(innen, t);
  return { pos, M: new THREE.Matrix4().makeBasis(laengs, innen, quer).setPosition(pos), innen };
}
const zufallsRichtung = () => { let v; do { v = V(zw(-1, 1), zw(-1, 1), zw(-1, 1)); } while (v.lengthSq() > 1 || v.lengthSq() < 0.01); return v.normalize(); };

// Hindernisse (Ellipsoide in lokalen Koordinaten) für die Platzierung kleiner Organellen
const hindernisse = [];
function frei(p, abstand = 0.15) {
  for (const h of hindernisse) {
    const q = p.clone().applyMatrix4(h.inv);
    if ((q.x / (h.r.x + abstand)) ** 2 + (q.y / (h.r.y + abstand)) ** 2 + (q.z / (h.r.z + abstand)) ** 2 < 1) return false;
  }
  return true;
}
const merke = (M, r) => hindernisse.push({ inv: M.clone().invert(), r });

// ---------- Chloroplast ----------
const CL = V(2.75, 1.0, 1.55);   // Halbachsen: Länge 5,5 µm, Dicke 2 µm, Breite 3,1 µm
function granaStapel(detail) {     // Thylakoidstapel (Grana) und Stromalamellen im lokalen System
  const th = [], la = [], stapel = [], dx = detail ? 0.62 : 0.8;
  for (let x = -2.4; x <= 2.4; x += dx) for (let z = -1.3; z <= 1.3; z += dx * 0.87) {
    const xx = x + (Math.round(z / (dx * 0.87)) % 2 ? dx / 2 : 0);
    const q = (xx / (CL.x - 0.3)) ** 2 + (z / (CL.z - 0.25)) ** 2; if (q > 1) continue;
    const h = (CL.y - 0.15) * Math.sqrt(1 - q), n = Math.max(2, Math.min(detail ? 12 : 8, Math.floor(1.7 * h / 0.06)));
    const y0 = zw(-0.15, 0.15) * h - n * 0.06 / 2, r = zw(0.22, 0.3);
    for (let i = 0; i < n; i++) { const g = new THREE.CylinderGeometry(r, r, 0.04, detail ? 16 : 7); g.translate(xx, y0 + i * 0.06, z); th.push(g); }
    stapel.push(V(xx, y0 + n * 0.03, z));
  }
  for (let i = 0; i < stapel.length; i++) for (let j = i + 1; j < stapel.length; j++) {     // Stromalamellen zu Nachbarstapeln
    const a = stapel[i], b = stapel[j], l = a.distanceTo(b); if (l > dx * 1.15) continue;
    const g = new THREE.BoxGeometry(l, 0.015, 0.12); g.rotateY(-Math.atan2(b.z - a.z, b.x - a.x)); g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); la.push(g);
  }
  return { th, la };
}
function chloroplastOffen(bau, M, detail) {      // aufgeschnitten: Hülle als Schale, innen Grana, Stärkekorn, Plastoglobuli
  const tr = g => { g = g.clone(); g.applyMatrix4(M); return g; };
  const huelle = detail
    ? [...schale(ellipsoid(CL.x, CL.y, CL.z, 64), ellipsoid(CL.x - 0.03, CL.y - 0.03, CL.z - 0.03, 64), 'chloroHuelle', 'chloroInnen'),
       ...schale(ellipsoid(CL.x - 0.06, CL.y - 0.06, CL.z - 0.06, 64), ellipsoid(CL.x - 0.09, CL.y - 0.09, CL.z - 0.09, 64), 'chloroHuelle', 'chloroInnen')]
    : schale(ellipsoid(CL.x, CL.y, CL.z, 32), ellipsoid(CL.x - 0.08, CL.y - 0.08, CL.z - 0.08, 32), 'chloroHuelle', 'chloroInnen');
  nachBau(bau, schneide(brush(huelle.map(([g, k]) => [tr(g), k])), 'chloroSchnitt'));
  const { th, la } = granaStapel(detail);
  nachBau(bau, schneide(brush([[tr(mergeGeometries(th.map(nurPN))), 'thylakoid']]), 'thylakoidSchnitt'));
  for (const g of la) bau.add('stromaLamelle', abschneiden(tr(g)));
  const st = ellipsoid(0.45, 0.2, 0.3, 16); st.translate(1.1, -0.35, 0.2); nachBau(bau, schneide(brush([[tr(st), 'staerke']]), 'staerke'));
  for (const [x, y, z] of [[-1.6, 0.3, -0.4], [0.4, -0.5, -0.6], [-0.6, 0.45, 0.5]]) { const g = new THREE.IcosahedronGeometry(0.07, 1); g.translate(x, y, z); bau.add('plastoglobulus', abschneiden(tr(g))); }
}

// ---------- Mitochondrium ----------
const MITO = { r: 0.27, l: 0.86 };   // Gesamtlänge 1,4 µm, Durchmesser 0,54 µm
const kapsel = (r, l, seg = 12) => new THREE.CapsuleGeometry(r, l, 4, seg).rotateZ(Math.PI / 2);   // längs x
function mitoDetail(bau) {           // Detail: Doppelmembran, innere Membran zu Cristae gefaltet, halb aufgeschnitten
  const R = 0.3, L = 1.0;
  nachBau(bau, schneide(brush([...schale(kapsel(R, L, 48), kapsel(R - 0.015, L, 48), 'mitoHuelle', 'mitoInnen')]), 'mitoSchnitt'));
  const ri = R - 0.045;
  // Cristae: Einstülpungen der inneren Membran als flache Platten, abwechselnd von oben und unten, auf den Innenraum begrenzt
  const platten = [];
  for (let i = 0; i < 9; i++) {
    const x = -0.75 + i * 0.19, oben = i % 2 === 0;
    const g = new THREE.BoxGeometry(0.03, ri * 1.35, ri * 1.7); g.translate(x, oben ? ri - ri * 0.67 : -ri + ri * 0.67, 0); platten.push(nurPN(g));
  }
  const cr = csg.evaluate(brush([[mergeGeometries(platten), 'cristae']]), brush([[kapsel(ri, L, 48), 'cristae']]), INTERSECTION);
  nachBau(bau, schneide(cr, 'mitoSchnitt'));
  nachBau(bau, schneide(brush([...schale(kapsel(ri, L, 48), kapsel(ri - 0.015, L, 48), 'cristae', 'mitoInnen')]), 'mitoSchnitt'));
  for (let i = 0; i < 6; i++) { const g = new THREE.IcosahedronGeometry(0.012, 0); g.translate(zw(-0.6, 0.6), zw(-0.12, 0.12), zw(-0.15, -0.02)); bau.add('ribosom', g); }
}

// ---------- Dictyosom (Golgi-Stapel) ----------
function dictyosom(bau, M, detail) {
  const n = detail ? 6 : 5;
  for (let i = 0; i < n; i++) {
    const r = 0.5 - Math.abs(i - (n - 1) / 2) * 0.04, g = ellipsoid(r, 0.035, r * 0.8, detail ? 28 : 10), P = g.attributes.position;
    for (let k = 0; k < P.count; k++) { const x = P.getX(k), z = P.getZ(k); P.setY(k, P.getY(k) + i * 0.1 + 0.35 * (x * x + z * z)); }   // gebogene Zisternen
    g.computeVertexNormals(); bau.add('golgi', g, M);
    if (detail) { const t = new THREE.TorusGeometry(r, 0.045, 8, 36); t.rotateX(Math.PI / 2); t.scale(1, 1, 0.8); t.translate(0, i * 0.1 + 0.35 * r * r * 0.9, 0); bau.add('golgi', t, M); }
  }
  const nv = detail ? 16 : 4;
  for (let i = 0; i < nv; i++) {
    const w = zw(0, Math.PI * 2), rr = zw(0.55, 0.68), y = zw(0, (n - 1) * 0.1) + 0.3;
    const g = new THREE.IcosahedronGeometry(detail ? 0.05 : 0.06, detail ? 2 : 0); g.translate(Math.cos(w) * rr, y, Math.sin(w) * rr * 0.8); bau.add('vesikel', g, M);
  }
}

function massstab(bau, laenge, pos, dicke) {
  const g = new THREE.BoxGeometry(laenge, dicke, dicke); g.translate(pos.x, pos.y, pos.z); bau.add('massstab', g);
  for (const s of [-1, 1]) { const t = new THREE.BoxGeometry(dicke, dicke * 4, dicke); t.translate(pos.x + s * laenge / 2, pos.y, pos.z); bau.add('massstab', t); }
}

// =====================================================================
function bauen(stufe) {
  saat = 4711; hindernisse.length = 0;
  const s78 = stufe === 78, teile = [], kennzahlen = {};

  // ---- Zellkern: wandständig, linsenförmig, von der Schnittebene halbiert ----
  const KR = V(3.2, 1.6, 2.8);                    // Halbachsen: längs, Dicke (zur Zellmitte), quer
  const kern = anDerWand(V(-1, 0.22, 0), KR.y + 0.12);
  merke(kern.M, KR);
  // ---- Chloroplasten an der Wand verteilen (Abstand so, dass sie sich nicht durchdringen) ----
  const chloros = [];
  for (let versuch = 0; versuch < 20000 && chloros.length < 40; versuch++) {
    const d = zufallsRichtung(), w = anDerWand(d, CL.y + 0.06, zw(-0.35, 0.35));
    if (w.pos.distanceTo(kern.pos) < 6.2) continue;
    if (chloros.some(c => { const q = w.pos.clone().applyMatrix4(c.inv); return (q.x / 5.9) ** 2 + (q.z / 3.4) ** 2 + (q.y / 2.6) ** 2 < 1; })) continue;
    if (Math.abs(w.pos.z - ZC) < 0.4) continue;    // nicht genau auf der Schnittkante (sonst nur Splitter)
    chloros.push({ ...w, inv: w.M.clone().invert() });
  }
  for (const c of chloros) merke(c.M, CL);
  kennzahlen.chloroplasten = chloros.length;

  // ---- Vakuole: Zellinneres minus Plasmaschicht, mit Dellen um Kern und Chloroplasten ----
  let vak = brush([[zellform(...VA, 84), s78 ? 'tonoplast' : 'vakuole']]);
  const delle = (M, r, extra) => { const g = ellipsoid(r.x + extra, r.y + extra, r.z + extra, 20); g.applyMatrix4(M); vak = csg.evaluate(vak, brush([[g, s78 ? 'tonoplast' : 'vakuole']]), SUBTRACTION); };
  delle(kern.M, KR, 0.35);
  for (const c of chloros) delle(c.M, CL, 0.12);
  const vInnen = volumen(zellform(...MI, 84)), vVak = volumen(vak.geometry);
  kennzahlen.vakuoleProzent = Math.round(100 * vVak / vInnen);

  // ---- Zellwand, Membran, Plasma, Deckel ----
  {
    const wand = brush(schale(zellform(A, B, C), zellform(A - W, B - W, C - W), 'wand', 'wand'));
    const mem = brush(schale(zellform(A - W, B - W, C - W), zellform(...MI), 'membran', 'membran'));
    { const b = new Bau(); nachBau(b, schneide(wand, 'wandSchnitt')); massstab(b, 10, V(0, -B - 3, 0), 0.3); teile.push(b.bauen('zellwand')); }
    { const b = new Bau(); nachBau(b, schneide(mem, 'membranSchnitt')); teile.push(b.bauen('zellmembran')); }
    { const b = new Bau(); nachBau(b, deckelVon(wand, 'wandSchnitt')); nachBau(b, deckelVon(mem, 'membranSchnitt')); teile.push(b.bauen('vorderseite')); }
    const plasma = csg.evaluate(brush([[zellform(...MI), 'plasma']]), vak, SUBTRACTION);
    { const b = new Bau(); nachBau(b, schneide(plasma, 'plasmaSchnitt')); teile.push(b.bauen('zellplasma')); }
    { const b = new Bau(); nachBau(b, schneide(vak, 'vakuoleSchnitt')); teile.push(b.bauen('vakuole')); }
  }

  // ---- Zellkern ----
  {
    const b = new Bau(), tr = g => g.clone().applyMatrix4(kern.M);
    const huelle = s78
      ? [...schale(ellipsoid(KR.x, KR.y, KR.z, 48), ellipsoid(KR.x - 0.03, KR.y - 0.03, KR.z - 0.03, 48), 'kernHuelle', 'kernHuelle'),
         ...schale(ellipsoid(KR.x - 0.07, KR.y - 0.07, KR.z - 0.07, 48), ellipsoid(KR.x - 0.1, KR.y - 0.1, KR.z - 0.1, 48), 'kernHuelle', 'kernInnen')]
      : schale(ellipsoid(KR.x, KR.y, KR.z, 48), ellipsoid(KR.x - 0.08, KR.y - 0.08, KR.z - 0.08, 48), 'kernHuelle', 'kernInnen');
    nachBau(b, schneide(brush(huelle.map(([g, k]) => [tr(g), k])), 'kernSchnitt'));
    const nu = ellipsoid(1.0, 0.75, 0.95, 28); nu.translate(0.6, 0.1, -0.5); nachBau(b, schneide(brush([[tr(nu), 'nucleolus']]), 'nucleolusSchnitt'));
    for (let f = 0; f < (s78 ? 14 : 8); f++) {     // Chromatin: feine Fäden im Kerninneren
      const pts = []; let p = V(zw(-2.2, 2.2), zw(-0.9, 0.9), zw(-2, 2));
      for (let i = 0; i < 9; i++) {
        pts.push(p.clone()); p.add(V(zw(-0.5, 0.5), zw(-0.3, 0.3), zw(-0.5, 0.5)));
        const q = (p.x / (KR.x - 0.4)) ** 2 + (p.y / (KR.y - 0.4)) ** 2 + (p.z / (KR.z - 0.4)) ** 2; if (q > 1) p.multiplyScalar(0.9 / Math.sqrt(q));
      }
      b.add('chromatin', abschneiden(tr(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.06, 5))));
    }
    if (s78) {                                    // Kernporen
      for (let i = 0; i < 100; i++) {
        const d = zufallsRichtung(), q = V(d.x * KR.x, d.y * KR.y, d.z * KR.z), n = V(d.x / KR.x, d.y / KR.y, d.z / KR.z).normalize();
        const t = new THREE.TorusGeometry(0.06, 0.025, 4, 8);
        t.applyMatrix4(new THREE.Matrix4().compose(q.addScaledVector(n, 0.01), new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), n), V(1, 1, 1)));
        b.add('kernpore', abschneiden(tr(t)));
      }
    }
    teile.push(b.bauen('zellkern'));
  }

  // ---- Chloroplasten: ganze Linsen, an der Schnittebene aufgeschnitten ----
  {
    const b = new Bau();
    for (const c of chloros) {
      const g = ellipsoid(CL.x, CL.y, CL.z, 20); g.applyMatrix4(c.M);
      const l = lageZurEbene(g);
      if (l === 'hinten') b.add('chloroHuelle', g);
      else if (l === 'quer') chloroplastOffen(b, c.M, false);
    }
    teile.push(b.bauen('chloroplasten'));
  }

  if (s78) {
    // ---- ER: Röhrennetz in der Plasmaschicht, geht aus der äußeren Kernhülle hervor; raues ER mit Ribosomen ----
    const tiefe = 0.32;
    {
      const b = new Bau(); let ribos = 0;
      const imKern = p => { const q = p.clone().applyMatrix4(hindernisse[0].inv); return (q.x / KR.x) ** 2 + (q.y / KR.y) ** 2 + (q.z / KR.z) ** 2 < 1; };
      const wege = [];
      // Röhre von p aus in Richtung `richtung` an der Wand entlang; weicht Organellen aus
      const laufe = (p, richtung, schritte) => {
        const pts = [p.clone()];
        for (let i = 0; i < schritte; i++) {
          let ok = false;
          for (let t = 0; t < 14 && !ok; t++) {
            const r = richtung.clone().applyAxisAngle(p.clone().normalize(), zw(-1, 1) * (0.35 + t * 0.12)).normalize();
            const kand = anDerWand(p.clone().addScaledVector(r, 0.5), tiefe).pos;
            if (!imKern(kand) && (frei(kand, 0.12) || i < 2)) { richtung = kand.clone().sub(p).normalize(); p = kand; ok = true; }
          }
          if (!ok) break;
          pts.push(p.clone());
        }
        return pts;
      };
      const roehre = (pts, rau) => {
        if (pts.length < 4) return;
        wege.push(pts);
        const kurve = new THREE.CatmullRomCurve3(pts);
        b.add('er', abschneiden(new THREE.TubeGeometry(kurve, pts.length * 4, 0.09, 5)));
        if (rau) for (let k = 0; k < 40; k++) {          // raues ER: Ribosomen auf dem kernnahen Abschnitt
          const u = zw(0, 0.5), q = kurve.getPointAt(u), tg = kurve.getTangentAt(u), seite = zufallsRichtung().cross(tg).normalize();
          const r = new THREE.IcosahedronGeometry(0.035, 0); r.translate(...q.addScaledVector(seite, 0.11).toArray()); b.add('ribosom', abschneiden(r)); ribos++;
        }
      };
      for (let s = 0; s < 24; s++) {
        // Start: am Rand der Kernlinse, auf der äußeren Kernhülle
        const w = s / 24 * Math.PI * 2, lok = V(Math.cos(w) * KR.x * 0.98, -KR.y * 0.25, Math.sin(w) * KR.z * 0.98);
        const pts = laufe(lok.clone().applyMatrix4(kern.M), V(Math.cos(w), 0, Math.sin(w)).transformDirection(kern.M), 30);
        roehre(pts, true);
        // Verzweigungen
        for (let z = 0; z < 2 && pts.length > 8; z++) {
          const i = Math.floor(zw(0.3, 0.9) * pts.length), tg = pts[Math.min(i + 1, pts.length - 1)].clone().sub(pts[i]).normalize();
          roehre([pts[i], ...laufe(pts[i], tg.applyAxisAngle(pts[i].clone().normalize(), zufall() < 0.5 ? 1.1 : -1.1), 14).slice(1)], false);
        }
      }
      // Querverbindungen zwischen benachbarten Röhren (Netz)
      for (let i = 0; i < wege.length; i++) for (let j = i + 1; j < wege.length; j++) {
        const a = wege[i][Math.floor(wege[i].length * 0.6)], c = wege[j][Math.floor(wege[j].length * 0.6)];
        if (a.distanceTo(c) < 3.5 && frei(a.clone().lerp(c, 0.5), 0.1)) {
          const m = anDerWand(a.clone().lerp(c, 0.5), tiefe).pos;
          b.add('er', abschneiden(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([a, m, c]), 10, 0.07, 6)));
        }
      }
      teile.push(b.bauen('er'));
      kennzahlen.erRibosomen = ribos;
    }
    // ---- Mitochondrien ----
    {
      const b = new Bau(); let n = 0;
      for (let v = 0; v < 20000 && n < 45; v++) {
        const w = anDerWand(zufallsRichtung(), 0.36, zw(0, Math.PI * 2));
        if (!frei(w.pos, 0.85)) continue;
        const g = kapsel(MITO.r, MITO.l, 8); g.applyMatrix4(w.M);
        const l = lageZurEbene(g);
        if (l === 'vorn') continue;
        if (l === 'hinten') b.add('mitoHuelle', g);
        else nachBau(b, schneide(brush([[g, 'mitoHuelle']]), 'mitoSchnitt'));
        merke(w.M, V(MITO.l / 2 + MITO.r, MITO.r, MITO.r)); n++;
      }
      teile.push(b.bauen('mitochondrien')); kennzahlen.mitochondrien = n;
    }
    // ---- Dictyosomen (Golgi-Apparat) ----
    {
      const b = new Bau(); let n = 0;
      for (let v = 0; v < 20000 && n < 12; v++) {
        const w = anDerWand(zufallsRichtung(), 0.12, zw(0, Math.PI * 2));
        if (w.pos.z > ZC - 0.7 || !frei(w.pos.clone().addScaledVector(w.innen, 0.25), 0.7)) continue;
        dictyosom(b, w.M, false); merke(w.M, V(0.7, 0.6, 0.6)); n++;
      }
      teile.push(b.bauen('golgi')); kennzahlen.dictyosomen = n;
    }
    // ---- freie Ribosomen (vergrößert gezeichnet) ----
    {
      const b = new Bau(); let n = 0;
      for (let v = 0; v < 40000 && n < 400; v++) {
        const w = anDerWand(zufallsRichtung(), zw(0.15, 0.6));
        if (w.pos.z > ZC || !frei(w.pos, 0.06)) continue;
        const g = new THREE.IcosahedronGeometry(0.045, 0); g.translate(w.pos.x, w.pos.y, w.pos.z); b.add('ribosom', g); n++;
      }
      teile.push(b.bauen('ribosomen'));
    }
    // ---- Tüpfel: dünne Stellen der Wand mit Plasmodesmen zu den Nachbarzellen ----
    {
      const b = new Bau();
      for (const d of [V(1, 0.5, -0.3), V(1, -0.4, -0.8), V(-1, -0.5, -0.6), V(-0.6, -0.15, -1), V(0.4, 0.3, -1), V(0.3, -0.7, -1), V(1, 0.05, -0.05), V(-1, -0.25, -0.02)]) {
        const { p, n } = flaeche(A - W / 2, B - W / 2, C - W / 2, d);
        const M = new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), n), V(1, 1, 1));
        b.add('tuepfel', abschneiden(new THREE.CylinderGeometry(0.55, 0.55, W + 0.16, 24).applyMatrix4(M)));
        for (const [dx, dz] of [[-0.2, 0], [0.2, 0], [0, 0.2], [0, -0.2], [0, 0]]) {
          const s = new THREE.CylinderGeometry(0.03, 0.03, W + 0.3, 6); s.translate(dx, 0, dz); b.add('membran', abschneiden(s.applyMatrix4(M)));
        }
      }
      teile.push(b.bauen('tuepfel'));
    }
  }

  // ---------- Detailansichten (eigene Größe, nur bei Auswahl sichtbar) ----------
  { const b = new Bau(); chloroplastOffen(b, new THREE.Matrix4(), true); massstab(b, 1, V(0, -1.5, 0), 0.03); teile.push(b.bauen('chloroplasten_detail')); }
  if (s78) {
    { const b = new Bau(); mitoDetail(b); massstab(b, 0.5, V(0, -0.5, 0), 0.012); teile.push(b.bauen('mitochondrien_detail')); }
    { const b = new Bau(); dictyosom(b, new THREE.Matrix4(), true); massstab(b, 0.5, V(0, -0.35, 0), 0.012); teile.push(b.bauen('golgi_detail')); }
    { // Ribosom: große und kleine Untereinheit, dazwischen mRNA, wachsende Proteinkette (schematisch, ca. 25 nm)
      const b = new Bau();
      const gross = new THREE.SphereGeometry(1, 32, 20); gross.scale(1.0, 0.75, 0.85); b.add('ribosom', gross);
      const klein = new THREE.SphereGeometry(1, 32, 20); klein.scale(0.8, 0.45, 0.65); klein.translate(0.05, 0.95, 0); b.add('ribosomKlein', klein);
      const pts = []; for (let i = 0; i <= 20; i++) pts.push(V(-2.2 + i * 0.22, 0.62 + 0.08 * Math.sin(i * 1.3), 0.15 * Math.cos(i)));
      b.add('mrna', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.06, 8));
      for (let i = 0; i < 9; i++) { const g = new THREE.IcosahedronGeometry(0.11, 1); g.translate(0.2 + 0.12 * Math.sin(i), -0.7 - i * 0.18, 0.5 + 0.15 * Math.cos(i * 1.7)); b.add('protein', g); }
      teile.push(b.bauen('ribosomen_detail'));
    }
    { // Tüpfel im Querschnitt: zwei Nachbarzellwände, an der dünnen Stelle nur die Mittellamelle, Plasmodesmen hindurch
      const b = new Bau(), d = 0.5, L = 2.6, R = 0.9;
      const M = new THREE.Matrix4().makeRotationY(-Math.PI / 2);
      const form = new THREE.Shape();
      form.moveTo(-L, -L); form.lineTo(0, -L); form.lineTo(0, -R); form.absarc(0, 0, R, -Math.PI / 2, -3 * Math.PI / 2, true); form.lineTo(0, L); form.lineTo(-L, L); form.lineTo(-L, -L);
      for (const sgn of [-1, 1]) {
        const w = new THREE.ExtrudeGeometry(form, { depth: d, bevelEnabled: false, curveSegments: 24 }); w.translate(0, 0, sgn > 0 ? 0.06 : -0.06 - d); b.add('wand', w, M);
        const m = new THREE.BoxGeometry(L, 2 * L, 0.03); m.translate(-L / 2, 0, sgn * (0.06 + d + 0.015)); b.add('membran', m, M);
        const r = new THREE.CylinderGeometry(R, R, d, 24, 1, true, Math.PI, Math.PI); r.rotateX(Math.PI / 2); r.translate(0, 0, sgn * (0.06 + d / 2)); b.add('membran', r, M);
      }
      const ml = new THREE.BoxGeometry(L, 2 * L, 0.12); ml.translate(-L / 2, 0, 0); b.add('wandKante', ml, M);
      for (const [x, y] of [[-0.05, 0], [-0.05, 0.5], [-0.05, -0.5], [-0.45, 0.25], [-0.45, -0.25], [-0.7, 0]]) {
        const c = new THREE.CylinderGeometry(0.05, 0.05, 2 * (d + 0.09), 10); c.rotateX(Math.PI / 2); c.translate(x, y, 0); b.add('membran', c, M);
      }
      teile.push(b.bauen('tuepfel_detail'));
    }
  }
  return { teile, kennzahlen };
}

const out = process.argv[2] || '.';
for (const stufe of [56, 78]) {
  const { teile, kennzahlen } = bauen(stufe);
  const root = new THREE.Group(); root.name = 'zelle' + stufe;
  for (const t of teile) root.add(t);
  const scene = new THREE.Scene(); scene.add(root);
  let dreiecke = 0; root.traverse(o => { if (o.isMesh) dreiecke += o.geometry.index ? o.geometry.index.count / 3 : o.geometry.attributes.position.count / 3; });
  const glb = await new GLTFExporter().parseAsync(scene, { binary: true });
  const datei = `${out}/zelle${stufe}.glb`;
  const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS), doc = await io.readBinary(new Uint8Array(glb));
  await doc.transform(weld(), quantize({ quantizeNormal: 8 }));
  fs.writeFileSync(datei, Buffer.from(await io.writeBinary(doc)));
  console.log(datei, (fs.statSync(datei).size / 1024).toFixed(0), 'KB,', Math.round(dreiecke / 1000), 'Tsd. Dreiecke', JSON.stringify(kennzahlen));
}
