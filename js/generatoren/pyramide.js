// Cheops-Pyramide (Gizeh, um 2560 v. Chr.) – Maße in Metern nach den Vermessungen (Petrie u. a.), Lage der Innenräume vereinfacht.
// Ansichten: Längsschnitt (Nord–Süd) mit Gängen und Kammern, damals (mit Verkleidung), heute (Stufenkern), Bau (Theorie: umlaufende Rampe).
// Koordinaten: y nach oben, z nach Norden, x nach Osten; Schnitt bei x = 0 (östliche Hälfte entfernt).
import * as THREE from 'three';
import { textSprite, entsorge as entsorgeObj, stil } from './hilfen.js';

const S = 230.33 / 2, H = 146.6, NEIG = Math.atan(H / S);     // halbe Grundseite, Höhe, Neigung (51,8°)
export const ANSICHTEN = { schnitt: 'Längsschnitt – Gänge und Kammern', damals: 'Damals – mit weißer Verkleidung', heute: 'Heute – Stufenkern', bau: 'Bau (Theorie: umlaufende Rampe)' };
export const standard = () => ({ ansicht: 'schnitt', beschriftung: false, bewegung: false });
const rad = THREE.MathUtils.degToRad;

// ---------- Innenräume als Polygone im Schnitt (z, y) und halbe Breite in Ost-West-Richtung ----------
function linie(z0, y0, grad, laenge) { const a = rad(grad); return [z0 + Math.cos(a) * laenge, y0 + Math.sin(a) * laenge]; }
// geneigter Gang: von (z0,y0) mit Winkel grad (0 = nach Norden), Länge l, senkrechte Höhe h
const gang = (z0, y0, grad, l, h) => { const [z1, y1] = linie(z0, y0, grad, l); return [[z0, y0], [z1, y1], [z1, y1 + h], [z0, y0 + h]]; };
const rechteck = (z0, z1, y0, y1) => [[z0, y0], [z1, y0], [z1, y1], [z0, y1]];
function innenraeume() {
  const E = [S - 17 / Math.tan(NEIG), 17];                                  // Eingang in der Nordseite
  const abw = gang(E[0], E[1] - 1.2, 180 + 26.5, 107, 1.2);                  // absteigender Gang (nach Süden, abwärts)
  const unten = linie(E[0], E[1] - 1.2, 180 + 26.5, 107);
  const r = [
    { id: 'abstieg', name: 'absteigender Gang', poly: abw, b: 0.52 },
    { id: 'abstieg2', poly: rechteck(unten[0] - 9, unten[0] + 0.3, unten[1], unten[1] + 1.0), b: 0.45 },
    { id: 'felsen', name: 'Felsenkammer\n(unvollendet)', poly: rechteck(unten[0] - 17.4, unten[0] - 9, unten[1] - 0.5, unten[1] + 3.5), b: 7.0 },
  ];
  const abzweig = linie(E[0], E[1] - 1.2, 180 + 26.5, 28.2);
  const auf = gang(abzweig[0], abzweig[1] + 0.2, 180 - 26, 39.3, 1.2);       // aufsteigender Gang
  const galStart = linie(abzweig[0], abzweig[1] + 0.2, 180 - 26, 39.3);
  r.push({ id: 'aufstieg', name: 'aufsteigender Gang', poly: auf, b: 0.52 });
  // waagerechter Gang zur Königinnenkammer
  r.push({ id: 'waagerecht', poly: rechteck(2.6, galStart[0], galStart[1] - 0.5, galStart[1] + 0.65), b: 0.52 });
  const yQ = galStart[1] - 0.5;
  r.push({ id: 'koenigin', name: 'Königinnenkammer', poly: [[-2.6, yQ], [2.6, yQ], [2.6, yQ + 4.7], [0, yQ + 6.2], [-2.6, yQ + 4.7]], b: 2.87 });
  const galEnde = linie(galStart[0], galStart[1], 180 - 26, 46.7);
  // Große Galerie: nach oben schmaler (Kraggewölbe), deshalb in Schichten
  for (let k = 0; k < 7; k++) {
    const h0 = 8.6 * k / 7, h1 = 8.6 * (k + 1) / 7;
    r.push({ id: 'galerie', name: k === 0 ? 'Große Galerie' : undefined, poly: [[galStart[0], galStart[1] + h0], [galEnde[0], galEnde[1] + h0], [galEnde[0], galEnde[1] + h1], [galStart[0], galStart[1] + h1]], b: 1.03 - k * 0.075, schicht: k });
  }
  const yK = galEnde[1] + 0.8;
  r.push({ id: 'vorkammer', poly: rechteck(-6.2, galEnde[0], yK, yK + 1.1), b: 0.52 });
  r.push({ id: 'vorkammer2', poly: rechteck(-5.0, -2.0, yK, yK + 3.8), b: 0.6 });
  r.push({ id: 'koenig', name: 'Königskammer\n(Granit, mit Sarkophag)', poly: rechteck(-11.43, -6.2, yK, yK + 5.84), b: 5.23 });
  const entl = [];
  for (let k = 0; k < 5; k++) { const y0 = yK + 5.84 + 1.6 + k * 2.4; entl.push(y0); r.push({ id: 'entlastung', name: k === 2 ? 'Entlastungskammern' : undefined, poly: rechteck(-11.43, -6.2, y0, y0 + 0.95), b: 5.23 }); }
  return { raeume: r, E, unten, abzweig, galStart, galEnde, yQ, yK, entl };
}

