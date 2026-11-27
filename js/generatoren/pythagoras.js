// Pythagoras-Generator: Satz des Pythagoras a² + b² = c² im rechtwinkligen Dreieck (Seiten frei wählbar, in cm),
// Ergänzungsbeweis als Animation (vier gleiche Dreiecke im Quadrat der Seitenlänge a + b werden umgelegt),
// Anwendung im Raum: Flächen- und Raumdiagonale eines Quaders.
import * as THREE from 'three';
import { textSprite, entsorge as entsorgeObj, stil, zahlKnopf } from './hilfen.js';

export const ANSICHTEN = { quadrate: 'Quadrate über den Seiten', beweis: 'Beweis durch Umlegen', raum: 'Raumdiagonale im Quader' };
export const standard = () => ({ ansicht: 'quadrate', a: 3, b: 4, h: 2, bewegung: true, beschriftung: true });
const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const FA = 0x3b82f6, FB = 0x22c55e, FC = 0xf97316, FD = 0xfacc15;
const zahl = x => (Math.round(x * 100) / 100).toLocaleString('de-DE');
const D = 0.12;                                           // Dicke der Plättchen

// Vieleck als dünne Platte (in der xy-Ebene) mit Rand und optionalem Einheitsgitter
function platte(pts, farbe, gitter = null, opacity = 0.9) {
  const g = new THREE.Group();
  const f = new THREE.Shape(pts.map(p => new THREE.Vector2(p.x, p.y)));
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(f, { depth: D, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: farbe, roughness: 0.5, transparent: opacity < 1, opacity, side: THREE.DoubleSide }));
  m.position.z = -D / 2; g.add(m);
  const rand = [...pts, pts[0]].map(p => V(p.x, p.y, D / 2 + 0.01));
  g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(rand), new THREE.LineBasicMaterial({ color: 0x1f2937 })));
  if (gitter) {                                           // Einheitsquadrate in einem Quadrat: Ursprung, Richtung u, Richtung v, n
    const [o, u, v, n] = gitter, l = [];
    for (let i = 1; i < n; i++) { l.push(o.clone().addScaledVector(u, i), o.clone().addScaledVector(u, i).addScaledVector(v, n)); l.push(o.clone().addScaledVector(v, i), o.clone().addScaledVector(v, i).addScaledVector(u, n)); }
    g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(l.map(p => p.setZ(D / 2 + 0.005))), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 })));
  }
  return g;
}

