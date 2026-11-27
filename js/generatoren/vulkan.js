// Vulkan-Generator: Schicht- und Schildvulkan als Blockbild, vorne aufgeschnitten (Schnitt durch den Schlot bei z = 0). Maße in km.
// Schichtvulkan (Stratovulkan): steiler Kegel (oben über 30°), Wechsel von Asche- und Lavaschichten, zähflüssiges,
// gasreiches Magma → explosive Ausbrüche mit Aschewolke, Lavabomben und Glutlawinen; z. B. Vesuv, Fuji, Ätna.
// Schildvulkan: sehr flach (meist unter 10°), viele dünne Lavadecken aus dünnflüssiger Basaltlava → ruhige Ausbrüche mit
// Lavaströmen, z. B. Mauna Loa (Hawaii), Island; in Deutschland der Vogelsberg. Berge überhöht: Schicht 1,5-fach, Schild 3-fach.
import * as THREE from 'three';
import { textSprite, entsorge as entsorgeObj, stil, zufall } from './hilfen.js';

export const TYPEN = { schicht: 'Schichtvulkan', schild: 'Schildvulkan' };
export const standard = () => ({ typ: 'schicht', ausbruch: false, beschriftung: false });
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const BX = 12.5, BZ = 8, UNTEN = -6.5;                       // Blockgröße (x: ±16 km, z: −9 … 0), Unterkante −8 km

const PARAM = {
  schicht: { R: 7, Hk: 3.0, krater: 0.5, kt: 0.2, ueber: 1.5, kammer: [0, -4.4, 2.2, 1.0], nebenkrater: true, magma: '#e25822' },
  schild: { R: 12, Hk: 1.3, krater: 1.6, kt: 0.1, ueber: 3, kammer: [0, -3.0, 3.2, 0.8], nebenkrater: false, magma: '#ff8c1a' },
};
// Oberflächenhöhe (gezeichnet, also mit Überhöhung) in Abhängigkeit vom Abstand r zur Achse
function profil(p, r) {
  if (r >= p.R) return 0.04 * Math.sin(r * 1.3);
  const grund = u => p.typ === 'schicht' ? p.Hk * Math.pow(1 - u, 1.7) : p.Hk * (1 - u * u) ** 0.9 * (1 - 0.15 * u);
  // Krater: Mulde unterhalb des Kraterrands
  const h = r < p.krater ? grund(p.krater / p.R) - p.kt * (1 - (r / p.krater) ** 2) : grund(r / p.R);
  return h * p.ueber;
}

