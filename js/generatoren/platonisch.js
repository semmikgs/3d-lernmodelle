// Generator „Platonische Körper“: die fünf regelmäßigen Körper mit Ecken, Kanten, Flächen,
// Eulerschem Polyedersatz, Oberfläche/Volumen und einem Netz, das sich auf- und zufaltet.
// Das Netz wird berechnet: Flächen über gemeinsame Kanten zu einem Baum verbunden, jede Fläche dreht um ihre Scharnierkante;
// ein Baum, bei dem sich im ausgebreiteten Netz Flächen überlappen würden, wird verworfen.
import * as THREE from 'three';
import { textSprite, entsorge as entsorgeObj, stil, zahlKnopf } from './hilfen.js';

export const KOERPER = {
  tetraeder: { name: 'Tetraeder', geo: () => new THREE.TetrahedronGeometry(1, 0), farbe: 0xef4444,
    O: '√3 · a²', Ok: Math.sqrt(3), Vf: '√2 / 12 · a³', Vk: Math.SQRT2 / 12 },
  hexaeder: { name: 'Würfel (Hexaeder)', geo: () => new THREE.BoxGeometry(1, 1, 1), farbe: 0xf59e0b,
    O: '6 · a²', Ok: 6, Vf: 'a³', Vk: 1 },
  oktaeder: { name: 'Oktaeder', geo: () => new THREE.OctahedronGeometry(1, 0), farbe: 0x22c55e,
    O: '2√3 · a²', Ok: 2 * Math.sqrt(3), Vf: '√2 / 3 · a³', Vk: Math.SQRT2 / 3 },
  dodekaeder: { name: 'Dodekaeder', geo: () => new THREE.DodecahedronGeometry(1, 0), farbe: 0x3b82f6,
    O: '3 · √(25 + 10√5) · a²', Ok: 3 * Math.sqrt(25 + 10 * Math.sqrt(5)), Vf: '(15 + 7√5) / 4 · a³', Vk: (15 + 7 * Math.sqrt(5)) / 4 },
  ikosaeder: { name: 'Ikosaeder', geo: () => new THREE.IcosahedronGeometry(1, 0), farbe: 0x8b5cf6,
    O: '5√3 · a²', Ok: 5 * Math.sqrt(3), Vf: '5 · (3 + √5) / 12 · a³', Vk: 5 * (3 + Math.sqrt(5)) / 12 },
};
export const ANSICHTEN = { koerper: 'Körper', netz: 'Netz (auf- und zufalten)' };
export const standard = () => ({ koerper: 'ikosaeder', ansicht: 'koerper', a: 4, ecken: true, beschriftung: false, bewegung: false });
const KANTE = 4;                                     // Kantenlänge im Modell
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const zahl = x => (Math.round(x * 10) / 10).toLocaleString('de-DE');

// ---------- Flächen aus der three.js-Geometrie gewinnen ----------
function polyeder(art) {
  const g = KOERPER[art].geo().toNonIndexed(), P = g.attributes.position;
  const ecken = [], schluessel = new Map();
  const idx = v => { const k = v.toArray().map(x => Math.round(x * 1e4)).join(','); if (!schluessel.has(k)) { schluessel.set(k, ecken.length); ecken.push(v.clone()); } return schluessel.get(k); };
  const gruppen = new Map();
  for (let i = 0; i < P.count; i += 3) {
    const a = V(P.getX(i), P.getY(i), P.getZ(i)), b = V(P.getX(i + 1), P.getY(i + 1), P.getZ(i + 1)), c = V(P.getX(i + 2), P.getY(i + 2), P.getZ(i + 2));
    const n = b.clone().sub(a).cross(c.clone().sub(a)).normalize(), k = n.toArray().map(x => Math.round(x * 1e3)).join(',');
    if (!gruppen.has(k)) gruppen.set(k, { n, ids: new Set() });
    for (const v of [a, b, c]) gruppen.get(k).ids.add(idx(v));
  }
  // Maßstab: Kantenlänge = KANTE
  let kmin = Infinity;
  for (let i = 0; i < ecken.length; i++) for (let j = i + 1; j < ecken.length; j++) kmin = Math.min(kmin, ecken[i].distanceTo(ecken[j]));
  for (const e of ecken) e.multiplyScalar(KANTE / kmin);
  const flaechen = [...gruppen.values()].map(({ n, ids }) => {
    const liste = [...ids], m = liste.reduce((s, i) => s.add(ecken[i]), V(0, 0, 0)).divideScalar(liste.length);
    const u = ecken[liste[0]].clone().sub(m).normalize(), w = n.clone().cross(u);
    liste.sort((i, j) => { const pi = ecken[i].clone().sub(m), pj = ecken[j].clone().sub(m); return Math.atan2(pi.dot(w), pi.dot(u)) - Math.atan2(pj.dot(w), pj.dot(u)); });
    return { ids: liste, n, m };
  });
  const kanten = new Map();
  flaechen.forEach((f, fi) => f.ids.forEach((a, i) => { const b = f.ids[(i + 1) % f.ids.length], k = Math.min(a, b) + '-' + Math.max(a, b); if (!kanten.has(k)) kanten.set(k, { a, b, f: [] }); kanten.get(k).f.push(fi); }));
  return { ecken, flaechen, kanten: [...kanten.values()] };
}

