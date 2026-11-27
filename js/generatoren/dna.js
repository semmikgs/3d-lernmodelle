// DNA-Generator: B-DNA in echten Maßen (nm) – Doppelhelix, Strickleiter (entdrillt) und Replikation (animiert).
// Maße: 0,338 nm Anstieg pro Basenpaar, 10,5 Basenpaare pro Windung, Phosphat-Radius 0,89 nm (Durchmesser ≈ 2 nm),
// Zucker (C1') auf Radius 0,6 nm; die Stränge sitzen 140° versetzt → kleine und große Furche.
import * as THREE from 'three';
import { textSprite, zylinderMatrix, entsorge as entsorgeObj, stil, zahlKnopf } from './hilfen.js';

const ANSTIEG = 0.338, DREHUNG = 2 * Math.PI / 10.5, R_P = 0.89, R_Z = 0.6, VERSATZ = THREE.MathUtils.degToRad(140), T0 = Math.PI / 2;
const PARTNER = { A: 'T', T: 'A', G: 'C', C: 'G' }, PURIN = { A: true, G: true, C: false, T: false };
const FARBE = {
  A: 0xe53935, T: 0x43a047, G: 0x1e88e5, C: 0xfdd835,
  phosphat: 0xf97316, zucker: 0x94a3b8, phosphatNeu: 0xfed7aa, zuckerNeu: 0xe2e8f0, bruecke: 0x475569,
};
const NAME = { A: 'Adenin', T: 'Thymin', G: 'Guanin', C: 'Cytosin' };

export const DARSTELLUNGEN = { helix: 'Doppelhelix', leiter: 'Strickleiter (entdrillt)', replikation: 'Replikation' };
export const standard = () => ({ darstellung: 'helix', seq: 'ATGGCTAGCAATCGGTACGTA', beschriftung: false, bewegung: false });

const smooth = u => u * u * (3 - 2 * u);
const pol = (a, r, y) => new THREE.Vector3(r * Math.cos(a), y, r * Math.sin(a));

// ---------- Lage aller Bausteine ----------
// Liefert: nuk[] { S, P, ende, achse, base, neu }, paare[] { a, b, n }, ketten[] (Indizes 5'→3', mit Lücken = null)
function lageHelix(seq, t) {
  const N = seq.length, nuk = [], paare = [], kA = [], kB = [];
  for (let i = 0; i < N; i++) {
    const y = ((N - 1) / 2 - i) * ANSTIEG, phi = T0 + i * DREHUNG * t;
    const aA = phi + VERSATZ / 2, aB = phi - VERSATZ / 2, dt = DREHUNG * t / 2;
    const SA = pol(aA, R_Z, y), SB = pol(aB, R_Z, y), bA = seq[i], bB = PARTNER[bA];
    const teil = SA.clone().lerp(SB, PURIN[bA] ? 0.56 : 0.44), achse = new THREE.Vector3(0, 1, 0);
    nuk.push({ S: SA, P: pol(aA - dt, R_P, y + ANSTIEG / 2), ende: teil, achse, base: bA, neu: false });
    nuk.push({ S: SB, P: pol(aB + dt, R_P, y - ANSTIEG / 2), ende: teil, achse, base: bB, neu: false });
    paare.push({ a: 2 * i, b: 2 * i + 1, n: bA === 'A' || bA === 'T' ? 2 : 3 });
    kA.push(2 * i); kB.unshift(2 * i + 1);
  }
  return { nuk, paare, ketten: [kA, kB], gabel: null };
}

