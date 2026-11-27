// Körper-Generator (Mathematik): Körper mit Maßen, Netz (animiert abgewickelt) und Volumenvergleiche.
// Würfel, Quader, Dreiecks- und Sechseckprisma, Zylinder, Pyramide, Kegel, Kugel. Maße in cm, frei einstellbar.
import * as THREE from 'three';
import { textSprite, entsorge as entsorgeObj, stil, zahlKnopf } from './hilfen.js';

export const KOERPER = {
  wuerfel: { name: 'Würfel', masse: ['a'] }, quader: { name: 'Quader', masse: ['a', 'b', 'c'] },
  prisma3: { name: 'Dreiecksprisma', masse: ['a', 'h'] }, prisma6: { name: 'Sechseckprisma', masse: ['a', 'h'] },
  zylinder: { name: 'Zylinder', masse: ['r', 'h'] }, pyramide: { name: 'Pyramide', masse: ['a', 'h'] },
  kegel: { name: 'Kegel', masse: ['r', 'h'] }, kugel: { name: 'Kugel', masse: ['r'] },
};
export const ANSICHTEN = { koerper: 'Körper mit Maßen', netz: 'Netz abwickeln', volumen: 'Volumen verstehen' };
const MIT_VOLUMEN = ['pyramide', 'kegel', 'kugel'];
export const standard = () => ({ koerper: 'quader', ansicht: 'koerper', masse: { a: 4, b: 3, c: 2, h: 5, r: 2 }, beschriftung: false, bewegung: false });

const FARBEN = [0x93c5fd, 0xfca5a5, 0x86efac, 0xfde68a, 0xc4b5fd, 0xf9a8d4, 0x99f6e4, 0xfdba74];
const kante = new THREE.LineBasicMaterial({ color: 0x1e293b });
const zahl = (x, d = 1) => (Math.round(x * 10 ** d) / 10 ** d).toString().replace('.', ',');
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- Vielflächner: Flächen (konvexe Polygone, außen gegen den Uhrzeigersinn) und Abwicklungsbaum ----------
function polyeder(art, m) {
  const f = [];   // { pts: [V3], eltern: index | -1 }
  const prisma = (basis, h) => {      // basis: Punkte (x,z) gegen Uhrzeigersinn von oben gesehen
    const n = basis.length;
    const unten = basis.map(([x, z]) => V3(x, 0, z)), oben = basis.map(([x, z]) => V3(x, h, z));
    f.push({ pts: [...unten].reverse(), eltern: -1 });
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; f.push({ pts: [unten[i], unten[j], oben[j], oben[i]], eltern: 0 }); }
    f.push({ pts: oben, eltern: 1 });
  };
  if (art === 'wuerfel' || art === 'quader') {
    const a = art === 'wuerfel' ? m.a : m.a, b = art === 'wuerfel' ? m.a : m.b, c = art === 'wuerfel' ? m.a : m.c;
    prisma([[-a / 2, b / 2], [a / 2, b / 2], [a / 2, -b / 2], [-a / 2, -b / 2]], c);
  } else if (art === 'prisma3' || art === 'prisma6') {
    const n = art === 'prisma3' ? 3 : 6, R = m.a / (2 * Math.sin(Math.PI / n));
    prisma(Array.from({ length: n }, (_, i) => { const w = Math.PI / 2 + i * 2 * Math.PI / n; return [R * Math.cos(w), -R * Math.sin(w)]; }).reverse().map(([x, z]) => [x, -z]), m.h);
  } else if (art === 'pyramide') {
    const a = m.a / 2, unten = [V3(-a, 0, a), V3(a, 0, a), V3(a, 0, -a), V3(-a, 0, -a)], s = V3(0, m.h, 0);
    f.push({ pts: [...unten].reverse(), eltern: -1 });
    for (let i = 0; i < 4; i++) f.push({ pts: [unten[i], unten[(i + 1) % 4], s], eltern: 0 });
  }
  // Normalen, Gelenkkanten (gemeinsame Kante mit dem Elternteil) und Klappwinkel
  const normale = pts => new THREE.Vector3().subVectors(pts[1], pts[0]).cross(new THREE.Vector3().subVectors(pts[2], pts[0])).normalize();
  for (const fl of f) fl.n = normale(fl.pts);
  for (const fl of f) {
    if (fl.eltern < 0) continue;
    const e = f[fl.eltern], gleich = (p, q) => p.distanceTo(q) < 1e-6;
    let a = null, b = null;
    for (let i = 0; i < fl.pts.length && !b; i++) {
      const p = fl.pts[i], q = fl.pts[(i + 1) % fl.pts.length];
      if (e.pts.some(x => gleich(x, p)) && e.pts.some(x => gleich(x, q))) { a = p; b = q; }
    }
    fl.gelenk = { p: a, achse: new THREE.Vector3().subVectors(b, a).normalize() };
    fl.winkel = Math.atan2(new THREE.Vector3().crossVectors(fl.n, e.n).dot(fl.gelenk.achse), fl.n.dot(e.n));
  }
  return f;
}

