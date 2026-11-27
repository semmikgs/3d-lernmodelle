// Regenwald-Generator: Stockwerkbau des tropischen Regenwaldes, Maße in m (Höhen 1 : 1), vorne aufgeschnitten bis in den Boden.
// Stockwerke (vereinfacht nach Schulbuch): Krautschicht bis ca. 2 m · Strauchschicht bis ca. 10 m · untere Baumschicht
// 10–30 m · Kronendach 30–40 m · Urwaldriesen (Überständer) bis 60 m. Licht: oben 100 %, am Boden nur 1–2 %.
// Boden: dünne Humusschicht über tiefgründig verwittertem, rotem, nährstoffarmem Boden (Latosol).
import * as THREE from 'three';
import { textSprite, entsorge as entsorgeObj, stil, zufall } from './hilfen.js';

export const STOCKWERKE = {
  riesen: ['Urwaldriesen', 40, 62, 0x3f7d3a, 'Einzelne Bäume ragen bis 60 m (manche über 70 m) aus dem Kronendach heraus. Sie sind Sonne, Wind und großen Temperaturschwankungen ausgesetzt. Mächtige Brettwurzeln stützen sie, weil ihre Wurzeln nur flach im Boden liegen. Hier nisten Greifvögel wie die Harpyie.', '100 %', 'heiß und trocken am Tag, Wind'],
  krone: ['Kronendach (obere Baumschicht)', 30, 40, 0x2f6b2f, 'Die Kronen schließen sich zu einem fast geschlossenen Dach. Hier wachsen die meisten Blätter, Blüten und Früchte – deshalb leben hier die meisten Tiere: Affen, Faultiere, Tukane, Papageien, unzählige Insekten. Auf den Ästen sitzen Aufsitzerpflanzen (Epiphyten) wie Orchideen und Bromelien; Lianen klettern vom Boden zum Licht.', 'ca. 70–100 %', 'warm, große Schwankungen'],
  unten: ['untere Baumschicht', 10, 30, 0x4f8a3c, 'Jüngere Bäume, Palmen und schattenverträgliche Arten warten hier darauf, dass im Kronendach eine Lücke entsteht. Es ist schon deutlich dunkler und feuchter.', 'ca. 5–25 %', 'feucht, ausgeglichen'],
  strauch: ['Strauchschicht', 2, 10, 0x6aa04a, 'Sträucher, Jungbäume, Baumfarne und großblättrige Pflanzen. Große Blätter fangen möglichst viel des wenigen Lichts ein.', 'ca. 2–5 %', 'sehr feucht, kaum Wind'],
  kraut: ['Krautschicht und Boden', 0, 2, 0x8bb85a, 'Am Boden kommen nur 1–2 % des Sonnenlichts an – es wachsen nur wenige Kräuter, Farne und Pilze. Es ist das ganze Jahr etwa 25 °C warm und fast 100 % feucht. Laub fällt ständig und wird von Pilzen, Bakterien, Termiten und Ameisen sehr schnell zersetzt; die Nährstoffe werden sofort wieder von den Wurzeln aufgenommen. Deshalb ist die Humusschicht nur wenige Zentimeter dick, und der rote Boden darunter ist arm an Nährstoffen.', '1–2 %', '≈ 25 °C, fast 100 % Luftfeuchte'],
};
export const standard = () => ({ fokus: 'alle', licht: true, tiere: true, beschriftung: true });
const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const LX = 50, LZ = 24, BODEN = -6;