export function erzeuge(st) {
  const wurzel = new THREE.Group(), etik = new THREE.Group(); wurzel.add(etik);
  const { a, b } = st, c = Math.hypot(a, b), ganz = Number.isInteger(a) && Number.isInteger(b) && Math.abs(c - Math.round(c)) < 1e-9;
  const text = (t, p, farbe = '#1f2937', h = 0.55) => { const s = textSprite(t, farbe, h); s.position.copy(p); etik.add(s); return s; };
  const bewegt = [];
  let info, radius, titel = ANSICHTEN[st.ansicht];

  if (st.ansicht === 'quadrate') {
    // rechter Winkel in C, Kathete a nach rechts, Kathete b nach oben
    const C = V(0, 0), B = V(a, 0), A = V(0, b);
    wurzel.add(platte([C, B, A], 0xe5e7eb, null, 1));
    const nc = V(b, a).normalize().multiplyScalar(c);
    wurzel.add(platte([C, V(0, -a), V(a, -a), B], FA, Number.isInteger(a) ? [V(0, -a), V(1, 0), V(0, 1), a] : null));
    wurzel.add(platte([C, A, V(-b, b), V(-b, 0)], FB, Number.isInteger(b) ? [V(-b, 0), V(1, 0), V(0, 1), b] : null));
    const P = B.clone().add(nc), Q = A.clone().add(nc);
    wurzel.add(platte([B, P, Q, A], FC, ganz ? [B, nc.clone().normalize(), A.clone().sub(B).normalize(), Math.round(c)] : null));
    // rechter Winkel markieren
    { const r = Math.min(a, b) * 0.18; etik.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(r, 0, 0.1), V(r, r, 0.1), V(0, r, 0.1)]), new THREE.LineBasicMaterial({ color: 0x111827 }))); const p = new THREE.Mesh(new THREE.CircleGeometry(r * 0.12, 12), new THREE.MeshBasicMaterial({ color: 0x111827 })); p.position.set(r * 0.5, r * 0.5, 0.11); etik.add(p); }
    const H = Math.max(0.45, c * 0.07);
    text('a', V(a / 2, 0.35 * H / 0.55), '#1e40af', H); text('b', V(0.35 * H / 0.55, b / 2), '#15803d', H); text('c', A.clone().add(B).multiplyScalar(0.5).add(V(-0.3, -0.3)), '#c2410c', H);
    text(`a² = ${zahl(a * a)} cm²`, V(a / 2, -a / 2, 0.3), '#1e3a8a', H * 0.9);
    text(`b² = ${zahl(b * b)} cm²`, V(-b / 2, b / 2, 0.3), '#14532d', H * 0.9);
    text(`c² = ${zahl(c * c)} cm²`, B.clone().add(Q).multiplyScalar(0.5).setZ(0.3), '#7c2d12', H * 0.9);
    text(`${zahl(a * a)} + ${zahl(b * b)} = ${zahl(c * c)}  →  c = ${zahl(c)} cm`, V((a - b) / 2, -a - 1.2 * H - 0.4), '#111827', H);
    wurzel.position.set(-(a - b + nc.x) / 2 + 0.2, -(b - a + nc.y) / 2, 0);
    radius = (a + b + c) * 0.62;
    info = `<b>Satz des Pythagoras</b> · Im rechtwinkligen Dreieck gilt: <b>a² + b² = c²</b>. Hier: ${zahl(a)}² + ${zahl(b)}² = ${zahl(a * a)} + ${zahl(b * b)} = ${zahl(c * c)} = c², also c = ${zahl(c)} cm.${ganz ? ` (${a}, ${b}, ${Math.round(c)}) ist ein <b>pythagoreisches Zahlentripel</b> – zähle die Kästchen nach!` : ''}<br><i>Die Seiten a und b am rechten Winkel heißen Katheten, die längste Seite c gegenüber heißt Hypotenuse. Die Flächen der beiden kleinen Quadrate sind zusammen genauso groß wie die Fläche des großen Quadrats. Probiere a = 3, b = 4 oder a = 5, b = 12.</i>`;
  } else if (st.ansicht === 'beweis') {
    const s = a + b;
    // Rahmen (Quadrat mit Seitenlänge a + b)
    const rahmen = [V(0, 0), V(s, 0), V(s, s), V(0, s), V(0, 0)].map(p => p.setZ(0.02));
    wurzel.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(rahmen), new THREE.LineBasicMaterial({ color: 0x111827 })));
    // Hintergrundflächen beider Lagen: c² (Mitte) bzw. a² und b²
    const fc = platte([V(a, 0), V(s, a), V(b, s), V(0, b)], FC, null, 0.85); fc.position.z = -0.2; wurzel.add(fc);
    const fa = platte([V(0, 0), V(a, 0), V(a, a), V(0, a)], FA, null, 0.85); fa.position.z = -0.2; wurzel.add(fa);
    const fb = platte([V(a, a), V(s, a), V(s, s), V(a, s)], FB, null, 0.85); fb.position.z = -0.2; wurzel.add(fb);
    // vier gleiche Dreiecke: rechter Winkel R, Kathete a nach A, Kathete b nach B (Start- und Ziellage, gleich orientiert)
    const lagen = [
      [[V(0, 0), V(a, 0)], [V(a, a), V(a, 0)]],
      [[V(s, 0), V(s, a)], [V(s, 0), V(s, a)]],
      [[V(s, s), V(b, s)], [V(0, a), V(a, a)]],
      [[V(0, s), V(0, b)], [V(a, s), V(0, s)]],
    ];
    const dreieck = () => { const g = platte([V(0, 0), V(a, 0), V(0, b)], 0xe5e7eb, null, 1); return g; };    // lokal: R = 0, A = (a,0), B = (0,b)
    const ppos = [];
    lagen.forEach(([[R1, A1], [R2, A2]], i) => {
      const g = dreieck(); wurzel.add(g);
      const w1 = Math.atan2(A1.y - R1.y, A1.x - R1.x), w2 = Math.atan2(A2.y - R2.y, A2.x - R2.x);
      let dw = w2 - w1; while (dw > Math.PI) dw -= 2 * Math.PI; while (dw < -Math.PI) dw += 2 * Math.PI;
      ppos.push({ g, R1, R2, w1, dw, hub: 0.6 + 0.5 * i });
    });
    const phase = new THREE.Sprite(new THREE.SpriteMaterial({ depthTest: false, transparent: true })); phase.renderOrder = 12; phase.position.set(s / 2, -1.4, 0); wurzel.add(phase);
    let letzte = null;
    const zeige = txt => { if (txt === letzte) return; letzte = txt; const t = textSprite(txt, '#111827', 0.5 * s / 7); if (phase.material.map) phase.material.map.dispose(); phase.material.map = t.material.map; phase.scale.copy(t.scale); phase.material.needsUpdate = true; };
    const glatt = x => x * x * (3 - 2 * x);
    bewegt.push(t => {
      const z = t % 12, u = z < 2.5 ? 0 : z < 5.5 ? glatt((z - 2.5) / 3) : z < 8.5 ? 1 : z < 11.5 ? 1 - glatt((z - 8.5) / 3) : 0;
      for (const p of ppos) { const R = p.R1.clone().lerp(p.R2, u); p.g.position.set(R.x, R.y, Math.sin(Math.PI * u) * p.hub); p.g.rotation.z = p.w1 + p.dw * u; }
      fc.visible = u < 0.5; fa.visible = fb.visible = u >= 0.5;
      zeige(u === 0 ? `Frei bleibt ein Quadrat mit der Fläche c² = ${zahl(c * c)} cm²` : u === 1 ? `Frei bleiben zwei Quadrate: a² + b² = ${zahl(a * a)} + ${zahl(b * b)} cm²` : 'Die vier gleichen Dreiecke werden nur verschoben …');
    });
    text('a + b', V(s / 2, s + 0.5), '#111827', 0.5 * s / 7);
    wurzel.position.set(-s / 2, -s / 2 + 0.6, 0);
    radius = s * 0.85;
    titel = 'Beweis durch Umlegen';
    info = `<b>Ergänzungsbeweis</b> · Im großen Quadrat mit der Seitenlänge a + b liegen vier gleiche rechtwinklige Dreiecke. In der ersten Lage bleibt in der Mitte ein Quadrat mit der Seite c frei, in der zweiten Lage bleiben zwei Quadrate mit den Seiten a und b frei. Das große Quadrat und die vier Dreiecke ändern sich nicht – also muss die freie Fläche in beiden Fällen gleich groß sein: <b>c² = a² + b²</b>. Das gilt für jedes rechtwinklige Dreieck, nicht nur für dieses Beispiel.`;
  } else {
    // Quader a × b × h; Flächendiagonale e der Grundfläche, Raumdiagonale d
    const h = st.h, e = Math.hypot(a, b), d = Math.hypot(e, h);
    const box = new THREE.Mesh(new THREE.BoxGeometry(a, h, b), new THREE.MeshStandardMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.18, depthWrite: false }));
    box.position.set(a / 2, h / 2, b / 2); wurzel.add(box);
    wurzel.add(new THREE.LineSegments(new THREE.EdgesGeometry(box.geometry).translate(a / 2, h / 2, b / 2), new THREE.LineBasicMaterial({ color: 0x1e3a8a })));
    const P0 = V(0, 0, 0), P1 = V(a, 0, b), P2 = V(a, h, b);
    const linie = (p, q, farbe, r) => { const d0 = q.clone().sub(p), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d0.length(), 10), new THREE.MeshBasicMaterial({ color: farbe })); m.position.copy(p).addScaledVector(d0, 0.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d0.normalize()); wurzel.add(m); };
    linie(P0, P1, FC, 0.05); linie(P0, P2, 0xdc2626, 0.07);
    const dreieck = (p, q, r, farbe) => { const g = new THREE.BufferGeometry().setFromPoints([p, q, r]); g.computeVertexNormals(); wurzel.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: farbe, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }))); };
    dreieck(P0, V(a, 0, 0), P1, FC); dreieck(P0, P1, P2, FD);
    const H = Math.max(0.28, d * 0.045);
    text(`a = ${zahl(a)}`, V(a / 2, -0.3, -0.3), '#1e40af', H); text(`b = ${zahl(b)}`, V(a + 0.4, -0.3, b / 2), '#15803d', H); text(`h = ${zahl(h)}`, V(a + 0.4, h / 2, b + 0.2), '#7c3aed', H);
    text(`e = ${zahl(e)}`, V(a * 0.62 + 0.3, -0.35, b * 0.62 + 0.3), '#c2410c', H); text(`d = ${zahl(d)}`, V(a * 0.38 - 0.3, h * 0.38 + 0.6, b * 0.38 - 0.3), '#b91c1c', H);
    wurzel.position.set(-a / 2, -h / 2, -b / 2);
    radius = d * 0.62 + 0.5;
    info = `<b>Pythagoras im Raum</b> · Quader ${zahl(a)} × ${zahl(b)} × ${zahl(h)} cm<br>1. Flächendiagonale der Grundfläche (orangefarbenes Dreieck): e² = a² + b² = ${zahl(a * a)} + ${zahl(b * b)} → <b>e = ${zahl(e)} cm</b><br>2. Raumdiagonale (gelbes Dreieck mit e und h): d² = e² + h² = ${zahl(e * e)} + ${zahl(h * h)} → <b>d = ${zahl(d)} cm</b> · kurz: d = √(a² + b² + h²)<br><i>Im Raum steckt der Satz des Pythagoras gleich zweimal: Man sucht ein rechtwinkliges Dreieck, in dem die gesuchte Strecke die Hypotenuse ist.</i>`;
  }
  etik.visible = st.beschriftung || st.ansicht === 'beweis';
  let t = st._zeit || 0; for (const f of bewegt) f(t);
  return { objekt: (() => { const h = new THREE.Group(); h.add(wurzel); return h; })(), radius, titel: `Pythagoras – ${titel}`, info, update: dt => { if (!st.bewegung) return; t += Math.min(dt, 0.1); st._zeit = t; for (const f of bewegt) f(t); } };
}
export const entsorge = entsorgeObj;
export function ausUrl(p) {
  const st = standard(); if (ANSICHTEN[p.get('v')]) st.ansicht = p.get('v');
  for (const k of ['a', 'b', 'h']) { const x = Number(p.get(k)); if (x >= 1 && x <= 15) st[k] = x; }
  return st;
}
export const zuUrl = st => `&v=${st.ansicht}&a=${st.a}&b=${st.b}&h=${st.h}`;
export function bedienung(ort, st, neu) {
  stil(); ort.innerHTML = '';
  const s = document.createElement('select'); for (const [k, v] of Object.entries(ANSICHTEN)) s.add(new Option(v, k)); ort.appendChild(s);
  const k = { a: zahlKnopf(ort, 'Kathete a in cm'), b: zahlKnopf(ort, 'Kathete b in cm'), h: zahlKnopf(ort, 'Höhe h in cm') };
  const knopf = t => { const b = document.createElement('button'); b.textContent = t; ort.appendChild(b); return b; };
  const bB = knopf('Bewegung'), bS = knopf('Beschriftung');
  const auff = () => {
    s.value = st.ansicht;
    for (const [n, kk] of Object.entries(k)) { kk.t.textContent = `${n} = ${st[n].toLocaleString('de-DE')} cm`; kk.w.hidden = n === 'h' && st.ansicht !== 'raum'; }
    bB.hidden = st.ansicht !== 'beweis'; bB.classList.toggle('on', st.bewegung); bS.classList.toggle('on', st.beschriftung);
  };
  for (const [n, kk] of Object.entries(k)) {
    kk.m.onclick = () => { st[n] = Math.max(1, st[n] - 0.5); auff(); neu(); };
    kk.p.onclick = () => { st[n] = Math.min(15, st[n] + 0.5); auff(); neu(); };
  }
  s.onchange = () => { st.ansicht = s.value; st._zeit = 0; auff(); neu(); };
  bB.onclick = () => { st.bewegung = !st.bewegung; auff(); };
  bS.onclick = () => { st.beschriftung = !st.beschriftung; auff(); neu(); };
  auff();
}