// ---------- Netz-Animation: Gruppen-Hierarchie entlang des Abwicklungsbaums ----------
function netzObjekt(flaechen) {
  const wurzel = new THREE.Group(), gruppen = [];
  flaechen.forEach((fl, i) => {
    const g = new THREE.Group(); g.matrixAutoUpdate = false; gruppen.push(g);
    const geo = new THREE.BufferGeometry().setFromPoints(fl.pts.flatMap((p, k) => k >= 2 ? [fl.pts[0], fl.pts[k - 1], p] : []));
    geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: FARBEN[i % FARBEN.length], side: THREE.DoubleSide, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 })));
    g.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(fl.pts), kante));
    (fl.eltern < 0 ? wurzel : gruppen[fl.eltern]).add(g);
  });
  const setze = t => flaechen.forEach((fl, i) => {
    const g = gruppen[i];
    if (fl.eltern < 0) { g.matrix.identity(); return; }
    const p = fl.gelenk.p;
    g.matrix.makeTranslation(p.x, p.y, p.z).multiply(new THREE.Matrix4().makeRotationAxis(fl.gelenk.achse, fl.winkel * t)).multiply(new THREE.Matrix4().makeTranslation(-p.x, -p.y, -p.z));
  });
  return { wurzel, setze };
}

