// Herz-Generator: Herz im Frontalschnitt mit animiertem Herzschlag und doppelter Blutkreislauf.
// Maße in cm (Herz ≈ 12 cm). Ansicht von vorne: die rechte Herzhälfte des Menschen liegt im Bild links.
// Herzzyklus (verlangsamt auf 3,2 s): Diastole – Segelklappen offen, Kammern füllen sich (am Ende Vorhofkontraktion);
// Systole – Segelklappen zu, Taschenklappen offen, Kammern ziehen sich zusammen.
import * as THREE from 'three';
import { textSprite, entsorge as entsorgeObj, stil } from './hilfen.js';

export const ANSICHTEN = { herz: 'Herz im Schnitt', kreislauf: 'Blutkreislauf' };
export const standard = () => ({ ansicht: 'herz', beschriftung: true, bewegung: true, tempo: 1 });
const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const ROT = 0xd62828, BLAU = 0x2f5fd0, T = 3.2, DIA = 1.9;
const glatt = u => u * u * (3 - 2 * u);

// Zustand im Herzzyklus: c = Kammergröße (1 = gefüllt), a = Vorhofgröße, av/sl = Öffnung der Segel-/Taschenklappen (0…1)
function zyklus(t) {
  t = ((t % T) + T) % T;
  const dia = t < DIA;
  const c = dia ? 0.74 + 0.26 * glatt(Math.min(t / 1.3, 1)) : 1 - 0.26 * glatt(Math.min((t - DIA) / 0.9, 1));
  const a = t > 1.3 && t < DIA ? 1 - 0.1 * Math.sin((t - 1.3) / (DIA - 1.3) * Math.PI) : 1;
  const av = dia ? glatt(Math.min(t / 0.15, 1)) * (t > DIA - 0.12 ? 1 - glatt((t - DIA + 0.12) / 0.12) : 1) : 0;
  const sl = dia ? 0 : glatt(Math.min(Math.max(t - DIA - 0.08, 0) / 0.15, 1)) * (t > T - 0.12 ? 1 - glatt((t - T + 0.12) / 0.12) : 1);
  return { t, dia, c, a, av, sl };
}

// ---------- Formen im Schnitt ----------
const kurve = (pts, n, geschlossen = false) => new THREE.CatmullRomCurve3(pts.map(([x, y]) => V(x, y)), geschlossen, 'centripetal').getPoints(n).map(p => [p.x, p.y]);
const AUSSEN = [[-4.6, 0.2], [-5.3, -1.6], [-5.0, -4.1], [-3.6, -6.5], [-1.3, -8.3], [0.8, -8.9], [2.9, -8.0], [4.9, -5.6], [5.9, -2.8], [5.7, 0.2]];
const RK = [[-4.2, 0.2], [-0.35, 0.2], [-0.5, -2.5], [-0.3, -5.0], [-1.3, -6.6], [-3.0, -5.7], [-4.4, -3.6], [-4.6, -1.2]];      // rechte Kammer
const LK = [[1.1, 0.2], [4.7, 0.2], [4.7, -2.6], [3.7, -5.7], [2.3, -6.8], [1.4, -5.1], [1.1, -2.0]];                         // linke Kammer
const skal = (pts, [cx, cy], f) => pts.map(([x, y]) => [cx + (x - cx) * f, y >= 0.19 ? y : cy + (y - cy) * f]);
function kammerWand(c) {
  const fa = 0.95 + 0.05 * c, aussen = kurve(skal(AUSSEN, [0.4, -2], fa), 70);
  const rk = kurve(skal(RK, [-2.3, -1.0], c), 50), lk = kurve(skal(LK, [2.9, -1.0], c), 50);
  // ein Umriss: außen herum, dann in die linke Kammer hinein und heraus, dann in die rechte Kammer
  const um = [...aussen, ...lk.slice(1), lk[0], ...rk.slice(1), rk[0]];
  return { um, rk, lk };
}
function ellipseU(cx, cy, rx, ry, wand, f) {    // Vorhof: oben gewölbt, unten zur Klappenebene offen (U-Form)
  const ya = 0.2, R = rx * f, Q = ry * f, n = 36;
  const bogen = (r, q) => Array.from({ length: n + 1 }, (_, i) => { const w = Math.PI * i / n; return [cx + Math.cos(w) * r, cy + Math.sin(w) * q]; });
  const aussen = [[cx + R, ya], ...bogen(R, Q), [cx - R, ya]];
  const innen = [[cx - R + wand, ya], ...bogen(R - wand, Q - wand).reverse(), [cx + R - wand, ya]];
  return { um: [...aussen, ...innen], aussen, hohl: innen };
}
const RV = { cx: -3.6, cy: 2.3, rx: 2.2, ry: 2.1 }, LV = { cx: 3.9, cy: 2.4, rx: 2.0, ry: 1.9 };

