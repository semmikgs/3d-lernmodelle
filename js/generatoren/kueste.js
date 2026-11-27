// Küsten-Generator: niedersächsische Nordseeküste. Höhen in m über Normalhöhennull (NHN), stark überhöht.
// Ansicht „Wattenmeer“: Blockbild von der Geest über die Marsch (mit Warft), Deich, Salzwiese, Watt mit Prielen bis zur
// Düneninsel und zum Seegat; Ebbe und Flut animiert (ein Tidezyklus ≈ 12 h 25 min, Tidenhub hier ca. 3 m).
// Ansicht „Deich im Schnitt“: Seedeich mit flacher Außenböschung (≈ 1:6), steiler Innenböschung (≈ 1:3), Sandkern,
// Kleidecke, Deckwerk, Deichverteidigungsweg; Wasserstände: mittleres Niedrig-/Hochwasser und Sturmflut.
import * as THREE from 'three';
import { textSprite, entsorge as entsorgeObj, stil, zufall } from './hilfen.js';

export const ANSICHTEN = { watt: 'Wattenmeer mit Ebbe und Flut', deich: 'Deich im Schnitt' };
export const standard = () => ({ ansicht: 'watt', sturmflut: false, bewegung: true, beschriftung: true });
const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const MNW = -1.4, MHW = 1.5, STURM = 5.0, TIDE = 12 + 25 / 60;      // m NHN, Stunden
const SEK_PRO_TIDE = 24;                                            // Animation: ein Tidezyklus in 24 s
const rausch = (x, z) => 0.5 * Math.sin(x * 1.3 + 0.4) * Math.cos(z * 0.9 - 0.2) + 0.3 * Math.sin(x * 2.9 - z * 2.1 + 1.1) + 0.2 * Math.cos(x * 5.1 + z * 3.7);
const glatt = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ---------- Gelände Wattenmeer (x: Land −30 … See +30, z: −12 … 0) ----------
const priel = (x, z) => { const zm = -6 + 2.2 * Math.sin(x * 0.35) + 0.8 * Math.sin(x * 0.9); return Math.exp(-(((z - zm) / 0.9) ** 2)) * glatt(6, 9, x); };
const prielAst = (x, z) => { const zm = -2 + 1.2 * Math.sin(x * 0.6); return Math.exp(-(((z - zm) / 0.6) ** 2)) * glatt(9, 12, x) * (1 - glatt(16, 19, x)); };
function hoehe(x, z) {
  if (x < -20) return 8 + 1.5 * rausch(x * 0.4, z * 0.4);                                         // Geest
  if (x < -17) return 0.6 + (8 - 0.6) * (1 - glatt(-20, -17, x));                                 // Geestrand
  if (x < -2.4) { let h = 0.3 + 0.25 * rausch(x, z); const d = Math.hypot(x + 11, z + 6); if (d < 2.4) h = Math.max(h, 0.3 + 4.2 * (1 - (d / 2.4) ** 2)); return h; }   // Marsch mit Warft
  if (x < 2.6) { const k = -0.2, b = 0.6; if (x < k - b / 2) return 0.5 + 8 * glatt(-2.4, k - b / 2, x) ** 0.9; if (x < k + b / 2) return 8.5; return 8.5 - (8.5 - 2) * glatt(k + b / 2, 2.6, x); }   // Deich
  if (x < 6) return 2 + 0.15 * rausch(x * 2, z * 2) - 1.6 * glatt(5, 6, x);                       // Salzwiese (Vorland)
  if (x < 20) { const h = 0.4 - 1.9 * glatt(6, 20, x) + 0.2 * rausch(x, z); return h - 2.6 * Math.max(priel(x, z), prielAst(x, z)); }   // Watt mit Prielen
  const insel = z > -9;
  if (x < 27) {
    if (!insel) return -1.5 - 7 * glatt(19.5, 21, x) * glatt(-8.4, -10.5, z) - 0.3;               // Seegat
    if (x < 21) return -1.5 + 3.5 * glatt(20, 21, x);                                             // Wattseite der Insel
    const d = 2 + 0.3 * rausch(x * 2, z * 2); let h = d;
    if (x > 23 && x < 26) h += 6 * Math.sin((x - 23) / 3 * Math.PI) * (0.75 + 0.25 * rausch(x * 3, z * 3));   // Dünen
    if (x > 26) h = 2 - 3 * glatt(26, 27, x);                                                     // Strand
    return h;
  }
  return -1 - 8 * glatt(27, 30, x);                                                               // Nordsee
}