// ---------- Zylinder- und Kegelnetz (Mantel wird abgerollt) ----------
function zylinderNetz(r, h) {
  const g = new THREE.Group(), nU = 64, nV = 2;
  const mantel = new THREE.BufferGeometry(), pos = new Float32Array((nU + 1) * (nV + 1) * 3), idx = [];
  for (let i = 0; i < nU; i++) for (let j = 0; j < nV; j++) { const a = i * (nV + 1) + j, b = a + nV + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  mantel.setIndex(idx); mantel.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mMesh = new THREE.Mesh(mantel, new THREE.MeshStandardMaterial({ color: FARBEN[0], side: THREE.DoubleSide, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: 1 }));
  const rand = new THREE.Line(new THREE.BufferGeometry(), kante);
  g.add(mMesh, rand);
  const deckel = [0, 1].map(k => { const d = new THREE.Group(); const m = new THREE.Mesh(new THREE.CircleGeometry(r, 64), new THREE.MeshStandardMaterial({ color: FARBEN[k + 1], side: THREE.DoubleSide, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: 1 })); m.rotation.x = -Math.PI / 2; d.add(m);
    const l = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 64 }, (_, i) => V3(r * Math.cos(i / 64 * Math.PI * 2), 0, r * Math.sin(i / 64 * Math.PI * 2)))), kante); d.add(l); g.add(d); return d; });
  const setze = t => {
    // Mantel um die feste Linie hinten (z = −r) abrollen: Krümmungsradius wächst, Bogenlänge bleibt
    const rho = r / Math.max(1 - t, 1e-4), umriss = [];
    for (let i = 0; i <= nU; i++) {
      const s = (i / nU - 0.5) * 2 * Math.PI * r, w = s / rho;
      const x = rho * Math.sin(w), z = -r + rho - rho * Math.cos(w);
      for (let j = 0; j <= nV; j++) { const k = (i * (nV + 1) + j) * 3; pos[k] = x; pos[k + 1] = h * j / nV; pos[k + 2] = -z; }
      umriss.push(V3(x, 0, -z));
    }
    // Umriss: unten hin, oben zurück
    const oben = umriss.map(p => V3(p.x, h, p.z)).reverse();
    rand.geometry.dispose(); rand.geometry = new THREE.BufferGeometry().setFromPoints([...umriss, ...oben, umriss[0]]);
    mantel.attributes.position.needsUpdate = true; mantel.computeVertexNormals(); mantel.computeBoundingSphere();
    // Deckel klappen um die hinteren Tangentenlinien nach oben/unten weg
    const winkel = t * Math.PI / 2;
    deckel[0].position.set(0, 0, 0); deckel[0].matrixAutoUpdate = false;
    deckel[0].matrix.makeTranslation(0, 0, r).multiply(new THREE.Matrix4().makeRotationX(-winkel)).multiply(new THREE.Matrix4().makeTranslation(0, 0, -r));
    deckel[1].matrixAutoUpdate = false;
    deckel[1].matrix.makeTranslation(0, h, r).multiply(new THREE.Matrix4().makeRotationX(winkel)).multiply(new THREE.Matrix4().makeTranslation(0, 0, -r));
  };
  return { wurzel: g, setze };
}
function kegelNetz(r, h) {
  const s = Math.hypot(r, h), theta = 2 * Math.PI * r / s, g = new THREE.Group(), nU = 64, nV = 8;
  const pos = new Float32Array((nU + 1) * (nV + 1) * 3), idx = [];
  for (let i = 0; i < nU; i++) for (let j = 0; j < nV; j++) { const a = i * (nV + 1) + j, b = a + nV + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const mantel = new THREE.BufferGeometry(); mantel.setIndex(idx); mantel.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.add(new THREE.Mesh(mantel, new THREE.MeshStandardMaterial({ color: FARBEN[0], side: THREE.DoubleSide, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: 1 })));
  const rand = new THREE.Line(new THREE.BufferGeometry(), kante); g.add(rand);
  const boden = new THREE.Group(); const bm = new THREE.Mesh(new THREE.CircleGeometry(r, 64), new THREE.MeshStandardMaterial({ color: FARBEN[1], side: THREE.DoubleSide, roughness: 0.6 })); bm.rotation.x = -Math.PI / 2; boden.add(bm);
  boden.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 64 }, (_, i) => V3(r * Math.cos(i / 64 * Math.PI * 2), 0.002, r * Math.sin(i / 64 * Math.PI * 2)))), kante)); g.add(boden);
  const setze = t => {
    // Mantel öffnet sich: gleicher Kreisausschnitt, um einen immer breiteren Kegel gelegt, bis er flach ist
    const r2 = r + (s - r) * t, hoehe = Math.sqrt(Math.max(s * s - r2 * r2, 0)), spitzeY = hoehe;   // Grundkreis bleibt auf dem Boden
    const umriss = [];
    for (let i = 0; i <= nU; i++) {
      const psi = (i / nU - 0.5) * theta, phi = psi * s / r2 + Math.PI / 2;
      for (let j = 0; j <= nV; j++) {
        const u = s * j / nV, k = (i * (nV + 1) + j) * 3, rr = u * r2 / s;
        pos[k] = rr * Math.cos(phi); pos[k + 1] = spitzeY - u * hoehe / s; pos[k + 2] = rr * Math.sin(phi);
      }
      umriss.push(V3(pos[(i * (nV + 1) + nV) * 3], pos[(i * (nV + 1) + nV) * 3 + 1], pos[(i * (nV + 1) + nV) * 3 + 2]));
    }
    const spitze = V3(0, spitzeY, 0);
    rand.geometry.dispose(); rand.geometry = new THREE.BufferGeometry().setFromPoints([spitze, ...umriss, spitze]);
    mantel.attributes.position.needsUpdate = true; mantel.computeVertexNormals(); mantel.computeBoundingSphere();
    // Grundkreis berührt im Netz den Bogen bei psi = 0 (vorne, +z)
    const p0 = umriss[nU / 2], richtung = V3(0, 0, 1);
    boden.position.set(0, 0, 0).lerp(p0.clone().addScaledVector(richtung, r).setY(0), t);
  };
  return { wurzel: g, setze, s, theta };
}