// ---------- Netz: Spannbaum über die Flächen ----------
function drehungUm(a, b, w) {
  const achse = b.clone().sub(a).normalize();
  return new THREE.Matrix4().makeTranslation(a.x, a.y, a.z).multiply(new THREE.Matrix4().makeRotationAxis(achse, w)).multiply(new THREE.Matrix4().makeTranslation(-a.x, -a.y, -a.z));
}
function baum(poly, wurzel, breite) {
  const { flaechen, kanten } = poly, eltern = new Array(flaechen.length).fill(null), reihe = [wurzel], besucht = new Set([wurzel]);
  while (reihe.length) {
    const f = breite ? reihe.shift() : reihe.pop();
    for (const k of kanten) {
      if (!k.f.includes(f)) continue;
      const g = k.f[0] === f ? k.f[1] : k.f[0];
      if (besucht.has(g)) continue;
      besucht.add(g); eltern[g] = { p: f, a: poly.ecken[k.a], b: poly.ecken[k.b] }; reihe.push(g);
    }
  }
  // Faltwinkel: dreht die Kindfläche in die Ebene der Elternfläche
  for (const [i, e] of eltern.entries()) {
    if (!e) continue;
    const nc = flaechen[i].n, np = flaechen[e.p].n, achse = e.b.clone().sub(e.a).normalize();
    e.w = Math.atan2(nc.clone().cross(np).dot(achse), nc.dot(np));
  }
  // Reihenfolge: Eltern vor Kindern
  const tiefe = i => eltern[i] ? 1 + tiefe(eltern[i].p) : 0;
  const ordnung = flaechen.map((_, i) => i).sort((x, y) => tiefe(x) - tiefe(y));
  return { eltern, ordnung };
}
function matrizen(poly, b, t) {
  const M = new Array(poly.flaechen.length);
  for (const i of b.ordnung) { const e = b.eltern[i]; M[i] = e ? M[e.p].clone().multiply(drehungUm(e.a, e.b, t * e.w)) : new THREE.Matrix4(); }
  return M;
}
// Überlappung im ausgebreiteten Netz (konvexe Vielecke, leicht geschrumpft; Trennachsen-Test)
function ueberlappt(poly, b, wurzel) {
  const M = matrizen(poly, b, 1), n = poly.flaechen[wurzel].n, u = V(1, 0, 0).cross(n).lengthSq() > 0.1 ? V(1, 0, 0).cross(n).normalize() : V(0, 1, 0).cross(n).normalize(), w = n.clone().cross(u);
  const vielecke = poly.flaechen.map((f, i) => { const pts = f.ids.map(id => poly.ecken[id].clone().applyMatrix4(M[i])); const m = pts.reduce((s, p) => s.add(p), V(0, 0, 0)).divideScalar(pts.length); return pts.map(p => p.lerp(m, 0.02)).map(p => [p.dot(u), p.dot(w)]); });
  const getrennt = (A, Bv) => {
    for (const Q of [A, Bv]) for (let i = 0; i < Q.length; i++) {
      const [x1, y1] = Q[i], [x2, y2] = Q[(i + 1) % Q.length], nx = y2 - y1, ny = x1 - x2;
      const pa = A.map(([x, y]) => x * nx + y * ny), pb = Bv.map(([x, y]) => x * nx + y * ny);
      if (Math.max(...pa) <= Math.min(...pb) + 1e-6 || Math.max(...pb) <= Math.min(...pa) + 1e-6) return true;
    }
    return false;
  };
  for (let i = 0; i < vielecke.length; i++) for (let j = i + 1; j < vielecke.length; j++) if (!getrennt(vielecke[i], vielecke[j])) return true;
  return false;
}
function netzFinden(poly) {
  for (const breite of [true, false]) for (let r = 0; r < poly.flaechen.length; r++) { const b = baum(poly, r, breite); if (!ueberlappt(poly, b, r)) return { b, wurzel: r }; }
  return { b: baum(poly, 0, true), wurzel: 0 };
}

