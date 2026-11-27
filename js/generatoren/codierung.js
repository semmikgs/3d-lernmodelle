// Codierungs-Generator: Wie Computer Daten mit 0 und 1 darstellen.
// (1) Binärzahlen: 8 Bit = 1 Byte als Lampen mit Stellenwerten 128 … 1; zählt auf Wunsch von 0 bis 255.
// (2) Text: jedes Zeichen als ASCII-Code (7 Bit, hier in 8 Bit) – eine Reihe Lampen pro Zeichen.
// (3) Bilder: Pixelgrafik 16 × 16 – schwarz-weiß mit 1 Bit pro Pixel oder farbig mit 24 Bit (je 8 Bit Rot, Grün, Blau);
//     die Farbebenen lassen sich auseinanderziehen.
import * as THREE from 'three';
import { textSprite, entsorge as entsorgeObj, stil, zahlKnopf } from './hilfen.js';

export const ANSICHTEN = { binaer: 'Binärzahlen (1 Byte)', text: 'Text im ASCII-Code', bild: 'Bild aus Pixeln' };
export const standard = () => ({ ansicht: 'binaer', zahl: 42, text: 'KGS', farbe: true, zerlegt: false, bewegung: false, beschriftung: true });
const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const bits = (n, k = 8) => n.toString(2).padStart(k, '0');

// 16 × 16 Pixelbild (Haus mit Baum und Sonne); Zeichen → Farbe
const PALETTE = { '.': [135, 206, 235], 'g': [76, 160, 60], 'r': [200, 40, 30], 'w': [245, 240, 225], 'b': [120, 70, 30], 'y': [250, 210, 40], 'd': [40, 90, 40], 'f': [60, 110, 200] };
const BILD = [
  '............yy..', '...........yyyy.', '...........yyyy.', '......rr.....yy.', '.....rrrr.......', '....rrrrrr...dd.', '...rrrrrrrr.dddd',
  '..rrrrrrrrrrdddd', '...wwwwwwww..dd.', '...wffwwffw...b.', '...wffwwffw...b.', '...wwwbbwww...b.', '...wwwbbwww...b.', 'gggwwwbbwwwggggg', 'gggggggggggggggg', 'gggggggggggggggg',
];