// ---------- Körper als Ganzes (für Ansicht „Körper mit Maßen“) ----------
function koerperMesh(art, m) {
  const g = new THREE.Group(), matK = new THREE.MeshStandardMaterial({ color: 0x93c5fd, roughness: 0.5, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false });
  if (['wuerfel', 'quader', 'prisma3', 'prisma6', 'pyramide'].includes(art)) {
    const { wurzel, setze } = netzObjekt(polyeder(art, m)); setze(0);
    wurzel.traverse(o => { if (o.isMesh) { o.material.transparent = true; o.material.opacity = 0.8; o.material.depthWrite = false; } });
    g.add(wurzel);
  } else if (art === 'zylinder') {
    const z = new THREE.Mesh(new THREE.CylinderGeometry(m.r, m.r, m.h, 64), matK); z.position.y = m.h / 2; g.add(z);
    for (const y of [0, m.h]) g.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 64 }, (_, i) => V3(m.r * Math.cos(i / 64 * Math.PI * 2), y, m.r * Math.sin(i / 64 * Math.PI * 2)))), kante));
  } else if (art === 'kegel') {
    const z = new THREE.Mesh(new THREE.ConeGeometry(m.r, m.h, 64), matK); z.position.y = m.h / 2; g.add(z);
    g.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 64 }, (_, i) => V3(m.r * Math.cos(i / 64 * Math.PI * 2), 0, m.r * Math.sin(i / 64 * Math.PI * 2)))), kante));
  } else if (art === 'kugel') {
    const z = new THREE.Mesh(new THREE.SphereGeometry(m.r, 64, 48), matK); z.position.y = m.r; g.add(z);
    g.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 64 }, (_, i) => V3(m.r * Math.cos(i / 64 * Math.PI * 2), m.r, m.r * Math.sin(i / 64 * Math.PI * 2)))), new THREE.LineBasicMaterial({ color: 0x64748b })));
  }
  return g;
}

// Maßlinie mit Beschriftung
function masslinie(gruppe, a, b, text, schrift, versatz = V3(0, 0, 0), farbe = 0xdc2626) {
  const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
  gruppe.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: farbe })));
  for (const p of [a, b]) { const k = new THREE.Mesh(new THREE.SphereGeometry(schrift * 0.12, 8, 6), new THREE.MeshBasicMaterial({ color: farbe })); k.position.copy(p); gruppe.add(k); }
  const s = textSprite(text, '#b91c1c', schrift); s.position.copy(a.clone().lerp(b, 0.5)).add(versatz); gruppe.add(s);
}

// ---------- Formeln ----------
function formeln(art, m) {
  const pi = Math.PI, z = [];
  const r3 = Math.sqrt(3);
  switch (art) {
    case 'wuerfel': z.push(`V = a³ = ${zahl(m.a ** 3)} cm³`, `O = 6 · a² = ${zahl(6 * m.a ** 2)} cm²`); break;
    case 'quader': z.push(`V = a · b · c = ${zahl(m.a * m.b * m.c)} cm³`, `O = 2 · (a·b + a·c + b·c) = ${zahl(2 * (m.a * m.b + m.a * m.c + m.b * m.c))} cm²`); break;
    case 'prisma3': { const G = r3 / 4 * m.a ** 2; z.push(`Grundfläche G = (√3/4) · a² = ${zahl(G, 2)} cm² (gleichseitiges Dreieck)`, `V = G · h = ${zahl(G * m.h)} cm³`, `O = 2 · G + 3 · a · h = ${zahl(2 * G + 3 * m.a * m.h)} cm²`); break; }
    case 'prisma6': { const G = 3 * r3 / 2 * m.a ** 2; z.push(`Grundfläche G = (3√3/2) · a² = ${zahl(G, 2)} cm² (regelmäßiges Sechseck)`, `V = G · h = ${zahl(G * m.h)} cm³`, `O = 2 · G + 6 · a · h = ${zahl(2 * G + 6 * m.a * m.h)} cm²`); break; }
    case 'zylinder': z.push(`V = π · r² · h = ${zahl(pi * m.r ** 2 * m.h)} cm³`, `O = 2 · π · r² + 2 · π · r · h = ${zahl(2 * pi * m.r ** 2 + 2 * pi * m.r * m.h)} cm²`, `Mantel abgerollt: Rechteck ${zahl(2 * pi * m.r)} cm × ${zahl(m.h)} cm (Breite = Umfang 2πr)`); break;
    case 'pyramide': { const hs = Math.hypot(m.h, m.a / 2); z.push(`V = ⅓ · G · h = ⅓ · a² · h = ${zahl(m.a ** 2 * m.h / 3)} cm³`, `Höhe der Seitenfläche h<sub>s</sub> = √(h² + (a/2)²) = ${zahl(hs, 2)} cm`, `O = a² + 2 · a · h<sub>s</sub> = ${zahl(m.a ** 2 + 2 * m.a * hs)} cm²`); break; }
    case 'kegel': { const s = Math.hypot(m.r, m.h); z.push(`V = ⅓ · π · r² · h = ${zahl(pi * m.r ** 2 * m.h / 3)} cm³`, `Mantellinie s = √(r² + h²) = ${zahl(s, 2)} cm`, `O = π · r² + π · r · s = ${zahl(pi * m.r ** 2 + pi * m.r * s)} cm²`, `Mantel abgewickelt: Kreisausschnitt mit Radius s und Winkel ${zahl(360 * m.r / s, 0)}° (= 360° · r/s)`); break; }
    case 'kugel': z.push(`V = ⁴⁄₃ · π · r³ = ${zahl(4 / 3 * pi * m.r ** 3)} cm³`, `O = 4 · π · r² = ${zahl(4 * pi * m.r ** 2)} cm²`); break;
  }
  return z;
}