function extrudiert(pts, tiefe, mats) {
  const f = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(f, { depth: tiefe, bevelEnabled: false, curveSegments: 1 }); g.translate(0, 0, -tiefe);
  return new THREE.Mesh(g, mats);
}
const flach = (pts, mat, z) => { const g = new THREE.ShapeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)))); const m = new THREE.Mesh(g, mat); m.position.z = z; return m; };

// =====================================================================
function herzAnsicht(wurzel, st, schild, linie) {
  const muskel = [new THREE.MeshStandardMaterial({ color: 0xd9776f, roughness: 0.75, side: THREE.DoubleSide }), new THREE.MeshStandardMaterial({ color: 0xa83a32, roughness: 0.6, side: THREE.DoubleSide })];
  const hinten = new THREE.MeshStandardMaterial({ color: 0x6e2424, roughness: 0.8, side: THREE.DoubleSide });
  const blauBlut = new THREE.MeshBasicMaterial({ color: BLAU, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false });
  const rotBlut = new THREE.MeshBasicMaterial({ color: ROT, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false });
  const beweglich = new THREE.Group(); wurzel.add(beweglich);
  // Gefäße (halb durchsichtig, damit man das Blut fließen sieht)
  const gefaess = (pts, r, farbe) => { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, r, 20), new THREE.MeshStandardMaterial({ color: farbe, roughness: 0.4, transparent: true, opacity: 0.5, depthWrite: false })); wurzel.add(m); return m; };
  const P = {
    oHohl: [V(-3.3, 10), V(-3.3, 6.5, -0.6), V(-3.5, 4.2, -0.8)],
    uHohl: [V(-5.2, -8.5, -3.2), V(-5.0, -3, -2.8), V(-4.4, 0.9, -1.6)],
    lungArt: [V(-0.8, 0.2, -0.6), V(-0.8, 2.6, 0.2), V(-0.5, 5.0, 1.0), V(0.4, 6.4, 0.9)],
    lungArtL: [V(0.4, 6.4, 0.9), V(3.0, 6.9, 0.2), V(7.5, 6.4, -1.0)],
    lungArtR: [V(0.4, 6.4, 0.9), V(-2.4, 7.0, 0.0), V(-7.8, 6.4, -1.4)],
    aorta: [V(1.55, 0.2, -0.6), V(1.4, 3.6, -0.6), V(1.0, 7.6, -1.0), V(2.6, 9.4, -1.8), V(4.6, 8.0, -2.8), V(4.9, 3.0, -3.3), V(4.9, -8.5, -3.4)],
    lungVenL1: [V(8.0, 3.6, -1.2), V(5.4, 3.1, -1.0)], lungVenL2: [V(8.0, 1.6, -1.2), V(5.5, 1.8, -1.0)],
    lungVenR1: [V(-7.6, 3.4, -3.0), V(-1, 3.4, -2.8), V(2.2, 3.0, -2.0)], lungVenR2: [V(-7.6, 1.8, -3.0), V(-1, 1.6, -2.8), V(2.2, 1.9, -2.0)],
  };
  gefaess(P.oHohl, 0.95, BLAU); gefaess(P.uHohl, 0.95, BLAU);
  gefaess(P.lungArt, 0.75, BLAU); gefaess(P.lungArtL, 0.55, BLAU); gefaess(P.lungArtR, 0.55, BLAU);
  gefaess(P.aorta, 1.0, ROT);
  for (const [x, y] of [[1.25, 9.4], [2.3, 10.0], [3.4, 9.6]]) gefaess([V(x, y - 0.8, -1.6), V(x + 0.1, y + 2.0, -1.6)], 0.32, ROT);
  for (const k of ['lungVenL1', 'lungVenL2', 'lungVenR1', 'lungVenR2']) gefaess(P[k], 0.42, ROT);
  // Klappen: Segel (an der Klappenebene) und Taschen (in den Schlagadern)
  const segelM = new THREE.MeshStandardMaterial({ color: 0xf3e3c3, roughness: 0.5, side: THREE.DoubleSide });
  const klappe = (x, y, z, laenge, breite) => { const g = new THREE.Group(); g.position.set(x, y, z); const b = new THREE.Mesh(new THREE.BoxGeometry(laenge, 0.12, breite), segelM); b.position.x = laenge / 2; g.add(b); beweglich.add(g); return g; };
  const tri = [klappe(-4.2, 0.2, -1, 1.25, 1.8), klappe(-1.75, 0.2, -1, 1.2, 1.8)];  tri[1].rotation.y = Math.PI;
  const mit = [klappe(2.25, 0.2, -1, 1.2, 1.8), klappe(4.7, 0.2, -1, 1.2, 1.8)];     mit[1].rotation.y = Math.PI;
  const pul = [klappe(-1.5, 1.2, 0.0, 0.7, 1.2), klappe(-0.1, 1.2, 0.0, 0.7, 1.2)];  pul[1].rotation.y = Math.PI;
  const aor = [klappe(0.6, 1.0, -0.6, 0.95, 1.6), klappe(2.5, 1.0, -0.6, 0.95, 1.6)]; aor[1].rotation.y = Math.PI;
  // Papillarmuskeln und Sehnenfäden
  const papM = new THREE.MeshStandardMaterial({ color: 0xa83a32 });
  const papillen = [[-3.1, -3.9], [-1.1, -4.6], [3.9, -4.3], [2.0, -5.0]].map(([x, y]) => { const m = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.4, 12), papM); m.position.set(x, y, -1); beweglich.add(m); return m; });
  const faeden = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xf8fafc }));
  beweglich.add(faeden);
  // Wände und Hohlräume (werden in jedem Bild neu geformt)
  let teile = [];
  function formen(z) {
    for (const m of teile) { beweglich.remove(m); m.geometry.dispose(); }
    teile = [];
    const k = kammerWand(z.c), ra = ellipseU(RV.cx, RV.cy, RV.rx, RV.ry, 0.3, z.a), la = ellipseU(LV.cx, LV.cy, LV.rx, LV.ry, 0.3, z.a);
    teile.push(extrudiert(k.um, 2.4, muskel), extrudiert(ra.um, 2.4, muskel), extrudiert(la.um, 2.4, muskel));
    teile.push(flach(kurve(skal(AUSSEN, [0.4, -2], 0.95 + 0.05 * z.c), 70), hinten, -2.4));
    teile.push(flach(ra.aussen, hinten, -2.4), flach(la.aussen, hinten, -2.4));
    teile.push(flach(k.rk, blauBlut, -0.9), flach(k.lk, rotBlut, -0.9), flach(ra.hohl, blauBlut, -0.9), flach(la.hohl, rotBlut, -0.9));
    for (const m of teile) beweglich.add(m);
    // Klappenstellung: Segel hängen offen nach unten in die Kammer, geschlossen waagerecht; Taschen offen an die Wand gelegt
    const segel = (paar, offen) => { paar[0].rotation.z = -offen * 1.25; paar[1].rotation.z = -offen * 1.25; };
    segel(tri, z.av); segel(mit, z.av);
    const tasche = (paar, offen) => { paar[0].rotation.z = 0.25 + offen * 1.2; paar[1].rotation.z = 0.25 + offen * 1.2; };
    tasche(pul, z.sl); tasche(aor, z.sl);
    // Sehnenfäden von den Segelspitzen zu den Papillarmuskeln
    const pts = [];
    const spitze = g => { g.updateMatrixWorld(true); return g.children[0].localToWorld(V(g.children[0].geometry.parameters.width / 2, 0, 0)).applyMatrix4(wurzel.matrixWorld.clone().invert()); };
    const zuordnung = [[tri[0], 0], [tri[1], 1], [mit[0], 3], [mit[1], 2]];
    for (const [g, p] of zuordnung) { const s = spitze(g), q = papillen[p].position.clone().add(V(0, 0.6, 0)); for (const dz of [-0.6, 0, 0.6]) pts.push(s.clone().add(V(0, 0, dz)), q); }
    faeden.geometry.dispose(); faeden.geometry = new THREE.BufferGeometry().setFromPoints(pts);
    const f = 0.95 + 0.05 * z.c; for (const [i, m] of papillen.entries()) { const [x, y] = [[-3.1, -3.9], [-1.1, -4.6], [3.9, -4.3], [2.0, -5.0]][i]; const c = i < 2 ? [-2.3, -1] : [2.9, -1]; m.position.set(c[0] + (x - c[0]) * z.c, c[1] + (y - c[1]) * z.c, -1); void f; }
  }
  // Blutteilchen auf Wegen mit „Toren“ (Klappen)
  const wege = {
    blauO: [[...P.oHohl, V(-3.5, 2.3, -0.9)], 'T', [V(-3.0, -0.2, -0.9), V(-2.4, -3.0, -0.9), V(-1.0, -1.0, -0.9), V(-0.8, 0.4, -0.6)], 'P', [V(-0.8, 2.6, 0.2), V(-0.5, 5.0, 1.0), V(0.4, 6.4, 0.9)], 'Lunge'],
    blauU: [[...P.uHohl, V(-3.5, 2.0, -0.9)], 'T', [V(-3.2, -0.2, -0.9), V(-2.8, -3.5, -0.9), V(-1.0, -1.2, -0.9), V(-0.8, 0.4, -0.6)], 'P', [V(-0.8, 2.6, 0.2), V(-0.5, 5.0, 1.0), V(0.4, 6.4, 0.9)], 'Lunge'],
    rotL: [[...P.lungVenL1, V(3.9, 2.4, -0.9)], 'M', [V(3.4, -0.2, -0.9), V(3.0, -3.8, -0.9), V(1.6, -1.2, -0.9), V(1.55, 0.4, -0.6)], 'A', P.aorta.slice(1)],
    rotR: [[...P.lungVenR1, V(3.6, 2.2, -0.9)], 'M', [V(3.0, -0.2, -0.9), V(2.6, -4.2, -0.9), V(1.5, -1.2, -0.9), V(1.55, 0.4, -0.6)], 'A', P.aorta.slice(1)],
  };
  const lungeL = new THREE.CatmullRomCurve3(P.lungArtL), lungeR = new THREE.CatmullRomCurve3(P.lungArtR);
  const teilchenM = { b: new THREE.MeshBasicMaterial({ color: 0x1e40af }), r: new THREE.MeshBasicMaterial({ color: 0xb91c1c }) };
  const teilchen = [];
  for (const [name, w] of Object.entries(wege)) {
    const abschnitte = [w[0], w[2], w[4]].map(p => new THREE.CatmullRomCurve3(p)), tore = [w[1], w[3]];
    for (let i = 0; i < 16; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), name.startsWith('blau') ? teilchenM.b : teilchenM.r); wurzel.add(m);
      teilchen.push({ m, abschnitte, tore, ab: i % 3, u: Math.random(), ver: V(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.7), extra: name.startsWith('blau') ? (Math.random() < 0.5 ? lungeL : lungeR) : null });
    }
  }
  const torOffen = (tor, z) => (tor === 'T' || tor === 'M') ? z.av > 0.5 : z.sl > 0.5;
  function fliessen(dt, z) {
    for (const p of teilchen) {
      const kurveA = p.ab < 3 ? p.abschnitte[p.ab] : p.extra;
      if (!kurveA) { p.ab = 0; p.u = 0; continue; }
      const len = kurveA.getLength();
      let v = 3.2;                                          // cm/s (verlangsamt)
      if (p.ab === 1) v = z.dia ? 1.6 : 7;                 // Kammer: im Systole schnell hinaus
      if (p.ab === 2) v = z.dia ? 0.6 : 6;                 // Schlagader: Puls
      p.u += v * dt / len;
      if (p.u >= 1) {
        const tor = p.ab < 2 ? p.tore[p.ab] : null;
        if (tor && !torOffen(tor, z)) p.u = 0.97 + Math.random() * 0.03;
        else if (p.ab === 2 && p.extra) { p.ab = 3; p.u = 0; }
        else if (p.ab >= 2) { p.ab = 0; p.u = 0; }
        else { p.ab++; p.u = 0; }
      }
      const q = (p.ab < 3 ? p.abschnitte[p.ab] : p.extra).getPointAt(Math.min(p.u, 1));
      const breit = p.ab === 1 || (p.ab === 0 && p.u > 0.75) ? 1.6 : 0.5;
      p.m.position.copy(q).addScaledVector(p.ver, breit);
    }
  }
  // Beschriftung
  linie('rechter Vorhof', V(-3.6, 2.6, 0), V(-9, 3.6, 0));
  linie('rechte Kammer', V(-2.6, -3.0, 0), V(-8.6, -3.5, 0));
  linie('linker Vorhof', V(3.9, 2.6, 0), V(9.3, 4.6, 0), '#991b1b');
  linie('linke Kammer\n(dicke Muskelwand)', V(3.2, -3.4, 0), V(9.2, -3.2, 0), '#991b1b');
  linie('Herzscheidewand', V(0.3, -4.6, 0), V(2.2, -10.4, 0));
  linie('Segelklappe', V(-3.0, 0.2, 0), V(-9.0, 0.6, 0));
  linie('Segelklappe', V(3.5, 0.2, 0), V(9.0, 0.8, 0));
  linie('Taschenklappe', V(-0.8, 1.2, 0.3), V(-6.6, 8.8, 0));
  linie('Taschenklappe', V(1.55, 1.0, 0), V(7.6, 10.6, 0));
  linie('Sehnenfäden', V(-2.6, -2.3, -1), V(-8.6, -1.4, 0));
  linie('obere Hohlvene', V(-3.3, 8.5, 0), V(-8.6, 9.8, 0), '#1e3a8a');
  linie('untere Hohlvene', V(-5.1, -6.5, -3), V(-8.2, -7.6, 0), '#1e3a8a');
  linie('Lungenarterie', V(-0.5, 5.0, 1), V(-4.2, 11.6, 0), '#1e3a8a');
  linie('Aorta\n(Hauptschlagader)', V(2.6, 9.4, -1.8), V(4.6, 12.6, 0), '#991b1b');
  linie('Lungenvenen', V(7.2, 3.4, -1.2), V(10.2, 6.6, 0), '#991b1b');
  const phase = { s: null, letzte: null };
  return { formen, fliessen, phase };
}