export function erzeuge(st) {
  const wurzel = new THREE.Group(), etik = new THREE.Group(); wurzel.add(etik);
  const m = (farbe, o = {}) => new THREE.MeshStandardMaterial({ color: farbe, roughness: 0.45, ...o });
  const text = (t, p, farbe = '#1f2937', h = 0.5, bg) => { const s = textSprite(t, farbe, h, bg); s.position.copy(p); wurzel.add(s); return s; };
  const bewegt = [];
  let info, radius;

  // Lampe (Bit): Sockel und Kugel, an = gelb leuchtend
  const lampe = (p, an, gr = 1) => {
    const g = new THREE.Group(); g.position.copy(p); wurzel.add(g);
    const so = new THREE.Mesh(new THREE.CylinderGeometry(0.42 * gr, 0.5 * gr, 0.35 * gr, 20), m(0x475569)); so.position.y = -0.4 * gr; g.add(so);
    const k = new THREE.Mesh(new THREE.SphereGeometry(0.4 * gr, 24, 16), m(0xfde047)); g.add(k);
    const setze = a => { k.material.color.set(a ? 0xfde047 : 0x334155); k.material.emissive.set(a ? 0xfacc15 : 0x000000); k.material.emissiveIntensity = a ? 0.9 : 0; };
    setze(an); return setze;
  };

  if (st.ansicht === 'binaer') {
    const lampen = [], ziffern = [];
    for (let i = 0; i < 8; i++) {
      const x = (i - 3.5) * 1.5, wert = 2 ** (7 - i);
      lampen.push(lampe(V(x, 0, 0), false, 1.2));
      text(String(wert), V(x, 1.4), '#475569', 0.45);
      ziffern.push(text('0', V(x, -1.4), '#111827', 0.7));
    }
    text('Stellenwert', V(-7.6, 1.4), '#475569', 0.4); text('Bit', V(-7.6, -1.4), '#475569', 0.4);
    const summe = new THREE.Sprite(new THREE.SpriteMaterial({ depthTest: false, transparent: true })); summe.renderOrder = 12; summe.position.set(0, -3.2, 0); wurzel.add(summe);
    let letzte = -1;
    const zeige = n => {
      if (n === letzte) return; letzte = n; const b = bits(n);
      b.split('').forEach((c, i) => { lampen[i](c === '1'); const s = textSprite(c, c === '1' ? '#b45309' : '#64748b', 0.7, 'rgba(0,0,0,0)'); ziffern[i].material.map.dispose(); ziffern[i].material.map = s.material.map; ziffern[i].scale.copy(s.scale); ziffern[i].material.needsUpdate = true; });
      const teile = b.split('').map((c, i) => c === '1' ? 2 ** (7 - i) : null).filter(x => x !== null);
      const t = textSprite(`${b} (binär) = ${teile.length ? teile.join(' + ') : '0'} = ${n} (dezimal)`, '#111827', 0.6);
      if (summe.material.map) summe.material.map.dispose(); summe.material.map = t.material.map; summe.scale.copy(t.scale); summe.material.needsUpdate = true;
    };
    zeige(st.zahl);
    bewegt.push(t => { if (st.bewegung) { st.zahl = Math.floor(t * 1.5) % 256; zeige(st.zahl); } });
    radius = 8;
    info = '<b>Binärzahlen</b> · Ein Computer kennt nur zwei Zustände: Strom an oder aus, 1 oder 0. So ein Zustand heißt <b>Bit</b>; 8 Bit sind ein <b>Byte</b>. Im Binärsystem hat jede Stelle den doppelten Wert der Stelle rechts daneben: 1, 2, 4, 8, … 128. Man addiert die Stellenwerte der Lampen, die leuchten. Mit 8 Bit lassen sich 2⁸ = 256 Zahlen darstellen (0 bis 255). Schalte „Zählen“ ein und beobachte: Die rechte Lampe wechselt bei jedem Schritt.';
  } else if (st.ansicht === 'text') {
    const zeichen = [...(st.text || ' ')].slice(0, 10);
    zeichen.forEach((c, r) => {
      const code = c.charCodeAt(0), ascii = code >= 32 && code <= 126, b = ascii ? bits(code) : '????????', y = (zeichen.length - 1) / 2 * 1.4 - r * 1.4;
      text(c === ' ' ? '␣' : c, V(-8.2, y), '#111827', 0.9);
      text(ascii ? String(code) : 'kein ASCII', V(-6.6, y), ascii ? '#1d4ed8' : '#b91c1c', 0.5);
      for (let i = 0; i < 8; i++) lampe(V(-4.5 + i * 1.2, y, 0), b[i] === '1', 0.8);
      text(b, V(6.6, y), '#475569', 0.5);
    });
    text('Zeichen   Code', V(-7.2, (zeichen.length - 1) / 2 * 1.4 + 1.3), '#475569', 0.42);
    text('128  64  32  16  8  4  2  1', V(-0.3, (zeichen.length - 1) / 2 * 1.4 + 1.3), '#475569', 0.42);
    text(`${zeichen.length} Zeichen = ${zeichen.length} Byte = ${zeichen.length * 8} Bit`, V(0, -(zeichen.length - 1) / 2 * 1.4 - 1.6), '#111827', 0.55);
    radius = Math.max(8, zeichen.length * 0.9 + 3);
    info = '<b>Text im ASCII-Code</b> · Damit Computer Text speichern können, bekommt jedes Zeichen eine Nummer. Im <b>ASCII-Code</b> ist „A“ = 65, „B“ = 66, „a“ = 97, das Leerzeichen = 32. Diese Zahl wird binär gespeichert – ein Zeichen braucht hier 1 Byte. Großbuchstaben unterscheiden sich von Kleinbuchstaben genau in einem Bit (32). Umlaute wie „ä“ und Emojis gibt es im ASCII-Code nicht; heute verwendet man dafür <b>Unicode</b> (UTF-8) mit bis zu 4 Byte pro Zeichen. Tippe oben einen eigenen Text ein!';
  } else {
    const N = 16, s = 0.62, zerlegt = st.farbe && st.zerlegt;
    const gruppe = new THREE.Group(); wurzel.add(gruppe);
    const geo = new THREE.BoxGeometry(s * 0.94, s * 0.94, 0.2);
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const [R, G, B] = PALETTE[BILD[r][c]], hell = (R * 0.3 + G * 0.59 + B * 0.11) > 128, x = (c - (N - 1) / 2) * s, y = ((N - 1) / 2 - r) * s;
      if (!st.farbe) {
        const p = new THREE.Mesh(geo, m(hell ? 0xf8fafc : 0x111827)); p.position.set(x, y, 0); gruppe.add(p);
        if (st.beschriftung && r % 1 === 0) { const t = textSprite(hell ? '0' : '1', hell ? '#64748b' : '#fde047', 0.22, 'rgba(0,0,0,0)'); t.position.set(x, y, 0.2); gruppe.add(t); }
      } else if (!zerlegt) {
        const p = new THREE.Mesh(geo, m(new THREE.Color(`rgb(${R},${G},${B})`))); p.position.set(x, y, 0); gruppe.add(p);
      } else {
        // drei Farbebenen hintereinander: Rot, Grün, Blau, Helligkeit = Wert 0–255
        [[R, 0xff0000, 0], [G, 0x00ff00, -2.2], [B, 0x0000ff, -4.4]].forEach(([w, f, z]) => {
          const col = new THREE.Color(f).multiplyScalar(w / 255); const p = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: col })); p.position.set(x, y, z); gruppe.add(p);
        });
      }
    }
    if (zerlegt) { for (const [n, f, z] of [['Rot', '#b91c1c', 0.3], ['Grün', '#15803d', -1.9], ['Blau', '#1d4ed8', -4.1]]) { const l = textSprite(n, f, 0.5); l.position.set(-4.4, 5.6, z); gruppe.add(l); } gruppe.rotation.y = -0.6; }
    const bitPro = st.farbe ? 24 : 1, bytes = N * N * bitPro / 8;
    text(`${N} × ${N} = ${N * N} Pixel · ${bitPro} Bit pro Pixel · ${(N * N * bitPro).toLocaleString('de-DE')} Bit = ${bytes.toLocaleString('de-DE')} Byte`, V(0, -6.2), '#111827', 0.45);
    if (st.farbe) { const [R, G, B] = PALETTE.r; text(`Beispiel Dachpixel: R ${R} = ${bits(R)} · G ${G} = ${bits(G)} · B ${B} = ${bits(B)}`, V(0, -7.0), '#475569', 0.38); }
    radius = 7.5;
    info = st.farbe
      ? '<b>Farbbilder</b> · Ein Bild besteht aus vielen kleinen Bildpunkten (<b>Pixeln</b>). Jede Farbe wird aus Rot, Grün und Blau gemischt (RGB), jeder Anteil mit 8 Bit (0–255): 24 Bit pro Pixel, also über 16 Millionen Farben. Schalte „Farbebenen“ ein: Dann siehst du die drei Anteile getrennt – hell heißt viel von dieser Farbe. Ein Handyfoto mit 12 Millionen Pixeln braucht so unkomprimiert 36 MB; Formate wie JPEG verkleinern das stark.'
      : '<b>Schwarz-Weiß-Bilder</b> · Bei einem reinen Schwarz-Weiß-Bild reicht 1 Bit pro Pixel: 1 = schwarz, 0 = weiß. Das ganze 16 × 16-Bild braucht dann nur 256 Bit = 32 Byte. Je mehr Pixel und je mehr Farben, desto mehr Speicher braucht ein Bild.';
  }
  etik.visible = st.beschriftung;
  let t = st._zeit || 0; for (const f of bewegt) f(t);
  return { objekt: wurzel, radius, titel: `Codierung – ${ANSICHTEN[st.ansicht]}`, info, update: dt => { if (!st.bewegung) return; t += Math.min(dt, 0.1); st._zeit = t; for (const f of bewegt) f(t); } };
}
export const entsorge = entsorgeObj;
export function ausUrl(p) {
  const st = standard(); if (ANSICHTEN[p.get('v')]) st.ansicht = p.get('v');
  const z = Number(p.get('z')); if (p.has('z') && Number.isInteger(z) && z >= 0 && z <= 255) st.zahl = z;
  if (p.get('t')) st.text = p.get('t').slice(0, 10); if (p.get('f') === '0') st.farbe = false; return st;
}
export const zuUrl = st => `&v=${st.ansicht}&z=${st.zahl}&t=${encodeURIComponent(st.text)}&f=${st.farbe ? 1 : 0}`;
export function bedienung(ort, st, neu) {
  stil(); ort.innerHTML = '';
  const s = document.createElement('select'); for (const [k, v] of Object.entries(ANSICHTEN)) s.add(new Option(v, k)); ort.appendChild(s);
  const zk = zahlKnopf(ort, 'Zahl von 0 bis 255');
  const eing = document.createElement('input'); eing.className = 'gen-eingabe'; eing.maxLength = 10; eing.style.textTransform = 'none'; eing.title = 'Text (bis 10 Zeichen)'; ort.appendChild(eing);
  const knopf = t => { const b = document.createElement('button'); b.textContent = t; ort.appendChild(b); return b; };
  const bZ = knopf('Zählen'), bF = knopf('Farbe'), bE = knopf('Farbebenen'), bS = knopf('Beschriftung');
  const auff = () => {
    s.value = st.ansicht; zk.t.textContent = String(st.zahl); eing.value = st.text;
    zk.w.hidden = bZ.hidden = st.ansicht !== 'binaer'; eing.hidden = st.ansicht !== 'text'; bF.hidden = st.ansicht !== 'bild'; bE.hidden = st.ansicht !== 'bild' || !st.farbe;
    bZ.classList.toggle('on', st.bewegung); bF.classList.toggle('on', st.farbe); bE.classList.toggle('on', st.zerlegt); bS.classList.toggle('on', st.beschriftung);
  };
  s.onchange = () => { st.ansicht = s.value; st.bewegung = false; auff(); neu(); };
  zk.m.onclick = () => { st.bewegung = false; st.zahl = (st.zahl + 255) % 256; auff(); neu(); };
  zk.p.onclick = () => { st.bewegung = false; st.zahl = (st.zahl + 1) % 256; auff(); neu(); };
  eing.oninput = () => { st.text = eing.value; neu(); };
  bZ.onclick = () => { st.bewegung = !st.bewegung; st._zeit = st.zahl / 1.5; auff(); };
  bF.onclick = () => { st.farbe = !st.farbe; auff(); neu(); };
  bE.onclick = () => { st.zerlegt = !st.zerlegt; auff(); neu(); };
  bS.onclick = () => { st.beschriftung = !st.beschriftung; auff(); neu(); };
  auff();
}
