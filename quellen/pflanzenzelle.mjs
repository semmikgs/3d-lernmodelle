// Erzeugt modelle/zelle56.glb (Klasse 5–6) und modelle/zelle78.glb (Klasse 7–8).
// Aufruf: node pflanzenzelle.mjs <Ausgabeordner>   (benötigt npm-Paket "three")
// Oberste Gruppen = Teil-IDs für den Viewer; "vorderseite" ist die abnehmbare Vorderwand.
// Die Zelle ist vorne offen; Kern, Chloroplasten und Mitochondrien sind zur Vorderseite hin aufgeschnitten.
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'fs';
import { Brush, Evaluator, SUBTRACTION, INTERSECTION, ADDITION } from 'three-bvh-csg';

globalThis.FileReader = class {
  readAsArrayBuffer(b) { b.arrayBuffer().then(r => { this.result = r; this.onloadend && this.onloadend(); }); }
  readAsDataURL(b) { b.arrayBuffer().then(r => { this.result = 'data:application/octet-stream;base64,' + Buffer.from(r).toString('base64'); this.onloadend && this.onloadend(); }); }
};

// ---------- Zufall mit festem Startwert (gleiches Modell bei jedem Lauf) ----------
let saat = 12345;
const zufall = () => ((saat = (saat * 16807) % 2147483647) / 2147483647);
const zw = (a, b) => a + (b - a) * zufall();

// ---------- Materialien ----------
const D = THREE.DoubleSide;
const FARBEN = {
  wand:       [0x8bbf5c, {}],
  wandKante:  [0x6e9e45, {}],
  wandSchnitt: [0xc5e1a5, {}],
  membranSchnitt: [0xf7d98a, {}],
  tuepfel:    [0x3e6b1f, {}],
  membran:    [0xf2c14e, {}],
  plasma:     [0xfff3b0, { transparent: true, opacity: 0.16 }],
  vakuole:    [0x7cc4f2, { transparent: true, opacity: 0.42, roughness: 0.2 }],
  tonoplast:  [0x3d8fd1, { side: D }],
  kernHuelle: [0x9c6ad6, { side: D }],
  kernInnen:  [0xc9a7ef, { side: D }],
  kernpore:   [0x4a2a7a, {}],
  nucleolus:  [0x4a148c, {}],
  chromatin:  [0x7e3fbf, {}],
  chloroHuelle: [0x2f7d32, { side: D }],
  chloroInnen:  [0x81c784, { side: D }],
  thylakoid:  [0x1b5e20, {}],
  mitoHuelle: [0xe8741e, { side: D }],
  mitoInnen:  [0xffc07a, { side: D }],
  cristae:    [0xf08a2c, { side: D }],
  ribosomKlein: [0x546e7a, {}],
  mrna:       [0xe53935, {}],
  protein:    [0x43a047, {}],
  erRau:      [0x5c6bc0, { side: D }],
  erGlatt:    [0x8e99e0, {}],
  ribosom:    [0x263238, {}],
  golgi:      [0xec5f98, { side: D }],
  vesikel:    [0xf48fb1, {}],
};
const matCache = {};
function mat(k) {
  if (!matCache[k]) {
    const [c, o] = FARBEN[k];
    matCache[k] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, metalness: 0, name: k, ...o });
  }
  return matCache[k];
}

class Bau {
  constructor() { this.teile = {}; }
  add(k, g, M) { g.deleteAttribute('uv'); if (M) g.applyMatrix4(M); (this.teile[k] ||= []).push(g.index ? g : mergeVertices(g)); }
  box(k, x0, x1, y0, y1, z0, z1) { const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); this.add(k, g); }
  kugel(k, p, r, det = 1, M) { const g = new THREE.IcosahedronGeometry(r, det); g.translate(p.x, p.y, p.z); this.add(k, g, M); }
  bauen(name) {
    const grp = new THREE.Group(); grp.name = name;
    for (const [k, gs] of Object.entries(this.teile)) { const m = new THREE.Mesh(mergeGeometries(gs), mat(k)); m.name = name + '_' + k; grp.add(m); }
    return grp;
  }
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const KIPP = -0.65;  // Schnittfläche zeigt nach oben-vorne (Blick meist von schräg oben)
const trafo = (pos, rot = [0, 0, 0], s = 1) => new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), V(s, s, s));