// Schnittfläche in der Ebene x = 0 (Normale +x): Form-Koordinaten u = −z, v = y
const SCHNITT_BASIS = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0));
const form = poly => new THREE.Shape(poly.map(([z, y]) => new THREE.Vector2(-z, y)));
function schnittflaeche(aussen, loecher, material) {
  const f = form(aussen);
  for (const l of loecher) if (l.length >= 3) f.holes.push(new THREE.Path(l.map(([z, y]) => new THREE.Vector2(-z, y)).reverse()));
  const g = new THREE.ShapeGeometry(f, 4); g.applyMatrix4(SCHNITT_BASIS);
  return new THREE.Mesh(g, material);
}
// ---------- Ansichten ----------
function schnitt(w, st, schild) {
  const kalk = new THREE.MeshStandardMaterial({ color: 0xd9c9a3, roughness: 0.9, side: THREE.DoubleSide });
  const flaecheM = new THREE.MeshStandardMaterial({ color: 0xc9ae80, roughness: 0.95, side: THREE.DoubleSide });
  const fels = new THREE.MeshStandardMaterial({ color: 0xa8916b, roughness: 1, side: THREE.DoubleSide });
  const hohl = new THREE.MeshStandardMaterial({ color: 0x5b4a36, roughness: 1, side: THREE.BackSide });
  const granit = new THREE.MeshStandardMaterial({ color: 0xb4636a, roughness: 0.7, side: THREE.BackSide });
  // westliche Hälfte der Pyramide
  const A = new THREE.Vector3(0, H, 0), dreieck = (a, b, c, m) => { const g = new THREE.BufferGeometry().setFromPoints([a, b, c]); g.computeVertexNormals(); w.add(new THREE.Mesh(g, m)); };
  dreieck(new THREE.Vector3(-S, 0, S), new THREE.Vector3(-S, 0, -S), A, kalk);
  dreieck(new THREE.Vector3(0, 0, S), new THREE.Vector3(-S, 0, S), A, kalk);
  dreieck(new THREE.Vector3(-S, 0, -S), new THREE.Vector3(0, 0, -S), A, kalk);
  const I = innenraeume();
  // Schnittfläche geschlossen; Gänge und Kammern als dunkle Flächen darauf (wie eine Schnittzeichnung)
  w.add(schnittflaeche([[S, 0], [-S, 0], [0, H]], [], flaecheM));
  const T = 45, B = S + 30;
  w.add(schnittflaeche([[B, 0], [B, -T], [-B, -T], [-B, 0]], [], fels));
  const kasten = new THREE.BoxGeometry(B, T, 2 * B); kasten.translate(-B / 2, -T / 2, 0);
  const idx = kasten.index.array, neuIdx = []; for (let i = 0; i < idx.length; i += 3) { const v = kasten.attributes.position; const xs = [idx[i], idx[i + 1], idx[i + 2]].map(k => v.getX(k)); if (!xs.every(x => Math.abs(x) < 1e-6)) neuIdx.push(idx[i], idx[i + 1], idx[i + 2]); }
  kasten.setIndex(neuIdx); w.add(new THREE.Mesh(kasten, fels));
  const raumM = new THREE.MeshBasicMaterial({ color: 0x3b2f22, side: THREE.DoubleSide }), granitM = new THREE.MeshBasicMaterial({ color: 0x9f3a48, side: THREE.DoubleSide });
  for (const r of I.raeume) {
    if (r.id === 'galerie' && r.schicht > 0) continue;
    const poly = r.id === 'galerie' ? [r.poly[0], r.poly[1], I.raeume.filter(x => x.id === 'galerie')[6].poly[2], I.raeume.filter(x => x.id === 'galerie')[6].poly[3]] : r.poly;
    const m = schnittflaeche(poly, [], r.id === 'koenig' || r.id === 'entlastung' ? granitM : raumM); m.position.x = 0.08; w.add(m);
  }
  // Steinlagen auf der Schnittfläche (alle 5 m)
  const lagen = [];
  for (let y = 5; y < H - 2; y += 5) { const halb = S * (1 - y / H); lagen.push(new THREE.Vector3(0.05, y, -halb), new THREE.Vector3(0.05, y, halb)); }
  w.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(lagen), new THREE.LineBasicMaterial({ color: 0xa88d62 })));
  // Kraggewölbe der Galerie: Stufen andeuten
  const stufenM = new THREE.MeshBasicMaterial({ color: 0x6b5a45, side: THREE.DoubleSide });
  for (const r of I.raeume.filter(x => x.id === 'galerie' && x.schicht > 0)) { const m = schnittflaeche([r.poly[0], r.poly[1], [r.poly[1][0], r.poly[1][1] + 0.18], [r.poly[0][0], r.poly[0][1] + 0.18]], [], stufenM); m.position.x = 0.12; w.add(m); }
  // Sarkophag in der Königskammer, Sperrsteine im aufsteigenden Gang
  const sark = new THREE.Mesh(new THREE.BoxGeometry(0.98, 1.05, 2.28), new THREE.MeshStandardMaterial({ color: 0x8b5a5f })); sark.position.set(-4.2, I.yK + 0.53, -8.8); w.add(sark);
  const sperr = new THREE.MeshStandardMaterial({ color: 0xb4636a });
  for (let k = 0; k < 3; k++) { const [z, y] = linie(I.abzweig[0], I.abzweig[1] + 0.2, 180 - 26, 1 + k * 1.7); const s = new THREE.Mesh(new THREE.BoxGeometry(1.04, 1.2, 1.6), sperr); s.position.set(-0.52, y + 0.6 - Math.tan(rad(26)) * 0.8, z - 0.8); s.rotation.x = rad(26); w.add(s); }
  // Schächte und Giebeldach als farbige Linien auf der Schnittfläche
  const linienMat = new THREE.MeshBasicMaterial({ color: 0x0f766e });
  const rohr = (pts, r = 0.35, m = linienMat) => w.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(([z, y]) => new THREE.Vector3(0.4, y, z)), false, 'catmullrom', 0), pts.length * 8, r, 6), m));
  const bisFlaeche = (z0, y0, grad, nord) => { for (let t = 0; t < 200; t += 0.5) { const [z, y] = linie(z0, y0, grad, t); if (y >= H * (1 - Math.abs(z) / S)) return [[z0, y0], [z, y]]; } return [[z0, y0], linie(z0, y0, grad, 100)]; };
  rohr(bisFlaeche(-6.2, I.yK + 1, 32.6, true));
  rohr(bisFlaeche(-11.43, I.yK + 1, 180 - 45, false));
  rohr([[2.6, I.yQ + 1.2], linie(2.6, I.yQ + 1.2, 39.5, 62)]);
  rohr([[-2.6, I.yQ + 1.2], linie(-2.6, I.yQ + 1.2, 180 - 39.5, 62)]);
  const giebel = I.entl[4] + 1.6; rohr([[-13.5, giebel], [-8.8, giebel + 5], [-4.1, giebel]], 0.45, new THREE.MeshBasicMaterial({ color: 0x7c2d12 }));
  rohr([[I.galStart[0] - 0.5, I.galStart[1] - 0.3], [38, 10], [36.5, 0], [30, -10], [21, -20], [I.unten[0] + 3, I.unten[1] + 2]], 0.4, new THREE.MeshBasicMaterial({ color: 0x92400e }));
  // Beschriftungen (rechts vor der Schnittfläche, mit Hinweislinien)
  const zeige = (text, anker, ziel, farbe = '#1f2937') => { if (!st.beschriftung) return; schild(text, farbe, 8, new THREE.Vector3(18, ziel[1], ziel[0])); const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0.5, anker[1], anker[0]), new THREE.Vector3(16, ziel[1], ziel[0])]); w.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0x334155 }))); };
  zeige('Eingang (17 m hoch)', I.E, [I.E[0] + 22, I.E[1] - 12]);
  zeige('absteigender Gang', linie(I.E[0], I.E[1], 180 + 26.5, 60), [70, -38]);
  zeige('Felsenkammer\n(30 m unter dem Boden, unvollendet)', [I.unten[0] - 13, I.unten[1] + 1.5], [-45, -42]);
  zeige('aufsteigender Gang\nmit Sperrsteinen aus Granit', linie(I.abzweig[0], I.abzweig[1], 180 - 26, 20), [85, 40]);
  zeige('Königinnenkammer', [0, I.yQ + 3], [25, 8]);
  zeige('Große Galerie (47 m lang, 8,6 m hoch)', linie(I.galStart[0], I.galStart[1] + 4, 180 - 26, 25), [55, 75]);
  zeige('Königskammer aus Granit\nmit Sarkophag', [-8.8, I.yK + 3], [-55, 30], '#9f1239');
  zeige('Entlastungskammern', [-8.8, I.entl[2]], [-55, 70], '#9f1239');
  zeige('Schächte', linie(-6.2, I.yK + 1, 32.6, 40), [30, 110], '#0f766e');
  zeige('Brunnenschacht', [33, -5], [10, -25], '#92400e');
  // Maßstab: Mensch und 50-m-Balken
  const mensch = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 1.75, 8), new THREE.MeshStandardMaterial({ color: 0x1d4ed8 })); mensch.position.set(-2, 0.9, S + 6); w.add(mensch);
  const balken = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 50), new THREE.MeshBasicMaterial({ color: 0x111111 })); balken.position.set(4, 0.5, -S + 25); w.add(balken);
  if (st.beschriftung) schild('50 m', '#111', 6, new THREE.Vector3(8, 6, -S + 25));
  return 'Längsschnitt von Nord (rechts vorne) nach Süd. Durch den Eingang in 17 m Höhe führt ein Gang 105 m schräg hinab bis zur unvollendeten Felsenkammer tief im Felsen. Vom absteigenden Gang zweigt der aufsteigende Gang ab, der mit Granitblöcken verschlossen wurde. Er führt zur Großen Galerie mit ihrem Kraggewölbe und weiter zur Königskammer aus Granit mit dem Sarkophag. Darüber verteilen fünf Entlastungskammern das Gewicht der Steinmassen. Die „Königinnenkammer“ hat ihren Namen nur aus Versehen erhalten – eine Königin lag dort nie. 2017 und 2023 fanden Forschende mit Myonen-Messungen weitere, noch unerforschte Hohlräume. Gänge und Kammern maßstäblich; ihre Lage ist leicht vereinfacht.';
}
function damals(w, st, schild) {
  const g = new THREE.ConeGeometry(S * Math.SQRT2, H, 4, 1); g.rotateY(Math.PI / 4); g.translate(0, H / 2, 0); g.computeVertexNormals();
  w.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xf5efe0, roughness: 0.35, flatShading: true })));
  const spitze = new THREE.ConeGeometry(3 * Math.SQRT2, 3.8, 4, 1); spitze.rotateY(Math.PI / 4); spitze.translate(0, H - 1.9 + 0.01, 0);
  w.add(new THREE.Mesh(spitze, new THREE.MeshStandardMaterial({ color: 0xe9d9a6, roughness: 0.3, flatShading: true })));
  boden(w);
  if (st.beschriftung) { schild('146,6 m hoch', '#1f2937', 7, new THREE.Vector3(S * 0.6, H * 0.55, S * 0.6)); schild('230,3 m', '#1f2937', 7, new THREE.Vector3(0, -6, S + 10)); }
  return 'So sah die Pyramide um 2560 v. Chr. aus: verkleidet mit glatt polierten Platten aus weißem Tura-Kalkstein, die in der Sonne strahlten. Mit 146,6 m war sie fast 3800 Jahre lang das höchste Bauwerk der Erde. Rund 2,3 Millionen Steinblöcke von durchschnittlich etwa 2,5 Tonnen wurden verbaut. Ob die Spitze vergoldet war, ist nicht bekannt.';
}
function heute(w, st, schild) {
  const m = new THREE.MeshStandardMaterial({ color: 0xc9b38a, roughness: 0.95, flatShading: true }), stufe = 3, n = Math.floor(138.5 / stufe);
  const kern = S - 3;
  for (let k = 0; k < n; k++) {
    const y = k * stufe, halb = kern * (1 - (y + stufe) / H) + 1.2;
    if (halb < 5) break;
    const b = new THREE.Mesh(new THREE.BoxGeometry(2 * halb, stufe, 2 * halb), m); b.position.y = y + stufe / 2; w.add(b);
  }
  // Reste der Verkleidung am Fuß und Eingang
  const rest = new THREE.Mesh(new THREE.BoxGeometry(2 * S, 1.2, 2 * S), new THREE.MeshStandardMaterial({ color: 0xf0e8d6, roughness: 0.5 })); rest.position.y = 0.6; w.add(rest);
  const eingang = new THREE.Mesh(new THREE.BoxGeometry(2, 2.5, 4), new THREE.MeshStandardMaterial({ color: 0x3f3324 })); eingang.position.set(7.3, 17, S - 17 / Math.tan(NEIG) + 1); w.add(eingang);
  const raeuber = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.5, 4), new THREE.MeshStandardMaterial({ color: 0x3f3324 })); raeuber.position.set(0, 7, S - 7 / Math.tan(NEIG) - 1); w.add(raeuber);
  boden(w);
  if (st.beschriftung) { schild('138,5 m hoch', '#1f2937', 7, new THREE.Vector3(S * 0.6, H * 0.5, S * 0.6)); schild('Eingang', '#1f2937', 5, new THREE.Vector3(7.3, 26, S - 6)); schild('Grabräuberstollen\n(9. Jh. n. Chr.)', '#1f2937', 4.5, new THREE.Vector3(-14, 6, S - 2)); }
  return 'Heute fehlt fast die ganze weiße Verkleidung – im Mittelalter wurden die Platten abgetragen und in Kairo verbaut, etwa nach Erdbeben. Darunter kommt der stufige Kern aus grobem Kalkstein zum Vorschein. Die Spitze fehlt ebenfalls, deshalb ist die Pyramide nur noch 138,5 m hoch. Besucher betreten sie heute durch einen Stollen, den Grabräuber im 9. Jahrhundert unterhalb des echten Eingangs gegraben haben.';
}
function boden(w) {
  const sand = new THREE.Mesh(new THREE.BoxGeometry(2 * S + 80, 2, 2 * S + 80), new THREE.MeshStandardMaterial({ color: 0xdec59a, roughness: 1 })); sand.position.y = -1; w.add(sand);
}