export function erzeuge(st) {
  const p = { ...PARAM[st.typ], typ: st.typ }, schicht = st.typ === 'schicht', zf = zufall(13);
  const wurzel = new THREE.Group(), etik = new THREE.Group(); wurzel.add(etik);
  const mat = o => new THREE.MeshStandardMaterial({ roughness: 0.9, ...o });
  const hoehe = (x, z) => { let h = profil(p, Math.hypot(x, z)); if (p.nebenkrater) { const d = Math.hypot(x - 4.2, z + 0.0); if (d < 1.1) h = Math.max(h, profil(p, Math.hypot(4.2, 0)) + 0.55 * (1 - (d / 1.1) ** 1.5) - (d < 0.25 ? 0.12 * (1 - d / 0.25) : 0)); } return h; };
  // ---------- Schnittfläche: Farben pro Bildpunkt ----------
  const kammer = p.kammer, schlotBreite = schicht ? 0.22 : 0.3;
  const farbe = (x, y) => {
    const top = hoehe(x, 0);
    if (y > top) return null;
    const [kx, ky, ka, kb] = kammer;
    if (((x - kx) / ka) ** 2 + ((y - ky) / kb) ** 2 < 1) return [228 + 20 * Math.sin(x * 3), 90 + 40 * ((y - ky) / kb + 1), 20];           // Magmakammer
    if (Math.abs(x - 0.06 * Math.sin(y * 1.3)) < schlotBreite * (1 + Math.max(0, y) * 0.04) && y > ky) return [240, 110 + 30 * Math.sin(y * 4), 25];  // Schlot
    if (p.nebenkrater) { const t = (y - (-1.2)) / (top - (-1.2)), xs = 0.25 + (4.2 - 0.25) * Math.max(0, t) ** 0.8; if (y > -1.2 && Math.abs(x - xs) < 0.12) return [235, 105, 25]; }   // Nebenschlot
    if (y > 0.02) {                                                           // Vulkanbau
      const d = top - y;                                                      // Tiefe unter der Oberfläche → Schichten parallel zur Flanke
      if (schicht) { const k = Math.floor(d / 0.26); return k % 2 ? [92 + 10 * Math.sin(x * 7), 74, 66] : [176 + 12 * Math.sin(x * 5 + y * 9), 164, 140]; }
      const k = Math.floor(d / 0.16); return k % 3 === 0 ? [118, 62, 48] : [58 + 6 * Math.sin(x * 9), 58, 62];
    }
    // Untergrund: waagerechte Gesteinsschichten, nach unten dunkler
    const k = ((Math.floor((-y + 0.15 * Math.sin(x * 0.7)) / 1.1) % 3) + 3) % 3, f = 1 + y / 14;
    return [[150, 128, 98], [128, 112, 90], [168, 148, 116]][k].map(c => c * f);
  };
  const W = 1024, Hh = 640, ymax = p.Hk * p.ueber + 0.3;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = Hh; const g = cv.getContext('2d'), bild = g.createImageData(W, Hh);
  for (let j = 0; j < Hh; j++) for (let i = 0; i < W; i++) {
    const x = -BX + 2 * BX * (i + 0.5) / W, y = ymax - (ymax - UNTEN) * (j + 0.5) / Hh, c = farbe(x, y), o = 4 * (j * W + i);
    if (c) { bild.data[o] = c[0]; bild.data[o + 1] = c[1]; bild.data[o + 2] = c[2]; bild.data[o + 3] = 255; }
  }
  g.putImageData(bild, 0, 0);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  {
    const pts = []; for (let i = 0; i <= 400; i++) { const x = -BX + 2 * BX * i / 400; pts.push(new THREE.Vector2(x, hoehe(x, 0))); }
    pts.push(new THREE.Vector2(BX, UNTEN), new THREE.Vector2(-BX, UNTEN));
    const geo = new THREE.ShapeGeometry(new THREE.Shape(pts)), P = geo.attributes.position, uv = [];
    for (let i = 0; i < P.count; i++) uv.push((P.getX(i) + BX) / (2 * BX), (P.getY(i) - UNTEN) / (ymax - UNTEN));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    wurzel.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, emissive: 0x220800, emissiveIntensity: 0.15 })));
  }
  // ---------- Oberfläche (hintere Hälfte) mit Farben nach Höhe ----------
  {
    const geo = new THREE.PlaneGeometry(2 * BX, BZ, 240, 70); geo.rotateX(-Math.PI / 2); geo.translate(0, 0, -BZ / 2);
    const P = geo.attributes.position, col = [];
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), z = P.getZ(i), h = hoehe(x, z); P.setY(i, h);
      const rel = h / (p.Hk * p.ueber), n = 0.5 + 0.5 * Math.sin(x * 2.3) * Math.cos(z * 1.9);
      let c;
      if (schicht) c = rel > 0.82 ? new THREE.Color(0xeef2f5) : rel > 0.35 ? new THREE.Color(0x7d7065).lerp(new THREE.Color(0x968a7c), n) : new THREE.Color(0x5d8a3a).lerp(new THREE.Color(0x7c7056), Math.max(0, rel * 2.5 - 0.2));
      else c = rel > 0.05 ? new THREE.Color(0x5b524c).lerp(new THREE.Color(0x7a6656), n * 0.6) : new THREE.Color(0x5d8a3a);
      col.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
    wurzel.add(new THREE.Mesh(geo, mat({ vertexColors: true })));
    // Seiten- und Rückwände des Blocks
    const wandTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 256; const q = c.getContext('2d'); for (let j = 0; j < 256; j++) { const y = -(j / 256) * -UNTEN; const k = Math.floor(-y / 1.1) % 3, f = 1 + y / 14; const cc = [[150, 128, 98], [128, 112, 90], [168, 148, 116]][k].map(v => Math.round(v * f)); q.fillStyle = `rgb(${cc})`; q.fillRect(0, j, 64, 1); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const wand = (w, d, pos, rotY) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, -UNTEN), mat({ map: wandTex })); m.position.copy(pos); m.rotation.y = rotY; wurzel.add(m); };
    wand(2 * BX, 0, V(0, UNTEN / 2, -BZ), Math.PI); wand(BZ, 0, V(-BX, UNTEN / 2, -BZ / 2), -Math.PI / 2); wand(BZ, 0, V(BX, UNTEN / 2, -BZ / 2), Math.PI / 2);
  }
  // ---------- Ausbruch ----------
  const anim = [];
  if (st.ausbruch) {
    const gipfel = V(0, hoehe(0, 0) + 0.05, -0.05);
    if (schicht) {
      // Aschesäule und Schirm aus Wolkenkugeln
      const wolkeM = new THREE.MeshStandardMaterial({ color: 0x6b6763, roughness: 1, transparent: true, opacity: 0.9 });
      for (let i = 0; i < 46; i++) {
        const k = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), wolkeM); const ph = zf();
        anim.push(t => { const u = (t * 0.06 + ph) % 1, y = gipfel.y + u * 9, breit = u > 0.7 ? (u - 0.7) * 14 : 0.3 + u * 1.2; k.position.set(Math.cos(ph * 40) * breit, y, -Math.abs(Math.sin(ph * 40)) * breit * 0.6 - 0.3); k.scale.setScalar(0.5 + u * 1.6); });
        wurzel.add(k);
      }
      // Lavabomben auf Wurfparabeln
      const bM = new THREE.MeshStandardMaterial({ color: 0x3b1d10, emissive: 0xff4400, emissiveIntensity: 0.8 });
      for (let i = 0; i < 18; i++) {
        const b = new THREE.Mesh(new THREE.DodecahedronGeometry(0.09), bM), w = zf() * Math.PI * 2, v = 2.2 + zf() * 1.5, ph = zf();
        anim.push(t => { const u = ((t * 0.35 + ph) % 1) * 1.6; const x = Math.cos(w) * v * 0.55 * u, z = -Math.abs(Math.sin(w)) * v * 0.55 * u, y = gipfel.y + v * u - 2.4 * u * u; const hh = hoehe(x, z); b.visible = y > hh; b.position.set(x, Math.max(y, hh), z); });
        wurzel.add(b);
      }
      // Glutlawine (pyroklastischer Strom) die Flanke hinab
      const gM = new THREE.MeshStandardMaterial({ color: 0x8a7f74, transparent: true, opacity: 0.85, roughness: 1 });
      for (let i = 0; i < 14; i++) {
        const k = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 1), gM), ph = i / 14;
        anim.push(t => { const u = (t * 0.12 + ph) % 1, r = 0.6 + u * 7.5, w = -2.2 + 0.2 * Math.sin(i), x = Math.cos(w) * r, z = Math.sin(w) * r * 0.5 - 0.6; k.position.set(x, hoehe(x, z) + 0.25 + u * 0.3, z); k.scale.setScalar(0.6 + u * 1.2); k.material.opacity = 0.85 * (1 - u * 0.6); });
        wurzel.add(k);
      }
    } else {
      // Lavafontäne und Lavaströme die flachen Hänge hinunter
      const fM = new THREE.MeshStandardMaterial({ color: 0xffa000, emissive: 0xff5a00, emissiveIntensity: 1 });
      for (let i = 0; i < 26; i++) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), fM), w = zf() * Math.PI * 2, ph = zf();
        anim.push(t => { const u = (t * 0.8 + ph) % 1; b.position.set(Math.cos(w) * 0.5 * u - 0.6, hoehe(0.6, 0) + 1.6 * u - 1.4 * u * u + 0.1, Math.sin(w) * 0.3 * u - 0.8); });
        wurzel.add(b);
      }
      for (const [w, laenge] of [[Math.PI * 0.95, 11], [Math.PI * 0.62, 9], [Math.PI * 0.2, 12]]) {
        const pts = []; for (let i = 0; i <= 50; i++) { const r = 1.6 + laenge * i / 50, ww = w + 0.12 * Math.sin(i * 0.4), x = Math.cos(ww) * r, z = -Math.abs(Math.sin(ww)) * r * 0.55 - 0.3; pts.push(V(x, hoehe(x, z) + 0.06, z)); }
        const kurve = new THREE.CatmullRomCurve3(pts), geo = new THREE.TubeGeometry(kurve, 120, 0.22, 6), m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xff7a00, emissive: 0xff3d00, emissiveIntensity: 0.9 }));
        wurzel.add(m);
        const n = geo.index.count;
        anim.push(t => { const u = (t * 0.07) % 1.15; geo.setDrawRange(0, Math.floor(Math.min(1, u) * n / 6) * 6); });
      }
      // Lavasee im Krater
      const see = new THREE.Mesh(new THREE.CircleGeometry(1.2, 32, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0xff7a00, emissive: 0xff4500, emissiveIntensity: 0.9 })); see.rotation.x = -Math.PI / 2; see.rotation.z = Math.PI; see.position.set(0, hoehe(0, 0) + 0.05, 0); wurzel.add(see);
    }
  }
  // ---------- Beschriftung ----------
  const schild = (txt, a, z, farbe = '#1f2937') => { const s = textSprite(txt, farbe, 0.8); s.position.copy(z); etik.add(s); const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, z]), new THREE.LineBasicMaterial({ color: 0x334155, depthTest: false })); l.renderOrder = 9; etik.add(l); };
  const top = hoehe(0, 0), [kx, ky, ka] = kammer;
  schild('Magmakammer', V(kx + ka * 0.5, ky, 0.02), V(-9, ky - 1.0, 2));
  schild('Schlot', V(0.1, ky / 2 + 0.5, 0.02), V(5.5, -1.6, 2));
  schild('Krater', V(0, top + 0.1, -0.2), V(-5, top + 3.3, 1));
  if (schicht) {
    schild('Schichten aus Asche (hell)\nund erstarrter Lava (dunkel)', V(-3.2, hoehe(-3.2, 0) - 0.5, 0.02), V(-9.5, 4.2, 2));
    schild('Nebenkrater mit\nNebenschlot', V(4.2, hoehe(4.2, 0) + 0.1, -0.1), V(8.5, 5, 1));
    if (st.ausbruch) { schild('Aschewolke', V(0.5, top + 6, -0.5), V(7.5, top + 7.5, 0)); schild('Lavabomben', V(1.2, top + 1, -0.4), V(-7.5, top + 5.5, 0)); schild('Glutlawine', V(-4.5, hoehe(-4.5, -2) + 0.4, -2), V(-10.5, 2.2, -2)); }
  } else {
    schild('viele dünne Lavadecken\n(Basalt)', V(-6, hoehe(-6, 0) - 0.4, 0.02), V(-9.5, 5, 2));
    schild('flache Hänge', V(9, hoehe(9, -1), -1), V(10, 4.5, 0));
    if (st.ausbruch) { schild('Lavastrom aus\ndünnflüssiger Lava', V(-5.5, hoehe(-5.5, -2.2) + 0.1, -2.2), V(-3.5, 7.2, -2)); schild('Lavasee im Krater', V(0.3, top + 0.1, -0.3), V(5, top + 2.6, 1)); }
  }
  schild('Erdkruste (Gestein)', V(-10.5, -4.5, 0.02), V(-10.5, -7.8, 2));
  { const b = new THREE.Mesh(new THREE.BoxGeometry(2, 0.12, 0.05), new THREE.MeshBasicMaterial({ color: 0x111827 })); b.position.set(BX - 2.5, UNTEN - 0.6, 0.1); etik.add(b); const t = textSprite(`2 km (Berg ${p.ueber.toLocaleString('de-DE')}-fach überhöht)`, '#111827', 0.5); t.position.set(BX - 2.5, UNTEN - 1.15, 0.1); etik.add(t); }
  etik.visible = st.beschriftung;
  wurzel.position.y = -(ymax + UNTEN) / 2 - 1;
  const info = schicht
    ? 'Ein <b>Schichtvulkan</b> (Stratovulkan) entsteht, wenn zähflüssiges, gasreiches Magma aufsteigt – typisch dort, wo eine Platte unter eine andere abtaucht. Das Gas kann kaum entweichen, der Druck steigt, bis der Vulkan explosiv ausbricht: Eine Aschewolke steigt kilometerhoch auf, Lavabomben fliegen umher, und Glutlawinen aus heißer Asche und Gas rasen die Hänge hinab. Weil sich Ascheschichten und Lavaschichten abwechseln, wird der Kegel immer höher und steiler. Beispiele: Vesuv, Ätna, Fuji. In der Eifel war der Laacher See vor 13 000 Jahren ein solcher explosiver Ausbruch.'
    : 'Ein <b>Schildvulkan</b> entsteht aus dünnflüssiger, gasarmer Basaltlava – typisch über heißen Flecken im Erdmantel (Hawaii) oder dort, wo Platten auseinanderdriften (Island). Die Lava fließt ruhig aus und läuft in breiten Strömen weit die Hänge hinab, bevor sie erstarrt. Schicht für Schicht entsteht so ein sehr breiter, flacher Berg – er sieht aus wie ein liegender Schild. Der Berg ist hier dreifach überhöht gezeichnet, sonst wäre er kaum zu erkennen. Beispiele: Mauna Loa auf Hawaii, Vulkane auf Island; in Deutschland der erloschene Vogelsberg.';
  return {
    objekt: wurzel, radius: 14, titel: `Vulkan im Schnitt – ${TYPEN[st.typ]}`, info: info + '<br><i>Der Block ist vorne genau durch den Schlot aufgeschnitten. Die Ausbrüche sind stark beschleunigt.</i>',
    update: (() => { let t = st._zeit || 0; return dt => { t += Math.min(dt, 0.1); st._zeit = t; for (const f of anim) f(t); }; })(),
  };
}
export const entsorge = entsorgeObj;
export function ausUrl(q) { const st = standard(); if (TYPEN[q.get('t')]) st.typ = q.get('t'); if (q.get('a') === '0') st.ausbruch = false; return st; }
export const zuUrl = st => `&t=${st.typ}&a=${st.ausbruch ? 1 : 0}`;
export function bedienung(ort, st, neu) {
  stil(); ort.innerHTML = '';
  const s = document.createElement('select'); for (const [k, v] of Object.entries(TYPEN)) s.add(new Option(v, k)); ort.appendChild(s);
  const knopf = t => { const b = document.createElement('button'); b.textContent = t; ort.appendChild(b); return b; };
  const bA = knopf('Ausbruch'), bS = knopf('Beschriftung');
  const auff = () => { s.value = st.typ; bA.classList.toggle('on', st.ausbruch); bS.classList.toggle('on', st.beschriftung); };
  s.onchange = () => { st.typ = s.value; auff(); neu(); };
  bA.onclick = () => { st.ausbruch = !st.ausbruch; auff(); neu(); };
  bS.onclick = () => { st.beschriftung = !st.beschriftung; auff(); neu(); };
  auff();
}