// Halbschale eines Ellipsoids: hintere Hälfte (z ≤ 0), offene Seite zeigt nach vorne (+z)
function halbschale(rx, ry, rz, seg = 20) {
  const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.6), Math.PI, Math.PI);
  g.scale(rx, ry, rz); return g;
}

// ---------- Einzelne Organellen ----------
function chloroplast(b, M, stufe) {
  b.add('chloroHuelle', halbschale(1, 0.5, 0.55), M);
  b.add('chloroInnen', halbschale(0.9, 0.42, 0.47), M);
  for (const sx of [-0.52, -0.18, 0.18, 0.52]) {
    const n = stufe === 78 ? 6 : 5, hoeheMax = 0.36 * Math.sqrt(1 - (sx / 0.9) ** 2);
    for (let i = 0; i < n; i++) {
      const yy = -hoeheMax + (i + 0.5) * (2 * hoeheMax / n);
      const d = new THREE.CylinderGeometry(0.13, 0.13, 0.045, 8); d.translate(sx, yy, -0.2); b.add('thylakoid', d, M);
    }
  }
  for (const yy of [-0.08, 0.1]) { const l = new THREE.BoxGeometry(1.2, 0.02, 0.1); l.translate(0, yy, -0.2); b.add('thylakoid', l, M); }
}
function mitochondrium(b, M) {
  b.add('mitoHuelle', halbschale(0.8, 0.34, 0.36), M);
  b.add('mitoInnen', halbschale(0.72, 0.28, 0.3), M);
  for (let i = 0; i < 6; i++) {
    const xx = -0.55 + i * 0.22, oben = i % 2 === 0, rand = 0.28 * Math.sqrt(Math.max(0, 1 - (xx / 0.72) ** 2));
    const h = rand * 1.3;
    const c = new THREE.BoxGeometry(0.035, h, 0.22); c.translate(xx, oben ? rand - h / 2 : -rand + h / 2, -0.12);
    b.add('cristae', c, M);
  }
}

// ---------- Zellform: abgerundeter, leicht unregelmäßiger Körper (Superellipsoid + sanfte Beulen) ----------
function beule(d) { return 1 + 0.022 * Math.sin(3.1 * d.x + 1.3) * Math.cos(2.7 * d.y + 0.4) + 0.018 * Math.sin(4.3 * d.z + 0.7) * Math.cos(1.9 * d.x); }
function zellform(A, B, C, p = 5, seg = 72) {
  const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.65)), P = g.attributes.position, d = new THREE.Vector3();
  for (let i = 0; i < P.count; i++) {
    d.set(P.getX(i), P.getY(i), P.getZ(i)).normalize();
    const r = 1 / Math.pow(Math.abs(d.x / A) ** p + Math.abs(d.y / B) ** p + Math.abs(d.z / C) ** p, 1 / p) * beule(d);
    P.setXYZ(i, d.x * r, d.y * r, d.z * r);
  }
  g.deleteAttribute('uv'); g.computeVertexNormals();
  return g;
}
const csg = new Evaluator(); csg.useGroups = true; csg.attributes = ['position', 'normal'];
const pinsel = (g, k) => { const b = new Brush(g, mat(k)); b.updateMatrixWorld(); return b; };
const schnittKiste = (x0, x1, y0, y1, z0, z1, k) => { const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); g.deleteAttribute('uv'); return pinsel(g, k); };
// Ergebnis einer Schnittberechnung nach Materialgruppen in den Baukasten übernehmen
function csgNach(b, brush) {
  const g = brush.geometry, mats = Array.isArray(brush.material) ? brush.material : [brush.material];
  const gruppen = g.groups.length ? g.groups : [{ start: 0, count: (g.index ? g.index.count : g.attributes.position.count), materialIndex: 0 }];
  const nicht = g.index ? g.toNonIndexed() : g;
  for (const gr of gruppen) {
    const teil = new THREE.BufferGeometry();
    for (const name of ['position', 'normal']) {
      const a = nicht.attributes[name];
      teil.setAttribute(name, new THREE.BufferAttribute(a.array.slice(gr.start * 3, (gr.start + gr.count) * 3), 3));
    }
    b.add(mats[gr.materialIndex].name, mergeVertices(teil));
  }
}