// =====================================================================
function kreislauf(wurzel, st, schild, linie) {
  // Organe
  const org = (pos, r, farbe, skal = [1, 1, 1]) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 22), new THREE.MeshStandardMaterial({ color: farbe, roughness: 0.6, transparent: true, opacity: 0.55, depthWrite: false })); m.position.copy(pos); m.scale.set(...skal); wurzel.add(m); return m; };
  org(V(-3.4, 5.6), 1.8, 0xf4a3a8, [0.9, 1.35, 0.8]); org(V(3.4, 5.6), 1.8, 0xf4a3a8, [0.9, 1.35, 0.8]);
  org(V(0, 11.2), 1.4, 0xe9c9a6); org(V(0, -7.6), 2.2, 0xc98b6b, [1.5, 0.8, 0.9]);
  // Herz: vier Räume
  const raum = (x, y, farbe) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.75, 24, 16), new THREE.MeshStandardMaterial({ color: farbe, roughness: 0.5 })); m.position.set(x, y, 0); wurzel.add(m); return m; };
  const herz = [raum(-0.85, 0.6, BLAU), raum(-0.85, -0.8, BLAU), raum(0.85, 0.6, ROT), raum(0.85, -0.8, ROT)];
  const blauC = new THREE.Color(BLAU), rotC = new THREE.Color(ROT);
  // Wege: [Punkte, Farbe am Anfang, Farbe am Ende] – Haargefäße (Kapillaren) wechseln die Farbe
  const W = {
    rv_lungeL: [[V(-0.85, -0.8), V(-1.2, 1.8, 0.5), V(-2.6, 4.2, 0.5)], 0, 0], lungeL: [[V(-2.6, 4.2, 0.5), V(-3.9, 5.0, 0.5), V(-3.6, 6.8, 0.3), V(-2.8, 5.8, 0), V(-2.3, 4.6, -0.4)], 0, 1], lungeL_la: [[V(-2.3, 4.6, -0.4), V(-0.4, 3.0, -0.5), V(0.85, 0.6)], 1, 1],
    rv_lungeR: [[V(-0.85, -0.8), V(0.0, 2.2, 0.6), V(2.6, 4.2, 0.5)], 0, 0], lungeR: [[V(2.6, 4.2, 0.5), V(3.9, 5.0, 0.5), V(3.6, 6.8, 0.3), V(2.8, 5.8, 0), V(2.3, 4.6, -0.4)], 0, 1], lungeR_la: [[V(2.3, 4.6, -0.4), V(1.6, 2.6, -0.5), V(0.85, 0.6)], 1, 1],
    la_lk: [[V(0.85, 0.6), V(0.85, -0.8)], 1, 1],
    lk_kopf: [[V(0.85, -0.8), V(1.4, 1.5, 0.9), V(1.0, 9.6, 0.9)], 1, 1], kopf: [[V(1.0, 9.6, 0.9), V(0.9, 11.6, 0.6), V(-0.9, 11.6, -0.6), V(-1.0, 9.6, -0.9)], 1, 0], kopf_rv: [[V(-1.0, 9.6, -0.9), V(-1.5, 2.2, -0.9), V(-0.85, 0.6)], 0, 0],
    lk_koerper: [[V(0.85, -0.8), V(1.8, -2.4, 0.4), V(2.0, -6.6, 0.4)], 1, 1], koerper: [[V(2.0, -6.6, 0.4), V(2.6, -8.2, 0.3), V(-2.6, -8.2, -0.3), V(-2.0, -6.6, -0.4)], 1, 0], koerper_rv: [[V(-2.0, -6.6, -0.4), V(-1.8, -2.4, -0.4), V(-0.85, 0.6)], 0, 0],
    ra_rk: [[V(-0.85, 0.6), V(-0.85, -0.8)], 0, 0],
  };
  const kurven = {};
  for (const [k, [pts, a, b]] of Object.entries(W)) {
    const c = new THREE.CatmullRomCurve3(pts); kurven[k] = { c, a, b };
    if (k === 'la_lk' || k === 'ra_rk') continue;
    const g = new THREE.TubeGeometry(c, 60, k.length < 8 ? 0.28 : 0.22, 10), farben = [];
    const pos = g.attributes.position; const n = pos.count;
    for (let i = 0; i < n; i++) { const u = Math.floor(i / 11) / 60; const col = (a === b ? (a ? rotC : blauC) : blauC.clone().lerp(rotC, a < b ? u : 1 - u)); farben.push(col.r, col.g, col.b); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(farben, 3));
    wurzel.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, transparent: true, opacity: 0.75 })));
  }
  // Teilchen laufen den doppelten Kreislauf ab
  const ROUTE = () => ['ra_rk', Math.random() < 0.5 ? 'rv_lungeL' : 'rv_lungeR', null, null, 'la_lk', Math.random() < 0.35 ? 'lk_kopf' : 'lk_koerper', null, null];
  const folge = { rv_lungeL: 'lungeL', lungeL: 'lungeL_la', rv_lungeR: 'lungeR', lungeR: 'lungeR_la', lk_kopf: 'kopf', kopf: 'kopf_rv', lk_koerper: 'koerper', koerper: 'koerper_rv' };
  const teilchen = [];
  for (let i = 0; i < 90; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff })); wurzel.add(m);
    const startWege = Object.keys(W); teilchen.push({ m, weg: startWege[i % startWege.length], u: Math.random() });
  }
  const weiter = w => folge[w] || (w === 'lungeL_la' || w === 'lungeR_la' ? 'la_lk' : w === 'la_lk' ? (Math.random() < 0.35 ? 'lk_kopf' : 'lk_koerper') : w === 'kopf_rv' || w === 'koerper_rv' ? 'ra_rk' : (Math.random() < 0.5 ? 'rv_lungeL' : 'rv_lungeR'));
  void ROUTE;
  function fliessen(dt, z) {
    const puls = z.dia ? 0.7 : 1.8;
    for (const p of teilchen) {
      const k = kurven[p.weg], len = k.c.getLength();
      p.u += (p.weg.includes('lunge') && !p.weg.includes('_') || p.weg === 'kopf' || p.weg === 'koerper' ? 0.9 : 2.2 * puls) * dt / len;
      if (p.u >= 1) { p.u = 0; p.weg = weiter(p.weg); }
      const kk = kurven[p.weg]; p.m.position.copy(kk.c.getPointAt(p.u));
      p.m.material.color.copy(kk.a === kk.b ? (kk.a ? rotC : blauC) : blauC.clone().lerp(rotC, kk.a < kk.b ? p.u : 1 - p.u));
    }
    const s = 1 - 0.12 * (1 - z.c) / 0.26; herz[1].scale.setScalar(s); herz[3].scale.setScalar(s);
  }
  linie('Lunge', V(-3.4, 7.6, 0), V(-7.2, 9.4, 0)); linie('Lunge', V(3.4, 7.6, 0), V(7.2, 9.4, 0));
  linie('Kopf und Gehirn', V(0, 12.4, 0), V(4.6, 13.2, 0)); linie('Körperorgane\nund Muskeln', V(-2.6, -8.4, 0), V(-6.8, -9.6, 0));
  linie('Herz', V(-1.5, 0, 0), V(-5.6, -0.6, 0));
  schild('Lungenkreislauf\n(kleiner Kreislauf)', '#1f2937', 0.6, V(0, 8.0, 1.5));
  schild('Körperkreislauf\n(großer Kreislauf)', '#1f2937', 0.6, V(4.8, -4.4, 1.5));
  linie('Aorta', V(1.9, -3.8, 0.4), V(6.2, -1.8, 0), '#991b1b'); linie('Hohlvene', V(-1.9, -3.8, -0.4), V(-6.4, -3.6, 0), '#1e3a8a');
  linie('Lungenarterie', V(-1.6, 2.6, 0.5), V(-7.0, 3.0, 0), '#1e3a8a'); linie('Lungenvene', V(1.6, 2.6, -0.5), V(6.9, 3.0, 0), '#991b1b');
  return { formen: () => {}, fliessen, phase: {} };
}

