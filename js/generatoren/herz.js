// Herz-Generator: Herz im Frontalschnitt mit animiertem Herzschlag und doppelter Blutkreislauf.
// Maße in cm (Herz ≈ 12 cm). Ansicht von vorne: die rechte Herzhälfte des Menschen liegt im Bild links.
// Herzzyklus (verlangsamt auf 3,2 s): Diastole – Segelklappen offen, Kammern füllen sich (am Ende Vorhofkontraktion);
// Systole – Segelklappen zu, Taschenklappen offen, Kammern ziehen sich zusammen.
import * as THREE from 'three';
import { textSprite, entsorge as entsorgeObj, stil } from './hilfen.js';

export const ANSICHTEN = { herz: 'Herz im Schnitt', kreislauf: 'Blutkreislauf' };
export const standard = () => ({ ansicht: 'herz', beschriftung: false, bewegung: false, tempo: 1 });
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

// ---------- Formen im Schnitt (Frontalschnitt, Maße in cm, Blick von vorne: rechte Herzhälfte im Bild links) ----------
const glattZu = (pts, n) => new THREE.CatmullRomCurve3(pts.map(([x, y]) => V(x, y)), true, 'centripetal').getSpacedPoints(n).slice(0, n).map(p => [p.x, p.y]);
// Außenumriss: breite Basis oben (Vorhöfe), Spitze unten rechts (linke Kammer bildet die Herzspitze)
const UMRISS = [[-4.7, 3.8], [-2.8, 4.45], [-1.5, 4.7], [1.5, 4.7], [3.2, 4.4], [4.9, 3.6], [5.9, 0.5], [5.7, -3.2], [4.5, -6.4], [2.9, -8.4], [1.6, -8.4], [0.4, -7.6], [-2.2, -5.7], [-4.5, -2.7], [-5.3, 0.6]];
// rechter Hohlraum: rechter Vorhof – Segelklappe – rechte Kammer – Ausflussbahn bis zur Taschenklappe der Lungenarterie
const RECHTS = [[-2.8, 3.95], [-1.85, 3.35], [-1.75, 1.6], [-1.8, 0.95], [-1.5, 0.62], [-1.2, 0.95], [-1.15, 3.3], [-1.12, 4.2], [-0.45, 4.2], [-0.42, 3.3], [-0.45, 0.6], [-0.55, -1.5], [-0.8, -4.0], [-1.6, -5.25], [-3.2, -4.0], [-4.2, -1.5], [-4.2, 0.0], [-4.0, 0.7], [-4.5, 1.6], [-4.3, 3.3]];
// linker Hohlraum: linker Vorhof – Segelklappe – linke Kammer (dicke Wand) – Ausflussbahn bis zur Aortenklappe
const LINKS = [[1.75, 3.35], [3.5, 3.9], [4.55, 2.9], [4.5, 1.4], [4.35, 0.8], [4.45, -0.2], [4.55, -2.0], [3.85, -4.8], [2.7, -6.55], [1.75, -5.5], [1.15, -2.6], [0.6, -0.6], [0.15, 0.4], [0.12, 3.3], [0.15, 4.2], [0.85, 4.2], [0.88, 3.3], [0.85, 1.4], [1.0, 0.95], [1.45, 0.82], [1.6, 1.5]];
const KLAPPEN = {                                   // Scharniere der Klappen (Lage in der Schnittebene)
  tri: [[-4.0, 0.7], [-1.5, 0.62]], mit: [[4.35, 0.8], [1.45, 0.82]],
  pul: [[-1.12, 3.9], [-0.45, 3.9]], aor: [[0.15, 3.9], [0.85, 3.9]],
};
const ZR = [-2.4, -2.3], ZL = [2.9, -2.9];          // Mittelpunkte der Kammern (für das Zusammenziehen)

