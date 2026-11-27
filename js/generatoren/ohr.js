// Ohr-Generator: rechtes Ohr im Frontalschnitt (von vorne; außen = links, innen = rechts), Maße in mm.
// Gehörgang ca. 25 mm, Trommelfell Ø ca. 9 mm, Gehörknöchelchen Hammer–Amboss–Steigbügel, Schnecke mit 2¾ Windungen,
// drei Bogengänge, Hörnerv, Ohrtrompete. Schallweg animiert (stark verlangsamt, Schwingungen übertrieben).
// Zweite Ansicht: abgerollte Schnecke (ca. 35 mm) mit Wanderwelle auf der Basilarmembran; der Ort des Maximums
// hängt von der Tonhöhe ab (Greenwood-Funktion: hohe Töne am Anfang, tiefe an der Spitze).
import * as THREE from 'three';
import { textSprite, entsorge as entsorgeObj, stil } from './hilfen.js';

export const ANSICHTEN = { ohr: 'Ohr im Schnitt', schnecke: 'Schnecke abgerollt' };
export const TOENE = { tief: ['tiefer Ton', 200], mittel: ['mittlerer Ton', 1000], hoch: ['hoher Ton', 8000] };
export const standard = () => ({ ansicht: 'ohr', ton: 'mittel', bewegung: false, beschriftung: false });
const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const greenwood = f => Math.log10(f / 165.4 + 0.88) / 2.1;            // Anteil von der Spitze (0) bis zum Anfang (1)

// Querschnittsbild (Gewebe) pro Bildpunkt: Haut/Knorpel, Knochen (Felsenbein), Luft, Flüssigkeit
const kanal = x => 1.2 * Math.sin((x + 28) / 28 * Math.PI) - 0.6;    // Mittellinie des Gehörgangs (leicht S-förmig)
function gewebe(x, y) {
  if (x > -30 && x < 0.3 && Math.abs(y - kanal(x)) < 3.5 + (x < -20 ? (x + 20) * -0.15 : 0)) return null;                 // Gehörgang (Luft)
  if (x >= 0.3 && x < 7.5 && y > -7 && y < 11 && !(x > 5.8 && y < -3)) return null;                                     // Paukenhöhle (Luft)
  { const t = (y + 7) / -22; if (t > 0 && t < 1) { const cx = 3 + 13 * t; if (Math.abs(x - cx) < 1.2 + 2.5 * t) return null; } }   // Ohrtrompete
  if (x < -14) return y > -22 && y < 22 ? [232, 190, 165] : null;                                                       // Haut und Knorpel
  return [214, 204, 180];                                                                                               // Schläfenbein
}