function bau(w, st, schild) {
  const m = new THREE.MeshStandardMaterial({ color: 0xd9c9a3, roughness: 0.9, flatShading: true }), rm = new THREE.MeshStandardMaterial({ color: 0xa0825a, roughness: 1 });
  boden(w);
  const teile = new THREE.Group(); w.add(teile);
  const steinM = new THREE.MeshStandardMaterial({ color: 0xf1e7cf });
  const steine = Array.from({ length: 14 }, () => { const s = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 6), steinM); w.add(s); return s; });
  const HMAX = 0.92 * H, STEIG = 1 / 9;          // Rampe mit 1:9 Steigung
  // Punkt auf der umlaufenden Rampe in Höhe y
  const rampenPunkt = y => {
    const halb = S * (1 - y / H) + 6, umfang = y / STEIG;
    const seite = 2 * halb, k = Math.floor(umfang / seite) % 4, d = umfang % seite - halb;
    const pts = [[d, halb], [halb, -d], [-d, -halb], [-halb, d]][k];
    const richt = [[1, 0], [0, -1], [-1, 0], [0, 1]][k];
    return { p: new THREE.Vector3(pts[0], y, pts[1]), r: new THREE.Vector3(richt[0], 0, richt[1]) };
  };
  let h = 0, zeit = 0;
  const setze = () => {
    for (const c of [...teile.children]) { teile.remove(c); c.geometry.dispose(); }
    const hh = Math.max(h, 1), oben = S * (1 - hh / H);
    const g = new THREE.CylinderGeometry(oben * Math.SQRT2, S * Math.SQRT2, hh, 4, 1); g.rotateY(Math.PI / 4); g.translate(0, hh / 2, 0);
    teile.add(new THREE.Mesh(g, m));
    for (let y = 0; y < hh - 0.5; y += 1.2) {      // Rampe aus kurzen Stücken
      const a = rampenPunkt(y), b = rampenPunkt(Math.min(y + 1.2, hh));
      const st_ = new THREE.Mesh(new THREE.BoxGeometry(10, Math.max(a.p.y, 1) + 1, a.p.distanceTo(b.p) + 0.3), rm);
      st_.position.copy(a.p.clone().lerp(b.p, 0.5)); st_.position.y = (a.p.y + 1) / 2; st_.lookAt(b.p.x, st_.position.y, b.p.z);
      if (a.p.distanceTo(b.p) < 40) teile.add(st_);
    }
  };
  setze();
  let letzt = -1;
  return {
    text: 'Wie die Pyramide gebaut wurde, ist bis heute nicht sicher geklärt. Eine verbreitete Theorie: Die Steinblöcke wurden auf Schlitten über eine Rampe nach oben gezogen, die sich um die wachsende Pyramide herumwand. Eine gerade Rampe bis zur Spitze wäre über einen Kilometer lang geworden. Gearbeitet haben vermutlich einige zehntausend bezahlte Arbeiter, keine Sklaven – das zeigen ihre Siedlungen und Gräber. Die Bauzeit betrug rund 20 Jahre.',
    update: dt => {
      if (!st.bewegung) return;
      zeit += dt; h = Math.min(HMAX, (zeit % 34) / 28 * HMAX);
      const stufe = Math.floor(h / 3);
      if (stufe !== letzt) { letzt = stufe; setze(); }
      steine.forEach((s, i) => {
        const y = ((zeit * 6 + i * (h / steine.length)) % Math.max(h, 1));
        const a = rampenPunkt(y); s.position.copy(a.p); s.position.y = y + 2.5; s.lookAt(a.p.clone().add(a.r).setY(s.position.y)); s.visible = h > 3;
      });
    },
  };
}