// Replikation: k = Anzahl bereits getrennter Basenpaare (von oben), fließend
const BETA = THREE.MathUtils.degToRad(24);
function lageReplikation(seq, k) {
  const N = seq.length, nuk = [], paare = [], kA = [], kB = [], kAneu = [], kBneu = [];
  const yF = ((N - 1) / 2 - k) * ANSTIEG, F = new THREE.Vector3(0, yF, 0);
  const arme = [
    { d: new THREE.Vector3(-Math.sin(BETA), Math.cos(BETA), 0), n: new THREE.Vector3(-Math.cos(BETA), -Math.sin(BETA), 0) },
    { d: new THREE.Vector3(Math.sin(BETA), Math.cos(BETA), 0), n: new THREE.Vector3(Math.cos(BETA), -Math.sin(BETA), 0) },
  ];
  const idx = {};
  for (let i = 0; i < N; i++) {
    const y = ((N - 1) / 2 - i) * ANSTIEG, phi = T0 + (i - k) * DREHUNG;
    const aA = phi + VERSATZ / 2, aB = phi - VERSATZ / 2, dt = DREHUNG / 2;
    const hel = [
      { S: pol(aA, R_Z, y), P: pol(aA - dt, R_P, y + ANSTIEG / 2) },
      { S: pol(aB, R_Z, y), P: pol(aB + dt, R_P, y - ANSTIEG / 2) },
    ];
    const u = smooth(THREE.MathUtils.clamp((k - i) / 1.6, 0, 1)), s = Math.max(k - i, 0) * ANSTIEG * 1.05 + 0.5;
    const bA = seq[i], bB = PARTNER[bA];
    const pos = [];
    for (const st of [0, 1]) {
      const arm = arme[st], c = F.clone().addScaledVector(arm.d, s);
      const richt = st === 0 ? 1 : -1;            // Strang A: Phosphat Richtung Armende, Strang B: Richtung Gabel
      const S = c.clone().addScaledVector(arm.n, 0.585), P = c.clone().addScaledVector(arm.n, 0.86).addScaledVector(arm.d, richt * ANSTIEG / 2);
      pos.push({ S: hel[st].S.clone().lerp(S, u), P: hel[st].P.clone().lerp(P, u), c, arm, richt });
    }
    const getrennt = u > 0.02;
    const achse = new THREE.Vector3(0, 1, 0).lerp(arme[0].d, 0).normalize();
    if (!getrennt) {
      const teil = pos[0].S.clone().lerp(pos[1].S, PURIN[bA] ? 0.56 : 0.44);
      nuk.push({ S: pos[0].S, P: pos[0].P, ende: teil, achse, base: bA, neu: false });
      nuk.push({ S: pos[1].S, P: pos[1].P, ende: teil, achse, base: bB, neu: false });
      paare.push({ a: nuk.length - 2, b: nuk.length - 1, n: bA === 'A' || bA === 'T' ? 2 : 3 });
      kA.push(nuk.length - 2); kB.unshift(nuk.length - 1); continue;
    }
    // getrennt: alte Stränge auf den Armen, neue Nukleotide innen (A-Arm = Folgestrang, B-Arm = Leitstrang)
    for (const st of [0, 1]) {
      const p = pos[st], basis = st === 0 ? bA : bB, arm = p.arm;
      const neuDa = st === 1 ? k - i > 2.2 : okazaki(i, k);
      const S2 = p.c.clone().addScaledVector(arm.n, -0.585);
      const teil = p.S.clone().lerp(S2, PURIN[basis] ? 0.56 : 0.44);
      const ende = neuDa ? teil : p.S.clone().lerp(S2, 0.48);          // ungepaarte Base ragt frei nach innen
      nuk.push({ S: p.S, P: p.P, ende, achse: arm.d, base: basis, neu: false });
      const alt = nuk.length - 1;
      (st === 0 ? kA : kB)[st === 0 ? 'push' : 'unshift'](alt);
      if (neuDa) {
        const P2 = p.c.clone().addScaledVector(arm.n, -0.86).addScaledVector(arm.d, -p.richt * ANSTIEG / 2);
        nuk.push({ S: S2, P: P2, ende: teil, achse: arm.d, base: PARTNER[basis], neu: true });
        paare.push({ a: alt, b: nuk.length - 1, n: basis === 'A' || basis === 'T' ? 2 : 3 });
        idx[st + ':' + i] = nuk.length - 1;
      }
    }
  }
  // neue Stränge als Ketten (5'→3'); Folgestrang mit Lücken zwischen jungen Okazaki-Fragmenten
  for (let i = N - 1; i >= 0; i--) {                 // neuer Strang am A-Arm läuft 5'→3' vom Gabelende nach außen: i absteigend
    const n = idx['0:' + i];
    if (n === undefined) { kAneu.push(null); continue; }
    if (i % FRAG === FRAG - 1 && k - i < 16) kAneu.push(null);   // noch nicht verknüpft (Ligase)
    kAneu.push(n);
  }
  for (let i = 0; i < N; i++) { const n = idx['1:' + i]; kBneu.push(n === undefined ? null : n); }
  return { nuk, paare, ketten: [kA, kB, kAneu, kBneu], gabel: { F, arme, k } };
}
const FRAG = 6;
function okazaki(i, k) {          // Folgestrang: Fragmente von je FRAG Nukleotiden, jedes wird von der Gabel weg aufgebaut
  const j = Math.floor(i / FRAG), start = j * FRAG + FRAG - 1;   // gabelnächstes Nukleotid des Fragments
  const frei = k - (start + 1);                                     // so weit ist die Gabel schon über das Fragment hinaus
  return frei > 1.2 && (start - i) < (frei - 1.2) * 2.2;
}