function ohrAnsicht(wurzel, st, schild) {
  const mat = o => new THREE.MeshStandardMaterial({ roughness: 0.55, ...o });
  const bewegt = [];
  // ---------- Schnittbild als Hintergrund (z = −3) ----------
  {
    const X0 = -44, X1 = 30, Y0 = -30, Y1 = 26, W = 740, H = 560;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'), bild = g.createImageData(W, H);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const x = X0 + (X1 - X0) * (i + 0.5) / W, y = Y1 - (Y1 - Y0) * (j + 0.5) / H, c = gewebe(x, y), o = 4 * (j * W + i);
      if (c) { const n = 1 + 0.04 * Math.sin(x * 3.1 + y * 2.3) * Math.cos(x * 1.7 - y * 4.1); bild.data[o] = c[0] * n; bild.data[o + 1] = c[1] * n; bild.data[o + 2] = c[2] * n; bild.data[o + 3] = 255; }
    }
    g.putImageData(bild, 0, 0);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    const ebene = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, Y1 - Y0), new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.5 }));
    ebene.position.set((X0 + X1) / 2, (Y0 + Y1) / 2, -3); wurzel.add(ebene);
  }
  // ---------- Ohrmuschel (im Schnitt) ----------
  {
    const f = new THREE.Shape(); f.moveTo(-30, 4); f.bezierCurveTo(-40, 8, -44, 22, -34, 25); f.bezierCurveTo(-28, 27, -26, 18, -30, 14); f.bezierCurveTo(-33, 11, -34, 8, -31, 6);
    f.lineTo(-29.5, 4.5);
    const f2 = new THREE.Shape(); f2.moveTo(-30, -4); f2.bezierCurveTo(-38, -8, -40, -18, -33, -22); f2.bezierCurveTo(-28, -24, -27, -18, -30, -15); f2.bezierCurveTo(-32, -12, -32, -8, -29.5, -5.5); f2.lineTo(-30, -4);
    for (const s of [f, f2]) { const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 5, bevelEnabled: true, bevelThickness: 1, bevelSize: 0.8, bevelSegments: 2 }), mat({ color: 0xe8b394 })); m.position.z = -4; wurzel.add(m); }
  }
  // ---------- Trommelfell (schräg, kegelförmig nach innen gewölbt) ----------
  const trommel = new THREE.Group(); trommel.position.set(0.2, kanal(0), 0); trommel.rotation.z = -0.5; wurzel.add(trommel);
  { const g = new THREE.ConeGeometry(4.5, 1.2, 40, 1, true); g.rotateZ(-Math.PI / 2); g.translate(0.6, 0, 0); trommel.add(new THREE.Mesh(g, mat({ color: 0xf5d0b0, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }))); }
  // ---------- Gehörknöchelchen ----------
  const knochen = mat({ color: 0xf2ead2, roughness: 0.45 });
  const kette = new THREE.Group(); wurzel.add(kette);
  const drehpunkt = V(3.6, 7.2, 0);                                     // gemeinsame Drehachse von Hammer und Amboss
  const hammerAmboss = new THREE.Group(); hammerAmboss.position.copy(drehpunkt); kette.add(hammerAmboss);
  const rel = p => p.clone().sub(drehpunkt);
  const stab = (a, b, r, g) => { const d = b.clone().sub(a), c = new THREE.Mesh(new THREE.CapsuleGeometry(r, d.length(), 6, 12), knochen); c.position.copy(a).addScaledVector(d, 0.5); c.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); g.add(c); };
  const kopf = (p, r, g, s = [1, 1, 1]) => { const k = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), knochen); k.position.copy(p); k.scale.set(...s); g.add(k); };
  kopf(rel(V(2.4, 8.2)), 1.5, hammerAmboss, [1, 1.2, 1]); stab(rel(V(2.2, 7)), rel(V(1.0, 0.4)), 0.45, hammerAmboss);           // Hammer: Kopf und Griff am Trommelfell
  kopf(rel(V(4.6, 7.8)), 1.4, hammerAmboss, [1.1, 0.9, 1]); stab(rel(V(4.8, 6.6)), rel(V(5.3, 2.6)), 0.38, hammerAmboss);       // Amboss: Körper und langer Fortsatz
  const steig = new THREE.Group(); kette.add(steig);                                                                             // Steigbügel
  stab(V(5.4, 2.4), V(8.3, 2.9), 0.25, steig); stab(V(5.4, 2.0), V(8.3, 1.3), 0.25, steig);
  { const p = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.35, 20), knochen); p.rotation.z = Math.PI / 2; p.position.set(8.5, 2.1, 0); steig.add(p); }
  // ---------- Innenohr: Vorhof, Bogengänge, Schnecke, Hörnerv ----------
  const fluess = mat({ color: 0x7fb7e8, roughness: 0.3 }), haut = mat({ color: 0x60a5fa });
  { const v = new THREE.Mesh(new THREE.SphereGeometry(2.4, 20, 14), fluess); v.position.set(11, 3, 0); v.scale.set(1.2, 1.4, 1); wurzel.add(v); }
  for (const [rot, pos] of [[[0, 0, 0], [12, 9.5, 0]], [[Math.PI / 2, 0, 0], [14.5, 6.5, 0]], [[0, Math.PI / 2, 0], [10.5, 7.5, -1.5]]]) {
    const b = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.5, 10, 40, Math.PI * 1.7), fluess); b.rotation.set(...rot); b.position.set(...pos); wurzel.add(b);
  }
  // Schnecke: 2¾ Windungen um eine geneigte Achse
  {
    const pts = [], c = V(15.5, -3.5, 0), n = 2.75;
    for (let i = 0; i <= 220; i++) { const u = i / 220, w = u * n * Math.PI * 2, r = 4.6 * (1 - 0.72 * u); pts.push(V(r * Math.cos(w), 4.5 * u, r * Math.sin(w))); }
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 400, 1, 12);
    const P = g.attributes.position;                                      // Röhre verjüngt sich zur Spitze
    for (let i = 0; i < P.count; i++) { const k = Math.floor(i / 13) / 400, q = pts[Math.min(220, Math.round(k * 220))], v = V(P.getX(i), P.getY(i), P.getZ(i)).sub(q).multiplyScalar(1.15 - 0.6 * k); P.setXYZ(i, q.x + v.x, q.y + v.y, q.z + v.z); }
    g.computeVertexNormals();
    const s = new THREE.Mesh(g, fluess); s.position.copy(c); s.rotation.set(0.4, 0, -Math.PI / 2 - 0.25); wurzel.add(s);
    const welle = new THREE.Mesh(new THREE.TorusGeometry(4.4, 0.32, 8, 40), haut); welle.position.copy(c); welle.rotation.copy(s.rotation); welle.rotateX(Math.PI / 2); wurzel.add(welle);
    bewegt.push(t => { const a = 0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 0.6 - 2); welle.material.emissive = new THREE.Color(0x1d4ed8); welle.material.emissiveIntensity = a; });
  }
  { const pts = [V(17, -1, 0), V(21, 1, 0), V(28, 2, 0)]; wurzel.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 1.2, 10), mat({ color: 0xfde68a }))); }
  // ---------- Schall: Wellenfronten, Trommelfell schwingt, Knöchelchen hebeln, Steigbügel drückt aufs ovale Fenster ----------
  const welleM = new THREE.MeshBasicMaterial({ color: 0x2563eb, transparent: true, opacity: 0.6 });
  for (let i = 0; i < 6; i++) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(6, 0.25, 6, 40, Math.PI * 0.8), welleM); r.rotation.z = Math.PI * 0.6; wurzel.add(r);
    bewegt.push(t => { const u = (t * 0.6 + i / 6) % 1, x = -60 + 32 * u; r.position.set(x, kanal(Math.max(-28, x)), 0); r.scale.setScalar(1.2 - 0.6 * u); r.visible = x < -27; });
  }
  for (let i = 0; i < 5; i++) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.2, 6, 30, Math.PI * 0.9), welleM); r.rotation.z = Math.PI * 0.55; wurzel.add(r);
    bewegt.push(t => { const u = (t * 0.6 + i / 5) % 1, x = -28 + 27 * u; r.position.set(x, kanal(x), 0); });
  }
  bewegt.push(t => {
    const s = Math.sin(t * 2 * Math.PI * 0.6);
    trommel.position.x = 0.2 + 0.35 * s; hammerAmboss.rotation.z = 0.06 * s; steig.position.x = 0.3 * s;
  });
  // Bereiche und Beschriftung
  const band = (x0, x1, txt, farbe) => { const b = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 - 0.6, 1.2), new THREE.MeshBasicMaterial({ color: farbe })); b.position.set((x0 + x1) / 2, 29, 0); wurzel.add(b); const s = textSprite(txt, '#fff', 1.9, `#${farbe.toString(16).padStart(6, '0')}`); s.position.set((x0 + x1) / 2, 31.5, 0); wurzel.add(s); };
  band(-44, 0, 'Außenohr', 0xb45309); band(0, 8, 'Mittelohr', 0x15803d); band(8, 30, 'Innenohr', 0x1d4ed8);
  schild('Ohrmuschel', V(-38, 16, 1), V(-44, 23, 2));
  schild('Gehörgang', V(-15, kanal(-15), 0), V(-20, -16, 2));
  schild('Trommelfell', V(0.4, -3, 0.5), V(-6, -24, 2));
  schild('Hammer', V(2.2, 8.6, 1.5), V(-6, 18, 2));
  schild('Amboss', V(4.8, 8.6, 1.5), V(2, 22, 2));
  schild('Steigbügel', V(7.5, 2.5, 1), V(5, -15, 2));
  schild('ovales Fenster', V(9.1, 2.1, 0.5), V(16, -20, 2));
  schild('Paukenhöhle (Luft)', V(3, -4, 0), V(-6, -28, 2));
  schild('Ohrtrompete\n(zum Rachen)', V(10, -18, 0), V(20, -26, 2));
  schild('Bogengänge\n(Gleichgewicht)', V(13, 11.5, 1), V(22, 20, 2));
  schild('Schnecke\n(Hörsinneszellen)', V(17, -5, 2), V(28, -12, 2));
  schild('Hörnerv', V(25, 1.8, 1), V(29, 8, 2));
  return bewegt;
}