// =====================================================================
export function erzeuge(st) {
  const wurzel = new THREE.Group(), w = new THREE.Group(); wurzel.add(w);
  const etik = new THREE.Group(); wurzel.add(etik);
  const schild = (t, f, h, p) => { const s = textSprite(t, f, h); s.position.copy(p); etik.add(s); return s; };
  let text, update = () => {};
  if (st.ansicht === 'schnitt') text = schnitt(w, st, schild);
  else if (st.ansicht === 'damals') text = damals(w, st, schild);
  else if (st.ansicht === 'heute') text = heute(w, st, schild);
  else { const b = bau(w, st, schild); text = b.text; update = b.update; }
  w.position.y = -H / 3;
  etik.position.y = -H / 3;
  const info = [`<b>Cheops-Pyramide</b> · Gizeh, Ägypten · erbaut um 2580–2560 v. Chr. für Pharao Cheops (Chufu) · Grundseite 230,3 m, ursprünglich 146,6 m hoch, Neigung 51,8°`, `<i>${text}</i>`];
  return { objekt: wurzel, radius: S * 1.15, titel: `Cheops-Pyramide – ${ANSICHTEN[st.ansicht]}`, info: info.join('<br>'), update };
}
export const entsorge = entsorgeObj;
export function ausUrl(p) { const st = standard(); if (ANSICHTEN[p.get('v')]) st.ansicht = p.get('v'); return st; }
export const zuUrl = st => `&v=${st.ansicht}`;
export function bedienung(ort, st, neu) {
  stil(); ort.innerHTML = '';
  const s = document.createElement('select'); for (const [k, v] of Object.entries(ANSICHTEN)) s.add(new Option(v, k)); ort.appendChild(s);
  const knopf = t => { const b = document.createElement('button'); b.textContent = t; ort.appendChild(b); return b; };
  const bSchild = knopf('Beschriftung'), bBew = knopf('Bewegung');
  const auff = () => { s.value = st.ansicht; bSchild.classList.toggle('on', st.beschriftung); bBew.classList.toggle('on', st.bewegung); bBew.hidden = st.ansicht !== 'bau'; };
  s.onchange = () => { st.ansicht = s.value; auff(); neu(); };
  bSchild.onclick = () => { st.beschriftung = !st.beschriftung; auff(); neu(); };
  bBew.onclick = () => { st.bewegung = !st.bewegung; auff(); };
  auff();
}