export function erzeuge(st) {
  const wurzel = new THREE.Group(), etik = new THREE.Group(), zf = zufall(31); wurzel.add(etik);
  const watt = st.ansicht === 'watt';
  const mat = o => new THREE.MeshStandardMaterial({ roughness: 0.85, ...o });
  const schild = (txt, a, z, farbe = '#1f2937', h = watt ? 1.25 : 1.6) => { const s = textSprite(txt, farbe, h); s.position.copy(z); etik.add(s); const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, z]), new THREE.LineBasicMaterial({ color: 0x334155, depthTest: false })); l.renderOrder = 9; etik.add(l); };
  const bewegt = [];
  const UEB = watt ? 0.32 : 1;                                      // Überhöhung: Höhe m → Bildeinheit
  let pegel = MHW;
  const wasserStand = t => st.sturmflut ? STURM + 0.4 * Math.sin(t * 2 * Math.PI / SEK_PRO_TIDE) : (MHW + MNW) / 2 + (MHW - MNW) / 2 * Math.cos(t * 2 * Math.PI / SEK_PRO_TIDE);

  if (watt) {
    const BX = 30, BZ = 12, UNTEN = -12;
    // Schnittbild vorne (z = 0)
    const farbe = (x, y) => {
      const top = hoehe(x, 0) * UEB; if (y > top) return null;
      const d = top - y;
      if (x < -18.5) return [196, 164, 106].map(c => c * (1 - 0.2 * Math.max(0, -y / 12)));         // Geest: Sand, Kies (eiszeitlich)
      if (x > -2.4 && x < 2.6 && y > 0.15) return d < 0.35 ? [120, 104, 80] : [214, 190, 140];         // Deich: Kleidecke über Sandkern
      if (x < 6) return d < 0.6 ? [104, 92, 78] : y > -1.5 ? [80, 60, 45] : [180, 160, 120];           // Marsch/Vorland: Klei, darunter Torf, Sand
      if (x < 20) return d < 0.3 ? [120, 116, 108] : [170, 160, 136];                                  // Watt: Schlick über Sand
      return [222, 204, 160];                                                                          // Insel und Meeresboden: Sand
    };
    {
      const W = 1024, H = 380, ymax = 5;
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'), bild = g.createImageData(W, H);
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const x = -BX + 2 * BX * (i + 0.5) / W, y = ymax - (ymax - UNTEN * UEB) * (j + 0.5) / H, c = farbe(x, y), o = 4 * (j * W + i); if (c) { bild.data[o] = c[0]; bild.data[o + 1] = c[1]; bild.data[o + 2] = c[2]; bild.data[o + 3] = 255; } }
      g.putImageData(bild, 0, 0);
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
      const pts = []; for (let i = 0; i <= 600; i++) { const x = -BX + 2 * BX * i / 600; pts.push(new THREE.Vector2(x, hoehe(x, 0) * UEB)); }
      pts.push(new THREE.Vector2(BX, UNTEN * UEB), new THREE.Vector2(-BX, UNTEN * UEB));
      const geo = new THREE.ShapeGeometry(new THREE.Shape(pts)), P = geo.attributes.position, uv = [];
      for (let i = 0; i < P.count; i++) uv.push((P.getX(i) + BX) / (2 * BX), (P.getY(i) - UNTEN * UEB) / (ymax - UNTEN * UEB));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      wurzel.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 })));
    }
    // Oberfläche mit Farben
    {
      const geo = new THREE.PlaneGeometry(2 * BX, BZ, 300, 100); geo.rotateX(-Math.PI / 2); geo.translate(0, 0, -BZ / 2);
      const P = geo.attributes.position, col = [];
      for (let i = 0; i < P.count; i++) {
        const x = P.getX(i), z = P.getZ(i), h = hoehe(x, z); P.setY(i, h * UEB);
        const n = 0.5 + 0.5 * rausch(x * 2, z * 2); let c;
        if (x < -18.5) c = new THREE.Color(0x7f9a4a).lerp(new THREE.Color(0x4f7a3a), n);                    // Geest: Wald, Heide, Acker
        else if (x < -2.4) c = (Math.floor(z / 1.4) % 2 ? new THREE.Color(0x7cb84f) : new THREE.Color(0x8fc25c)).lerp(new THREE.Color(0x6aa543), n * 0.4);   // Marsch: Grünland
        else if (x < 2.6) c = new THREE.Color(0x6fae4a);                                                     // Deich: Gras
        else if (x < 5.6) c = new THREE.Color(0x8aa65a).lerp(new THREE.Color(0x9b8fb0), n * 0.35);           // Salzwiese
        else if (x < 20 || (x < 21 && z > -9)) c = new THREE.Color(0x8c8577).lerp(new THREE.Color(0x6f695f), n);   // Watt (Schlick)
        else if (h > 3) c = new THREE.Color(0xe8dcb5).lerp(new THREE.Color(0x9fb36a), h > 5 ? 0.55 : 0.1); // Dünen mit Strandhafer
        else c = new THREE.Color(0xe4d4a8);
        col.push(c.r, c.g, c.b);
      }
      geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
      wurzel.add(new THREE.Mesh(geo, mat({ vertexColors: true })));
      const wandM = mat({ color: 0xbfae88 });
      for (const [w, pos, r] of [[2 * BX, V(0, 0, -BZ), Math.PI], [BZ, V(-BX, 0, -BZ / 2), -Math.PI / 2], [BZ, V(BX, 0, -BZ / 2), Math.PI / 2]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, -UNTEN * UEB + 3), wandM); m.position.copy(pos).setY((UNTEN * UEB + 3) / 2); m.rotation.y = r; wurzel.add(m); }
    }
    // Wasser (nur seewärts des Deichs): Kasten, dessen Oberkante mit der Tide steigt und fällt
    const wGeo = new THREE.BoxGeometry(2 * BX - 2.6 - BX, 1, BZ); wGeo.translate((BX + 2.6) / 2, 0.5, -BZ / 2);
    const wasser = new THREE.Mesh(wGeo, new THREE.MeshStandardMaterial({ color: 0x3b82c4, transparent: true, opacity: 0.6, roughness: 0.15, depthWrite: false })); wurzel.add(wasser);
    const unten = UNTEN * UEB;
    bewegt.push(t => { pegel = wasserStand(t); wasser.position.y = unten; wasser.scale.y = pegel * UEB - unten; });
    // Warft mit Hof, Häuser auf der Geest, Siel im Deich, Schafe auf dem Deich, Leuchtturm auf der Insel
    const haus = (x, z, s = 1) => { const h = hoehe(x, z) * UEB; const k = new THREE.Mesh(new THREE.BoxGeometry(1.6 * s, 0.6 * s, 0.9 * s), mat({ color: 0xb45f45 })); k.position.set(x, h + 0.3 * s, z); wurzel.add(k); const d = new THREE.Mesh(new THREE.ConeGeometry(0.85 * s, 0.6 * s, 4), mat({ color: 0x6b4a2b })); d.rotation.y = Math.PI / 4; d.scale.z = 0.7; d.position.set(x, h + 0.9 * s, z); wurzel.add(d); };
    haus(-11, -6); haus(-24, -3); haus(-26, -8, 0.9); haus(-23, -10, 0.8);
    for (let i = 0; i < 12; i++) { const x = -1.6 + zf() * 3.6, z = -1 - zf() * 10, s = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), mat({ color: 0xf5f5f0 })); s.position.set(x, hoehe(x, z) * UEB + 0.12, z); s.scale.set(1.4, 1, 1); wurzel.add(s); }
    { const x = 25.5, z = -4, h = hoehe(x, z) * UEB; const l = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 3.2, 12), mat({ color: 0xffffff })); l.position.set(x, h + 1.6, z); wurzel.add(l); for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.35, 12), mat({ color: 0xdc2626 })); r.position.set(x, h + 0.6 + i * 1, z); wurzel.add(r); } }
    for (let i = 0; i < 40; i++) { const x = -20 - zf() * 9, z = -0.5 - zf() * 11, h = hoehe(x, z) * UEB, b = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.9, 7), mat({ color: 0x2f5a35 })); b.position.set(x, h + 0.45, z); wurzel.add(b); }
    { const siel = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.9, 0.9), mat({ color: 0x6b7280 })); siel.position.set(0, 0.6, -9.5); wurzel.add(siel); }
    // Gezeiten-Anzeige
    const anzeige = new THREE.Sprite(new THREE.SpriteMaterial({ depthTest: false, transparent: true })); anzeige.renderOrder = 12; anzeige.position.set(0, 11, -3); wurzel.add(anzeige);
    let letzte = '';
    bewegt.push(t => {
      const p = ((t / SEK_PRO_TIDE) % 1 + 1) % 1, h = p * TIDE, stunde = Math.floor(h), minute = Math.floor((h - stunde) * 60);
      const name = st.sturmflut ? 'Sturmflut: Wasser bis an den Deich' : p < 0.04 || p > 0.96 ? 'Hochwasser' : Math.abs(p - 0.5) < 0.04 ? 'Niedrigwasser – das Watt fällt trocken' : p < 0.5 ? 'Ebbe – das Wasser fällt' : 'Flut – das Wasser steigt';
      const txt = `${name} · Wasserstand ${pegel.toFixed(1).replace('.', ',')} m NHN${st.sturmflut ? '' : ` · ${stunde} h ${String(minute).padStart(2, '0')} min nach Hochwasser`}`;
      if (txt === letzte) return; letzte = txt;
      const s = textSprite(txt, st.sturmflut ? '#b91c1c' : '#0c4a6e', 1.2); if (anzeige.material.map) anzeige.material.map.dispose();
      anzeige.material.map = s.material.map; anzeige.scale.copy(s.scale); anzeige.material.needsUpdate = true;
    });
    const auf = (x, z, dy = 0) => V(x, hoehe(x, z) * UEB + dy, z);
    schild('Geest (höher, sandig)', auf(-25, -2, 0.5), V(-26, 9, 0));
    schild('Marsch (fruchtbarer Klei,\nkaum über dem Meeresspiegel)', auf(-7, -2, 0.2), V(-14, 9.5, 0));
    schild('Warft', auf(-11, -6, 1.6), V(-10, 6.6, -4));
    schild('Deich', auf(-0.2, -2, 0.2), V(-1, 6.2, 0));
    schild('Siel', V(0, 1, -9.5), V(3, 5.5, -10));
    schild('Salzwiese', auf(4, -2, 0.1), V(5, 4.8, 0));
    schild('Watt', auf(13, -1, 0.1), V(12, 5.5, 0));
    schild('Priel', auf(10, -6 + 2.2 * Math.sin(3.5) + 0.8 * Math.sin(9), 0), V(13, 4.8, -8));
    schild('Düneninsel', auf(24.5, -3, 1), V(22, 7, 0));
    schild('Seegat', V(22, -1, -10.5), V(26, 4.5, -12));
    schild('Nordsee', V(29, -1, -6), V(31, 3.5, -4));
    wurzel.position.y = -1;
  } else {
    // ---------- Deich im Schnitt (Maße in m) ----------
    const DZ = 10;
    const profil = [[-24, 0.3], [-17, 0.3], [-16.6, -0.6], [-16, -0.6], [-15.6, 0.3], [-14, 0.4], [-10.5, 0.5], [-10.5, 0.8], [-7.5, 0.8], [-7.2, 0.5], [-1.5, 8.5], [1.5, 8.5], [37.5, 2.5], [44, 2.2], [46, 1.0], [56, -1.8]];
    const yVon = x => { for (let i = 0; i < profil.length - 1; i++) { const [x0, y0] = profil[i], [x1, y1] = profil[i + 1]; if (x >= x0 && x <= x1) return y0 + (y1 - y0) * (x - x0) / (x1 - x0); } return x < profil[0][0] ? profil[0][1] : profil[profil.length - 1][1]; };
    const UNT = -5;
    const schicht = (punkte, farbe, z0 = -DZ, z1 = 0) => { const f = new THREE.Shape(punkte.map(([x, y]) => new THREE.Vector2(x, y))); const g = new THREE.ExtrudeGeometry(f, { depth: z1 - z0, bevelEnabled: false }); g.translate(0, 0, z0); const m = new THREE.Mesh(g, mat({ color: farbe })); wurzel.add(m); return m; };
    // Untergrund (Marsch: Klei über Sand)
    schicht([[-24, UNT], [56, UNT], [56, -2.5], [-24, -2.5]], 0xbfa878);
    { const oben = profil.map(([x, y]) => [x, x > -7.2 && x < 37.5 ? 0.5 : y]).reverse(); schicht([[-24, -2.5], [56, -2.5], ...oben], 0x6e5b45); }
    // Deichkörper: Sandkern und Kleidecke (ca. 1–1,5 m dick)
    const kern = [[-7.2, 0.5], [-2.2, 7.3], [2.0, 7.3], [36, 1.9], [36, 0.5]];
    schicht([[-7.2, 0.5], [-1.5, 8.5], [1.5, 8.5], [37.5, 2.5], [37.5, 0.5]], 0x8a7356);
    const k = schicht(kern, 0xdcc48f); k.position.z = 0.01;
    // Grasnarbe als dünne grüne Oberfläche, Deckwerk (Steine) am seeseitigen Fuß, Vorland
    { const pts = profil.map(([x, y]) => V(x, y + 0.06, 0.03)); const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x4d7c0f })); wurzel.add(l);
      const g = new THREE.PlaneGeometry(80, DZ, 160, 1); g.rotateX(-Math.PI / 2); g.translate(16, 0, -DZ / 2); const P = g.attributes.position; for (let i = 0; i < P.count; i++) P.setY(i, yVon(P.getX(i)) + 0.02); g.computeVertexNormals(); wurzel.add(new THREE.Mesh(g, mat({ color: 0x6fae4a }))); }
    for (let i = 0; i < 70; i++) { const x = 30 + zf() * 7.5, z = -zf() * DZ, s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35 + zf() * 0.2), mat({ color: 0x78716c })); s.position.set(x, yVon(x) + 0.2, z); wurzel.add(s); }
    { const w = new THREE.Mesh(new THREE.BoxGeometry(3, 0.25, DZ), mat({ color: 0x9ca3af })); w.position.set(-9, 0.92, -DZ / 2); wurzel.add(w); }   // Deichverteidigungsweg
    { const w = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.2, DZ), mat({ color: 0x9ca3af })); w.position.set(0, 8.6, -DZ / 2); wurzel.add(w); }    // Weg auf der Krone
    for (let i = 0; i < 5; i++) { const x = -20 + i * 1.6 + zf(), z = -2 - zf() * 6, s = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), mat({ color: 0xf5f5f0 })); s.position.set(x, 0.75, z); s.scale.set(1.5, 1, 1); wurzel.add(s); }
    // Wasser: Kasten von der Seeseite bis zum Deich, Oberkante = Wasserstand; Wellen
    const wGeo = new THREE.PlaneGeometry(40, DZ, 120, 1); wGeo.rotateX(-Math.PI / 2); wGeo.translate(36, 0, -DZ / 2);
    const wasserOben = new THREE.Mesh(wGeo, new THREE.MeshStandardMaterial({ color: 0x3b82c4, transparent: true, opacity: 0.6, roughness: 0.15, side: THREE.DoubleSide, depthWrite: false })); wurzel.add(wasserOben);
    const front = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0x3b82c4, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide })); wurzel.add(front);
    const P0 = wGeo.attributes.position, xs = Array.from({ length: P0.count }, (_, i) => P0.getX(i));
    bewegt.push(t => {
      pegel = wasserStand(t);
      let xAuflauf = 56;                                           // Schnittpunkt Wasserspiegel – Böschung
      for (let x = 1.5; x < 56; x += 0.05) if (yVon(x) < pegel) { xAuflauf = x; break; }
      const wellen = st.sturmflut ? 0.45 : 0.12;
      for (let i = 0; i < P0.count; i++) { const x = Math.max(xs[i], xAuflauf); P0.setX(i, x); P0.setY(i, pegel + wellen * Math.sin(x * 1.1 - t * 3) * Math.min(1, (x - xAuflauf) / 3)); }
      P0.needsUpdate = true;
      front.scale.set(56 - xAuflauf, pegel - UNT, 1); front.position.set((56 + xAuflauf) / 2, (pegel + UNT) / 2, 0.05);
    });
    // Pegellatte mit Wasserständen
    const latte = (y, txt, farbe) => { const l = new THREE.Mesh(new THREE.BoxGeometry(24, 0.06, 0.06), new THREE.MeshBasicMaterial({ color: farbe })); l.position.set(48, y, 0.3); wurzel.add(l); const s = textSprite(txt, farbe === 0xb91c1c ? '#b91c1c' : '#0c4a6e', 1.3); s.position.set(60.5 + 9, y, 0.3); wurzel.add(s); };
    latte(MNW, 'mittleres Niedrigwasser −1,4 m', 0x0c4a6e); latte(MHW, 'mittleres Hochwasser +1,5 m', 0x0c4a6e); latte(STURM, 'Sturmflut (z. B. 1962) ca. +5 m', 0xb91c1c);
    { const s = textSprite('Höhen in m über NHN (Normalhöhennull ≈ mittlerer Meeresspiegel)', '#334155', 1.1); s.position.set(16, UNT - 1, 0.3); wurzel.add(s); }
    schild('Deichkrone ca. +8,5 m', V(0, 8.7, 0), V(-2, 12.5, 0));
    schild('Binnenböschung steil (ca. 1 : 3)', V(-4.5, 4.5, 0), V(-16, 7.5, 0));
    schild('Außenböschung flach (ca. 1 : 6):\nWellen laufen sanft aus', V(18, 6, 0), V(24, 11, 0));
    schild('Sandkern', V(5, 4, 0.02), V(10, 9.5, 0));
    schild('Kleidecke mit Grasnarbe', V(-3.2, 6.6, 0.02), V(-12, 10.5, 0));
    schild('Deckwerk aus Steinen', V(33, 3.2, -1), V(36, 8.5, 0));
    schild('Deichverteidigungsweg', V(-9, 1.1, 0), V(-18, 4.5, 0));
    schild('Marsch (Klei)', V(-20, -0.8, 0.02), V(-22, -3.6, 1));
    schild('Vorland (Salzwiese)', V(41, 2.4, -2), V(45, 6.5, 0));
    wurzel.position.set(-16, -3, 0);
  }
  etik.visible = st.beschriftung;
  let t = st._zeit || 0; for (const f of bewegt) f(t);
  const info = watt
    ? `Die Gezeiten entstehen durch die Anziehungskraft von Mond und Sonne. Etwa alle <b>12 Stunden 25 Minuten</b> wechseln Hochwasser und Niedrigwasser; an der niedersächsischen Küste steigt und fällt das Wasser dabei um rund 3 m (Tidenhub). Bei <b>Ebbe</b> fällt das <b>Watt</b> trocken, nur die <b>Priele</b> führen noch Wasser – Wattwanderungen nur mit Führung! Bei <b>Flut</b> strömt das Wasser durch die <b>Seegats</b> zwischen den Inseln wieder herein. Hinter dem <b>Deich</b> liegt die flache, fruchtbare <b>Marsch</b> aus abgelagertem Schlick (Klei); früher bauten die Menschen ihre Höfe auf künstlichen Hügeln (<b>Warften</b>). Weiter landeinwärts beginnt die höhere, sandige <b>Geest</b> aus der Eiszeit. Das Wattenmeer ist Nationalpark und UNESCO-Weltnaturerbe. Höhen stark überhöht; ein Tidezyklus dauert hier 24 s.`
    : `Ein Seedeich schützt das tief liegende Land vor Sturmfluten. Die <b>Außenböschung</b> zur See ist sehr flach, damit die Wellen auslaufen und ihre Kraft verlieren; die <b>Binnenböschung</b> ist steiler. Innen liegt ein <b>Sandkern</b>, darüber eine wasserdichte <b>Kleidecke</b> mit festem Gras, das von Schafen kurz gehalten wird – ihre Hufe verdichten den Boden. Am Fuß schützt ein <b>Deckwerk</b> aus Steinen vor Wellenschlag. Seit der Sturmflut von 1962 wurden die Deiche erhöht und verstärkt; heute sind sie in Niedersachsen meist 8 bis 9 m hoch. ${st.sturmflut ? 'Gezeigt: Sturmflut mit ca. +5 m.' : 'Schalte „Sturmflut“ ein, um den Wasserstand von 1962 zu sehen.'}`;
  return {
    objekt: wurzel, radius: watt ? 31 : 38, titel: `Küste – ${ANSICHTEN[st.ansicht]}${st.sturmflut ? ' (Sturmflut)' : ''}`, info: `<b>Nordseeküste</b><br><i>${info}</i>`,
    update: dt => { if (!st.bewegung) return; t += Math.min(dt, 0.1); st._zeit = t; for (const f of bewegt) f(t); },
  };
}
export const entsorge = entsorgeObj;
export function ausUrl(p) { const st = standard(); if (ANSICHTEN[p.get('v')]) st.ansicht = p.get('v'); st.sturmflut = p.get('s') === '1'; return st; }
export const zuUrl = st => `&v=${st.ansicht}&s=${st.sturmflut ? 1 : 0}`;
export function bedienung(ort, st, neu) {
  stil(); ort.innerHTML = '';
  const s = document.createElement('select'); for (const [k, v] of Object.entries(ANSICHTEN)) s.add(new Option(v, k)); ort.appendChild(s);
  const knopf = t => { const b = document.createElement('button'); b.textContent = t; ort.appendChild(b); return b; };
  const bF = knopf('Sturmflut'), bB = knopf('Bewegung'), bS = knopf('Beschriftung');
  const auff = () => { s.value = st.ansicht; bF.classList.toggle('on', st.sturmflut); bB.classList.toggle('on', st.bewegung); bS.classList.toggle('on', st.beschriftung); };
  s.onchange = () => { st.ansicht = s.value; auff(); neu(); };
  bF.onclick = () => { st.sturmflut = !st.sturmflut; auff(); neu(); };
  bB.onclick = () => { st.bewegung = !st.bewegung; auff(); };
  bS.onclick = () => { st.beschriftung = !st.beschriftung; auff(); neu(); };
  auff();
}