// =====================================================================
export function erzeuge(st) {
  const K = KOERPER[st.koerper], poly = polyeder(st.koerper), { b, wurzel: w0 } = netzFinden(poly);
  const E = poly.ecken.length, Kn = poly.kanten.length, F = poly.flaechen.length, n = poly.flaechen[0].ids.length, q = 2 * Kn / E;
  // Grundfläche nach unten legen, Körper darauf stellen
  const huelle = new THREE.Group(), koerper = new THREE.Group(); huelle.add(koerper);
  const fw = poly.flaechen[w0];
  koerper.quaternion.setFromUnitVectors(fw.n, V(0, -1, 0));
  const tiefe = fw.m.clone().applyQuaternion(koerper.quaternion).y; koerper.position.y = -tiefe;
  // Flächen, Kanten, Ecken als Teile je Fläche (damit sie mitklappen)
  const fMat = new THREE.MeshStandardMaterial({ color: K.farbe, roughness: 0.5, transparent: true, opacity: 0.72, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: 1 });
  const kMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.5 }), eMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4, emissive: 0x332200 });
  const teile = poly.flaechen.map(f => {
    const g = new THREE.Group(); g.matrixAutoUpdate = false;
    const pos = []; for (let i = 1; i < f.ids.length - 1; i++) for (const id of [f.ids[0], f.ids[i], f.ids[i + 1]]) pos.push(...poly.ecken[id].toArray());
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, fMat));
    f.ids.forEach((a, i) => {
      const pa = poly.ecken[a], pb = poly.ecken[f.ids[(i + 1) % f.ids.length]], d = pb.clone().sub(pa);
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, d.length(), 8), kMat);
      c.position.copy(pa).addScaledVector(d, 0.5); c.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); g.add(c);
      if (st.ecken) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), eMat); s.position.copy(pa); g.add(s); }
    });
    koerper.add(g); return g;
  });
  // Beschriftung
  const etik = new THREE.Group(); huelle.add(etik);
  const R = poly.ecken[0].length();
  if (st.beschriftung) {
    const s = textSprite(`${K.name}\n${E} Ecken · ${Kn} Kanten · ${F} Flächen`, '#1f2937', 0.17 * R);
    s.position.set(0, 2 * R + 1.6, 0); etik.add(s);
  }
  // Ausmaße (für den Netz-Modus größer)
  const Mnetz = matrizen(poly, b, 1);
  let rNetz = 0; poly.flaechen.forEach((f, i) => f.ids.forEach(id => { const p = poly.ecken[id].clone().applyMatrix4(Mnetz[i]).sub(fw.m); rNetz = Math.max(rNetz, p.length()); }));
  const radius = st.ansicht === 'netz' ? Math.max(rNetz, 2 * R) + 1 : 2 * R + 1;
  huelle.position.y = -R * 0.6;
  // Animation des Netzes: zu – auf – Pause – zu
  let zeit = st._zeit || 0;
  const setze = t => { const M = matrizen(poly, b, t); teile.forEach((g, i) => { g.matrix.copy(M[i]); g.matrixWorldNeedsUpdate = true; }); };
  const tVon = z => { const u = z % 10; return u < 2 ? 0 : u < 5 ? 0.5 - 0.5 * Math.cos(Math.PI * (u - 2) / 3) : u < 7.5 ? 1 : 0.5 + 0.5 * Math.cos(Math.PI * (u - 7.5) / 2.5); };
  setze(st.ansicht === 'netz' ? (st.bewegung ? tVon(zeit) : 1) : 0);
  // Info
  const a = st.a, O = K.Ok * a * a, Vol = K.Vk * a ** 3;
  const vieleck = { 3: 'gleichseitigen Dreiecken', 4: 'Quadraten', 5: 'regelmäßigen Fünfecken' }[n];
  const info = [
    `<b>${K.name}</b> · ${F} Flächen aus ${vieleck} · an jeder Ecke treffen sich ${q} Flächen`,
    `Eulerscher Polyedersatz: Ecken − Kanten + Flächen = ${E} − ${Kn} + ${F} = <b>${E - Kn + F}</b>`,
    `Mit Kantenlänge a = ${zahl(a)} cm: Oberfläche O = ${K.O} ≈ <b>${zahl(O)} cm²</b> · Volumen V = ${K.Vf} ≈ <b>${zahl(Vol)} cm³</b>`,
    `<i>Platonische Körper sind ganz regelmäßig: Alle Flächen sind gleiche regelmäßige Vielecke, alle Kanten gleich lang, und an jeder Ecke stoßen gleich viele Flächen zusammen. Es gibt genau fünf davon – an einer Ecke müssen mindestens drei Flächen zusammenkommen, und ihre Winkel zusammen müssen kleiner als 360° sein. ${st.ansicht === 'netz' ? 'Das Netz zeigt, wie man den Körper aus Papier bastelt: Die Flächen klappen an ihren Kanten auf, bis alle in einer Ebene liegen.' : ''}</i>`,
  ].join('<br>');
  return {
    objekt: huelle, radius, titel: `${K.name} – ${ANSICHTEN[st.ansicht]}`, info,
    update: dt => { if (st.ansicht !== 'netz' || !st.bewegung) return; zeit += Math.min(dt, 0.1); st._zeit = zeit; setze(tVon(zeit)); },
  };
}
export const entsorge = entsorgeObj;
export function ausUrl(p) {
  const st = standard(); if (KOERPER[p.get('k')]) st.koerper = p.get('k'); if (ANSICHTEN[p.get('v')]) st.ansicht = p.get('v');
  const a = Number(p.get('a')); if (a >= 1 && a <= 20) st.a = a; return st;
}
export const zuUrl = st => `&k=${st.koerper}&v=${st.ansicht}&a=${st.a}`;
export function bedienung(ort, st, neu) {
  stil(); ort.innerHTML = '';
  const sel = obj => { const s = document.createElement('select'); for (const [k, v] of Object.entries(obj)) s.add(new Option(v.name || v, k)); ort.appendChild(s); return s; };
  const sK = sel(KOERPER), sA = sel(ANSICHTEN), ka = zahlKnopf(ort, 'Kantenlänge a in cm');
  const knopf = t => { const b = document.createElement('button'); b.textContent = t; ort.appendChild(b); return b; };
  const bEck = knopf('Ecken'), bSchild = knopf('Beschriftung'), bBew = knopf('Bewegung');
  const auff = () => { sK.value = st.koerper; sA.value = st.ansicht; ka.t.textContent = `a = ${st.a} cm`; bEck.classList.toggle('on', st.ecken); bSchild.classList.toggle('on', st.beschriftung); bBew.classList.toggle('on', st.bewegung); };
  sK.onchange = () => { st.koerper = sK.value; st._zeit = 0; auff(); neu(); };
  sA.onchange = () => { st.ansicht = sA.value; st._zeit = 0; auff(); neu(); };
  ka.m.onclick = () => { st.a = Math.max(1, st.a - 1); auff(); neu(); };
  ka.p.onclick = () => { st.a = Math.min(20, st.a + 1); auff(); neu(); };
  bEck.onclick = () => { st.ecken = !st.ecken; auff(); neu(); };
  bSchild.onclick = () => { st.beschriftung = !st.beschriftung; auff(); neu(); };
  bBew.onclick = () => { st.bewegung = !st.bewegung; auff(); };
  auff();
}