// =====================================================================
export function erzeuge(st) {
  const wurzel = new THREE.Group(), etik = new THREE.Group(); wurzel.add(etik);
  const schild = (t, f, h, p) => { const s = textSprite(t, f, h); s.position.copy(p); etik.add(s); return s; };
  const linie = (t, anker, ziel, farbe = '#1f2937') => { schild(t, farbe, 0.72, ziel); etik.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([anker, ziel]), new THREE.LineBasicMaterial({ color: 0x334155 }))); };
  const ans = st.ansicht === 'kreislauf' ? kreislauf(wurzel, st, schild, linie) : herzAnsicht(wurzel, st, schild, linie);
  etik.visible = st.beschriftung;
  const phaseSchild = new THREE.Sprite(new THREE.SpriteMaterial({ depthTest: false, transparent: true })); phaseSchild.renderOrder = 12; wurzel.add(phaseSchild);
  phaseSchild.position.set(0, st.ansicht === 'kreislauf' ? -11.4 : -12.2, 0);
  let zeit = st._zeit || 0, letzte = null, erg;
  const PHASE = {
    true: ['Diastole: Die Kammern entspannen sich und füllen sich mit Blut', 'Segelklappen offen, Taschenklappen geschlossen'],
    false: ['Systole: Die Kammern ziehen sich zusammen', 'Segelklappen geschlossen, Taschenklappen offen – Blut strömt in Aorta und Lungenarterie'],
  };
  const setzePhase = dia => {
    const s = textSprite(PHASE[dia].join('\n'), dia ? '#1d4ed8' : '#b91c1c', 0.7);
    if (phaseSchild.material.map) phaseSchild.material.map.dispose();
    phaseSchild.material.map = s.material.map; phaseSchild.scale.copy(s.scale); phaseSchild.material.needsUpdate = true;
  };
  const info = () => [
    st.ansicht === 'kreislauf'
      ? '<b>Doppelter Blutkreislauf</b> · <span style="color:#d62828">●</span> sauerstoffreich · <span style="color:#2f5fd0">●</span> sauerstoffarm'
      : '<b>Herz im Längsschnitt (von vorne)</b> · Die rechte Herzhälfte des Menschen ist im Bild links. <span style="color:#2f5fd0">●</span> sauerstoffarmes, <span style="color:#d62828">●</span> sauerstoffreiches Blut',
    st.ansicht === 'kreislauf'
      ? '<i>Das Herz pumpt das Blut durch zwei Kreisläufe: Die rechte Herzhälfte schickt sauerstoffarmes Blut durch die Lungenarterie in die Lunge (Lungenkreislauf). Dort gibt es Kohlenstoffdioxid ab und nimmt Sauerstoff auf. Über die Lungenvenen kommt es zur linken Herzhälfte, die es durch die Aorta in den ganzen Körper pumpt (Körperkreislauf). In den feinen Haargefäßen (Kapillaren) der Organe gibt es Sauerstoff und Nährstoffe ab und fließt durch die Hohlvenen zurück zum Herzen. Arterien führen vom Herzen weg, Venen zum Herzen hin. Ein erwachsenes Herz schlägt etwa 70-mal pro Minute und pumpt dabei rund 5 Liter Blut – einmal durch den ganzen Körper in etwa einer Minute.</i>'
      : '<i>Das Herz ist ein Hohlmuskel mit vier Räumen. Die Herzscheidewand trennt die rechte Hälfte (sauerstoffarmes Blut aus dem Körper) von der linken (sauerstoffreiches Blut aus der Lunge). Die Vorhöfe sammeln das Blut, die Kammern pumpen es hinaus – die linke Kammer hat die dickste Wand, weil sie das Blut durch den ganzen Körper drücken muss. Ventile sorgen dafür, dass das Blut nur in eine Richtung fließt: Segelklappen zwischen Vorhöfen und Kammern (Sehnenfäden verhindern das Durchschlagen), Taschenklappen am Ausgang zu Lungenarterie und Aorta. Der Herzschlag ist hier auf ein Drittel verlangsamt.</i>',
  ].join('<br>');
  erg = {
    objekt: wurzel, radius: st.ansicht === 'kreislauf' ? 12.5 : 12.8, titel: `Herz – ${ANSICHTEN[st.ansicht]}`, info: info(),
    update: dt => {
      if (st.bewegung) { zeit += dt; st._zeit = zeit; }
      const z = zyklus(zeit);
      ans.formen(z); if (st.bewegung) ans.fliessen(Math.min(dt, 0.05), z);
      if (z.dia !== letzte) { letzte = z.dia; setzePhase(z.dia); }
    },
  };
  erg.update(0);
  return erg;
}
export const entsorge = entsorgeObj;
export function ausUrl(p) { const st = standard(); if (ANSICHTEN[p.get('v')]) st.ansicht = p.get('v'); return st; }
export const zuUrl = st => `&v=${st.ansicht}`;
export function bedienung(ort, st, neu) {
  stil(); ort.innerHTML = '';
  const s = document.createElement('select'); for (const [k, v] of Object.entries(ANSICHTEN)) s.add(new Option(v, k)); ort.appendChild(s);
  const knopf = t => { const b = document.createElement('button'); b.textContent = t; ort.appendChild(b); return b; };
  const bSchild = knopf('Beschriftung'), bBew = knopf('Herzschlag');
  const auff = () => { s.value = st.ansicht; bSchild.classList.toggle('on', st.beschriftung); bBew.classList.toggle('on', st.bewegung); };
  s.onchange = () => { st.ansicht = s.value; auff(); neu(); };
  bSchild.onclick = () => { st.beschriftung = !st.beschriftung; auff(); neu(); };
  bBew.onclick = () => { st.bewegung = !st.bewegung; auff(); };
  auff();
}