// =====================================================================
export function erzeuge(st) {
  const art = st.koerper, m = { ...st.masse }, wurzel = new THREE.Group(), etik = new THREE.Group();
  if (art === 'wuerfel') m.b = m.c = m.a;
  const groesse = Math.max(m.a || 0, m.b || 0, m.c || 0, m.h || 0, 2 * (m.r || 0), 2);
  const schrift = groesse * 0.09;
  let update = () => {}, radius = groesse * 1.1;
  const ansicht = st.ansicht === 'volumen' && !MIT_VOLUMEN.includes(art) ? 'koerper' : st.ansicht;
  const zyklus = (dt, zustand, dauer = [2.5, 1.5, 2.5, 1.5]) => {    // auf – halten – zu – halten
    zustand.z = (zustand.z + dt) % dauer.reduce((a, b) => a + b);
    let z = zustand.z;
    if (z < dauer[0]) return smooth(z / dauer[0]); z -= dauer[0];
    if (z < dauer[1]) return 1; z -= dauer[1];
    if (z < dauer[2]) return 1 - smooth(z / dauer[2]); return 0;
  };
  const smooth = u => u * u * (3 - 2 * u);
  const zust = { z: st.bewegung ? 0 : 0 };

  if (ansicht === 'koerper') {
    wurzel.add(koerperMesh(art, m)); wurzel.add(etik);
    const kl = V3(0, 0, 0);
    if (art === 'wuerfel' || art === 'quader') {
      const a = m.a / 2, b = m.b / 2;
      masslinie(etik, V3(-a, 0, b + 0.02), V3(a, 0, b + 0.02), `a = ${zahl(m.a)} cm`, schrift, V3(0, -schrift * 0.9, schrift * 0.5));
      if (art === 'quader') {
        masslinie(etik, V3(a + 0.02, 0, b), V3(a + 0.02, 0, -b), `b = ${zahl(m.b)} cm`, schrift, V3(schrift * 2.6, -schrift * 0.6, 0));
        masslinie(etik, V3(a, 0, b + 0.02), V3(a, m.c, b + 0.02), `c = ${zahl(m.c)} cm`, schrift, V3(schrift * 2.6, 0, 0));
      }
    } else if (art === 'prisma3' || art === 'prisma6') {
      const fl = polyeder(art, m), unten = fl[0].pts;
      masslinie(etik, unten[0].clone().add(V3(0, 0.02, 0)), unten[1].clone().add(V3(0, 0.02, 0)), `a = ${zahl(m.a)} cm`, schrift, V3(0, -schrift, schrift * 0.6));
      masslinie(etik, unten[1].clone(), unten[1].clone().setY(m.h), `h = ${zahl(m.h)} cm`, schrift, V3(schrift * 2.6, 0, 0));
    } else if (art === 'pyramide') {
      const a = m.a / 2;
      masslinie(etik, V3(-a, 0, a + 0.02), V3(a, 0, a + 0.02), `a = ${zahl(m.a)} cm`, schrift, V3(0, -schrift * 0.9, schrift * 0.5));
      masslinie(etik, V3(0, 0, 0), V3(0, m.h, 0), `h = ${zahl(m.h)} cm`, schrift, V3(schrift * 2.4, 0, 0));
      masslinie(etik, V3(0, 0, a), V3(0, m.h, 0), `h_s`, schrift * 0.8, V3(schrift * 1.2, 0, schrift), 0x2563eb);
    } else if (art === 'zylinder' || art === 'kegel') {
      masslinie(etik, V3(0, 0.02, 0), V3(m.r, 0.02, 0), `r = ${zahl(m.r)} cm`, schrift, V3(0, -schrift * 0.9, schrift * 0.4));
      masslinie(etik, V3(0, 0, 0), V3(0, m.h, 0), `h = ${zahl(m.h)} cm`, schrift, V3(-schrift * 2.6, 0, 0));
      if (art === 'kegel') masslinie(etik, V3(-m.r, 0, 0), V3(0, m.h, 0), `s`, schrift * 0.8, V3(-schrift, 0, 0), 0x2563eb);
    } else if (art === 'kugel') {
      masslinie(etik, V3(0, m.r, 0), V3(m.r, m.r, 0), `r = ${zahl(m.r)} cm`, schrift, V3(0, schrift * 0.8, 0));
    }
    void kl;
  } else if (ansicht === 'netz') {
    let netz;
    if (art === 'zylinder') netz = zylinderNetz(m.r, m.h);
    else if (art === 'kegel') netz = kegelNetz(m.r, m.h);
    else if (art === 'kugel') netz = null;
    else netz = netzObjekt(polyeder(art, m));
    if (netz) {
      wurzel.add(netz.wurzel); netz.setze(st.bewegung ? 0 : 1);
      update = dt => { if (st.bewegung) netz.setze(zyklus(dt, zust)); };
      radius = groesse * (art === 'zylinder' ? 2.2 : art === 'kegel' ? 1.8 : 1.6);
    } else {
      wurzel.add(koerperMesh(art, m));
      const s = textSprite('Eine Kugel hat kein Netz:\nIhre Oberfläche ist überall gekrümmt\nund lässt sich nicht flach ausbreiten.', '#1f2937', schrift * 0.9); s.position.set(0, m.r * 2.6, 0); wurzel.add(s);
    }
  } else {
    // ---- Volumen verstehen ----
    if (art === 'pyramide') {
      // Ein Würfel lässt sich in drei gleiche Pyramiden zerlegen (gemeinsame Spitze in einer Würfelecke)
      const a = m.a, S = V3(a, a, a), teile = [];
      const flaeche = [[V3(0, 0, 0), V3(0, a, 0), V3(0, a, a), V3(0, 0, a)], [V3(0, 0, 0), V3(a, 0, 0), V3(a, 0, a), V3(0, 0, a)], [V3(0, 0, 0), V3(a, 0, 0), V3(a, a, 0), V3(0, a, 0)]];
      const raus = [V3(-1, 0, 0), V3(0, -1, 0), V3(0, 0, -1)];
      flaeche.forEach((q, i) => {
        const g = new THREE.Group(), pts = [];
        const dreiecke = [[q[0], q[1], q[2]], [q[0], q[2], q[3]], ...q.map((p, k) => [p, q[(k + 1) % 4], S])];
        for (const d of dreiecke) pts.push(...d);
        const geo = new THREE.BufferGeometry().setFromPoints(pts); geo.computeVertexNormals();
        g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: [0xf87171, 0x4ade80, 0x60a5fa][i], side: THREE.DoubleSide, roughness: 0.55, polygonOffset: true, polygonOffsetFactor: 1 })));
        const kanten = []; for (let k = 0; k < 4; k++) kanten.push(q[k], q[(k + 1) % 4], q[k], S);
        g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(kanten), kante));
        g.position.set(-a / 2, 0, -a / 2); teile.push({ g, raus: raus[i] }); wurzel.add(g);
      });
      update = dt => { const t = st.bewegung ? zyklus(dt, zust, [2, 2, 2, 1.5]) : 1; for (const p of teile) p.g.position.set(-a / 2, 0, -a / 2).addScaledVector(p.raus, t * a * 0.55).add(V3(0, t * a * 0.55, 0)); };
      update(0);
      radius = a * 1.5;
      const s = textSprite('3 gleiche Pyramiden = 1 Würfel\nV = ⅓ · a² · h', '#1f2937', schrift * 1.4); s.position.set(0, a * 2.3, 0); wurzel.add(s);
    } else {
      // Umfüllen: Kegel → Zylinder (3×) bzw. Halbkugel → Zylinder (Höhe r) füllt 2/3
      const r = m.r, h = art === 'kegel' ? m.h : r, dx = r * 1.6;
      const glas = new THREE.MeshStandardMaterial({ color: 0xdbeafe, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false, roughness: 0.1 });
      const wasserM = new THREE.MeshStandardMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.8, roughness: 0.2 });
      const zyl = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 64, 1, true), glas); zyl.position.set(dx, h / 2, 0); wurzel.add(zyl);
      const boden = new THREE.Mesh(new THREE.CircleGeometry(r, 64), glas); boden.rotation.x = -Math.PI / 2; boden.position.set(dx, 0.001, 0); wurzel.add(boden);
      const gef = art === 'kegel' ? new THREE.Mesh(new THREE.ConeGeometry(r, h, 64, 1, true), glas) : new THREE.Mesh(new THREE.SphereGeometry(r, 64, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), glas);
      gef.position.set(-dx, art === 'kegel' ? h / 2 : r, 0); wurzel.add(gef);
      if (art === 'kegel') { const b2 = boden.clone(); b2.position.set(-dx, 0.001, 0); wurzel.add(b2); }
      let wZ = null, wG = null;
      const portion = art === 'kegel' ? 1 / 3 : 2 / 3, fuellungen = art === 'kegel' ? 3 : 1;
      const zeige = (fZyl, fGef) => {
        if (wZ) { wurzel.remove(wZ); wZ.geometry.dispose(); }
        if (wG) { wurzel.remove(wG); wG.geometry.dispose(); }
        const hz = Math.max(h * fZyl, 0.001); wZ = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.985, r * 0.985, hz, 64), wasserM); wZ.position.set(dx, hz / 2, 0); wurzel.add(wZ);
        if (art === 'kegel') {           // Kegel mit Spitze oben: Füllstand L aus dem Volumenanteil
          const L = Math.max(h * (1 - Math.cbrt(1 - fGef)), 0.001);
          wG = new THREE.Mesh(new THREE.CylinderGeometry(r * (1 - L / h) * 0.985, r * 0.985, L, 64), wasserM); wG.position.set(-dx, L / 2, 0);
        } else {                         // Halbkugel-Schale: Kugelkappe der Höhe L
          let lo = 0, hi = r; for (let i = 0; i < 40; i++) { const L = (lo + hi) / 2; if ((L * L * (3 * r - L)) / (2 * r ** 3) < fGef) lo = L; else hi = L; }
          const L = Math.max(lo, 0.001), prof = []; for (let i = 0; i <= 24; i++) { const y = L * i / 24, rr = Math.sqrt(Math.max(r * r - (r - y) ** 2, 0)) * 0.985; prof.push(new THREE.Vector2(rr, y)); }
          prof.unshift(new THREE.Vector2(0, 0)); prof.push(new THREE.Vector2(0, L));
          wG = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), wasserM); wG.position.set(-dx, 0, 0);
        }
        wurzel.add(wG);
      };
      const ablauf = t => {               // t ∈ [0, fuellungen]: jede Einheit = einmal auffüllen und umgießen
        const k = Math.min(Math.floor(t), fuellungen - 1), u = Math.min(t - k, 1);
        zeige(portion * (k + u), 1 - u);
      };
      let tt = 0, pause = 0;
      update = dt => {
        if (!st.bewegung) { ablauf(fuellungen); return; }
        if (pause > 0) { pause -= dt; if (pause <= 0) tt = 0; } else { tt += dt * 0.4; if (tt >= fuellungen) { tt = fuellungen; pause = 2.5; } }
        ablauf(tt);
      };
      update(0);
      radius = Math.max(dx + r, h) * 1.4;
      const text = art === 'kegel' ? 'Kegel und Zylinder: gleiche Grundfläche, gleiche Höhe\nDreimal den Kegel umfüllen → Zylinder voll\nV_Kegel = ⅓ · V_Zylinder' : 'Halbkugel und Zylinder mit Höhe r\nEinmal umfüllen → Zylinder zu ⅔ voll\nV_Halbkugel = ⅔ · π r³  →  V_Kugel = ⁴⁄₃ · π r³';
      const gs = Math.max(dx + r, h) * 0.085; const s = textSprite(text, '#1f2937', gs * 0.9); s.position.set(0, h * 1.5 + r * 0.6, 0); wurzel.add(s);
      for (const [x, t] of [[-dx, art === 'kegel' ? 'Kegel' : 'Halbkugel'], [dx, 'Zylinder']]) { const l = textSprite(t, '#334155', gs * 1.1); l.position.set(x, -schrift * 1.2, r); wurzel.add(l); }
    }
  }
  etik.visible = st.beschriftung;
  // Inhalt mittig setzen
  const box = new THREE.Box3().setFromObject(wurzel), mitte = box.getCenter(new THREE.Vector3());
  const huelle = new THREE.Group(); huelle.add(wurzel); wurzel.position.set(-mitte.x, -mitte.y, -mitte.z);
  if (ansicht === 'netz' || ansicht === 'volumen') wurzel.position.y = -(box.min.y + box.max.y) / 2;

  const info = [
    `<b>${KOERPER[art].name}</b> · ${KOERPER[art].masse.map(k => `${k} = ${zahl(m[k])} cm`).join(' · ')}`,
    ...formeln(art, m),
  ];
  const TEXT = {
    koerper: 'Ändere die Maße mit − und +: Volumen und Oberfläche werden sofort neu berechnet.',
    netz: art === 'kugel' ? '' : 'Das Netz besteht aus allen Flächen des Körpers, flach ausgebreitet. Die Oberfläche O ist die Summe aller Flächen im Netz.',
    volumen: art === 'pyramide' ? 'Drei gleich große Pyramiden – jede mit einer Würfelfläche als Grundfläche und der gegenüberliegenden Ecke als Spitze – füllen den Würfel genau aus. Also hat jede Pyramide ein Drittel des Würfelvolumens. Das gilt für alle Pyramiden: V = ⅓ · G · h.'
      : art === 'kegel' ? 'Ein Kegel passt genau dreimal in einen Zylinder mit gleicher Grundfläche und gleicher Höhe. Deshalb gilt: V = ⅓ · π · r² · h.'
      : 'Archimedes: Eine Halbkugel füllt einen Zylinder mit gleichem Radius und der Höhe r zu zwei Dritteln. V_Halbkugel = ⅔ · π · r² · r, also V_Kugel = ⁴⁄₃ · π · r³.',
  };
  if (TEXT[ansicht]) info.push(`<i>${TEXT[ansicht]}</i>`);
  return { objekt: huelle, radius, titel: `${KOERPER[art].name} – ${ANSICHTEN[ansicht]}`, info: info.join('<br>'), update };
}
export const entsorge = entsorgeObj;