// Verformung im Herzzyklus: Kammern ziehen sich zur Mitte zusammen (Wand wird dicker, Spitze hebt sich), Vorhöfe leicht
function verformer(z) {
  const kammer = 1 - z.c, vorhof = 1 - z.a;
  return (x, y, innen) => {
    const w = glatt(Math.min(1, Math.max(0, (0.9 - y) / 1.6)));          // 1 in den Kammern, 0 in den Vorhöfen
    const zc = x < 0.3 ? ZR : ZL, f = 1 - (innen ? 1.0 : 0.38) * kammer * w;
    let nx = zc[0] + (x - zc[0]) * f, ny = zc[1] + (y - zc[1]) * f;
    const wa = 1 - w, za = x < 0.3 ? [-3.0, 2.3] : [3.1, 2.4], fa = 1 - (innen ? 1.2 : 0.4) * vorhof * wa;
    nx = za[0] + (nx - za[0]) * fa; ny = za[1] + (ny - za[1]) * fa;
    return [nx, ny];
  };
}
// Rückseite des Herzens: gewölbte Hälfte über dem (sternförmigen) Umriss
function wolbung(umriss, c, D, nS = 14) {
  const n = umriss.length, pos = [], idx = [];
  for (let s = 0; s <= nS; s++) {
    const u = s / nS, r = Math.sin(u * Math.PI / 2), z = -D * Math.cos(u * Math.PI / 2);
    for (let i = 0; i < n; i++) { const [x, y] = umriss[i]; pos.push(c[0] + (x - c[0]) * r, c[1] + (y - c[1]) * r, z); }
  }
  for (let s = 0; s < nS; s++) for (let i = 0; i < n; i++) { const a = s * n + i, b = s * n + (i + 1) % n, c2 = a + n, d = b + n; idx.push(a, c2, b, b, c2, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

// =====================================================================
function herzAnsicht(wurzel, st, schild, linie) {
  const mat = (farbe, o = {}) => new THREE.MeshStandardMaterial({ color: farbe, roughness: 0.6, ...o });
  const umriss = glattZu(UMRISS, 160), rechts = glattZu(RECHTS, 150), links = glattZu(LINKS, 150);
  const herz = new THREE.Group(); wurzel.add(herz);
  // Muskelstruktur auf der Schnittfläche
  const muskelTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#cf5a50'; g.fillRect(0, 0, 256, 256); let s = 3; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; for (let i = 0; i < 500; i++) { g.strokeStyle = `rgba(${150 + r() * 60},${40 + r() * 30},${40 + r() * 20},0.45)`; g.lineWidth = 1 + r() * 2; g.beginPath(); const x = r() * 256, y = r() * 256, w = r() * 6.3; g.moveTo(x, y); g.lineTo(x + Math.cos(w) * 18, y + Math.sin(w) * 18); g.stroke(); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(0.25, 0.25); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  // 1) Schnittfläche: Herzmuskel mit den beiden Hohlräumen als Löcher
  const form = new THREE.Shape(umriss.map(([x, y]) => new THREE.Vector2(x, y)));
  for (const h of [rechts, links]) form.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))));
  const schnittGeo = new THREE.ShapeGeometry(form); const schnitt = new THREE.Mesh(schnittGeo, mat(0xffffff, { map: muskelTex, roughness: 0.8 })); schnitt.position.z = 0.005; herz.add(schnitt);
  // 2) Rückseite außen (Herzbeutel-Oberfläche) und 3) Innenwände der Hohlräume (von innen gesehen)
  const aussenGeo = wolbung(umriss, [0.3, -1.4], 4.2); herz.add(new THREE.Mesh(aussenGeo, mat(0xb8463f, { roughness: 0.45 })));
  const hohl = (pts, farbe, tief) => {
    const f = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
    const g = new THREE.ExtrudeGeometry(f, { depth: tief, bevelEnabled: true, bevelThickness: 0.9, bevelSize: 0.22, bevelSegments: 5, curveSegments: 1 }); g.translate(0, 0, -(tief + 0.9));
    const m = new THREE.Mesh(g, mat(farbe, { side: THREE.BackSide, roughness: 0.7 })); herz.add(m); return g;
  };
  const hohlR = hohl(rechts, 0x4a5aa6, 1.1), hohlL = hohl(links, 0x8e1f2c, 1.1);
  // Innenhaut der Hohlräume und Außenrand als feine helle Linien auf der Schnittfläche
  const randLinien = [umriss, rechts, links].map((pts, i) => { const l = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts.map(([x, y]) => V(x, y, 0.02))), new THREE.LineBasicMaterial({ color: i ? 0xffe4e1 : 0x7f1d1d })); herz.add(l); return l; });
  // Grundlagen für die Verformung merken
  const basis = [schnittGeo, aussenGeo, hohlR, hohlL].map(g => g.attributes.position.array.slice());
  const istInnen = (() => {                      // für Schnittfläche: Punkte der Löcher gehören zur Innenseite
    const P = schnittGeo.attributes.position, alle = new Set([...rechts, ...links].map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`)), r = [];
    for (let i = 0; i < P.count; i++) r.push(alle.has(`${P.getX(i).toFixed(3)},${P.getY(i).toFixed(3)}`));
    return r;
  })();
  // Gefäße (außerhalb des Herzens, hinter der Schnittebene)
  const gefaess = (pts, r, farbe) => { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, r, 20), mat(farbe, { roughness: 0.4 })); wurzel.add(m); return m; };
  const P = {
    oHohl: [V(-3.1, 11, -1.6), V(-3.1, 7, -1.6), V(-3.0, 4.3, -1.5)],
    uHohl: [V(-3.4, -10.5, -5.2), V(-3.6, -4, -5.2), V(-3.4, -0.2, -4.0), V(-3.3, 1.0, -2.9)],
    lungArt: [V(-0.8, 4.3, -0.9), V(-0.9, 6.2, -0.8), V(-0.5, 7.6, -1.4), V(0.4, 8.3, -2.2)],
    lungArtR: [V(0.4, 8.3, -2.2), V(-2.5, 8.5, -3.2), V(-8.5, 7.6, -3.6)],
    lungArtL: [V(0.4, 8.3, -2.2), V(3.0, 8.5, -1.8), V(7.8, 7.6, -1.6)],
    aorta: [V(0.5, 4.3, -1.0), V(0.6, 6.8, -1.0), V(0.8, 9.6, -1.6), V(2.4, 11.0, -2.6), V(4.3, 9.6, -3.6), V(4.6, 5.0, -4.6), V(4.4, -10.5, -4.6)],
    lungVenL1: [V(8.4, 3.6, -1.6), V(4.3, 3.2, -1.4)], lungVenL2: [V(8.4, 1.6, -1.6), V(4.3, 2.0, -1.4)],
    lungVenR1: [V(-8.2, 3.6, -3.8), V(-3, 3.6, -3.8), V(2.4, 3.1, -2.4)], lungVenR2: [V(-8.2, 1.8, -3.8), V(-3, 1.8, -3.8), V(2.4, 2.0, -2.4)],
  };
  const vene = 0x3a5bc7, arterie = 0xc4302b;
  gefaess(P.oHohl, 1.0, vene); gefaess(P.uHohl, 1.1, vene);
  gefaess(P.lungArt, 0.9, vene); gefaess(P.lungArtR, 0.6, vene); gefaess(P.lungArtL, 0.6, vene);
  gefaess(P.aorta, 1.05, arterie);
  for (const [x, y, z] of [[1.3, 10.2, -1.9], [2.4, 10.8, -2.5], [3.5, 10.3, -3.1]]) gefaess([V(x, y - 0.6, z), V(x - 0.1, y + 2.3, z)], 0.34, arterie);
  for (const k of ['lungVenL1', 'lungVenL2', 'lungVenR1', 'lungVenR2']) gefaess(P[k], 0.45, arterie);
  // Herzkranzgefäße auf der Rückseite (sichtbar beim Drehen)
  { const pts = []; for (let i = 0; i <= 20; i++) { const u = i / 20; pts.push(V(4.8 - 2.2 * u, 0.6 - 7.5 * u, -2.6 - 1.2 * Math.sin(u * 3))); } gefaess(pts, 0.14, arterie); }
  // ---------- Klappen ----------
  const klappenM = mat(0xf2dfc2, { side: THREE.DoubleSide, roughness: 0.5 });
  const segel = (x, y, laenge, richtung) => {            // Segelklappe: gebogenes Segel, Scharnier am Klappenring
    const g = new THREE.Group(); g.position.set(x, y, -0.55); herz.add(g);
    const geo = new THREE.PlaneGeometry(laenge, 1.3, 10, 1); const Pq = geo.attributes.position;
    for (let i = 0; i < Pq.count; i++) { const u = (Pq.getX(i) + laenge / 2) / laenge; Pq.setX(i, u * laenge); Pq.setZ(i, -0.2 * Math.sin(u * Math.PI)); }
    geo.rotateX(Math.PI / 2); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, klappenM); m.scale.x = richtung; g.add(m);
    return g;
  };
  const tri = [segel(...KLAPPEN.tri[0], 1.25, 1), segel(...KLAPPEN.tri[1], 1.2, -1)];
  const mit = [segel(...KLAPPEN.mit[0], 1.35, -1), segel(...KLAPPEN.mit[1], 1.4, 1)];
  const tasche = (x, y, richtung) => {                    // Taschenklappe: kleine Tasche an der Gefäßwand
    const g = new THREE.Group(); g.position.set(x, y, -0.5); herz.add(g);
    const geo = new THREE.SphereGeometry(0.36, 16, 8, 0, Math.PI, 0, Math.PI / 2); geo.rotateZ(-Math.PI / 2); geo.scale(1, 1.2, 1.4);
    const m = new THREE.Mesh(geo, klappenM); m.position.x = richtung * 0.3; m.scale.x = richtung; g.add(m); g.userData.r = richtung;
    return g;
  };
  const pul = [tasche(...KLAPPEN.pul[0], 1), tasche(...KLAPPEN.pul[1], -1)];
  const aor = [tasche(...KLAPPEN.aor[0], 1), tasche(...KLAPPEN.aor[1], -1)];
  // Papillarmuskeln und Sehnenfäden
  const papM = mat(0x9a2a2a);
  const papBasis = [[-3.4, -3.6], [-1.2, -4.3], [4.0, -3.9], [2.1, -5.2]];
  const papillen = papBasis.map(() => { const m = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.5, 12), papM); m.position.z = -0.6; herz.add(m); return m; });
  const faeden = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xfaf5ef })); herz.add(faeden);
  function formen(z) {
    const vf = verformer(z);
    // Verformung auf Schnittfläche, Rückseite und Hohlräume anwenden
    [[schnittGeo, 0], [aussenGeo, 1], [hohlR, 2], [hohlL, 3]].forEach(([g, k]) => {
      const A = g.attributes.position, B = basis[k];
      for (let i = 0; i < A.count; i++) { const [x, y] = vf(B[3 * i], B[3 * i + 1], k >= 2 || (k === 0 && istInnen[i])); A.setXY(i, x, y); }
      A.needsUpdate = true; if (k) g.computeVertexNormals();
    });
    randLinien.forEach((l, i) => { const pts = [umriss, rechts, links][i]; const A = l.geometry.attributes.position; pts.forEach(([x, y], k) => { const [nx, ny] = vf(x, y, i > 0); A.setXY(k, nx, ny); }); A.needsUpdate = true; });
    // Klappen: Segel offen = in die Kammer hängend, geschlossen = waagerecht; Taschen offen = an die Wand gelegt
    const segelWinkel = offen => -0.15 - 1.25 * offen;
    tri[0].rotation.z = segelWinkel(z.av); tri[1].rotation.z = -segelWinkel(z.av); mit[0].rotation.z = -segelWinkel(z.av); mit[1].rotation.z = segelWinkel(z.av);
    for (const g of [...pul, ...aor]) g.rotation.z = g.userData.r * (z.sl * 1.3 - 0.1);
    // Papillarmuskeln mit der Kammerwand mitbewegen, Sehnenfäden zu den Segelspitzen
    papBasis.forEach(([x, y], i) => { const [nx, ny] = vf(x, y, true); papillen[i].position.x = nx; papillen[i].position.y = ny; });
    const spitze = (g, laenge, s) => { g.updateMatrix(); return V(laenge * s, 0, 0).applyMatrix4(g.matrix); };
    const pts = [];
    for (const [g, l, s, p] of [[tri[0], 1.25, 1, 0], [tri[1], 1.2, -1, 1], [mit[0], 1.35, -1, 2], [mit[1], 1.4, 1, 3]]) {
      const tip = spitze(g, l, s), q = papillen[p].position.clone().add(V(0, 0.7, 0));
      for (const dz of [-0.45, 0, 0.45]) pts.push(tip.clone().add(V(0, 0, dz)), q);
    }
    faeden.geometry.dispose(); faeden.geometry = new THREE.BufferGeometry().setFromPoints(pts);
  }
  // ---------- Blutteilchen: fließen nur weiter, wenn die Klappe davor offen ist ----------
  const wege = {
    blauO: [[...P.oHohl, V(-3.0, 2.4, -0.8)], 'T', [V(-2.9, 0.3, -0.8), V(-2.6, -2.6, -0.8), V(-1.2, -2.0, -0.8), V(-0.8, 0.5, -0.8), V(-0.8, 3.6, -0.8)], 'P', [V(-0.8, 4.4, -0.9), ...P.lungArt.slice(1)], 'Lunge'],
    blauU: [[...P.uHohl, V(-3.3, 1.6, -0.8)], 'T', [V(-3.0, 0.2, -0.8), V(-3.0, -3.2, -0.8), V(-1.3, -2.6, -0.8), V(-0.8, 0.5, -0.8), V(-0.8, 3.6, -0.8)], 'P', [V(-0.8, 4.4, -0.9), ...P.lungArt.slice(1)], 'Lunge'],
    rotL: [[...P.lungVenL1, V(3.2, 2.3, -0.8)], 'M', [V(3.0, 0.2, -0.8), V(3.1, -3.6, -0.8), V(1.6, -2.4, -0.8), V(0.5, 0.6, -0.8), V(0.5, 3.6, -0.8)], 'A', [V(0.5, 4.4, -1.0), ...P.aorta.slice(1)]],
    rotR: [[...P.lungVenR1, V(3.0, 2.6, -0.8)], 'M', [V(2.6, 0.2, -0.8), V(2.6, -4.4, -0.8), V(1.5, -2.6, -0.8), V(0.5, 0.6, -0.8), V(0.5, 3.6, -0.8)], 'A', [V(0.5, 4.4, -1.0), ...P.aorta.slice(1)]],
  };
  const lungeL = new THREE.CatmullRomCurve3(P.lungArtL), lungeR = new THREE.CatmullRomCurve3(P.lungArtR);
  const teilchenM = { b: new THREE.MeshBasicMaterial({ color: 0x1e40af }), r: new THREE.MeshBasicMaterial({ color: 0xdc2626 }) };
  const teilchen = [];
  for (const [name, w] of Object.entries(wege)) {
    const abschnitte = [w[0], w[2], w[4]].map(p => new THREE.CatmullRomCurve3(p)), tore = [w[1], w[3]];
    for (let i = 0; i < 16; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), name.startsWith('blau') ? teilchenM.b : teilchenM.r); wurzel.add(m);
      teilchen.push({ m, abschnitte, tore, ab: i % 3, u: Math.random(), ver: V(Math.random() - 0.5, Math.random() - 0.5, (Math.random() - 0.5) * 0.6).multiplyScalar(0.7), extra: name.startsWith('blau') ? (Math.random() < 0.5 ? lungeL : lungeR) : null });
    }
  }
  const torOffen = (tor, z) => (tor === 'T' || tor === 'M') ? z.av > 0.5 : z.sl > 0.5;
  function fliessen(dt, z) {
    for (const p of teilchen) {
      const kurveA = p.ab < 3 ? p.abschnitte[p.ab] : p.extra, len = kurveA.getLength();
      let v = 3.2;
      if (p.ab === 1) v = z.dia ? 1.6 : 7;
      if (p.ab === 2) v = z.dia ? 0.6 : 6;
      p.u += v * dt / len;
      if (p.u >= 1) {
        const tor = p.ab < 2 ? p.tore[p.ab] : null;
        if (tor && !torOffen(tor, z)) p.u = 0.97 + Math.random() * 0.03;
        else if (p.ab === 2 && p.extra) { p.ab = 3; p.u = 0; }
        else if (p.ab >= 2) { p.ab = 0; p.u = 0; }
        else { p.ab++; p.u = 0; }
      }
      const q = (p.ab < 3 ? p.abschnitte[p.ab] : p.extra).getPointAt(Math.min(p.u, 1));
      const breit = p.ab === 1 || (p.ab === 0 && p.u > 0.75) ? 1.2 : 0.4;
      p.m.position.copy(q).addScaledVector(p.ver, breit);
    }
  }
  // ---------- Beschriftung ----------
  linie('rechter Vorhof', V(-3.2, 2.8, 0), V(-9.5, 4.2, 0));
  linie('rechte Kammer', V(-2.6, -3.0, 0), V(-9.5, -3.4, 0));
  linie('linker Vorhof', V(3.3, 2.8, 0), V(9.8, 5.0, 0), '#991b1b');
  linie('linke Kammer\n(dicke Muskelwand)', V(3.0, -3.5, 0), V(9.8, -3.0, 0), '#991b1b');
  linie('Herzscheidewand', V(0.3, -4.0, 0), V(2.4, -10.6, 0));
  linie('Segelklappe', V(-3.4, 0.4, 0), V(-9.5, 0.8, 0));
  linie('Segelklappe', V(3.8, 0.5, 0), V(9.8, 1.0, 0));
  linie('Taschenklappe', V(-0.8, 3.9, 0), V(-6.8, 9.4, 0));
  linie('Taschenklappe', V(0.5, 3.9, 0), V(8.0, 11.6, 0));
  linie('Sehnenfäden', V(-2.6, -1.8, -0.6), V(-9.5, -1.3, 0));
  linie('obere Hohlvene', V(-3.1, 8.5, -1.3), V(-9.0, 10.4, 0), '#1e3a8a');
  linie('untere Hohlvene', V(-3.8, -6.5, -3.4), V(-8.6, -7.8, 0), '#1e3a8a');
  linie('Lungenarterie', V(-0.8, 6.2, -0.8), V(-4.6, 12.4, 0), '#1e3a8a');
  linie('Aorta\n(Hauptschlagader)', V(2.4, 11.0, -2.6), V(4.8, 13.4, 0), '#991b1b');
  linie('Lungenvenen', V(7.4, 3.5, -1.6), V(10.6, 7.2, 0), '#991b1b');
  return { formen, fliessen, phase: {} };
}
// =====================================================================
function kreislauf(wurzel, st, schild, linie) {
  // Organe
  const org = (pos, r, farbe, skal = [1, 1, 1]) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 22), new THREE.MeshStandardMaterial({ color: farbe, roughness: 0.6, transparent: true, opacity: 0.55, depthWrite: false })); m.position.copy(pos); m.scale.set(...skal); wurzel.add(m); return m; };
  org(V(-3.4, 5.6), 1.8, 0xf4a3a8, [0.9, 1.35, 0.8]); org(V(3.4, 5.6), 1.8, 0xf4a3a8, [0.9, 1.35, 0.8]);
  org(V(0, 11.2), 1.4, 0xe9c9a6); org(V(0, -7.6), 2.2, 0xc98b6b, [1.5, 0.8, 0.9]);
  // Herz: vier Räume
  // kleines Herz: rechte Hälfte (im Bild links) blau, linke rot, Herzscheidewand hell
  const herzGr = new THREE.Group(); herzGr.position.set(0, 0.3, 0); wurzel.add(herzGr);
  { const k = 0.25, umr = glattZu(UMRISS, 120).map(([x, y]) => new THREE.Vector2((x - 0.3) * k, (y + 1.6) * k));
    const g = new THREE.ExtrudeGeometry(new THREE.Shape(umr), { depth: 0.9, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.12, bevelSegments: 3 }); g.translate(0, 0, -0.45);
    const P = g.attributes.position, col = [], b = new THREE.Color(BLAU), r = new THREE.Color(ROT), w = new THREE.Color(0xf5e6e6);
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), c = Math.abs(x) < 0.06 ? w : x < 0 ? b : r; col.push(c.r, c.g, c.b); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    herzGr.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45 }))); }
  const herz = [herzGr, herzGr, herzGr, herzGr];
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
    const s = 1 - 0.08 * (1 - z.c) / 0.26; herzGr.scale.setScalar(s);
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
  phaseSchild.position.set(0, st.ansicht === 'kreislauf' ? -11.4 : -12.2, 0); phaseSchild.visible = st.beschriftung;
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