// ---------- Erzeugen ----------
export function erzeuge(st) {
  const seq = st.seq, N = seq.length, wurzel = new THREE.Group(), drehteil = new THREE.Group(); wurzel.add(drehteil);
  const MAX = N * 4 + 4;
  const mk = (geo, farbe, n, opt = {}) => { const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: farbe, roughness: 0.45, ...opt }), n); m.count = 0; m.frustumCulled = false; drehteil.add(m); return m; };
  const zucker = mk(new THREE.CylinderGeometry(0.17, 0.17, 0.1, 5), 0xffffff, MAX);
  const phosphat = mk(new THREE.SphereGeometry(0.15, 18, 12), 0xffffff, MAX);
  const basen = mk(new THREE.BoxGeometry(1, 0.09, 0.3), 0xffffff, MAX);
  const holm = mk(new THREE.CylinderGeometry(1, 1, 1, 8), 0xffffff, MAX * 2);
  const bruecken = mk(new THREE.CylinderGeometry(1, 1, 1, 6), FARBE.bruecke, MAX * 3);
  const col = new THREE.Color(), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sk = new THREE.Vector3(1, 1, 1);
  const basisMatrix = (pos, x, auf) => {
    const X = x.clone().normalize(), Y = auf.clone().addScaledVector(X, -auf.dot(X)).normalize(), Z = new THREE.Vector3().crossVectors(X, Y);
    return m4.makeBasis(X, Y, Z).setPosition(pos);
  };

  // Beschriftungen
  const etik = new THREE.Group(); drehteil.add(etik);
  const SK = 2.1;   // Schriftgröße passend zum nm-Maßstab
  const schild = (text, farbe, h = 0.2) => { const s = textSprite(text, farbe, h * SK); etik.add(s); return s; };
  const ends = [schild("5'", '#111'), schild("3'", '#111'), schild("3'", '#111'), schild("5'", '#111')];
  const extra = {};
  const legende = new THREE.Group(); wurzel.add(legende);

  let t = st.darstellung === 'helix' ? (st._vonLeiter ? 0 : 1) : 0, k = 0, pause = 0, drehung = 0;
  const zielT = st.darstellung === 'helix' ? 1 : 0;
  delete st._vonLeiter;

  function aufbauen() {
    const L = st.darstellung === 'replikation' ? lageReplikation(seq, k) : lageHelix(seq, t);
    const { nuk, paare, ketten } = L;
    zucker.count = phosphat.count = basen.count = nuk.length;
    nuk.forEach((n, i) => {
      const richtung = n.ende.clone().sub(n.S);
      zucker.setMatrixAt(i, basisMatrix(n.S, richtung, n.achse)); zucker.setColorAt(i, col.setHex(n.neu ? FARBE.zuckerNeu : FARBE.zucker));
      phosphat.setMatrixAt(i, m4.compose(n.P, q.identity(), sk)); phosphat.setColorAt(i, col.setHex(n.neu ? FARBE.phosphatNeu : FARBE.phosphat));
      const a = n.S.clone().addScaledVector(richtung.clone().normalize(), 0.13), l = Math.max(a.distanceTo(n.ende) - 0.07, 0.05);
      const mitte = a.clone().addScaledVector(richtung.clone().normalize(), l / 2);
      basisMatrix(mitte, richtung, n.achse); m4.scale(new THREE.Vector3(l, 1, 1));
      basen.setMatrixAt(i, m4); basen.setColorAt(i, col.setHex(FARBE[n.base]));
    });
    // Rückgrat: Phosphat → Zucker → nächstes Phosphat
    let h = 0;
    for (const kette of ketten) {
      for (let j = 0; j < kette.length; j++) {
        const a = kette[j]; if (a === null || a === undefined) continue;
        const n = nuk[a];
        holm.setMatrixAt(h, zylinderMatrix(n.P, n.S, 0.045)); holm.setColorAt(h++, col.setHex(n.neu ? FARBE.zuckerNeu : FARBE.zucker));
        const b = kette[j + 1]; if (b === null || b === undefined) continue;
        holm.setMatrixAt(h, zylinderMatrix(n.S, nuk[b].P, 0.045)); holm.setColorAt(h++, col.setHex(n.neu ? FARBE.zuckerNeu : FARBE.zucker));
      }
    }
    holm.count = h;
    // Wasserstoffbrücken (2 bei A–T, 3 bei G–C)
    let w = 0;
    for (const p of paare) {
      const A = nuk[p.a], B = nuk[p.b], dir = B.S.clone().sub(A.S).normalize();
      const Z = new THREE.Vector3().crossVectors(dir, A.achse).normalize();
      const offs = p.n === 2 ? [-0.07, 0.07] : [-0.1, 0, 0.1];
      for (const o of offs) {
        const c = A.ende.clone().addScaledVector(Z, o);
        bruecken.setMatrixAt(w, zylinderMatrix(c.clone().addScaledVector(dir, -0.075), c.clone().addScaledVector(dir, 0.075), 0.016)); w++;
      }
    }
    bruecken.count = w;
    for (const m of [zucker, phosphat, basen, holm, bruecken]) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
    // 5'/3'-Enden
    const endeVon = (kette, erstes) => { const l = kette.filter(x => x !== null && x !== undefined); return l.length ? nuk[erstes ? l[0] : l[l.length - 1]] : null; };
    const setze = (s, n, aussen) => { s.visible = !!n && st.beschriftung; if (n) s.position.copy(n.P).add(aussen); };
    const o = (n, f) => n ? new THREE.Vector3(n.P.x, 0, n.P.z).normalize().multiplyScalar(f) : null;
    const k0 = ketten[0], k1 = ketten[1];
    const a5 = endeVon(k0, true), a3 = endeVon(k0, false), b5 = endeVon(k1, true), b3 = endeVon(k1, false);
    setze(ends[0], a5, a5 ? o(a5, 0.35).add(new THREE.Vector3(0, 0.25, 0)) : null);
    setze(ends[1], a3, a3 ? o(a3, 0.35).add(new THREE.Vector3(0, -0.25, 0)) : null);
    setze(ends[2], b3, b3 ? o(b3, 0.35).add(new THREE.Vector3(0, 0.25, 0)) : null);
    setze(ends[3], b5, b5 ? o(b5, 0.35).add(new THREE.Vector3(0, -0.25, 0)) : null);
    if (L.gabel) gabelBeschriften(L);
  }

  // ---- Zusatzbeschriftungen je Darstellung ----
  const yOben = ((N - 1) / 2) * ANSTIEG, yUnten = -yOben;
  if (st.darstellung === 'helix') {
    const yW = Math.min(yOben - 0.3, 10.5 * ANSTIEG / 2);
    extra.gross = schild('große Furche', '#334155', 0.17); extra.klein = schild('kleine Furche', '#334155', 0.17);
    extra.gross.position.copy(pol(T0 + Math.PI, 1.45, 0.4)); extra.klein.position.copy(pol(T0, 1.4, -0.9));
    // Maßlinien: Durchmesser 2 nm, eine Windung 3,4 nm
    const linie = (a, b) => { const g = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 6), new THREE.MeshBasicMaterial({ color: 0x111111 })); g.applyMatrix4(zylinderMatrix(a, b, 1)); legende.add(g); };
    const yD = yUnten - 0.6;
    linie(new THREE.Vector3(-R_P, yD, 0), new THREE.Vector3(R_P, yD, 0));
    for (const x of [-R_P, R_P]) linie(new THREE.Vector3(x, yD - 0.08, 0), new THREE.Vector3(x, yD + 0.08, 0));
    const d = textSprite('2 nm', '#111', 0.17 * SK); d.position.set(0, yD - 0.25, 0); legende.add(d);
    if (N >= 11) {
      const x = R_P + 0.7, w = 10.5 * ANSTIEG;
      linie(new THREE.Vector3(x, yOben, 0), new THREE.Vector3(x, yOben - w, 0));
      for (const y of [yOben, yOben - w]) linie(new THREE.Vector3(x - 0.08, y, 0), new THREE.Vector3(x + 0.08, y, 0));
      const s = textSprite('1 Windung\n3,4 nm\n10,5 Basenpaare', '#111', 0.15 * SK); s.position.set(x + 1.3, yOben - w / 2, 0); legende.add(s);
    }
    void yW;
  } else if (st.darstellung === 'leiter') {
    // Bausteine eines Nukleotids benennen (oberstes Nukleotid links)
    extra.p = schild('Phosphat', '#c2410c', 0.15); extra.z = schild('Zucker (Desoxyribose)', '#475569', 0.15); extra.b = schild('Base', '#111', 0.15);
    extra.nuk = schild('Nukleotid', '#111', 0.17); extra.brueck = schild('Wasserstoff-\nbrücken', '#334155', 0.13);
  } else {
    extra.heli = schild('Helikase', '#6d28d9', 0.17); extra.leit = schild('Leitstrang', '#1d4ed8', 0.16); extra.folge = schild('Folgestrang\n(Okazaki-Fragmente)', '#1d4ed8', 0.14);
    extra.alt = schild('alter Strang', '#475569', 0.14); extra.neu = schild('neuer Strang', '#94a3b8', 0.14);
    const hel = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.16, 12, 32), new THREE.MeshStandardMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.55, roughness: 0.4 }));
    hel.rotation.x = Math.PI / 2; drehteil.add(hel); extra.helMesh = hel;
    extra.pol = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 16), new THREE.MeshStandardMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.4, roughness: 0.3, depthWrite: false })); drehteil.add(m); return m; });
    extra.polSchild = schild('DNA-Polymerase', '#0e7490', 0.14);
  }
  function gabelBeschriften(L) {
    const { F, arme } = L.gabel, sicht = st.beschriftung;
    extra.helMesh.position.copy(F).add(new THREE.Vector3(0, 0.1, 0));
    extra.heli.position.copy(F).add(new THREE.Vector3(1.3, -0.15, 0));
    const fl = Math.min(k - 2.2, 4) * ANSTIEG + 0.5;
    extra.pol[1].position.copy(F).addScaledVector(arme[1].d, Math.max(fl, 0.5)).addScaledVector(arme[1].n, -0.3);
    extra.pol[1].visible = k > 2.2;
    // Polymerase am Folgestrang sitzt am jüngsten Fragment
    const j = Math.floor(Math.max(k - 2.4, 0) / FRAG) - 1, start = j * FRAG + FRAG - 1, s0 = (k - start) * ANSTIEG * 1.05 + 0.5;
    extra.pol[0].visible = j >= 0; if (j >= 0) extra.pol[0].position.copy(F).addScaledVector(arme[0].d, s0 + 0.6).addScaledVector(arme[0].n, -0.3);
    extra.polSchild.position.copy(extra.pol[1].position).add(new THREE.Vector3(1.3, 0, 0)); extra.polSchild.visible = sicht && extra.pol[1].visible;
    const sArm = Math.max(k * ANSTIEG * 1.05, 0.5);
    extra.leit.position.copy(F).addScaledVector(arme[1].d, sArm * 0.75 + 0.5).addScaledVector(arme[1].n, -0.3).add(new THREE.Vector3(1.6, 0, 0));
    extra.folge.position.copy(F).addScaledVector(arme[0].d, sArm * 0.75 + 0.5).add(new THREE.Vector3(-2.0, 0, 0));
    extra.alt.position.copy(F).addScaledVector(arme[1].d, sArm * 0.35 + 0.6).addScaledVector(arme[1].n, 1.6);
    extra.neu.position.copy(F).addScaledVector(arme[1].d, sArm * 0.35 + 0.4).addScaledVector(arme[1].n, -1.3);
    for (const s of [extra.leit, extra.folge, extra.alt, extra.neu]) s.visible = sicht && k > 5;
    extra.heli.visible = sicht;
  }
  function leiterBeschriften() {
    if (!extra.p) return;
    const sicht = st.beschriftung;
    const yA = yOben, xs = -Math.cos(VERSATZ / 2) * 0, links = pol(T0 + VERSATZ / 2, R_P, yA + ANSTIEG / 2);
    extra.p.position.copy(links).add(new THREE.Vector3(-1.3, 0.25, 0));
    extra.z.position.copy(pol(T0 + VERSATZ / 2, R_Z, yA)).add(new THREE.Vector3(-2.6, -0.45, 0));
    extra.b.position.copy(pol(T0 + VERSATZ / 2, R_Z, yA)).add(new THREE.Vector3(0.4, 0.5, 0));
    extra.nuk.position.set(-2.0, yA + 1.0, 0);
    extra.brueck.position.copy(pol(T0 + VERSATZ / 2, R_Z, yA - 2 * ANSTIEG).lerp(pol(T0 - VERSATZ / 2, R_Z, yA - 2 * ANSTIEG), 0.5)).add(new THREE.Vector3(2.4, 0, 0));
    for (const s of [extra.p, extra.z, extra.b, extra.nuk, extra.brueck]) s.visible = sicht;
    void xs;
  }

  aufbauen(); leiterBeschriften();
  if (extra.gross) extra.gross.visible = extra.klein.visible = st.beschriftung;
  legende.visible = st.beschriftung;

  // ---- Info ----
  const komp = seq.split('').map(b => PARTNER[b]).join('');
  const zaehl = b => (seq + komp).split('').filter(x => x === b).length;
  const zeilen = [
    `<span style="font-family:ui-monospace,monospace">5'-${seq}-3'<br>3'-${komp}-5'</span>`,
    `${N} Basenpaare · Länge ${(N * ANSTIEG).toFixed(1).replace('.', ',')} nm · ${(N / 10.5).toFixed(1).replace('.', ',')} Windungen`,
    ['A', 'T', 'G', 'C'].map(b => `<span style="color:#${FARBE[b].toString(16).padStart(6, '0')};text-shadow:0 0 1px #000">■</span> ${NAME[b]} ${zaehl(b)}`).join(' · ')
      + ' – A = T und G = C (Chargaff-Regel)',
    '<span style="color:#f97316">●</span> Phosphat · <span style="color:#94a3b8">⬟</span> Zucker (Desoxyribose) · Linien zwischen den Basen: Wasserstoffbrücken',
  ];
  const TEXT = {
    helix: 'Zwei Stränge winden sich umeinander – die Doppelhelix (Watson und Crick 1953, nach Röntgenbildern von Rosalind Franklin). Außen liegt das Rückgrat aus Zucker und Phosphat, innen die Basenpaare. Eine Windung ist 3,4 nm hoch und hat 10,5 Basenpaare, der Durchmesser beträgt 2 nm. Weil die beiden Stränge nicht genau gegenüber sitzen, entstehen eine große und eine kleine Furche. Maßstäblich, die Atome sind zu Bausteinen vereinfacht.',
    leiter: 'Entdrillt sieht die DNA aus wie eine Strickleiter: Die Holme sind das Zucker-Phosphat-Rückgrat, die Sprossen die Basenpaare. Adenin paart immer mit Thymin (2 Wasserstoffbrücken), Guanin immer mit Cytosin (3 Wasserstoffbrücken) – die Stränge sind komplementär. Sie laufen gegenläufig (antiparallel): 5′→3′ und 3′→5′. Ein Baustein aus Phosphat, Zucker und Base heißt Nukleotid. Wähle „Doppelhelix“, um zu sehen, wie sich die Leiter verdrillt.',
    replikation: 'Vor jeder Zellteilung wird die DNA verdoppelt. Die Helikase trennt die Basenpaare wie einen Reißverschluss. Die DNA-Polymerase baut an jeden alten Strang passende neue Nukleotide an (hell gezeichnet) – immer in 5′→3′-Richtung. Am Leitstrang geht das am Stück, am Folgestrang in Stücken (Okazaki-Fragmente), die danach verknüpft werden (Ligase). Jede neue DNA besteht aus einem alten und einem neuen Strang: Die Verdopplung ist semikonservativ. Schematisch: Die Tochterstränge sind hier nicht verdrillt gezeichnet.',
  };
  zeilen.push(`<i>${TEXT[st.darstellung]}</i>`);

  const laenge = N * ANSTIEG;
  return {
    objekt: wurzel,
    radius: st.darstellung === 'replikation' ? Math.max(laenge * 0.58, 2.6) : Math.max(laenge / 2 + 0.4, 2),
    titel: `DNA – ${DARSTELLUNGEN[st.darstellung]}`,
    info: zeilen.join('<br>'),
    update: dt => {
      let neuBauen = false;
      if (st.darstellung !== 'replikation' && t !== zielT) {
        t = zielT > t ? Math.min(zielT, t + dt * 0.45) : Math.max(zielT, t - dt * 0.45); neuBauen = true;
      }
      if (st.darstellung === 'replikation' && st.bewegung) {
        if (pause > 0) { pause -= dt; if (pause <= 0) k = 0; }
        else { k += dt * 1.6; if (k >= N + 3) { k = N + 3; pause = 3; } }
        neuBauen = true;
      }
      if (st.darstellung === 'helix' && st.bewegung) { drehung += dt * 0.35; drehteil.rotation.y = drehung; }
      if (neuBauen) aufbauen();
    },
  };
}