export function ausUrl(p) {
  const st = standard();
  if (KOERPER[p.get('k')]) st.koerper = p.get('k');
  if (ANSICHTEN[p.get('v')]) st.ansicht = p.get('v');
  for (const k of ['a', 'b', 'c', 'h', 'r']) { const x = parseFloat(p.get(k)); if (x >= 1 && x <= 10) st.masse[k] = x; }
  return st;
}
export const zuUrl = st => `&k=${st.koerper}&v=${st.ansicht}` + KOERPER[st.koerper].masse.map(k => `&${k}=${st.masse[k]}`).join('');

export function bedienung(ort, st, neu) {
  stil(); ort.innerHTML = '';
  const sel = (opts, titel) => { const s = document.createElement('select'); s.title = titel; for (const [k, v] of Object.entries(opts)) s.add(new Option(typeof v === 'string' ? v : v.name, k)); ort.appendChild(s); return s; };
  const sK = sel(KOERPER, 'Körper'), sA = sel(ANSICHTEN, 'Ansicht');
  const knoepfe = {}; for (const k of ['a', 'b', 'c', 'h', 'r']) knoepfe[k] = zahlKnopf(ort, `Maß ${k} in cm`);
  const knopf = t => { const b = document.createElement('button'); b.textContent = t; ort.appendChild(b); return b; };
  const bSchild = knopf('Beschriftung'), bBew = knopf('Bewegung');
  function auffrischen() {
    sK.value = st.koerper; sA.value = st.ansicht;
    [...sA.options].find(o => o.value === 'volumen').disabled = !MIT_VOLUMEN.includes(st.koerper);
    if (st.ansicht === 'volumen' && !MIT_VOLUMEN.includes(st.koerper)) { st.ansicht = 'koerper'; sA.value = 'koerper'; }
    for (const [k, z] of Object.entries(knoepfe)) {
      z.w.hidden = !KOERPER[st.koerper].masse.includes(k);
      z.t.textContent = `${k} = ${st.masse[k]} cm`; z.m.disabled = st.masse[k] <= 1; z.p.disabled = st.masse[k] >= 10;
    }
    bSchild.classList.toggle('on', st.beschriftung); bBew.classList.toggle('on', st.bewegung);
  }
  const aendern = (f, bauen = true) => () => { f(); auffrischen(); if (bauen) neu(); };
  sK.onchange = aendern(() => st.koerper = sK.value);
  sA.onchange = aendern(() => st.ansicht = sA.value);
  for (const [k, z] of Object.entries(knoepfe)) { z.m.onclick = aendern(() => st.masse[k] = Math.max(1, st.masse[k] - 1)); z.p.onclick = aendern(() => st.masse[k] = Math.min(10, st.masse[k] + 1)); }
  bSchild.onclick = aendern(() => st.beschriftung = !st.beschriftung);
  bBew.onclick = aendern(() => st.bewegung = !st.bewegung);
  auffrischen();
}