// ---------- Zellmaße ----------
const X = 5, Y = 3.5, ZH = -3.5, ZV = 3.5;  // Innenraum (Membran) x∈[-X,X], y∈[-Y,Y], z∈[ZH,ZV]
const W = 0.45, MEM = 0.08;                 // Wanddicke, Membrandicke

function bauen(stufe) {
  saat = 12345;
  const teile = [];
  const s78 = stufe === 78;

  // Zellwand, Membran und Plasma als abgerundete Schalen; oben und vorne aufgeschnitten
  {
    const OBEN = Y - 0.4, VORN = ZV - 0.4, C = (ZV - ZH) / 2;
    const aussen = pinsel(zellform(X + W, Y + W, C + W), 'wand');
    const innen = pinsel(zellform(X, Y, C), 'wandSchnitt');
    const wand = csg.evaluate(aussen, innen, SUBTRACTION);
    const memInnen = pinsel(zellform(X - MEM, Y - MEM, C - MEM), 'membranSchnitt');
    const membran = csg.evaluate(pinsel(zellform(X, Y, C), 'membran'), memInnen, SUBTRACTION);
    const offen = (brush, k) => csg.evaluate(csg.evaluate(brush, schnittKiste(-20, 20, OBEN, 20, -20, 20, k), SUBTRACTION), schnittKiste(-20, 20, -20, 20, VORN, 20, k), SUBTRACTION);
    const deckel = (brush, k) => csg.evaluate(brush, csg.evaluate(schnittKiste(-20, 20, OBEN, 20, -20, 20, k), schnittKiste(-20, 20, -20, 20, VORN, 20, k), ADDITION), INTERSECTION);
    { const b = new Bau(); csgNach(b, offen(wand, 'wandSchnitt')); teile.push(b.bauen('zellwand')); }
    { const b = new Bau(); csgNach(b, offen(membran, 'membranSchnitt')); teile.push(b.bauen('zellmembran')); }
    { const b = new Bau(); csgNach(b, deckel(wand, 'wandSchnitt')); csgNach(b, deckel(membran, 'membranSchnitt')); teile.push(b.bauen('vorderseite')); }
    { const b = new Bau(); csgNach(b, offen(pinsel(zellform(X - 0.14, Y - 0.14, C - 0.14, 5, 48), 'plasma'), 'plasma')); teile.push(b.bauen('zellplasma')); }
  }
  // Vakuole
  const VAK = { c: V(1.5, -0.25, -1.0), r: V(2.8, 2.1, 1.9) };
  {
    const b = new Bau();
    const g = new THREE.SphereGeometry(1, 48, 32); g.scale(VAK.r.x, VAK.r.y, VAK.r.z);
    // leicht unregelmäßige Form
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) { const v = V(P.getX(i), P.getY(i), P.getZ(i)); const f = 1 + 0.05 * Math.sin(v.x * 1.7) * Math.cos(v.y * 2.1) + 0.03 * Math.sin(v.z * 2.5); P.setXYZ(i, v.x * f, v.y * f, v.z * f); }
    g.computeVertexNormals(); g.translate(VAK.c.x, VAK.c.y, VAK.c.z);
    b.add('vakuole', g);
    if (s78) { // Tonoplast als feiner Rand (Äquatorlinie)
      const t = new THREE.TorusGeometry(1, 0.025, 6, 96); t.scale(VAK.r.x * 1.02, VAK.r.y * 1.02, 1); t.translate(VAK.c.x, VAK.c.y, VAK.c.z); b.add('tonoplast', t);
    }
    teile.push(b.bauen('vakuole'));
  }
  // Zellkern (vorne aufgeschnitten)
  const KERN = { c: V(-3.0, 1.0, 0.2), r: 1.3 };
  {
    const b = new Bau(), M = trafo(KERN.c, [KIPP, 0, 0]);
    b.add('kernHuelle', halbschale(KERN.r, KERN.r, KERN.r), M);
    if (s78) {
      b.add('kernInnen', halbschale(KERN.r - 0.1, KERN.r - 0.1, KERN.r - 0.1), M);
      // Kernporen als Ringe auf der Hülle
      for (let i = 0; i < 26; i++) {
        const th = zw(0.3, Math.PI - 0.3), ph = zw(Math.PI + 0.2, 2 * Math.PI - 0.2);
        const n = V(-Math.cos(ph) * Math.sin(th), Math.cos(th), Math.sin(ph) * Math.sin(th));
        const t = new THREE.TorusGeometry(0.1, 0.03, 6, 12);
        t.applyMatrix4(new THREE.Matrix4().compose(n.clone().multiplyScalar(KERN.r + 0.01), new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), n), V(1, 1, 1)));
        b.add('kernpore', t, M);
      }
    } else {
      b.add('kernInnen', halbschale(KERN.r - 0.03, KERN.r - 0.03, KERN.r - 0.03), M);
    }
    b.kugel('nucleolus', V(0.15, -0.1, -0.35), 0.45, 2, M);
    // Chromatin: feine Fäden
    for (let f = 0; f < (s78 ? 9 : 5); f++) {
      const pts = []; let p = V(zw(-0.6, 0.6), zw(-0.6, 0.6), zw(-0.8, -0.2));
      for (let i = 0; i < 8; i++) { pts.push(p.clone()); p.add(V(zw(-0.3, 0.3), zw(-0.3, 0.3), zw(-0.2, 0.2))); p.clampLength(0, 1.0); if (p.z > -0.05) p.z = -0.05; }
      b.add('chromatin', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.035, 4), M);
    }
    teile.push(b.bauen('zellkern'));
  }
  // Chloroplasten (aufgeschnitten, innen Grana)
  {
    const b = new Bau();
    const lagen = [
      [-4.0, -2.6, 1.8, 0.1], [-1.5, -2.8, 2.2, -0.15], [1.4, -2.85, 2.1, 0.2], [3.8, -2.6, 1.9, -0.1],
      [4.25, 0.3, 2.0, 1.45], [3.0, 2.75, 2.0, 0.1], [0.4, 2.8, 2.3, -0.2], [-0.6, 2.9, 2.75, 0.15],
      [4.2, 1.2, -2.4, 1.6], [-4.3, -0.9, -2.3, 1.5], [-1.2, -2.9, -2.6, 0.05], [-0.3, 2.8, -2.4, 0.1],
    ];
    for (const [x, y, z, rz] of lagen) {
      const s = 0.85, M = trafo(V(x, y, z), [KIPP + zw(-0.15, 0.15), zw(-0.2, 0.2), rz], s);
      chloroplast(b, M, stufe);
    }
    teile.push(b.bauen('chloroplasten'));
  }

  if (s78) {
    // Mitochondrien (aufgeschnitten, innen Cristae)
    {
      const b = new Bau();
      const lagen = [[-0.9, -1.3, 2.3, 0.4], [-2.3, -1.8, 1.4, -0.3], [3.9, -1.2, 1.1, 1.3], [-3.8, 2.4, -1.8, 0.2], [0.6, 1.8, 2.6, -0.5], [2.4, 1.8, 2.6, 0.3]];
      for (const [x, y, z, rz] of lagen) {
        const M = trafo(V(x, y, z), [KIPP + zw(-0.2, 0.2), zw(-0.2, 0.2), rz], 0.9);
        mitochondrium(b, M);
      }
      teile.push(b.bauen('mitochondrien'));
    }
    // Endoplasmatisches Retikulum: raues ER als Membransäcke vor dem Kern, glattes ER als Röhren
    {
      const b = new Bau();
      for (const [i, r] of [1.5, 1.68, 1.86].entries()) {
        const h = 1.5 - i * 0.12, t0 = Math.PI / 2 - 0.9;
        const g = new THREE.CylinderGeometry(r, r, h, 40, 1, true, t0, 1.8);
        g.translate(KERN.c.x, KERN.c.y - 0.3, KERN.c.z); b.add('erRau', g);
        for (let k = 0; k < 35; k++) {
          const th = zw(t0, t0 + 1.8), yy = zw(-h / 2, h / 2) + KERN.c.y - 0.3;
          b.kugel('ribosom', V(KERN.c.x + (r + 0.05) * Math.sin(th), yy, KERN.c.z + (r + 0.05) * Math.cos(th)), 0.045, 0);
        }
      }
      for (let t = 0; t < 4; t++) {
        const pts = []; let p = V(zw(-2.6, -1.6), zw(-1.4, -0.6), zw(0.4, 1.6));
        for (let i = 0; i < 7; i++) { pts.push(p.clone()); p.add(V(zw(-0.35, 0.35), zw(-0.3, 0.3), zw(-0.3, 0.3))); }
        b.add('erGlatt', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.07, 6));
      }
      teile.push(b.bauen('er'));
    }
    // Golgi-Apparat: Stapel gebogener, flacher Säckchen (Zisternen) + Bläschen an den Enden
    {
      const b = new Bau(), c = V(-0.4, -2.0, 1.4);
      const M = trafo(c, [KIPP * 0.6, 0, 0]);
      for (let i = 0; i < 5; i++) {
        const R = 0.75 + i * 0.16, bogen = 1.9 - i * 0.12;
        const g = new THREE.TorusGeometry(R, 0.055, 8, 32, bogen);
        g.rotateZ(Math.PI / 2 - bogen / 2);    // Bogen öffnet nach unten
        g.scale(1, 1, 5.5);                    // flach und tief: Säckchen
        g.translate(0, -0.9, 0); b.add('golgi', g, M);
        for (const sgn of [-1, 1]) {           // abgeschnürte Bläschen an den Enden
          const w = Math.PI / 2 + sgn * (bogen / 2 + 0.12);
          b.kugel('vesikel', V(R * Math.cos(w), R * Math.sin(w) - 0.9, zw(-0.15, 0.15)), 0.085, 1, M);
        }
      }
      for (let i = 0; i < 6; i++) b.kugel('vesikel', V(zw(-0.5, 0.5), zw(0.25, 0.55), zw(-0.2, 0.2)), zw(0.06, 0.09), 1, M);
      teile.push(b.bauen('golgi'));
    }
    // Ribosomen frei im Plasma
    {
      const b = new Bau(); let n = 0;
      while (n < 90) {
        const p = V(zw(-4.7, 4.7), zw(-3.2, 3.2), zw(-3.2, 3.2));
        const v = p.clone().sub(VAK.c).divide(VAK.r);
        if (v.length() < 1.12 || p.distanceTo(KERN.c) < KERN.r + 0.3) continue;
        b.kugel('ribosom', p, 0.05, 0); n++;
      }
      teile.push(b.bauen('ribosomen'));
    }
    // Tüpfel: dünne Stellen in der Zellwand mit Plasmasträngen
    {
      const b = new Bau();
      const stellen = [
        [V(-X - W / 2, 1.8, -1.5), [0, 0, Math.PI / 2]], [V(-X - W / 2, -1.6, 1.2), [0, 0, Math.PI / 2]],
        [V(X + W / 2, 1.5, -0.8), [0, 0, Math.PI / 2]], [V(X + W / 2, -2.0, 1.8), [0, 0, Math.PI / 2]],
        [V(-3.2, -Y - W / 2, 1.6), [0, 0, 0]], [V(2.6, -Y - W / 2, -1.9), [0, 0, 0]],
        [V(-1.5, -Y - W / 2, -0.5), [0, 0, 0]], [V(1.0, 0.6, ZH - W / 2), [Math.PI / 2, 0, 0]], [V(-2.8, -1.5, ZH - W / 2), [Math.PI / 2, 0, 0]],
      ];
      for (const [p, rot] of stellen) {
        const M = trafo(p, rot);
        b.add('tuepfel', new THREE.CylinderGeometry(0.32, 0.32, W + 0.35, 20), M);
        for (const [dx, dz] of [[-0.12, 0], [0.12, 0], [0, 0.12], [0, -0.12]]) {
          const s = new THREE.CylinderGeometry(0.025, 0.025, W + 0.4, 6); s.translate(dx, 0, dz); b.add('membran', s, M);
        }
      }
      teile.push(b.bauen('tuepfel'));
    }
  }
  // ---------- Detailansichten (nur bei Auswahl sichtbar) ----------
  { const b = new Bau(); chloroplast(b, trafo(V(0, 0, 0), [KIPP, 0, 0]), stufe); teile.push(b.bauen('chloroplasten_detail')); }
  if (s78) {
    { const b = new Bau(); mitochondrium(b, trafo(V(0, 0, 0), [KIPP, 0, 0])); teile.push(b.bauen('mitochondrien_detail')); }
    { // Ribosom: große und kleine Untereinheit, dazwischen mRNA
      const b = new Bau();
      const gross = new THREE.SphereGeometry(1, 32, 20); gross.scale(1.0, 0.75, 0.85); b.add('ribosom', gross);
      const klein = new THREE.SphereGeometry(1, 32, 20); klein.scale(0.8, 0.45, 0.65); klein.translate(0.05, 0.95, 0); b.add('ribosomKlein', klein);
      const pts = []; for (let i = 0; i <= 20; i++) { const x = -2.2 + i * 0.22; pts.push(V(x, 0.62 + 0.08 * Math.sin(i * 1.3), 0.15 * Math.cos(i))); }
      b.add('mrna', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.06, 8));
      // wachsende Proteinkette
      const kette = []; for (let i = 0; i < 9; i++) kette.push(V(0.2 + 0.12 * Math.sin(i), -0.7 - i * 0.18, 0.5 + 0.15 * Math.cos(i * 1.7)));
      for (const p of kette) b.kugel('protein', p, 0.11, 1);
      teile.push(b.bauen('ribosomen_detail'));
    }
    { // Tüpfel im Querschnitt: zwei Nachbarzellwände, an der dünnen Stelle nur die Mittellamelle, Plasmodesmen hindurch
      const b = new Bau(), d = 0.5, L = 2.6, R = 0.9;
      const M = trafo(V(0, 0, 0), [0, -Math.PI / 2, 0]);          // Schnittfläche (x = 0) zeigt nach vorne
      const form = new THREE.Shape();
      form.moveTo(-L, -L); form.lineTo(0, -L); form.lineTo(0, -R);
      form.absarc(0, 0, R, -Math.PI / 2, -3 * Math.PI / 2, true);  // halbkreisförmige Aussparung
      form.lineTo(0, L); form.lineTo(-L, L); form.lineTo(-L, -L);
      for (const sgn of [-1, 1]) {
        const w = new THREE.ExtrudeGeometry(form, { depth: d, bevelEnabled: false, curveSegments: 24 });
        w.translate(0, 0, sgn > 0 ? 0.06 : -0.06 - d); b.add('wand', w, M);
        const m = new THREE.BoxGeometry(L, 2 * L, 0.06); m.translate(-L / 2, 0, sgn * (0.06 + d + 0.03)); b.add('membran', m, M);
        // Membran kleidet die Aussparung aus
        const r = new THREE.CylinderGeometry(R, R, d, 24, 1, true, Math.PI, Math.PI); r.rotateX(Math.PI / 2); r.translate(0, 0, sgn * (0.06 + d / 2)); b.add('membran', r, M);
      }
      const ml = new THREE.BoxGeometry(L, 2 * L, 0.12); ml.translate(-L / 2, 0, 0); b.add('wandKante', ml, M);   // Mittellamelle
      for (const [x, y] of [[-0.05, 0], [-0.05, 0.5], [-0.05, -0.5], [-0.45, 0.25], [-0.45, -0.25], [-0.7, 0]]) {
        const c = new THREE.CylinderGeometry(0.07, 0.07, 2 * (d + 0.09), 10); c.rotateX(Math.PI / 2); c.translate(x, y, 0); b.add('membran', c, M);
      }
      teile.push(b.bauen('tuepfel_detail'));
    }
  }
  return teile;
}

const out = process.argv[2] || '.';
for (const stufe of [56, 78]) {
  const root = new THREE.Group(); root.name = 'zelle' + stufe;
  for (const t of bauen(stufe)) root.add(t);
  const scene = new THREE.Scene(); scene.add(root);
  const glb = await new GLTFExporter().parseAsync(scene, { binary: true });
  const datei = `${out}/zelle${stufe}.glb`;
  fs.writeFileSync(datei, Buffer.from(glb));
  console.log(datei, (fs.statSync(datei).size / 1024).toFixed(0), 'KB');
}