export const entsorge = entsorgeObj;

// ---------- URL ----------
const sauber = s => String(s || '').toUpperCase().replace(/[^ACGT]/g, '').slice(0, 40);
export function ausUrl(p) {
  const st = standard();
  if (DARSTELLUNGEN[p.get('d')]) st.darstellung = p.get('d');
  const s = sauber(p.get('s')); if (s.length >= 4) st.seq = s;
  return st;
}
export const zuUrl = st => `&d=${st.darstellung}&s=${st.seq}`;

// ---------- Bedienung ----------
export function bedienung(ort, st, neu) {
  stil(); ort.innerHTML = '';
  const sDar = document.createElement('select');
  for (const [k, v] of Object.entries(DARSTELLUNGEN)) sDar.add(new Option(v, k));
  ort.appendChild(sDar);
  const ein = document.createElement('input'); ein.className = 'gen-eingabe'; ein.title = 'Eigene Basenfolge (A, T, G, C) für den oberen Strang'; ein.maxLength = 40; ort.appendChild(ein);
  const lang = zahlKnopf(ort, 'Anzahl der Basenpaare');
  const bZuf = document.createElement('button'); bZuf.textContent = '🎲 Zufall'; bZuf.title = 'Zufällige Basenfolge'; ort.appendChild(bZuf);
  const bSchild = document.createElement('button'); bSchild.textContent = 'Beschriftung'; ort.appendChild(bSchild);
  const bBew = document.createElement('button'); bBew.textContent = 'Bewegung'; ort.appendChild(bBew);
  const zufBase = () => 'ATGC'[Math.floor(Math.random() * 4)];
  function auffrischen() {
    sDar.value = st.darstellung; ein.value = st.seq; lang.t.textContent = `${st.seq.length} bp`;
    lang.m.disabled = st.seq.length <= 4; lang.p.disabled = st.seq.length >= 40;
    bSchild.classList.toggle('on', st.beschriftung); bBew.classList.toggle('on', st.bewegung);
  }
  const aendern = (f, bauen = true) => () => { f(); auffrischen(); if (bauen) neu(); };
  sDar.onchange = aendern(() => { st._vonLeiter = st.darstellung === 'leiter' && sDar.value === 'helix'; st.darstellung = sDar.value; });
  ein.onchange = aendern(() => { const s = sauber(ein.value); if (s.length >= 4) st.seq = s; });
  ein.addEventListener('keydown', e => e.stopPropagation());
  lang.m.onclick = aendern(() => st.seq = st.seq.slice(0, -1));
  lang.p.onclick = aendern(() => st.seq += zufBase());
  bZuf.onclick = aendern(() => st.seq = Array.from({ length: st.seq.length }, zufBase).join(''));
  bSchild.onclick = aendern(() => st.beschriftung = !st.beschriftung);
  bBew.onclick = aendern(() => st.bewegung = !st.bewegung, false);
  auffrischen();
}