function schneckeAnsicht(wurzel, st, schild) {
  const mat = o => new THREE.MeshStandardMaterial({ roughness: 0.5, ...o });
  const bewegt = [], L = 35, f = TOENE[st.ton][1], spitzeAnteil = greenwood(f), xMax = L * (1 - spitzeAnteil);
  // Gehäuse: zwei Gänge (oben Vorhoftreppe, unten Paukentreppe), an der Spitze verbunden; halb durchsichtig
  const gang = (y, farbe) => { const g = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.6, L, 24, 1, true), mat({ color: farbe, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false })); g.rotation.z = Math.PI / 2; g.position.set(L / 2, y, 0); wurzel.add(g); };
  gang(2.6, 0x7fb7e8); gang(-2.6, 0x7fb7e8);
  // Basilarmembran: am Anfang schmal und steif, zur Spitze breiter und weicher
  const N = 140, M = 8, geo = new THREE.PlaneGeometry(L, 1, N, M); geo.rotateX(-Math.PI / 2); geo.translate(L / 2, 0, 0);
  const P = geo.attributes.position, basis = P.array.slice();
  for (let i = 0; i < P.count; i++) { const x = basis[3 * i], b = 0.5 + 2.6 * x / L; P.setZ(i, basis[3 * i + 2] * b); }
  const membran = new THREE.Mesh(geo, mat({ color: 0xf59e0b, side: THREE.DoubleSide })); wurzel.add(membran);
  const z0 = P.array.slice();
  // Haarsinneszellen als Reihe, leuchten am Ort der größten Auslenkung
  const zellen = [];
  for (let i = 0; i < 46; i++) { const x = (i + 0.5) / 46 * L, c = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.9, 8), mat({ color: 0x16a34a })); c.position.set(x, 0.5, 0); wurzel.add(c); zellen.push(c); }
  // Wanderwelle: Hüllkurve steigt langsam bis xMax und fällt danach steil ab
  const huelle = x => x < xMax ? Math.pow(x / xMax, 2.2) : Math.exp(-(((x - xMax) / 2.2) ** 2));
  bewegt.push(t => {
    for (let i = 0; i < P.count; i++) { const x = z0[3 * i], y = 1.3 * huelle(x) * Math.sin(x * 2 * Math.PI / 3 * 0.9 - t * 5); P.setY(i, y); }
    P.needsUpdate = true; geo.computeVertexNormals();
    for (const c of zellen) { const h = huelle(c.position.x); c.position.y = 0.5 + 1.3 * h * Math.sin(c.position.x * 2 * Math.PI / 3 * 0.9 - t * 5); c.material.emissive = new THREE.Color(0x22c55e); c.material.emissiveIntensity = h > 0.75 ? 0.9 : 0; }
  });
  // Ovales und rundes Fenster, Steigbügel
  const fenster = (y, txt) => { const r = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.18, 8, 24), mat({ color: 0x1e3a8a })); r.rotation.y = Math.PI / 2; r.position.set(-0.2, y, 0); wurzel.add(r); return r; };
  fenster(2.6); fenster(-2.6);
  const steig = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.4, 20), mat({ color: 0xf2ead2 })); steig.rotation.z = Math.PI / 2; wurzel.add(steig);
  bewegt.push(t => steig.position.set(-0.6 + 0.25 * Math.sin(t * 5), 2.6, 0));
  // Hörnerv: Fasern von den Sinneszellen
  { const pts = []; for (let i = 0; i < 46; i += 3) { const x = (i + 0.5) / 46 * L; pts.push(V(x, 0.2, -1.6), V(x * 0.5 + 6, -6, -3)); } wurzel.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xca8a04 }))); }
  // Skala der Frequenzen entlang der Schnecke
  for (const fr of [20000, 8000, 2000, 1000, 500, 200, 50]) { const x = L * (1 - greenwood(fr)), t = textSprite(fr >= 1000 ? `${fr / 1000} kHz` : `${fr} Hz`, '#334155', 0.75); t.position.set(x, -5.6, 2); wurzel.add(t); const s = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.1), new THREE.MeshBasicMaterial({ color: 0x334155 })); s.position.set(x, -4.7, 2); wurzel.add(s); }
  schild('Steigbügel am ovalen Fenster', V(-0.6, 3.4, 0), V(-4, 9, 0));
  schild('rundes Fenster', V(-0.2, -3.6, 0), V(-5, -9, 0));
  schild('Basilarmembran mit\nHaarsinneszellen', V(8, 0.4, 1), V(8, 9, 0));
  schild(`größte Auslenkung beim\n${TOENE[st.ton][0]} (${f >= 1000 ? f / 1000 + ' kHz' : f + ' Hz'})`, V(xMax, 1.6, 0), V(Math.min(30, Math.max(6, xMax)), 12.5, 0), '#b45309');
  schild('Schneckenspitze', V(L, 0, 0), V(L + 2, -9, 0));
  schild('Hörnerv', V(14, -5, -2.6), V(18, -10, 0));
  wurzel.position.x = -L / 2;
  return bewegt;
}

