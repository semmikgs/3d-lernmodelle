// Langhaus-Generator: Haus der ersten Bauern in Mitteleuropa (Bandkeramik, Jungsteinzeit, ca. 5500–4900 v. Chr.).
// Maße in m: 30 m lang, 6,5 m breit, Wände ca. 2 m, First ca. 6,5 m; Längsachse Nordwest (−x) – Südost (+x).
// Fünf Pfostenreihen: zwei Wandreihen und drei tragende Innenreihen (Querjoche aus je drei Pfosten);
// Flechtwerkwände mit Lehmverputz, Nordwestende mit Spaltbohlenwand und Wandgraben; Lehm aus Längsgruben neben dem Haus.
// Ansichten: Grabungsbefund (Pfostenlöcher), Bau in Schritten, außen, innen (Dach und Vorderwand weggelassen).
import * as THREE from 'three';
import { textSprite, entsorge as entsorgeObj, stil, zufall } from './hilfen.js';

export const ANSICHTEN = { aussen: 'Außen', innen: 'Innen (aufgeschnitten)', bau: 'So wurde gebaut', befund: 'Was Archäologen finden' };
export const standard = () => ({ ansicht: 'innen', beschriftung: true, bewegung: true });
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const L = 30, W = 3.25, WAND = 2.0, FIRST = 6.5, X0 = -L / 2, X1 = L / 2;
const JOCHE = [-13.2, -10.2, -7.2, -4.2, -1.2, 1.8, 4.8, 7.8, 10.8, 13.2];      // Querjoche (je drei Innenpfosten)
const INNEN_Z = [-1.35, 0, 1.35];

// ---------- Texturen ----------
function textur(zeichne, w = 256, h = 256, rx = 1, ry = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; zeichne(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return t;
}
const TEX = {};
function texturen() {
  if (TEX.stroh) return TEX;
  const z = zufall(5);
  TEX.stroh = textur((g, w, h) => { g.fillStyle = '#b89b5e'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1400; i++) { const x = z() * w, y = z() * h; g.strokeStyle = `rgba(${90 + z() * 80},${70 + z() * 60},${30 + z() * 30},0.55)`; g.lineWidth = 1 + z(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + (z() - 0.5) * 4, y + 18 + z() * 20); g.stroke(); } });
  TEX.lehm = textur((g, w, h) => { g.fillStyle = '#b08a5a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${110 + z() * 70},${80 + z() * 50},${50 + z() * 30},0.35)`; g.beginPath(); g.arc(z() * w, z() * h, 1 + z() * 4, 0, 7); g.fill(); } for (let i = 0; i < 40; i++) { g.strokeStyle = 'rgba(90,60,30,0.35)'; g.beginPath(); const x = z() * w, y = z() * h; g.moveTo(x, y); g.lineTo(x + z() * 30 - 15, y + z() * 30 - 15); g.stroke(); } });
  TEX.flecht = textur((g, w, h) => {
    g.fillStyle = '#6b5233'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 32) { g.fillStyle = '#4a3520'; g.fillRect(x + 12, 0, 8, h); }                       // senkrechte Staken
    for (let y = 0; y < h; y += 14) { g.strokeStyle = (y / 14) % 2 ? '#9c7a4b' : '#8a6a3e'; g.lineWidth = 9; g.beginPath(); for (let x = 0; x <= w; x += 4) { const yy = y + 7 + 3 * Math.sin((x / 32 + (y / 14) % 2) * Math.PI); x ? g.lineTo(x, yy) : g.moveTo(x, yy); } g.stroke(); }
  });
  TEX.boden = textur((g, w, h) => { g.fillStyle = '#7a6a48'; g.fillRect(0, 0, w, h); for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(${80 + z() * 60},${90 + z() * 60},${40 + z() * 30},0.3)`; g.fillRect(z() * w, z() * h, 2, 2); } });
  TEX.wiese = textur((g, w, h) => { g.fillStyle = '#6d8f3e'; g.fillRect(0, 0, w, h); for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(${60 + z() * 60},${110 + z() * 60},${40 + z() * 30},0.4)`; g.fillRect(z() * w, z() * h, 2, 3); } });
  TEX.holz = textur((g, w, h) => { g.fillStyle = '#7b5532'; g.fillRect(0, 0, w, h); for (let i = 0; i < 60; i++) { g.strokeStyle = `rgba(60,38,18,${0.2 + z() * 0.3})`; g.beginPath(); const x = z() * w; g.moveTo(x, 0); g.bezierCurveTo(x + 6, h / 3, x - 6, 2 * h / 3, x + 2, h); g.stroke(); } });
  return TEX;
}