export function erzeuge(st) {
  const wurzel = new THREE.Group(), etik = new THREE.Group(), zf = zufall(19); wurzel.add(etik);
  const gr = {}; for (const k of Object.keys(STOCKWERKE)) { gr[k] = new THREE.Group(); wurzel.add(gr[k]); }
  const mat = (farbe, o = {}) => new THREE.MeshStandardMaterial({ color: farbe, roughness: 0.85, ...o });
  const rinde = mat(0x6b5a45), rindeHell = mat(0x9a8a6e);
  const stamm = (x, z, h, r, g, m = rinde) => { const s = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.7, r, h, 10), m); s.position.set(x, h / 2, z); g.add(s); return s; };
  const krone = (x, y, z, rx, ry, farbe, g) => { const n = 4 + Math.floor(zf() * 3); for (let i = 0; i < n; i++) { const k = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), mat(new THREE.Color(farbe).offsetHSL((zf() - 0.5) * 0.04, 0, (zf() - 0.5) * 0.1))); k.scale.set(rx * (0.55 + zf() * 0.35), ry * (0.6 + zf() * 0.3), rx * (0.55 + zf() * 0.35)); k.position.set(x + (zf() - 0.5) * rx * 0.9, y + (zf() - 0.5) * ry * 0.4, z + (zf() - 0.5) * rx * 0.9); g.add(k); } };
  const frei = (z) => z < -0.6;                                   // nur hinter der Schnittebene
  // ---------- Boden: Humus (dünn) und roter Latosol, vorne aufgeschnitten ----------
  {
    const b = new THREE.Mesh(new THREE.BoxGeometry(LX, -BODEN - 0.3, LZ), mat(0xb5532c)); b.position.set(0, (BODEN - 0.3) / 2, -LZ / 2); wurzel.add(b);
    const h = new THREE.Mesh(new THREE.BoxGeometry(LX, 0.3, LZ), mat(0x3b2a1a)); h.position.set(0, -0.15, -LZ / 2); wurzel.add(h);
    const laub = new THREE.Mesh(new THREE.PlaneGeometry(LX, LZ), mat(0x5c4a2c)); laub.rotation.x = -Math.PI / 2; laub.position.set(0, 0.01, -LZ / 2); wurzel.add(laub);
    // flache Wurzeln im Schnitt (fast alle in der obersten Bodenschicht)
    for (let i = 0; i < 40; i++) { const x0 = (zf() - 0.5) * LX * 0.9, pts = [V(x0, -0.1, 0.03), V(x0 + (zf() - 0.5) * 3, -0.4 - zf() * 0.5, 0.03), V(x0 + (zf() - 0.5) * 5, -0.3 - zf() * 0.9, 0.03)]; wurzel.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, 0.05, 4), mat(0xd9c3a0))); }
  }
  // ---------- Urwaldriesen mit Brettwurzeln und Schirmkrone ----------
  for (const [x, z, h] of [[-14, -9, 58], [12, -14, 62], [21, -5, 52]]) {
    stamm(x, z, h - 6, 0.9, gr.riesen, rindeHell);
    for (let i = 0; i < 5; i++) { const w = i / 5 * Math.PI * 2 + 0.3, f = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(3.2, 0), new THREE.Vector2(0, 4.5)]); const g = new THREE.Mesh(new THREE.ExtrudeGeometry(f, { depth: 0.18, bevelEnabled: false }), rindeHell); g.position.set(x, 0, z); g.rotation.y = -w; g.translateZ(-0.09); gr.riesen.add(g); }
    krone(x, h - 4, z, 9, 4.5, 0x3f7d3a, gr.riesen);
  }
  // ---------- Kronendach: dichte Kronen in 30–40 m ----------
  for (let i = 0; i < 26; i++) { const x = (zf() - 0.5) * (LX - 6), z = -1.5 - zf() * (LZ - 3), h = 31 + zf() * 7; stamm(x, z, h - 3, 0.5, gr.krone); krone(x, h, z, 5.2, 3.6, 0x2f6b2f, gr.krone); }
  // ---------- untere Baumschicht: schlanke Bäume und Palmen 10–30 m ----------
  for (let i = 0; i < 22; i++) {
    const x = (zf() - 0.5) * (LX - 4), z = -1 - zf() * (LZ - 2), h = 12 + zf() * 14;
    if (i % 3 === 0) { stamm(x, z, h, 0.2, gr.unten, mat(0x8a7a5e)); for (let k = 0; k < 8; k++) { const w = k / 8 * Math.PI * 2, b = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.06, 0.6), mat(0x4f8a3c)); b.position.set(x + Math.cos(w) * 1.5, h - 0.4, z + Math.sin(w) * 1.5); b.rotation.y = -w; b.rotation.z = -0.35; gr.unten.add(b); } }
    else { stamm(x, z, h - 2, 0.25, gr.unten); krone(x, h, z, 2.6, 2.4, 0x4f8a3c, gr.unten); }
  }
  // ---------- Strauchschicht: Sträucher, Jungbäume, Baumfarne ----------
  for (let i = 0; i < 30; i++) {
    const x = (zf() - 0.5) * (LX - 2), z = -0.8 - zf() * (LZ - 1.5), h = 3 + zf() * 6;
    if (i % 4 === 0) { stamm(x, z, h, 0.15, gr.strauch, mat(0x4a3b2b)); for (let k = 0; k < 9; k++) { const w = k / 9 * Math.PI * 2, f = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.04, 0.5), mat(0x5f9a40)); f.position.set(x + Math.cos(w) * 1, h, z + Math.sin(w) * 1); f.rotation.y = -w; f.rotation.z = -0.5; gr.strauch.add(f); } }
    else krone(x, h * 0.6, z, 1.4, h * 0.35, 0x6aa04a, gr.strauch);
  }
  // ---------- Krautschicht: wenige Kräuter, Farne, Pilze ----------
  for (let i = 0; i < 45; i++) { const x = (zf() - 0.5) * (LX - 1), z = -0.5 - zf() * (LZ - 1); const k = new THREE.Mesh(new THREE.ConeGeometry(0.3 + zf() * 0.3, 0.6 + zf() * 1.2, 6), mat(0x8bb85a)); k.position.set(x, 0.5, z); gr.kraut.add(k); }
  // ---------- Lianen und Epiphyten ----------
  for (let i = 0; i < 14; i++) {
    const x = (zf() - 0.5) * (LX - 8), z = -2 - zf() * (LZ - 4), h = 30 + zf() * 8, pts = [];
    for (let k = 0; k <= 12; k++) { const u = k / 12; pts.push(V(x + Math.sin(u * 9 + i) * 0.6, u * h, z + Math.cos(u * 7 + i) * 0.6)); }
    gr.krone.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.08, 5), mat(0x5b6b2a)));
  }
  for (let i = 0; i < 30; i++) { const x = (zf() - 0.5) * (LX - 6), z = -1.5 - zf() * (LZ - 3), y = 26 + zf() * 10; const e = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.7, 6), mat(i % 3 ? 0xd946ef : 0xef4444)); e.position.set(x, y, z); e.rotation.x = Math.PI; gr.krone.add(e); }
  // ---------- Licht von oben: Lichtstrahlen werden nach unten immer schwächer ----------
  if (st.licht) {
    for (let i = 0; i < 9; i++) {
      const x = -20 + i * 5, h = [62, 40, 30, 10, 2];
      for (let s = 0; s < 4; s++) { const y0 = h[s + 1], y1 = h[s], a = [0.35, 0.16, 0.06, 0.025][s]; const b = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, y1 - y0, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff1a8, transparent: true, opacity: a, depthWrite: false })); b.position.set(x, (y0 + y1) / 2, -0.4); wurzel.add(b); }
    }
    const sonne = new THREE.Mesh(new THREE.SphereGeometry(2.2, 24, 16), new THREE.MeshBasicMaterial({ color: 0xfde047 })); sonne.position.set(-18, 67, -6); wurzel.add(sonne);
  }
  // ---------- Tiere (als Symbole) ----------
  if (st.tiere) for (const [t, x, y, z, k] of [['🦅', 12, 64, -14, 'riesen'], ['🐒', -6, 35, -2, 'krone'], ['🦜', 6, 37, -3, 'krone'], ['🦥', -18, 32, -3, 'krone'], ['🐸', 8, 12, -2, 'unten'], ['🦋', -10, 7, -2, 'strauch'], ['🐆', 4, 1.4, -2, 'kraut'], ['🐜', -4, 0.6, -1, 'kraut']]) {
    const s = textSprite(t, '#000', 3.2, 'rgba(0,0,0,0)'); s.position.set(x, y, z); gr[k].add(s);
  }
  // ---------- Hervorheben ----------
  if (st.fokus !== 'alle') for (const [k, g] of Object.entries(gr)) if (k !== st.fokus) g.traverse(o => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity *= 0.12; o.material.depthWrite = false; } });
  // ---------- Höhenskala mit Stockwerken ----------
  const X = LX / 2 + 3;
  { const l = new THREE.Mesh(new THREE.BoxGeometry(0.25, 62, 0.25), new THREE.MeshBasicMaterial({ color: 0x334155 })); l.position.set(X, 31, 0); wurzel.add(l); }
  for (const [k, [name, a, b, farbe, , licht]] of Object.entries(STOCKWERKE)) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(1.4, b - a - 0.3, 0.4), new THREE.MeshBasicMaterial({ color: farbe, transparent: st.fokus !== 'alle' && st.fokus !== k, opacity: 0.3 })); band.position.set(X + 1, (a + b) / 2, 0); wurzel.add(band);
    if (st.beschriftung) { const s = textSprite(`${name}\nLicht: ${licht}`, '#1f2937', 2.0); s.position.set(X + 2.4 + s.scale.x / 2, (a + b) / 2, 0); etik.add(s); }
  }
  for (const h of [0, 10, 20, 30, 40, 50, 60]) { const s = textSprite(`${h} m`, '#334155', 1.6); s.position.set(X - 1.2 - s.scale.x / 2, h, 0); wurzel.add(s); }
  if (st.beschriftung) {
    const schild = (txt, a, z) => { const s = textSprite(txt, '#1f2937', 1.9); s.position.copy(z); etik.add(s); const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, z]), new THREE.LineBasicMaterial({ color: 0x334155, depthTest: false })); l.renderOrder = 9; etik.add(l); };
    schild('Brettwurzeln', V(-14, 2.5, -8), V(-34, 8, -4));
    schild('Lianen', V(-2, 20, -6), V(-34, 22, -2));
    schild('Aufsitzerpflanzen\n(Epiphyten)', V(-8, 30, -6), V(-36, 33, -2));
    schild('dünne Humusschicht', V(-20, -0.15, 0.1), V(-36, -2.5, 2));
    schild('roter, nährstoffarmer Boden', V(-12, -3.5, 0.1), V(-34, -7.5, 2));
  }
  etik.visible = st.beschriftung;
  wurzel.position.set(-3, -32, 6);
  const s = STOCKWERKE[st.fokus];
  const info = s
    ? `<b>${s[0]}</b> (${s[1]}–${s[2]} m) · Licht: ${s[5]} · ${s[6]}<br><i>${s[4]}</i>`
    : '<b>Stockwerkbau des tropischen Regenwaldes</b><br><i>Im immerfeuchten tropischen Regenwald ist es das ganze Jahr warm und nass – Pflanzen können ständig wachsen. Sie konkurrieren vor allem um <b>Licht</b>: Deshalb ist der Wald in Stockwerke gegliedert, vom Boden bis zu den Urwaldriesen in 60 m Höhe. Nur 1–2 % des Sonnenlichts erreichen den Boden. Fast alle Nährstoffe stecken in den Pflanzen, nicht im Boden: Abgestorbenes wird schnell zersetzt und sofort wieder aufgenommen (geschlossener Nährstoffkreislauf). Wird der Wald gerodet, wäscht der Regen die dünne Humusschicht schnell aus – der Boden wird unfruchtbar. Wähle oben ein Stockwerk aus, um mehr zu erfahren. Höhen maßstäblich (Mensch: 1,7 m).</i>';
  // Mensch zum Größenvergleich
  { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 1.7, 8), mat(0xdc2626)); m.position.set(-2, 0.85, -1); wurzel.add(m); }
  return { objekt: wurzel, radius: 46, titel: `Tropischer Regenwald – ${s ? s[0] : 'Stockwerke'}`, info, update: () => {} };
}
export const entsorge = entsorgeObj;
export function ausUrl(p) { const st = standard(); if (STOCKWERKE[p.get('o')]) st.fokus = p.get('o'); return st; }
export const zuUrl = st => `&o=${st.fokus}`;
export function bedienung(ort, st, neu) {
  stil(); ort.innerHTML = '';
  const s = document.createElement('select'); s.add(new Option('Alle Stockwerke', 'alle')); for (const [k, [n]] of Object.entries(STOCKWERKE)) s.add(new Option(n, k)); ort.appendChild(s);
  const knopf = t => { const b = document.createElement('button'); b.textContent = t; ort.appendChild(b); return b; };
  const bL = knopf('Licht'), bT = knopf('Tiere'), bS = knopf('Beschriftung');
  const auff = () => { s.value = st.fokus; bL.classList.toggle('on', st.licht); bT.classList.toggle('on', st.tiere); bS.classList.toggle('on', st.beschriftung); };
  s.onchange = () => { st.fokus = s.value; auff(); neu(); };
  bL.onclick = () => { st.licht = !st.licht; auff(); neu(); };
  bT.onclick = () => { st.tiere = !st.tiere; auff(); neu(); };
  bS.onclick = () => { st.beschriftung = !st.beschriftung; auff(); neu(); };
  auff();
}