export function erzeuge(st) {
  const wurzel = new THREE.Group(), etik = new THREE.Group(); wurzel.add(etik);
  const ohr = st.ansicht === 'ohr';
  const schild = (txt, a, z, farbe = '#1f2937') => { const s = textSprite(txt, farbe, ohr ? 2.1 : 1.1); s.position.copy(z); etik.add(s); const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, z]), new THREE.LineBasicMaterial({ color: 0x334155, depthTest: false })); l.renderOrder = 9; etik.add(l); };
  const bewegt = ohr ? ohrAnsicht(wurzel, st, schild) : schneckeAnsicht(wurzel, st, schild);
  etik.visible = st.beschriftung;
  let t = st._zeit || 0; for (const f of bewegt) f(t);
  const info = ohr
    ? 'Schall sind Druckschwankungen der Luft. Die <b>Ohrmuschel</b> fängt sie auf, durch den <b>Gehörgang</b> gelangen sie zum <b>Trommelfell</b> und bringen es zum Schwingen. Im luftgefüllten Mittelohr übertragen die drei kleinsten Knochen des Körpers – <b>Hammer, Amboss und Steigbügel</b> – die Schwingung wie Hebel auf das ovale Fenster und verstärken dabei den Druck etwa 20-fach. Im flüssigkeitsgefüllten <b>Innenohr</b> erzeugt das eine Wanderwelle in der <b>Schnecke</b>; Haarsinneszellen wandeln sie in elektrische Signale um, die der <b>Hörnerv</b> zum Gehirn leitet. Die <b>Bogengänge</b> gehören zum Gleichgewichtsorgan. Die <b>Ohrtrompete</b> verbindet das Mittelohr mit dem Rachen und gleicht den Luftdruck aus (Druck auf den Ohren beim Fliegen). Schwingungen stark verlangsamt und übertrieben.'
    : 'Die Schnecke ist hier „abgerollt“ (eigentlich ca. 35 mm lang, in 2¾ Windungen aufgerollt). Drückt der Steigbügel auf das ovale Fenster, läuft eine Welle durch die Flüssigkeit und bringt die <b>Basilarmembran</b> zum Schwingen. Je nach Tonhöhe ist die Auslenkung an einer anderen Stelle am größten: <b>hohe Töne am Anfang</b> (dort ist die Membran schmal und steif), <b>tiefe Töne an der Spitze</b>. Nur dort werden die Haarsinneszellen stark gereizt – so unterscheidet das Gehirn die Tonhöhen. Der Mensch hört etwa von 20 Hz bis 20 000 Hz; im Alter gehen zuerst die hohen Töne verloren, weil die Sinneszellen am Anfang der Schnecke am meisten beansprucht werden.';
  return {
    objekt: wurzel, radius: ohr ? 38 : 22, titel: `Ohr – ${ANSICHTEN[st.ansicht]}`, info: `<b>Ohr und Hören</b><br><i>${info}</i>`,
    update: dt => { if (!st.bewegung) return; t += Math.min(dt, 0.1); st._zeit = t; for (const f of bewegt) f(t); },
  };
}
export const entsorge = entsorgeObj;
export function ausUrl(p) { const st = standard(); if (ANSICHTEN[p.get('v')]) st.ansicht = p.get('v'); if (TOENE[p.get('t')]) st.ton = p.get('t'); return st; }
export const zuUrl = st => `&v=${st.ansicht}&t=${st.ton}`;
export function bedienung(ort, st, neu) {
  stil(); ort.innerHTML = '';
  const s = document.createElement('select'); for (const [k, v] of Object.entries(ANSICHTEN)) s.add(new Option(v, k)); ort.appendChild(s);
  const sT = document.createElement('select'); for (const [k, [n, f]] of Object.entries(TOENE)) sT.add(new Option(`${n} (${f >= 1000 ? f / 1000 + ' kHz' : f + ' Hz'})`, k)); ort.appendChild(sT);
  const knopf = t => { const b = document.createElement('button'); b.textContent = t; ort.appendChild(b); return b; };
  const bB = knopf('Bewegung'), bS = knopf('Beschriftung');
  const auff = () => { s.value = st.ansicht; sT.value = st.ton; sT.hidden = st.ansicht !== 'schnecke'; bB.classList.toggle('on', st.bewegung); bS.classList.toggle('on', st.beschriftung); };
  s.onchange = () => { st.ansicht = s.value; auff(); neu(); };
  sT.onchange = () => { st.ton = sT.value; auff(); neu(); };
  bB.onclick = () => { st.bewegung = !st.bewegung; auff(); };
  bS.onclick = () => { st.beschriftung = !st.beschriftung; auff(); neu(); };
  auff();
}
