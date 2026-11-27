// Burg-Generator: hochmittelalterliche Spornburg (um 1200) im deutschen Raum, Maße in m.
// Ein Bergsporn ist an drei Seiten durch steile Hänge geschützt; zur Bergseite (+x) trennt ihn der Halsgraben ab,
// dahinter die Schildmauer und der Bergfried. Kernburg mit Palas, Kapelle, Brunnen; davor die Vorburg mit Wirtschaftsbauten.
// Ansichten: ganze Burg, Bergfried im Schnitt, Palas im Schnitt.
import * as THREE from 'three';
import { textSprite, entsorge as entsorgeObj, stil, zufall } from './hilfen.js';

export const ANSICHTEN = { burg: 'Ganze Burg', bergfried: 'Bergfried im Schnitt', palas: 'Palas im Schnitt' };
export const standard = () => ({ ansicht: 'burg', beschriftung: false });
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const H = 15;                                               // Höhe des Burgplateaus über dem Tal
const PA = 42, PB = 18;                                     // Halbachsen des Plateaus

function textur(zeichne, w = 256, h = 256) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; zeichne(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
const TEX = {};
function texturen() {
  if (TEX.stein) return TEX;
  const z = zufall(9);
  TEX.stein = textur((g, w, h) => {               // Bruchsteinmauerwerk in Lagen
    g.fillStyle = '#8a8478'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 21) { let x = -z() * 30; while (x < w) { const b = 22 + z() * 30; const c = 120 + z() * 50; g.fillStyle = `rgb(${c},${c - 6},${c - 16})`; g.fillRect(x + 1.5, y + 1.5, b - 3, 18); x += b; } }
  });
  TEX.dach = textur((g, w, h) => { g.fillStyle = '#7a3b2a'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 16) for (let x = (y / 16) % 2 ? 0 : 10; x < w; x += 20) { const c = 100 + z() * 50; g.fillStyle = `rgb(${c + 40},${c - 30},${c - 50})`; g.beginPath(); g.ellipse(x + 10, y + 10, 9, 8, 0, 0, Math.PI); g.fill(); } });
  TEX.schiefer = textur((g, w, h) => { g.fillStyle = '#3f454f'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 14) for (let x = (y / 14) % 2 ? 0 : 9; x < w; x += 18) { const c = 55 + z() * 30; g.fillStyle = `rgb(${c},${c + 4},${c + 12})`; g.fillRect(x + 1, y + 1, 16, 12); } });
  TEX.holz = textur((g, w, h) => { g.fillStyle = '#6b4a2b'; g.fillRect(0, 0, w, h); for (let i = 0; i < 50; i++) { g.strokeStyle = `rgba(40,25,10,${0.2 + z() * 0.3})`; g.beginPath(); const y = z() * h; g.moveTo(0, y); g.bezierCurveTo(w / 3, y + 5, 2 * w / 3, y - 5, w, y + 2); g.stroke(); } });
  TEX.wiese = textur((g, w, h) => { g.fillStyle = '#5f8a3a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 3500; i++) { g.fillStyle = `rgba(${50 + z() * 60},${100 + z() * 60},${30 + z() * 30},0.4)`; g.fillRect(z() * w, z() * h, 2, 3); } });
  TEX.putz = textur((g, w, h) => { g.fillStyle = '#e8e0cf'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(160,150,130,${z() * 0.15})`; g.fillRect(z() * w, z() * h, 3, 3); } });
  return TEX;
}

export function erzeuge(st) {
  const T = texturen(), ans = st.ansicht, zf = zufall(4);
  const wurzel = new THREE.Group(), etik = new THREE.Group(); wurzel.add(etik);
  const mat = o => new THREE.MeshStandardMaterial({ roughness: 0.9, ...o });
  const steinM = (rx = 1, ry = 1) => { const t = T.stein.clone(); t.repeat.set(rx, ry); t.needsUpdate = true; return mat({ map: t }); };
  const kasten = (x0, x1, y0, y1, z0, z1, m, ziel = wurzel) => { const b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), m); b.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); ziel.add(b); return b; };
  const sKasten = (x0, x1, y0, y1, z0, z1, ziel) => kasten(x0, x1, y0, y1, z0, z1, steinM(Math.max(x1 - x0, z1 - z0) / 4, (y1 - y0) / 4), ziel);
  // Satteldach über einem Rechteck (First entlang x oder z)
  const dach = (x0, x1, z0, z1, y, hoch, tex = T.dach, entlangX = true, ziel = wurzel) => {
    const lx = x1 - x0, lz = z1 - z0, b = entlangX ? lz : lx, l = entlangX ? lx : lz;
    const form = new THREE.Shape([new THREE.Vector2(-b / 2 - 0.4, 0), new THREE.Vector2(b / 2 + 0.4, 0), new THREE.Vector2(0, hoch)]);
    const g = new THREE.ExtrudeGeometry(form, { depth: l + 0.6, bevelEnabled: false }); g.translate(0, 0, -(l + 0.6) / 2);
    const t = tex.clone(); t.repeat.set(0.25, 0.25); t.needsUpdate = true;
    const m = new THREE.Mesh(g, mat({ map: t })); m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); if (entlangX) m.rotation.y = Math.PI / 2; ziel.add(m); return m;
  };
  // Zinnen auf einer Mauerkrone zwischen a und b (xz), Höhe y, nach außen versetzt um seite·dicke/2
  const zinnen = (a, b, y, dicke, normal, ziel = wurzel, m = null) => {
    const d = b.clone().sub(a), l = d.length(), n = Math.floor(l / 2.2), dir = d.normalize(), rot = Math.atan2(-dir.z, dir.x);
    const mm = m || steinM(0.3, 0.4);
    for (let i = 0; i < n; i++) {
      const p = a.clone().addScaledVector(dir, (i + 0.5) * l / n).addScaledVector(normal, dicke / 2 - 0.3);
      const z = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.6, 0.6), mm); z.position.set(p.x, y + 0.8, p.z); z.rotation.y = rot; ziel.add(z);
    }
  };
  // Mauer entlang eines Polygonzugs (xz) mit Wehrgang und Zinnen; innen = Seite der Polygonmitte
  const mauer = (pts, yFuss, hoehe, dicke, mitte, ziel = wurzel, offen = []) => {
    for (let i = 0; i < pts.length - 1; i++) {
      if (offen.includes(i)) continue;
      const a = pts[i], b = pts[i + 1], d = b.clone().sub(a), l = d.length(), m = a.clone().add(b).multiplyScalar(0.5);
      let n = V(-d.z, 0, d.x).normalize(); if (n.dot(m.clone().sub(mitte)) < 0) n.negate();       // nach außen
      const w = new THREE.Mesh(new THREE.BoxGeometry(l + dicke * 0.9, hoehe, dicke), steinM(l / 4, hoehe / 4));
      w.position.set(m.x, yFuss + hoehe / 2, m.z); w.rotation.y = Math.atan2(-d.z, d.x); ziel.add(w);
      zinnen(a, b, yFuss + hoehe, dicke, n, ziel);
    }
  };
  const schilder = [];
  const schild = (txt, anker, ziel, gr = 1.6) => { schilder.push([txt, anker, ziel, gr]); };

  // =================== Ganze Burg ===================
  if (ans === 'burg') {
    // Gelände: Bergsporn mit Plateau, Hängen, Bergrücken nach +x und Halsgraben
    const hoehe = (x, z) => {
      const e = Math.sqrt((x / PA) ** 2 + (z / PB) ** 2), d = (e - 1) * PB;
      let h = e < 1 ? H : H * Math.max(0, 1 - d / 13) ** 1.4;                   // steile Hänge rund um den Sporn
      if (x > 30) {                                                             // Bergrücken zur Bergseite, steigt an
        const r = Math.min(1, Math.max(0, 1 - (Math.abs(z) - 9) / 13)), hr = H + Math.max(0, x - 44) * 0.14;
        h = Math.max(h, hr * (r * r * (3 - 2 * r)));
      }
      if (x > 34 && x < 44) h = Math.min(h, H - 8 + 8 * ((x - 39) / 5) ** 2);   // Halsgraben quer über den Rücken
      return h + 0.35 * Math.sin(x * 0.4) * Math.cos(z * 0.5);
    };
    {
      const g = new THREE.PlaneGeometry(170, 110, 170, 110); g.rotateX(-Math.PI / 2); const P = g.attributes.position;
      for (let i = 0; i < P.count; i++) P.setY(i, hoehe(P.getX(i), P.getZ(i)));
      g.computeVertexNormals(); const t = T.wiese.clone(); t.repeat.set(20, 13); t.needsUpdate = true;
      // Felsige Hänge dunkler: Farbe pro Ecke nach Steilheit
      const N = g.attributes.normal, col = []; for (let i = 0; i < N.count; i++) { const s = N.getY(i); const c = new THREE.Color(0xffffff).lerp(new THREE.Color(0x8c8270), Math.min(1, Math.max(0, (0.85 - s) * 2.5))); col.push(c.r, c.g, c.b); }
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      const m = new THREE.Mesh(g, mat({ map: t, vertexColors: true })); m.position.x = -10; wurzel.add(m);
      for (let i = 0; i < 70; i++) {                                       // Wald an den Hängen
        const x = -95 + zf() * 170, z = -55 + zf() * 110, e = Math.sqrt(((x + 10) / PA) ** 2 + (z / PB) ** 2); if (e < 1.12) continue;
        const y = hoehe(x + 10, z); const b = new THREE.Mesh(new THREE.ConeGeometry(1.6, 6, 8), mat({ color: 0x2f5d2a })); b.position.set(x, y + 3, z); wurzel.add(b);
      }
    }
    const burg = new THREE.Group(); burg.position.x = -10; wurzel.add(burg);
    const ell = (x, s) => s * PB * 0.9 * Math.sqrt(Math.max(0, 1 - (x / (PA * 0.94)) ** 2));
    // Kernburg (x −4 … 33)
    const kern = []; for (let x = -4; x <= 30; x += 4) kern.push(V(x, 0, ell(x, 1))); kern.push(V(33, 0, 10.5)); kern.push(V(33, 0, -10.5)); for (let x = 30; x >= -4; x -= 4) kern.push(V(x, 0, ell(x, -1))); kern.push(kern[0].clone());
    mauer(kern, H, 9, 1.8, V(14, 0, 0), burg, [kern.length - 2]);
    // Schildmauer zur Angriffsseite: viel höher und dicker
    sKasten(32, 35.5, H, H + 17, -12, 12, burg); zinnen(V(35.5, 0, -12), V(35.5, 0, 12), H + 17, 3.5, V(1, 0, 0), burg);
    // Bergfried hinter der Schildmauer, Hocheingang zum Hof
    sKasten(22, 30, H, H + 28, -4, 4, burg);
    zinnen(V(22, 0, -4), V(30, 0, -4), H + 28, 1.2, V(0, 0, -1), burg); zinnen(V(22, 0, 4), V(30, 0, 4), H + 28, 1.2, V(0, 0, 1), burg);
    zinnen(V(22, 0, -4), V(22, 0, 4), H + 28, 1.2, V(-1, 0, 0), burg); zinnen(V(30, 0, -4), V(30, 0, 4), H + 28, 1.2, V(1, 0, 0), burg);
    kasten(21.9, 22, H + 9, H + 11.2, -0.7, 0.7, mat({ map: T.holz }), burg);                // Hocheingang
    for (let i = 0; i < 12; i++) kasten(18 + i * 0.33, 18.4 + i * 0.33, H + i * 0.75, H + i * 0.75 + 0.2, -0.8, 0.8, mat({ map: T.holz }), burg); // Holztreppe
    // Palas an der Südseite (Talseite)
    const pz0 = -ell(10, 1) + 1.0;
    sKasten(2, 20, H, H + 13, pz0, pz0 + 9, burg); dach(2, 20, pz0, pz0 + 9, H + 13, 6, T.schiefer, true, burg);
    for (let i = 0; i < 5; i++) { kasten(4 + i * 3.4, 5.6 + i * 3.4, H + 7.5, H + 10.5, pz0 + 9, pz0 + 9.05, mat({ color: 0x1f2937 }), burg); kasten(4 + i * 3.4, 5.6 + i * 3.4, H + 3, H + 4.6, pz0 + 9, pz0 + 9.05, mat({ color: 0x1f2937 }), burg); }
    const abort = kasten(12, 13.6, H + 8.5, H + 10.5, pz0 - 1.4, pz0, steinM(0.4, 0.5), burg);         // Aborterker
    // Kapelle mit Apsis nach Osten (+x)
    const kz = ell(6, 1) - 7.5;
    sKasten(-1, 9, H, H + 8, kz - 2.5, kz + 2.5, burg); dach(-1, 9, kz - 2.5, kz + 2.5, H + 8, 4, T.schiefer, true, burg);
    { const a = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 6.5, 20, 1, false, 0, Math.PI), steinM(1, 1.5)); a.position.set(9, H + 3.25, kz); burg.add(a); }
    // Brunnen im Hof
    { const b = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 1, 16, 1, true), mat({ map: T.stein, side: THREE.DoubleSide })); b.position.set(14, H + 0.5, 3); burg.add(b); const w = new THREE.Mesh(new THREE.CircleGeometry(1.1, 16), mat({ color: 0x1e3a5f })); w.rotation.x = -Math.PI / 2; w.position.set(14, H + 0.3, 3); burg.add(w); kasten(12.6, 12.8, H, H + 2.6, 2.9, 3.1, mat({ map: T.holz }), burg); kasten(15.2, 15.4, H, H + 2.6, 2.9, 3.1, mat({ map: T.holz }), burg); kasten(12.6, 15.4, H + 2.5, H + 2.7, 2.9, 3.1, mat({ map: T.holz }), burg); }
    // Torhaus zur Vorburg mit Abschnittsgraben und Zugbrücke, Fallgatter
    sKasten(-7, -2, H, H + 13, -4.5, 4.5, burg); dach(-7, -2, -4.5, 4.5, H + 13, 4, T.schiefer, false, burg);
    kasten(-7.05, -1.95, H, H + 5, -1.8, 1.8, mat({ color: 0x1a1a1a }), burg);
    for (let i = 0; i < 6; i++) kasten(-7.2, -7.1, H, H + 4.8, -1.6 + i * 0.64, -1.5 + i * 0.64, mat({ color: 0x3a3a3a, metalness: 0.5 }), burg);   // Fallgatter
    for (let i = 0; i < 4; i++) kasten(-7.2, -7.1, H + 0.6 + i * 1.2, H + 0.7 + i * 1.2, -1.8, 1.8, mat({ color: 0x3a3a3a, metalness: 0.5 }), burg);
    { const br = kasten(-13, -7.2, H - 0.3, H, -1.7, 1.7, mat({ map: T.holz }), burg); void br; }
    { const gr = new THREE.Mesh(new THREE.BoxGeometry(5, 4, 2 * PB * 0.92), mat({ color: 0x4b3b2a })); gr.position.set(-10.1, H - 1.98, 0); burg.add(gr); }   // Abschnittsgraben (vereinfacht als Grube)
    // Vorburg (x −38 … −8) mit niedrigerer Mauer, Tor, Wirtschaftsbauten
    const vor = []; for (let x = -5; x >= -37; x -= 4) vor.push(V(x, 0, ell(x, 1))); vor.push(V(-39, 0, 0)); for (let x = -37; x <= -5; x += 4) vor.push(V(x, 0, ell(x, -1)));
    mauer(vor, H, 6, 1.4, V(-25, 0, 0), burg, [8, 9]);
    sKasten(-40.5, -37.5, H, H + 8, -3.5, 3.5, burg); kasten(-40.6, -37.4, H, H + 4, -1.6, 1.6, mat({ color: 0x1a1a1a }), burg);
    const haus = (x0, x1, z0, z1, h, tex = T.dach) => { const m = kasten(x0, x1, H, H + h, z0, z1, mat({ map: T.putz }), burg); void m; dach(x0, x1, z0, z1, H + h, 3, tex, true, burg); };
    haus(-33, -24, -ell(-28, 1) + 1, -ell(-28, 1) + 6, 4);           // Stall
    haus(-22, -14, -ell(-18, 1) + 1, -ell(-18, 1) + 6, 4.5);         // Scheune
    haus(-32, -26, ell(-29, 1) - 6, ell(-29, 1) - 1, 3.5);           // Schmiede
    haus(-21, -14, ell(-17, 1) - 6, ell(-17, 1) - 1, 4.5);           // Gesindehaus
    { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 1.2, 6), mat({ color: 0x777777 })); r.position.set(-29, H + 4.6, ell(-29, 1) - 3.5); burg.add(r); }
    // Burgweg den Hang hinauf zum Vorburgtor
    { const pts = []; for (let i = 0; i <= 40; i++) { const t = i / 40, x = -64 + 23 * t, z = -30 * (1 - t) ** 1.2; pts.push(V(x, hoehe(x, z) + 0.3, z)); } burg.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 1.1, 6), mat({ color: 0xa08a64 }))); }
    const B = burg.position.x;
    schild('Bergfried (Hauptturm)\nmit Hocheingang', V(B + 26, H + 26, 0), V(B + 18, H + 38, -8));
    schild('Schildmauer', V(B + 34, H + 14, 6), V(B + 46, H + 26, 14));
    schild('Halsgraben', V(B + 39, H - 7, 18), V(B + 52, H + 8, 30));
    schild('Palas (Wohnbau)', V(B + 11, H + 14, pz0 + 4), V(B + 8, H + 30, -24));
    schild('Abort-Erker', V(B + 12.8, H + 9.5, pz0 - 1.4), V(B + 20, H + 4, -30));
    schild('Burgkapelle', V(B + 4, H + 9, kz), V(B + 2, H + 24, 24));
    schild('Brunnen', V(B + 14, H + 1.5, 3), V(B + 18, H + 18, 14));
    schild('Ringmauer mit Wehrgang\nund Zinnen', V(B + 20, H + 9, ell(20, 1)), V(B + 30, H + 22, 30));
    schild('Torhaus mit Fallgatter\nund Zugbrücke', V(B - 7, H + 7, 0), V(B - 10, H + 26, 12));
    schild('Vorburg mit Stall, Scheune,\nSchmiede und Gesindehaus', V(B - 24, H + 5, 0), V(B - 30, H + 22, 18));
    schild('Burgweg', V(B - 52, H * 0.4, -12), V(B - 62, H + 6, -24));
  }

  // =================== Bergfried im Schnitt ===================
  if (ans === 'bergfried') {
    const S = 9, D = 2.6, HT = 28, g = new THREE.Group(); wurzel.add(g);
    const boden = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 1, 40), mat({ map: T.wiese })); boden.position.y = -0.5; g.add(boden);
    // Mauern: hintere Wand ganz, Seitenwände halbiert (Schnitt bei z = 0), vordere Hälfte weg
    sKasten(-S / 2, S / 2, 0, HT, -S / 2, -S / 2 + D, g);
    sKasten(-S / 2, -S / 2 + D, 0, HT, -S / 2, 0, g); sKasten(S / 2 - D, S / 2, 0, HT, -S / 2, 0, g);
    // Schnittflächen etwas heller
    kasten(-S / 2, -S / 2 + D, 0, HT, -0.02, 0.01, mat({ color: 0xb8b0a0 }), g); kasten(S / 2 - D, S / 2, 0, HT, -0.02, 0.01, mat({ color: 0xb8b0a0 }), g);
    zinnen(V(-S / 2, 0, -S / 2), V(S / 2, 0, -S / 2), HT, 1.2, V(0, 0, -1), g); zinnen(V(-S / 2, 0, -S / 2), V(-S / 2, 0, 0), HT, 1.2, V(-1, 0, 0), g); zinnen(V(S / 2, 0, -S / 2), V(S / 2, 0, 0), HT, 1.2, V(1, 0, 0), g);
    // Geschosse: Verlies (Gewölbe mit Angstloch), Eingangsgeschoss mit Hocheingang, Vorrats-/Wachgeschoss, Wehrplattform
    const iw = S - 2 * D, boden2 = y => { const f = kasten(-iw / 2, iw / 2, y - 0.4, y, -S / 2 + D, 0, mat({ map: T.holz }), g); return f; };
    { const gew = new THREE.Mesh(new THREE.CylinderGeometry(iw / 2, iw / 2, S / 2 - D, 24, 1, false, -Math.PI / 2, Math.PI), steinM(1, 1)); gew.rotation.x = Math.PI / 2; gew.rotation.z = 0; gew.position.set(0, 7.2, -(S / 2 - D) / 2); g.add(gew);
      kasten(-iw / 2, iw / 2, 7.2, 9, -S / 2 + D, 0, steinM(1, 0.5), g); const loch = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 2.2, 16), mat({ color: 0x111111 })); loch.position.set(0, 8.1, -0.9); g.add(loch); }
    boden2(9); boden2(15); boden2(21); kasten(-iw / 2, iw / 2, HT - 0.5, HT, -S / 2 + D, 0, steinM(1, 0.2), g);
    // Hocheingang in der Seitenwand (Hofseite) + Leiter von außen, Leitern zwischen den Geschossen
    kasten(-S / 2 - 0.05, -S / 2 + D + 0.05, 9, 11.4, -1.6, -0.2, mat({ color: 0x1f1a14 }), g);
    const leiter = (x, y0, y1, zz, ziel = g) => { for (const dx of [-0.3, 0.3]) kasten(x + dx - 0.05, x + dx + 0.05, y0, y1, zz - 0.05, zz + 0.05, mat({ map: T.holz }), ziel); for (let y = y0 + 0.3; y < y1; y += 0.4) kasten(x - 0.3, x + 0.3, y, y + 0.06, zz - 0.04, zz + 0.04, mat({ map: T.holz }), ziel); };
    leiter(-S / 2 - 1.2, 0, 9.2, -0.9); leiter(1.2, 9, 15.2, -2.5); leiter(-1.2, 15, 21.2, -2.5); leiter(1.2, 21, HT, -2.5);
    // Gefangener im Verlies, Vorräte, Wache
    const figur = (x, y, zz, f) => { const k = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 1.3, 10), mat({ color: f })); k.position.set(x, y + 0.65, zz); g.add(k); const kp = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), mat({ color: 0xd7a57a })); kp.position.set(x, y + 1.5, zz); g.add(kp); };
    figur(0.6, 0, -1.4, 0x5b5045); figur(-1, 9, -1.2, 0x7f1d1d); figur(0.5, 21, -1.5, 0x334155); figur(-1, HT, -1.3, 0x334155);
    for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1, 14), mat({ map: T.holz })); f.position.set(-1.1 + i * 0.75, 15.5, -2.8); g.add(f); }
    schild('Wehrplattform mit Zinnen', V(0, HT + 1, -3), V(9, HT + 5, 4));
    schild('Wachstube', V(0, 22.5, -2), V(10, 22, 4));
    schild('Vorratsraum', V(0, 16, -2.5), V(10, 16, 4));
    schild('Hocheingang (ca. 9 m hoch):\nLeiter wurde bei Gefahr eingezogen', V(-S / 2, 10.4, -0.9), V(-12, 13, 4));
    schild('Eingangsgeschoss', V(0, 10.5, -2), V(10, 10, 4));
    schild('Angstloch: einziger Zugang\nzum Verlies', V(0, 8.2, -0.9), V(10, 6.5, 4));
    schild('Verlies (Gefängnis\noder Vorratsraum)', V(0, 2, -1.5), V(10, 1.5, 4));
    schild('Mauer bis 3 m dick', V(S / 2 - 1.3, 4, 0), V(-11, 3, 5));
  }

  // =================== Palas im Schnitt ===================
  if (ans === 'palas') {
    const LX = 18, TZ = 9, g = new THREE.Group(); wurzel.add(g);
    const boden = new THREE.Mesh(new THREE.BoxGeometry(26, 1, 16), mat({ map: T.wiese })); boden.position.y = -0.5; g.add(boden);
    // Außenmauern: hintere Längswand, beide Giebelwände halb, vordere Wand weg; Keller halb eingetieft
    sKasten(-LX / 2, LX / 2, -3, 13, -TZ / 2, -TZ / 2 + 1.4, g);
    sKasten(-LX / 2, -LX / 2 + 1.4, -3, 13, -TZ / 2, TZ / 2, g); sKasten(LX / 2 - 1.4, LX / 2, -3, 13, -TZ / 2, TZ / 2, g);
    kasten(-LX / 2 + 1.4, LX / 2 - 1.4, -3, -2.8, -TZ / 2 + 1.4, TZ / 2, mat({ color: 0x5b4a36 }), g);
    // Böden: Erdgeschoss (y 0.5), Obergeschoss (y 6), Dachboden (y 13)
    for (const y of [0.5, 6]) kasten(-LX / 2 + 1.4, LX / 2 - 1.4, y - 0.4, y, -TZ / 2 + 1.4, TZ / 2, mat({ map: T.holz }), g);
    // Innenwand im Obergeschoss: Kemenate (beheizbares Zimmer) rechts
    kasten(3.5, 3.8, 6, 12.6, -TZ / 2 + 1.4, TZ / 2, mat({ map: T.putz }), g);
    // Dach (nur hintere Hälfte, damit man hineinsieht)
    { const t = T.schiefer.clone(); t.repeat.set(4, 1.5); t.needsUpdate = true; const d = new THREE.Mesh(new THREE.BoxGeometry(LX + 0.8, 0.3, Math.hypot(TZ / 2 + 0.5, 6)), mat({ map: t })); d.position.set(0, 13 + 3, -TZ / 4 - 0.1); d.rotation.x = Math.atan2(6, TZ / 2 + 0.5); g.add(d); }
    // Fenster in der Rückwand: oben große Rundbogenfenster (Saal), unten schmal
    for (let i = 0; i < 4; i++) { kasten(-6.5 + i * 3, -5.3 + i * 3, 7.5, 10.5, -TZ / 2 + 1.38, -TZ / 2 + 1.42, mat({ color: 0x9cc3e6, emissive: 0x334455 }), g); kasten(-6.2 + i * 3, -5.6 + i * 3, 2, 3.2, -TZ / 2 + 1.38, -TZ / 2 + 1.42, mat({ color: 0x9cc3e6 }), g); }
    // Keller: Fässer und Säcke
    for (let i = 0; i < 6; i++) { const f = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.3, 14), mat({ map: T.holz })); f.rotation.z = Math.PI / 2; f.position.set(-5 + i * 1.6, -2.2, -2); g.add(f); }
    // Erdgeschoss: Küche mit Herdstelle, Kessel, Tisch
    sKasten(-7.5, -4.5, 0.5, 1.3, -3.2, -1.5, g); const glut = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 1.2), new THREE.MeshStandardMaterial({ color: 0xff6a00, emissive: 0xff4500 })); glut.position.set(-6, 1.35, -2.35); g.add(glut);
    const kessel = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat({ color: 0x2b2b2b, side: THREE.DoubleSide })); kessel.position.set(-6, 2.1, -2.35); g.add(kessel);
    sKasten(-8.2, -3.8, 1.3, 5.6, -TZ / 2 + 1.4, -3.2, g);                    // Rauchabzug
    kasten(0, 4, 1.3, 1.4, -1.5, 0, mat({ map: T.holz }), g);
    // Obergeschoss: Rittersaal mit Kamin, langer Tafel, Wandbehang; Kemenate mit Kamin und Bett
    sKasten(-2.5, 0.5, 6, 12.5, -TZ / 2 + 1.4, -TZ / 2 + 2.2, g); const k2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.6), new THREE.MeshStandardMaterial({ color: 0xff6a00, emissive: 0xff4500 })); k2.position.set(-1, 6.1, -TZ / 2 + 2.5); g.add(k2);
    kasten(-7, 2, 6.8, 6.95, -0.8, 0.6, mat({ map: T.holz }), g); for (const x of [-6.6, 1.6]) for (const zz of [-0.7, 0.5]) kasten(x - 0.06, x + 0.06, 6, 6.8, zz - 0.06, zz + 0.06, mat({ map: T.holz }), g);
    for (let i = 0; i < 6; i++) kasten(-6.5 + i * 1.6, -5.9 + i * 1.6, 6, 6.5, 1.0, 1.4, mat({ map: T.holz }), g);
    kasten(-7.5, -3, 8, 11.5, -TZ / 2 + 1.38, -TZ / 2 + 1.45, mat({ color: 0x7f1d1d }), g);
    sKasten(6, 8, 6, 12.5, -TZ / 2 + 1.4, -TZ / 2 + 2.1, g);
    kasten(4.5, 7, 6, 6.7, -1, 1.8, mat({ color: 0x8b5a2b }), g); kasten(4.5, 7, 6.7, 6.9, -1, 1.8, mat({ color: 0xe5e7eb }), g);
    const figur = (x, y, zz, f) => { const k = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 1.3, 10), mat({ color: f })); k.position.set(x, y + 0.65, zz); g.add(k); const kp = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), mat({ color: 0xd7a57a })); kp.position.set(x, y + 1.5, zz); g.add(kp); };
    figur(-4, 0.5, -0.5, 0x6b7280); figur(-2, 6, 1.2, 0x1e40af); figur(-5, 6, 1.2, 0x7f1d1d);
    schild('Dachboden', V(0, 14, -2), V(-4, 21, 3));
    schild('Rittersaal: Feste, Gericht,\nEmpfang von Gästen', V(-3, 8.5, 0), V(-12, 15, 6));
    schild('Kemenate: beheizbares\nWohn- und Schlafzimmer', V(6, 8.5, 0), V(11, 16, 6));
    schild('Kamin', V(-1, 7, -TZ / 2 + 2.3), V(5, 12.5, 7));
    schild('Küche mit offener\nHerdstelle', V(-6, 2, -2.3), V(-13, 4.5, 6));
    schild('Keller: Vorräte', V(-2, -2.2, -2), V(10, -2.5, 6));
    schild('Wände 1,5–2 m dick', V(LX / 2 - 0.7, 3, 4), V(13, 5, 7));
  }

  // ---------- Beschriftung ----------
  if (st.beschriftung) for (const [txt, a, z, gr] of schilder) {
    const s = textSprite(txt, '#1f2937', ans === 'burg' ? 3.2 : gr * 0.75); s.position.copy(z); etik.add(s);
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, z]), new THREE.LineBasicMaterial({ color: 0x334155, depthTest: false })); l.renderOrder = 9; etik.add(l);
  }
  etik.visible = st.beschriftung;
  const radius = ans === 'burg' ? 62 : ans === 'bergfried' ? 20 : 14;
  wurzel.position.y = ans === 'burg' ? -20 : ans === 'bergfried' ? -15 : -5;
  const info = {
    burg: 'Eine Spornburg, wie sie um 1200 in vielen Gegenden Deutschlands gebaut wurde. Sie steht auf einem Bergsporn, der an drei Seiten steil abfällt. Nur zur Bergseite ist sie leicht angreifbar – dort trennt ein tiefer Halsgraben den Sporn vom Berg ab, und eine besonders hohe, dicke Schildmauer und der Bergfried schützen die Burg. In der Kernburg wohnte die adlige Familie im Palas; in der Vorburg lagen Ställe, Scheune, Schmiede und die Häuser der Bediensteten. Wasser kam aus einem tiefen Brunnen oder einer Zisterne.',
    bergfried: 'Der Bergfried war der stärkste und höchste Turm der Burg (oft 25–35 m hoch, Mauern bis 3 m dick). Er war Wachturm und letzte Zuflucht, aber meist keine Wohnung. Der Eingang lag hoch über dem Boden und war nur über eine Leiter oder Holztreppe zu erreichen, die man bei Gefahr entfernte. Ganz unten lag ein fensterloser Raum, der nur durch ein Loch in der Decke („Angstloch“) zu erreichen war – als Verlies für Gefangene oder als Vorratsraum.',
    palas: 'Der Palas war das Wohn- und Saalgebäude der Burgherren. Im Keller lagerten Vorräte, im Erdgeschoss lagen oft Küche und Lagerräume. Im Obergeschoss lag der große Saal für Feste, Gericht und Gäste, mit einem großen Kamin. Daneben gab es die Kemenate – einen Raum mit eigenem Kamin, in dem man es warm hatte. Die Fenster waren klein, nur im Saal gab es größere Bogenfenster; Glas war teuer, oft verschloss man die Öffnungen mit Holzläden.',
  }[ans];
  return { objekt: wurzel, radius, titel: `Mittelalterliche Burg – ${ANSICHTEN[ans]}`, info: `<b>Mittelalterliche Burg (um 1200)</b><br><i>${info}</i>`, update: () => {} };
}
export const entsorge = entsorgeObj;
export function ausUrl(p) { const st = standard(); if (ANSICHTEN[p.get('v')]) st.ansicht = p.get('v'); return st; }
export const zuUrl = st => `&v=${st.ansicht}`;
export function bedienung(ort, st, neu) {
  stil(); ort.innerHTML = '';
  const s = document.createElement('select'); for (const [k, v] of Object.entries(ANSICHTEN)) s.add(new Option(v, k)); ort.appendChild(s);
  const b = document.createElement('button'); b.textContent = 'Beschriftung'; ort.appendChild(b);
  const auff = () => { s.value = st.ansicht; b.classList.toggle('on', st.beschriftung); };
  s.onchange = () => { st.ansicht = s.value; auff(); neu(); };
  b.onclick = () => { st.beschriftung = !st.beschriftung; auff(); neu(); };
  auff();
}