export function erzeuge(st) {
  const T = texturen(), z = zufall(11), ans = st.ansicht;
  const wurzel = new THREE.Group(), etik = new THREE.Group(); wurzel.add(etik);
  const mat = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, ...o });
  const holzM = mat({ map: T.holz, color: 0xc9a27a }), dunkelHolz = mat({ map: T.holz, color: 0x8a6a4a });
  const teile = { pfosten: new THREE.Group(), dach: new THREE.Group(), flecht: new THREE.Group(), lehm: new THREE.Group(), deckung: new THREE.Group(), innen: new THREE.Group(), umgebung: new THREE.Group() };
  for (const g of Object.values(teile)) wurzel.add(g);
  const balken = (a, b, r, m = holzM, ziel = teile.dach) => { const d = b.clone().sub(a); const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.05, d.length(), 8), m); c.position.copy(a).addScaledVector(d, 0.5); c.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); ziel.add(c); return c; };
  const kasten = (x0, x1, y0, y1, z0, z1, m, ziel) => { const b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), m); b.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); ziel.add(b); return b; };
  const vorneWeg = ans === 'innen';                         // Vorderseite (z > 0) weglassen

  // ---------- Boden und Umgebung ----------
  const boden = new THREE.Mesh(new THREE.PlaneGeometry(40, 24), mat({ map: T.wiese })); boden.rotation.x = -Math.PI / 2; boden.position.y = -0.01; teile.umgebung.add(boden);
  T.wiese.repeat.set(8, 4);
  // Längsgruben: hier wurde der Lehm für die Wände ausgehoben (flache, unregelmäßige Mulden)
  const grube = (x, zz, lx, lz) => { const m = new THREE.Mesh(new THREE.CircleGeometry(1, 28), mat({ color: ans === 'befund' ? 0x3f2d1c : 0x7a6440 })); m.scale.set(lx, lz, 1); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.005, zz); teile.umgebung.add(m); };
  for (const s of [-1, 1]) for (const [x, lx] of [[-9, 4.5], [-1.5, 3.5], [6, 4.2]]) grube(x + (z() - 0.5), s * (W + 1.8 + z() * 0.4), lx, 0.9 + z() * 0.4);

  if (ans === 'befund') {
    // Grabungsfläche: heller Lössboden, dunkle Verfärbungen der vergangenen Pfosten
    const f = new THREE.Mesh(new THREE.PlaneGeometry(36, 14), mat({ color: 0xc9a66b })); f.rotation.x = -Math.PI / 2; f.position.y = 0.002; teile.umgebung.add(f);
    const loch = (x, zz, r) => { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 20), mat({ color: 0x3b2a1a })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.01, zz); teile.umgebung.add(m); };
    for (const x of JOCHE) for (const zz of INNEN_Z) loch(x + (z() - 0.5) * 0.2, zz + (z() - 0.5) * 0.15, 0.28);
    for (let x = X0 + 4; x <= X1; x += 1.0) for (const s of [-1, 1]) if (z() > 0.15) loch(x, s * W, 0.14);
    // Wandgraben am Nordwestende (Spaltbohlenwand)
    const gr = (x0, x1, z0, z1) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), mat({ color: 0x3b2a1a })); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, 0.011, (z0 + z1) / 2); teile.umgebung.add(m); };
    gr(X0 - 0.15, X0 + 0.15, -W - 0.15, W + 0.15); gr(X0, X0 + 4, -W - 0.15, -W + 0.15); gr(X0, X0 + 4, W - 0.15, W + 0.15);
    // Scherben und Steinbeil als Funde
    for (let i = 0; i < 14; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.09), mat({ color: 0x8c5a3c })); s.position.set((z() - 0.5) * 30, 0.02, W + 2 + z() * 1.2); s.rotation.y = z() * 3; teile.umgebung.add(s); }
    if (st.beschriftung) {
      const t = (txt, p, q) => { const s = textSprite(txt, '#1f2937', 1.05); s.position.copy(q); etik.add(s); etik.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([p, q]), new THREE.LineBasicMaterial({ color: 0x334155 }))); };
      t('Pfostenlöcher der drei\ninneren Pfostenreihen', V(JOCHE[4], 0, 0), V(-3, 4.5, -3));
      t('Pfostenlöcher der Wand', V(5, 0, W), V(8, 3.5, 5));
      t('Wandgraben\n(Spaltbohlenwand im Nordwesten)', V(X0, 0, 0), V(X0 - 1, 4, -5));
      t('Längsgruben (Lehmentnahme)\nmit Scherben und Abfall', V(-9, 0, W + 2), V(-10, 3.5, 7));
    }
    return fertig();
  }

  // Fußboden aus festgetretenem Lehm
  { const f = new THREE.Mesh(new THREE.PlaneGeometry(L, 2 * W), mat({ map: T.boden })); f.rotation.x = -Math.PI / 2; f.position.y = 0.01; teile.innen.add(f); }
  // ---------- Pfosten (fünf Reihen) ----------
  const pfosten = [];
  for (const x of JOCHE) for (const zz of INNEN_Z) { const h = zz === 0 ? FIRST - 0.15 : 4.3; pfosten.push(balken(V(x, -0.3, zz), V(x, h, zz), zz === 0 ? 0.17 : 0.15, holzM, teile.pfosten)); }
  for (let x = X0 + 4; x <= X1 + 0.01; x += 1.0) for (const s of [-1, 1]) { if (vorneWeg && s > 0) continue; pfosten.push(balken(V(x, -0.2, s * W), V(x, WAND, s * W), 0.09, holzM, teile.pfosten)); }
  // ---------- Dachgerüst: Firstpfette, Mittelpfetten, Rähm, Querbalken, Sparren ----------
  balken(V(X0 - 0.6, FIRST - 0.1, 0), V(X1 + 0.6, FIRST - 0.1, 0), 0.14);
  for (const s of [-1, 1]) { balken(V(X0 - 0.6, 4.35, s * 1.35), V(X1 + 0.6, 4.35, s * 1.35), 0.12); if (!(vorneWeg && s > 0)) balken(V(X0, WAND, s * W), V(X1, WAND, s * W), 0.1); }
  for (const x of JOCHE) balken(V(x, 2.4, -W), V(x, 2.4, W), 0.1);                     // Querbalken (tragen den Dachboden)
  const neig = (FIRST - WAND) / W;
  for (let x = X0 - 0.4; x <= X1 + 0.4; x += 1.0) for (const s of [-1, 1]) { if (vorneWeg && s > 0) continue; balken(V(x, FIRST, 0), V(x, WAND - 0.6 * neig, s * (W + 0.6)), 0.06, dunkelHolz); }
  // Dachboden (Speicher) über einem Teil des Hauses
  kasten(-13.2, -4.2, 2.48, 2.56, -W + 0.1, W - 0.1, mat({ map: T.holz, color: 0xa88a64 }), teile.dach);
  // ---------- Wände: Flechtwerk, darüber Lehmputz; Nordwestende Spaltbohlen ----------
  const wand = (x0, x1, zz, flechtSicht = false) => {
    const lg = x1 - x0;
    const f = kasten(x0, x1, 0, WAND, zz - 0.05, zz + 0.05, mat({ map: T.flecht.clone() }), teile.flecht); f.material.map.repeat.set(lg / 1.2, WAND / 1.2); f.material.map.needsUpdate = true;
    if (!flechtSicht) { const l = kasten(x0, x1, 0, WAND, zz - 0.1, zz + 0.1, mat({ map: T.lehm.clone() }), teile.lehm); l.material.map.repeat.set(lg / 3, 1); l.material.map.needsUpdate = true; }
  };
  for (const s of [-1, 1]) {
    if (vorneWeg && s > 0) continue;
    wand(X0 + 4, -2, s * W); wand(-2, 1.5, s * W, ans === 'innen'); wand(1.5, X1, s * W);   // ein Stück ohne Lehm: Flechtwerk sichtbar
    kasten(X0, X0 + 4, 0, WAND, s * W - 0.08, s * W + 0.08, mat({ map: T.holz, color: 0x9a7650 }), teile.flecht);   // Spaltbohlen
  }
  kasten(X0 - 0.08, X0 + 0.08, 0, WAND, -W, vorneWeg ? 0 : W, mat({ map: T.holz, color: 0x9a7650 }), teile.flecht);
  // Südostende: Giebelwand mit Eingang
  for (const [a, b] of [[-W, -0.6], [0.6, W]]) { if (vorneWeg && a > 0) continue; const f = kasten(X1 - 0.05, X1 + 0.05, 0, WAND, a, b, mat({ map: T.lehm }), teile.lehm); void f; }
  // ---------- Dachdeckung: Schilf/Stroh, steil ----------
  const sl = Math.hypot(FIRST - WAND + 0.6 * neig, W + 0.6), wink = Math.atan2(FIRST - WAND, W);
  T.stroh.repeat.set(L / 3, sl / 3);
  for (const s of [-1, 1]) {
    if (vorneWeg && s > 0) continue;
    const d = new THREE.Mesh(new THREE.BoxGeometry(L + 1.4, 0.35, sl), mat({ map: T.stroh }));
    d.position.set(0, (FIRST + WAND - 0.6 * neig) / 2 + 0.2, s * (W + 0.6) / 2); d.rotation.x = s * wink; teile.deckung.add(d);
  }
  // Giebel: Flechtwerk-Dreieck mit Rauchloch (im Nordwesten geschlossen)
  for (const x of [X0, X1]) {
    const pts = vorneWeg ? [new THREE.Vector2(-W, WAND), new THREE.Vector2(0, WAND), new THREE.Vector2(0, FIRST)] : [new THREE.Vector2(-W, WAND), new THREE.Vector2(W, WAND), new THREE.Vector2(0, FIRST)];
    const g = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(pts)), mat({ map: T.flecht, side: THREE.DoubleSide }));
    g.rotation.y = Math.PI / 2; g.position.x = x; teile.flecht.add(g);
  }
  // ---------- Einrichtung ----------
  const I = teile.innen;
  // Herdstelle mit Steinen und Glut (Rauch zieht durchs Dach ab – kein Schornstein)
  const herd = V(2.8, 0, -0.7);
  for (let i = 0; i < 12; i++) { const w = i / 12 * Math.PI * 2, s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.13 + z() * 0.05), mat({ color: 0x8b8b85 })); s.position.set(herd.x + 0.55 * Math.cos(w), 0.08, herd.z + 0.55 * Math.sin(w)); I.add(s); }
  const glut = new THREE.Mesh(new THREE.CircleGeometry(0.45, 20), new THREE.MeshStandardMaterial({ color: 0xff6a00, emissive: 0xff4500, emissiveIntensity: 0.9 })); glut.rotation.x = -Math.PI / 2; glut.position.set(herd.x, 0.03, herd.z); I.add(glut);
  const flammen = new THREE.Group(); flammen.position.copy(herd); I.add(flammen);
  for (let i = 0; i < 5; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.5, 8), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffb300 : 0xff6d00 })); f.position.set((z() - 0.5) * 0.4, 0.25, (z() - 0.5) * 0.4); f.userData.flamme = i + 1; flammen.add(f); }
  // Webstuhl (Gewichtswebstuhl) an der Wand
  { const x = 7, zz = -W + 0.6; balken(V(x - 0.8, 0, zz), V(x - 0.8, 1.9, zz + 0.3), 0.04, holzM, I); balken(V(x + 0.8, 0, zz), V(x + 0.8, 1.9, zz + 0.3), 0.04, holzM, I); balken(V(x - 0.9, 1.85, zz + 0.29), V(x + 0.9, 1.85, zz + 0.29), 0.04, holzM, I);
    const stoff = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.0), mat({ color: 0xd8c7a0, side: THREE.DoubleSide })); stoff.position.set(x, 1.35, zz + 0.25); stoff.rotation.x = -0.15; I.add(stoff);
    for (let i = 0; i < 10; i++) { const k = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.03, 6, 10), mat({ color: 0x9c7046 })); k.position.set(x - 0.68 + i * 0.15, 0.45, zz + 0.08); I.add(k); } }
  // Mahlstein mit Läufer, Vorratsgefäße (Bandkeramik), Schlafplatz mit Fellen, Körbe
  { const m = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.15, 0.4), mat({ color: 0x7c7c74 })); m.position.set(5.2, 0.08, 1.4); m.rotation.x = 0.1; I.add(m); const l = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.25, 4, 8), mat({ color: 0x6b6b63 })); l.rotation.z = Math.PI / 2; l.position.set(5.2, 0.24, 1.4); I.add(l); }
  const gefaessTex = textur((g, w, h) => { g.fillStyle = '#9a6a45'; g.fillRect(0, 0, w, h); g.strokeStyle = '#3d2716'; g.lineWidth = 5; for (let k = 0; k < 4; k++) { g.beginPath(); for (let x = 0; x <= w; x += 4) { const y = h * 0.45 + 22 * Math.sin(x / w * Math.PI * 4 + k) ; x ? g.lineTo(x, y + k * 8 - 12) : g.moveTo(x, y + k * 8 - 12); } g.stroke(); } });
  for (const [x, zz, s] of [[-1.5, 2.6, 1], [-1.0, 2.75, 0.8], [-0.4, 2.6, 1.2], [9.5, -2.7, 1], [10.1, -2.6, 0.7]]) {
    const prof = []; for (let i = 0; i <= 12; i++) { const t = i / 12; prof.push(new THREE.Vector2(0.22 * s * Math.sin(Math.PI * (0.15 + 0.75 * t)) + 0.02, 0.4 * s * t)); }
    const k = new THREE.Mesh(new THREE.LatheGeometry(prof, 20), mat({ map: gefaessTex, side: THREE.DoubleSide })); k.position.set(x, 0, zz); I.add(k);
  }
  { const b = kasten(-8, -5.2, 0, 0.35, -W + 0.2, -W + 1.6, mat({ color: 0x6f5a3e }), I); void b; for (const [x, c] of [[-7.4, 0x7a5c3e], [-6.1, 0xa58763]]) { const f = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 1.2), mat({ color: c })); f.position.set(x, 0.39, -W + 0.9); f.rotation.y = 0.2; I.add(f); } }
  for (const [x, zz] of [[-11.5, 1.8], [-11, 2.4], [-12.2, 2.2]]) { const k = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.24, 0.5, 14, 1, true), mat({ color: 0xa68a52, side: THREE.DoubleSide })); k.position.set(x, 2.81, zz - 3); I.add(k); }
  // Menschen zum Größenvergleich (1,60 m)
  const mensch = (x, zz, h = 1.6, farbe = 0x8d6e4a) => { const g = new THREE.Group(); const k = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.24, h * 0.78, 10), mat({ color: farbe })); k.position.y = h * 0.39; g.add(k); const kopf = new THREE.Mesh(new THREE.SphereGeometry(h * 0.075, 12, 10), mat({ color: 0xd7a57a })); kopf.position.y = h * 0.86; g.add(kopf); const haar = new THREE.Mesh(new THREE.SphereGeometry(h * 0.078, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat({ color: 0x3b2a1a })); haar.position.y = h * 0.87; g.add(haar); g.position.set(x, 0, zz); I.add(g); return g; };
  mensch(3.8, 0.6); mensch(6.2, -2.0, 1.5, 0x6d5838); mensch(5.6, 1.5, 1.2, 0x9a7b56);
  // Außen: Holzstapel, kleines Feld mit Getreide (Emmer, Einkorn)
  for (let i = 0; i < 18; i++) { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.1, 6), dunkelHolz); h.rotation.z = Math.PI / 2; h.position.set(X1 + 1.6, 0.1 + Math.floor(i / 6) * 0.17, -2.4 + (i % 6) * 0.19); teile.umgebung.add(h); }
  { const feld = new THREE.Group(); for (let i = 0; i < 260; i++) { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 4), mat({ color: 0xc8b25a })); h.position.set(-6 + (i % 26) * 0.45 + z() * 0.1, 0.45, -10.5 + Math.floor(i / 26) * 0.45); feld.add(h); } teile.umgebung.add(feld); }
  if (ans !== 'innen') { mensch(X1 + 2.5, 1.5); teile.umgebung.add(I.children[I.children.length - 1]); }

  // ---------- Ansichten ----------
  if (ans === 'aussen') { I.visible = false; }
  // Bauablauf: 1 Pfosten, 2 Dachgerüst, 3 Flechtwerk, 4 Lehm, 5 Dach decken
  const SCHRITTE = ['1. Pfosten eingraben', '2. Dachgerüst aus Pfetten und Sparren', '3. Wände aus Flechtwerk', '4. Lehm auf das Flechtwerk streichen', '5. Dach mit Schilf oder Stroh decken'];
  const reihen = [teile.pfosten, teile.dach, teile.flecht, teile.lehm, teile.deckung];
  let zeit = st._zeit || 0, letzter = -1;
  const schrittSchild = new THREE.Sprite(new THREE.SpriteMaterial({ depthTest: false, transparent: true })); schrittSchild.renderOrder = 12; schrittSchild.position.set(0, 10.2, 0); wurzel.add(schrittSchild);
  const zeigeSchritt = s => {
    reihen.forEach((g, i) => { g.visible = i <= s; g.scale.y = 1; }); I.visible = s >= 4;
    if (s === letzter) return; letzter = s;
    const t = textSprite(SCHRITTE[s], '#1f2937', 0.9); if (schrittSchild.material.map) schrittSchild.material.map.dispose();
    schrittSchild.material.map = t.material.map; schrittSchild.scale.copy(t.scale); schrittSchild.material.needsUpdate = true;
  };
  schrittSchild.visible = ans === 'bau';
  if (ans === 'bau') zeigeSchritt(Math.floor(zeit / 3) % 5);
  // Beschriftung
  if (st.beschriftung && ans !== 'bau') {
    const t = (txt, p, q) => { const s = textSprite(txt, '#1f2937', 1.05); s.position.copy(q); etik.add(s); const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([p, q]), new THREE.LineBasicMaterial({ color: 0x334155, depthTest: false })); l.renderOrder = 9; etik.add(l); };
    if (ans === 'innen') {
      t('Herdstelle (Rauch zieht\ndurch das Dach ab)', herd.clone().setY(0.3), V(2, 9, 2));
      t('Webstuhl', V(7, 1.6, -W + 0.8), V(9, 8, -1));
      t('Mahlstein', V(5.2, 0.2, 1.4), V(8, 5.2, 4.5));
      t('Vorratsgefäße\n(Bandkeramik)', V(-1, 0.4, 2.6), V(-2.5, 5.5, 5));
      t('Schlafplatz', V(-6.6, 0.4, -W + 0.9), V(-5, 9, -1));
      t('Dachboden als Speicher', V(-11.5, 2.6, -1), V(-11, 8.8, 1.5));
      t('Firstpfosten (mittlere Reihe)', V(JOCHE[2], 5, 0), V(-7, 11.5, 0));
      t('Flechtwerk ohne Lehm', V(0, 1.2, -W), V(1, 4.5, -7));
      t('Spaltbohlenwand', V(X0 + 2, 1.2, -W), V(X0 + 1, 4, -7.5));
      t('Mensch, 1,60 m', V(3.8, 1.7, 0.6), V(5, 7, 6));
    } else {
      t('Dach aus Schilf oder Stroh', V(-4, 4.5, 2.2), V(-4, 9.5, 5));
      t('Wand aus Flechtwerk\nmit Lehm verputzt', V(4, 1.2, W), V(6, 4.5, 8));
      t('Längsgrube: hier wurde\nder Lehm ausgehoben', V(6, 0, W + 2), V(11, 2.5, 9));
      t('Eingang', V(X1, 1, 0), V(X1 + 3, 4, 1));
      t('Nordwesten: Wetterseite', V(X0, 1, 0), V(X0 - 3, 4.5, 0));
    }
  }
  return fertig();

  function fertig() {
    wurzel.position.y = ans === 'befund' ? -1 : -3;
    etik.visible = st.beschriftung;
    const info = {
      aussen: 'So sah ein Haus der ersten Bauern bei uns aus (Jungsteinzeit, Bandkeramik, etwa 5500–4900 v. Chr.). Es war rund 30 m lang und 6–7 m breit – in einem solchen Langhaus lebte eine große Familie zusammen. Mehrere Häuser bildeten ein Dorf; ringsum lagen Felder mit Emmer und Einkorn sowie Weiden für Rinder, Schweine, Schafe und Ziegen. Die schmale Nordwestseite mit der dicken Bohlenwand zeigt gegen das Wetter.',
      innen: 'Blick ins Innere (Dach und Vorderwand weggelassen). Drei Reihen kräftiger Innenpfosten tragen das schwere Dach; die Wände tragen kaum. Im Wohnbereich brennt das Herdfeuer – einen Schornstein gab es nicht, der Rauch zog durch das Dach ab. Hier wurde gekocht, gemahlen, gewebt und geschlafen; auf dem Dachboden lagerten Vorräte. Ob auch Tiere im Haus standen, ist unter Fachleuten umstritten.',
      bau: 'Die Bauern bauten ohne Metallwerkzeug – mit Steinbeilen, Holz, Lehm, Weidenruten und Schilf oder Stroh. Erst wurden die Pfosten eingegraben, dann das Dachgerüst aufgesetzt. Die Wände bestehen aus geflochtenen Ruten, auf die man Lehm aus den Gruben neben dem Haus strich. Zum Schluss wurde das steile Dach dicht gedeckt, damit Regen gut abläuft. Ein Haus hielt etwa 25 Jahre.',
      befund: 'Holz verrottet im Boden – nach 7000 Jahren ist vom Haus nichts mehr übrig. Archäologen finden aber dunkle Verfärbungen im hellen Boden, wo früher die Pfosten standen (Pfostenlöcher), dazu die Längsgruben mit Scherben und Abfall. Aus dem Muster der Pfostenlöcher können sie Größe und Bauweise des Hauses erschließen. Die typischen Gefäßscherben mit Bandmustern gaben der Kultur ihren Namen: Bandkeramik.',
    }[ans];
    return {
      objekt: wurzel, radius: 16, titel: `Steinzeitliches Langhaus – ${ANSICHTEN[ans]}`, info: `<b>Langhaus der Jungsteinzeit</b> · ca. 30 × 6,5 m · Firsthöhe ca. 6,5 m<br><i>${info}</i>`,
      update: dt => {
        if (ans === 'befund' || !st.bewegung) return; zeit += Math.min(dt, 0.1); st._zeit = zeit;
        if (ans === 'bau') zeigeSchritt(Math.floor(zeit / 3) % 5);
        wurzel.traverse(o => { if (o.userData.flamme) o.scale.y = 0.8 + 0.4 * Math.abs(Math.sin(zeit * 9 + o.userData.flamme)); });
      },
    };
  }
}
export const entsorge = entsorgeObj;
export function ausUrl(p) { const st = standard(); if (ANSICHTEN[p.get('v')]) st.ansicht = p.get('v'); return st; }
export const zuUrl = st => `&v=${st.ansicht}`;
export function bedienung(ort, st, neu) {
  stil(); ort.innerHTML = '';
  const s = document.createElement('select'); for (const [k, v] of Object.entries(ANSICHTEN)) s.add(new Option(v, k)); ort.appendChild(s);
  const knopf = t => { const b = document.createElement('button'); b.textContent = t; ort.appendChild(b); return b; };
  const bSchild = knopf('Beschriftung'), bBew = knopf('Bewegung');
  const auff = () => { s.value = st.ansicht; bSchild.classList.toggle('on', st.beschriftung); bBew.classList.toggle('on', st.bewegung); };
  s.onchange = () => { st.ansicht = s.value; st._zeit = 0; auff(); neu(); };
  bSchild.onclick = () => { st.beschriftung = !st.beschriftung; auff(); neu(); };
  bBew.onclick = () => { st.bewegung = !st.bewegung; auff(); };
  auff();
}
