// Molekül- und Gittergenerator (Chemie).
// Moleküle: Raumstruktur wird berechnet (Bindungslängen aus Tabellen, Winkel nach dem Elektronenpaarabstoßungsmodell,
// Doppelbindungen planar, nicht gebundene Atome stoßen sich ab) – Längen in Å (1 Å = 0,1 nm).
// Gitter: Natriumchlorid, Caesiumchlorid, Kupfer (kfz), Eisen (krz), Diamant, Graphit – mit echten Gitterkonstanten und Radien.
import * as THREE from 'three';
import { textSprite, zylinderMatrix, entsorge as entsorgeObj, stil, zahlKnopf } from './hilfen.js';

// ---------- Elemente ----------
const EL = {
  H: { farbe: 0xf8fafc, kugel: 0.26, vdw: 1.2, en: 2.2, ve: 1, name: 'Wasserstoff' },
  C: { farbe: 0x374151, kugel: 0.36, vdw: 1.7, en: 2.55, ve: 4, name: 'Kohlenstoff' },
  N: { farbe: 0x2563eb, kugel: 0.35, vdw: 1.55, en: 3.04, ve: 5, name: 'Stickstoff' },
  O: { farbe: 0xdc2626, kugel: 0.34, vdw: 1.52, en: 3.44, ve: 6, name: 'Sauerstoff' },
  F: { farbe: 0x84cc16, kugel: 0.33, vdw: 1.47, en: 3.98, ve: 7, name: 'Fluor' },
  Cl: { farbe: 0x16a34a, kugel: 0.45, vdw: 1.75, en: 3.16, ve: 7, name: 'Chlor' },
  S: { farbe: 0xeab308, kugel: 0.45, vdw: 1.8, en: 2.58, ve: 6, name: 'Schwefel' },
  Na: { farbe: 0xa855f7, en: 0.93, name: 'Natrium' }, Cs: { farbe: 0x6d28d9, en: 0.79, name: 'Caesium' },
  Cu: { farbe: 0xc87533, name: 'Kupfer' }, Fe: { farbe: 0x9a6b4f, name: 'Eisen' },
};
// Bindungslängen (Å) nach Elementpaar und Bindungsart (1 einfach, 2 doppelt, 3 dreifach, 1.5 aromatisch)
const LAENGE = {
  'C-H1': 1.09, 'C-C1': 1.54, 'C-C2': 1.34, 'C-C3': 1.20, 'C-C1.5': 1.39, 'C-O1': 1.43, 'C-O2': 1.21, 'C-O3': 1.13, 'H-O1': 0.96, 'H-N1': 1.01,
  'C-N1': 1.47, 'C-Cl1': 1.77, 'Cl-H1': 1.27, 'H-H1': 0.74, 'O-O2': 1.21, 'N-N3': 1.10, 'Cl-Cl1': 1.99, 'H-S1': 1.34, 'O-S2': 1.43,
};
const laenge = (a, b, o) => LAENGE[[a, b].sort().join('-') + o] ?? 1.5;

// ---------- Moleküle: Atome (mit Ladung, z. B. „O+“), Bindungen „i-j“, „i=j“, „i#j“, „i:j“ (aromatisch) ----------
const MOL = {
  // anorganisch
  wasserstoff: { name: 'Wasserstoff', f: 'H₂', g: 'anorg', a: 'H H', b: '0-1' },
  sauerstoff: { name: 'Sauerstoff', f: 'O₂', g: 'anorg', a: 'O O', b: '0=1' },
  stickstoff: { name: 'Stickstoff', f: 'N₂', g: 'anorg', a: 'N N', b: '0#1' },
  chlor: { name: 'Chlor', f: 'Cl₂', g: 'anorg', a: 'Cl Cl', b: '0-1' },
  chlorwasserstoff: { name: 'Chlorwasserstoff', f: 'HCl', g: 'anorg', a: 'H Cl', b: '0-1' },
  wasser: { name: 'Wasser', f: 'H₂O', g: 'anorg', a: 'O H H', b: '0-1 0-2', w: 104.5 },
  kohlenstoffdioxid: { name: 'Kohlenstoffdioxid', f: 'CO₂', g: 'anorg', a: 'C O O', b: '0=1 0=2', w: 180 },
  kohlenstoffmonooxid: { name: 'Kohlenstoffmonooxid', f: 'CO', g: 'anorg', a: 'C- O+', b: '0#1' },
  ammoniak: { name: 'Ammoniak', f: 'NH₃', g: 'anorg', a: 'N H H H', b: '0-1 0-2 0-3', w: 107 },
  ammonium: { name: 'Ammonium-Ion', f: 'NH₄⁺', g: 'anorg', a: 'N+ H H H H', b: '0-1 0-2 0-3 0-4', w: 109.5 },
  oxonium: { name: 'Oxonium-Ion', f: 'H₃O⁺', g: 'anorg', a: 'O+ H H H', b: '0-1 0-2 0-3', w: 113 },
  schwefeldioxid: { name: 'Schwefeldioxid', f: 'SO₂', g: 'anorg', a: 'S O O', b: '0=1 0=2', w: 119 },
  // organisch
  methanol: { name: 'Methanol', f: 'CH₃OH', g: 'org', a: 'C O H H H H', b: '0-1 0-2 0-3 0-4 1-5' },
  ethanol: { name: 'Ethanol', f: 'C₂H₅OH', g: 'org', a: 'C C O H H H H H H', b: '0-1 1-2 0-3 0-4 0-5 1-6 1-7 2-8' },
  methanal: { name: 'Methanal (Formaldehyd)', f: 'HCHO', g: 'org', a: 'C O H H', b: '0=1 0-2 0-3', w: 120 },
  ethansaeure: { name: 'Ethansäure (Essigsäure)', f: 'CH₃COOH', g: 'org', a: 'C C O O H H H H', b: '0-1 1=2 1-3 3-7 0-4 0-5 0-6' },
  propanon: { name: 'Propanon (Aceton)', f: 'CH₃COCH₃', g: 'org', a: 'C C C O H H H H H H', b: '0-1 1-2 1=3 0-4 0-5 0-6 2-7 2-8 2-9' },
  glycin: { name: 'Glycin (Aminosäure)', f: 'H₂NCH₂COOH', g: 'org', a: 'N C C O O H H H H H', b: '0-1 1-2 2=3 2-4 0-5 0-6 1-7 1-8 4-9' },
  benzol: { name: 'Benzol', f: 'C₆H₆', g: 'org', a: 'C C C C C C H H H H H H', b: '0:1 1:2 2:3 3:4 4:5 5:0 0-6 1-7 2-8 3-9 4-10 5-11', ring: [0, 1, 2, 3, 4, 5], w: 120 },
  tetrachlormethan: { name: 'Tetrachlormethan', f: 'CCl₄', g: 'org', a: 'C Cl Cl Cl Cl', b: '0-1 0-2 0-3 0-4', w: 109.5 },
};
// ---------- Gitter ----------
// ---------- Kohlenwasserstoffe: aus dem Kohlenstoffgerüst erzeugt, Wasserstoff füllt auf 4 Bindungen auf ----------
// Siedetemperaturen in °C bei Normaldruck (gerundet).
const KW = [
  ['methan', 'Methan', 'alkan', 1, '', 'CH₄', -162],
  ['ethan', 'Ethan', 'alkan', 2, '0-1', 'CH₃–CH₃', -89],
  ['propan', 'Propan', 'alkan', 3, '0-1 1-2', 'CH₃–CH₂–CH₃', -42],
  ['butan', 'Butan', 'alkan', 4, '0-1 1-2 2-3', 'CH₃–(CH₂)₂–CH₃', -1],
  ['pentan', 'Pentan', 'alkan', 5, '0-1 1-2 2-3 3-4', 'CH₃–(CH₂)₃–CH₃', 36],
  ['hexan', 'Hexan', 'alkan', 6, '0-1 1-2 2-3 3-4 4-5', 'CH₃–(CH₂)₄–CH₃', 69],
  ['heptan', 'Heptan', 'alkan', 7, '0-1 1-2 2-3 3-4 4-5 5-6', 'CH₃–(CH₂)₅–CH₃', 98],
  ['octan', 'Octan', 'alkan', 8, '0-1 1-2 2-3 3-4 4-5 5-6 6-7', 'CH₃–(CH₂)₆–CH₃', 126],
  ['nonan', 'Nonan', 'alkan', 9, '0-1 1-2 2-3 3-4 4-5 5-6 6-7 7-8', 'CH₃–(CH₂)₇–CH₃', 151],
  ['decan', 'Decan', 'alkan', 10, '0-1 1-2 2-3 3-4 4-5 5-6 6-7 7-8 8-9', 'CH₃–(CH₂)₈–CH₃', 174],
  ['methylpropan', '2-Methylpropan (Isobutan)', 'iso', 4, '0-1 1-2 1-3', 'CH₃–CH(CH₃)–CH₃', -12, 'butan'],
  ['methylbutan', '2-Methylbutan (Isopentan)', 'iso', 5, '0-1 1-2 2-3 1-4', 'CH₃–CH(CH₃)–CH₂–CH₃', 28, 'pentan'],
  ['dimethylpropan', '2,2-Dimethylpropan (Neopentan)', 'iso', 5, '0-1 1-2 1-3 1-4', 'C(CH₃)₄', 10, 'pentan'],
  ['ethen', 'Ethen', 'en', 2, '0=1', 'CH₂=CH₂', -104],
  ['propen', 'Propen', 'en', 3, '0=1 1-2', 'CH₂=CH–CH₃', -48],
  ['but1en', 'But-1-en', 'en', 4, '0=1 1-2 2-3', 'CH₂=CH–CH₂–CH₃', -6, 'buten'],
  ['cisbut2en', 'cis-But-2-en', 'en', 4, '0-1 1=2 2-3', 'CH₃–CH=CH–CH₃ (cis)', 4, 'buten', [2]],
  ['transbut2en', 'trans-But-2-en', 'en', 4, '0-1 1=2 2-3', 'CH₃–CH=CH–CH₃ (trans)', 1, 'buten'],
  ['ethin', 'Ethin (Acetylen)', 'en', 2, '0#1', 'CH≡CH', -84],
  ['propin', 'Propin', 'en', 3, '0#1 1-2', 'CH≡C–CH₃', -23],
];
const TIEF = '₀₁₂₃₄₅₆₇₈₉', tief = n => n === 1 ? '' : String(n).split('').map(c => TIEF[c]).join('');
for (const [k, name, g, nC, cc, halb, sdp, iso, cis] of KW) {
  const bind = cc ? cc.split(' ') : [], frei = new Array(nC).fill(4);
  for (const t of bind) { const [, i, op, j] = t.match(/(\d+)([-=#])(\d+)/); const o = { '-': 1, '=': 2, '#': 3 }[op]; frei[+i] -= o; frei[+j] -= o; }
  const a = new Array(nC).fill('C'); let nH = 0;
  frei.forEach((f, i) => { for (let h = 0; h < f; h++) { bind.push(`${i}-${nC + nH}`); a.push('H'); nH++; } });
  const m = { name, f: `C${tief(nC)}H${tief(nH)}`, g, a: a.join(' '), b: bind.join(' '), halb, sdp, iso, cis, nC, nH };
  if (k === 'methan') m.w = 109.5;
  MOL[k] = m;
}

const GITTER = {
  nacl: { name: 'Natriumchlorid (Kochsalz)', f: 'NaCl', g: 'ion', a0: 5.64 },
  cscl: { name: 'Caesiumchlorid', f: 'CsCl', g: 'ion', a0: 4.12 },
  kupfer: { name: 'Kupfer (kubisch-flächenzentriert)', f: 'Cu', g: 'met', a0: 3.61 },
  eisen: { name: 'Eisen (kubisch-raumzentriert)', f: 'Fe', g: 'met', a0: 2.87 },
  diamant: { name: 'Diamant', f: 'C', g: 'atom', a0: 3.57 },
  graphit: { name: 'Graphit', f: 'C', g: 'atom', a0: 2.46 },
};
const GRUPPEN = { anorg: 'Moleküle – anorganisch', alkan: 'Alkane (homologe Reihe)', iso: 'Isomere', en: 'Alkene und Alkine', org: 'weitere organische Moleküle', ion: 'Ionengitter', met: 'Metallgitter', atom: 'Atomgitter' };
export const standard = () => ({ stoff: 'wasser', darstellung: 'kugelstab', zellen: 2, symbole: false, paare: true, dipol: true, bewegung: false });

// ---------- Molekülstruktur berechnen ----------
function parse(m) {
  const atome = m.a.split(' ').map(t => { const q = t.endsWith('+') ? 1 : t.endsWith('-') ? -1 : 0; return { el: t.replace(/[+-]$/, ''), q, nb: [] }; });
  const bind = m.b.split(' ').map(t => { const [i, op, j] = t.match(/(\d+)([-=#:])(\d+)/).slice(1); const o = { '-': 1, '=': 2, '#': 3, ':': 1.5 }[op]; return { i: +i, j: +j, o }; });
  for (const b of bind) { atome[b.i].nb.push(b.j); atome[b.j].nb.push(b.i); }
  // freie Elektronenpaare: (Valenzelektronen − Bindungselektronen − Ladung) / 2
  for (const [k, a] of atome.entries()) {
    const bindE = bind.filter(b => b.i === k || b.j === k).reduce((s, b) => s + (b.o === 1.5 ? 1.5 : b.o), 0);
    a.lp = Math.max(0, Math.round((EL[a.el].ve - bindE - a.q) / 2));
  }
  return { atome, bind };
}
// Raumstruktur nach dem EPA-Modell aufbauen: jedes Atom erhält eine Richtungsvorlage für seine Elektronenpaare
// (2 linear, 3 trigonal-planar, 4 tetraedrisch); Nachbarn werden gestaffelt (Einfachbindung) bzw. in einer Ebene
// (Doppelbindung) angesetzt. Am Zentralatom gelten die gemessenen Winkel (Wasser 104,5°, Ammoniak 107° …).
const VORLAGE = {
  1: [[0, 0, -1]], 2: [[0, 0, -1], [0, 0, 1]],
  3: [[0, 0, -1], [0.8660, 0, 0.5], [-0.8660, 0, 0.5]],
  4: [[0, 0, -1], [0.9428, 0, 0.3333], [-0.4714, 0.8165, 0.3333], [-0.4714, -0.8165, 0.3333]],
};
function zentralVorlage(b, lp, w) {          // Richtungen: zuerst Bindungen, dann freie Paare
  const r = THREE.MathUtils.degToRad;
  if (w && b === 2 && lp === 2) { const h = r(w / 2), f = r(57); return [[Math.sin(h), 0, -Math.cos(h)], [-Math.sin(h), 0, -Math.cos(h)], [0, Math.sin(f), Math.cos(f)], [0, -Math.sin(f), Math.cos(f)]]; }
  if (w && b === 2 && lp === 1) { const h = r(w / 2); return [[Math.sin(h), 0, -Math.cos(h)], [-Math.sin(h), 0, -Math.cos(h)], [0, 0, 1]]; }
  if (w && b === 3 && lp === 1) { const z = -Math.sqrt((2 * Math.cos(r(w)) + 1) / 3), s = Math.sqrt(1 - z * z); return [0, 1, 2].map(i => [s * Math.cos(i * 2 * Math.PI / 3), s * Math.sin(i * 2 * Math.PI / 3), z]).concat([[0, 0, 1]]); }
  return VORLAGE[b + lp];
}
function struktur(m) {
  const { atome, bind } = parse(m), n = atome.length;
  const P = new Array(n), lpRicht = [], bLaenge = (i, j) => { const b = bind.find(x => (x.i === i && x.j === j) || (x.i === j && x.j === i)); return laenge(atome[i].el, atome[j].el, b.o); };
  if (m.ring) {   // Benzol: ebenes Sechseck
    const R = 1.39;
    m.ring.forEach((k, i) => { const w = i / 6 * Math.PI * 2; P[k] = new THREE.Vector3(R * Math.cos(w), 0, R * Math.sin(w)); });
    for (const k of m.ring) for (const h of atome[k].nb) if (!m.ring.includes(h)) P[h] = P[k].clone().setLength(R + 1.09);
    return { atome, bind, P, lpRicht, n };
  }
  P[0] = new THREE.Vector3();
  const eltern = new Array(n).fill(-1), reihe = [0], fertig = new Set([0]);
  while (reihe.length) {
    const A = reihe.shift(), at = atome[A], B = eltern[A];
    const kinder = at.nb.filter(x => !fertig.has(x)), sn = at.nb.length + at.lp;
    if (!sn) continue;
    let lokal, X, Y, Z;
    if (B < 0) {
      lokal = zentralVorlage(at.nb.length, at.lp, m.w); X = new THREE.Vector3(1, 0, 0); Y = new THREE.Vector3(0, 1, 0); Z = new THREE.Vector3(0, 0, 1);
    } else {
      lokal = VORLAGE[sn];
      const u = new THREE.Vector3().subVectors(P[B], P[A]).normalize();          // zum Elternatom = lokal −Z
      Z = u.clone().negate();
      const G = atome[B].nb.find(x => x !== A && P[x]);
      let v = G !== undefined ? new THREE.Vector3().subVectors(P[G], P[B]) : new THREE.Vector3(0, 1, 0);
      v.addScaledVector(u, -v.dot(u)); if (v.lengthSq() < 1e-6) v = new THREE.Vector3(1, 0, 0).addScaledVector(u, -u.x);
      X = (m.cis && m.cis.includes(A)) ? v.normalize() : v.normalize().negate();   // gestaffelt / in der Ebene gegenüber (cis: gleiche Seite)
      Y = new THREE.Vector3().crossVectors(Z, X);
    }
    const welt = l => X.clone().multiplyScalar(l[0]).addScaledVector(Y, l[1]).addScaledVector(Z, l[2]).normalize();
    let d = B < 0 ? 0 : 1;
    for (const k of kinder) { P[k] = P[A].clone().addScaledVector(welt(lokal[d++]), bLaenge(A, k)); eltern[k] = A; fertig.add(k); reihe.push(k); }
    for (let i = 0; i < at.lp; i++) lpRicht.push({ k: A, d: welt(lokal[d++]) });
  }
  const mitte = P.reduce((a, p) => a.add(p), new THREE.Vector3()).divideScalar(n);
  P.forEach(p => p.sub(mitte));
  return { atome, bind, P, lpRicht, n };
}

// ---------- Darstellung Molekül ----------
const DARST_MOL = { kugelstab: 'Kugel-Stab-Modell', kalotte: 'Kalottenmodell' };
const DARST_GIT = { kugeln: 'Kugelpackung', gitter: 'Gitter mit Elementarzelle' };
const geom = (b, lp) => ({ '1,0': 'linear', '1,1': 'linear', '1,2': 'linear', '1,3': 'linear', '2,0': 'linear', '3,0': 'trigonal-planar', '2,1': 'gewinkelt', '4,0': 'tetraedrisch', '3,1': 'trigonal-pyramidal', '2,2': 'gewinkelt' })[`${b},${lp}`] || '–';
const zahl = (x, d = 1) => x.toFixed(d).replace('.', ',');

function kwInfo(m) {
  const allg = m.g === 'en' ? (m.b.includes('#') ? 'Alkin: C<sub>n</sub>H<sub>2n−2</sub>, eine Dreifachbindung' : 'Alken: C<sub>n</sub>H<sub>2n</sub>, eine Doppelbindung') : 'Alkan: C<sub>n</sub>H<sub>2n+2</sub>, nur Einfachbindungen';
  const zustand = m.sdp < 20 ? 'gasförmig' : m.sdp < 300 ? 'flüssig' : 'fest';
  const geschwister = Object.values(MOL).filter(x => m.iso && x !== m && (x.iso === m.iso || (m.iso && x.name.toLowerCase() === m.iso)));
  let t = `Halbstrukturformel: <b>${m.halb}</b> · ${allg} · Siedetemperatur <b>${m.sdp.toLocaleString('de-DE')} °C</b> → bei 20 °C ${zustand}`;
  if (m.g === 'alkan') t += '<br><i>Homologe Reihe: Jedes Molekül hat eine CH₂-Gruppe mehr als das vorige. Je länger die Kette, desto größer die Oberfläche, desto stärker die Van-der-Waals-Kräfte zwischen den Molekülen – und desto höher die Siedetemperatur.</i>';
  if (m.iso && m.g === 'iso') t += `<br><i>Isomer: gleiche Summenformel ${m.f} wie ${geschwister.map(x => x.name).join(' und ')}, aber anderer Bau. Das verzweigte Molekül ist kugeliger, hat weniger Berührungsfläche und siedet deshalb niedriger.</i>`;
  if (m.cis || m.name.startsWith('trans')) t += '<br><i>cis/trans-Isomerie: Um die Doppelbindung kann sich das Molekül nicht drehen. Bei cis liegen die beiden CH₃-Gruppen auf derselben Seite, bei trans gegenüber.</i>';
  return t;
}

function molekuel(st, wurzel) {
  const m = MOL[st.stoff], S = struktur(m), { atome, bind, P, lpRicht, n } = S;
  const kalotte = st.darstellung === 'kalotte';
  const kugelMat = {};
  const matF = el => kugelMat[el] ||= new THREE.MeshStandardMaterial({ color: EL[el].farbe, roughness: 0.35, metalness: 0.05 });
  atome.forEach((a, k) => {
    const r = kalotte ? EL[a.el].vdw * 0.82 : EL[a.el].kugel;
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 40, 28), matF(a.el)); s.position.copy(P[k]); wurzel.add(s);
    if (st.symbole) { const t = textSprite(a.el + (a.q > 0 ? '⁺' : a.q < 0 ? '⁻' : ''), '#111827', kalotte ? 0.42 : 0.3, 'rgba(255,255,255,0.75)'); t.position.copy(P[k]); wurzel.add(t); }
  });
  if (!kalotte) {
    const bm = new THREE.MeshStandardMaterial({ color: 0xa1a1aa, roughness: 0.4 });
    for (const b of bind) {
      const A = P[b.i], B = P[b.j], ach = new THREE.Vector3().subVectors(B, A).normalize();
      // Versatzrichtung für Mehrfachbindungen: in der Ebene eines Nachbarn
      const andere = [...atome[b.i].nb.filter(x => x !== b.j).map(x => P[x]), ...atome[b.j].nb.filter(x => x !== b.i).map(x => P[x])][0];
      let quer = andere ? new THREE.Vector3().subVectors(andere, A).cross(ach).cross(ach).normalize() : new THREE.Vector3(0, 1, 0).cross(ach).normalize();
      if (quer.lengthSq() < 0.5) quer = new THREE.Vector3(1, 0, 0).cross(ach).normalize();
      const linien = b.o === 1 ? [[0, 0.09]] : b.o === 1.5 ? [[0, 0.08], [0.17, 0.035]] : b.o === 2 ? [[-0.1, 0.065], [0.1, 0.065]] : [[-0.14, 0.05], [0, 0.05], [0.14, 0.05]];
      const quer2 = b.o === 1.5 ? new THREE.Vector3().subVectors(A, new THREE.Vector3()).setLength(1).projectOnPlane(ach).normalize().negate() : quer;
      for (const [off, r] of linien) {
        const v = (b.o === 1.5 ? quer2 : quer).clone().multiplyScalar(off);
        const c = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 12), bm); c.applyMatrix4(zylinderMatrix(A.clone().add(v), B.clone().add(v), r)); wurzel.add(c);
      }
    }
    // freie Elektronenpaare als Keulen mit zwei Punkten
    if (st.paare) {
      const lpMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, transparent: true, opacity: 0.55, roughness: 0.3, depthWrite: false });
      for (const { k, d } of lpRicht) {
        const keule = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), lpMat); keule.scale.set(0.17, 0.32, 0.17);
        keule.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); keule.position.copy(P[k]).addScaledVector(d, EL[atome[k].el].kugel + 0.22); wurzel.add(keule);
        const q = new THREE.Vector3().crossVectors(d, Math.abs(d.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)).normalize();
        for (const sg of [-1, 1]) { const pt = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: 0x111827 })); pt.position.copy(keule.position).addScaledVector(q, sg * 0.07).addScaledVector(d, 0.05); wurzel.add(pt); }
      }
    }
    // Bindungswinkel am Zentralatom
    const c = atome[0];
    const nbs = c.nb.filter(x => atome[x].el !== undefined);
    if (nbs.length >= 2 && m.w && m.w < 179) {
      const a = new THREE.Vector3().subVectors(P[nbs[0]], P[0]).normalize(), b = new THREE.Vector3().subVectors(P[nbs[1]], P[0]).normalize();
      const w = a.angleTo(b), pts = [];
      for (let i = 0; i <= 24; i++) pts.push(P[0].clone().addScaledVector(a.clone().lerp(b, i / 24).normalize(), 0.62));
      wurzel.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x7c3aed })));
      const t = textSprite(`${zahl(m.w)}°`, '#6d28d9', 0.26); t.position.copy(P[0]).addScaledVector(a.clone().add(b).normalize(), 0.98); wurzel.add(t);
      void w;
    }
  }
  // Polarität: Partialladungen und Dipol
  const dipol = new THREE.Vector3(); const partial = new Array(n).fill(0);
  for (const b of bind) {
    const d = EL[atome[b.j].el].en - EL[atome[b.i].el].en;
    dipol.addScaledVector(new THREE.Vector3().subVectors(P[b.j], P[b.i]).normalize(), d);   // zeigt zum elektronegativeren Atom (δ−)
    if (Math.abs(d) >= 0.4) { partial[b.i] -= Math.sign(d); partial[b.j] += Math.sign(d); }
  }
  const polar = dipol.length() > 0.3 && !atome.some(a => a.q);
  if (st.dipol && !atome.some(a => a.q)) {
    atome.forEach((a, k) => {
      if (!partial[k]) return;
      const t = textSprite(partial[k] > 0 ? 'δ−' : 'δ+', partial[k] > 0 ? '#1d4ed8' : '#b91c1c', 0.26, 'rgba(255,255,255,0)');
      const weg = P[k].clone().sub(new THREE.Vector3()).setLength(1).multiplyScalar(kalotte ? EL[a.el].vdw * 0.9 + 0.2 : EL[a.el].kugel + 0.35);
      if (weg.lengthSq() < 1e-4) weg.set(0, 0.6, 0);
      t.position.copy(P[k]).add(weg).add(new THREE.Vector3(0, 0.25, 0)); wurzel.add(t);
    });
    if (polar) {
      const d = dipol.clone().normalize(), l = 2.2, start = d.clone().multiplyScalar(-l / 2).add(new THREE.Vector3(0, kalotte ? -2.6 : -1.8, 0));
      const g = new THREE.Group(), mm = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
      const sch = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, l * 0.8, 10), mm); sch.position.y = l * 0.4; g.add(sch);
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.14, l * 0.2, 14), mm); sp.position.y = l * 0.9; g.add(sp);
      const kr = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.35, 8), mm); kr.rotation.z = Math.PI / 2; kr.position.y = 0.2; g.add(kr);
      g.position.copy(start); g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); wurzel.add(g);
      const t = textSprite('Dipol', '#b45309', 0.26); t.position.copy(start).addScaledVector(d, l / 2).add(new THREE.Vector3(0, -0.35, 0)); wurzel.add(t);
    }
  }
  // Info
  const zaehl = {}; atome.forEach(a => zaehl[a.el] = (zaehl[a.el] || 0) + 1);
  const zentral = atome[0], geoName = zentral.nb.length >= 2 ? geom(zentral.nb.length, zentral.lp) : 'linear';
  const lpSumme = atome.reduce((s, a) => s + a.lp, 0);
  const z = [
    `<b>${m.name}</b> · ${m.f} · ${Object.entries(zaehl).map(([e, k]) => `${k} ${EL[e].name}`).join(', ')}`,
    `${bind.length} Bindungen${bind.some(b => b.o === 2) ? ' (mit Doppelbindung)' : ''}${bind.some(b => b.o === 3) ? ' (mit Dreifachbindung)' : ''}${bind.some(b => b.o === 1.5) ? ' (Ring mit 6 gleichwertigen Bindungen)' : ''} · ${lpSumme} freie Elektronenpaare`
      + (m.g === 'anorg' || ['methan', 'ethen', 'ethin', 'methanal', 'tetrachlormethan'].includes(st.stoff) ? ` · Form am ${EL[zentral.el].name}-Atom: <b>${geoName}</b>${m.w ? ` (${zahl(m.w)}°)` : ''}` : ''),
    ...(m.halb ? [kwInfo(m)] : []),
    atome.some(a => a.q) ? 'Ion: trägt eine Ladung.' : polar ? '<b>polares Molekül (Dipol)</b>: Die Ladungsschwerpunkte fallen nicht zusammen.' : '<b>unpolares Molekül</b>: Die Bindungsdipole heben sich auf (oder es gibt keine).',
    `<i>${kalotte ? 'Kalottenmodell: Die Kugeln zeigen den Raum, den die Atome einnehmen (Van-der-Waals-Radien).' : 'Kugel-Stab-Modell: Kugeln = Atome, Stäbe = Elektronenpaarbindungen, gelbe Keulen = freie Elektronenpaare.'} Elektronenpaare stoßen sich ab und ordnen sich mit größtmöglichem Abstand an (EPA-Modell); freie Paare brauchen etwas mehr Platz und drücken die Bindungen zusammen. Abstände maßstäblich (Bindungslängen 0,07–0,2 nm).</i>`,
  ];
  return { info: z.join('<br>'), titel: `${m.name} (${m.f})`, radius: Math.max(...P.map(p => p.length())) + (kalotte ? 1.6 : 1.0) };
}

// ---------- Gitter ----------
function gitter(st, wurzel) {
  const G = GITTER[st.stoff], n = st.zellen, a = G.a0, kugeln = st.darstellung === 'kugeln';
  const teilchen = [];   // { p, el, r, ladung }
  const bonds = [];
  const add = (x, y, z, el, r, q = 0) => teilchen.push({ p: new THREE.Vector3(x, y, z), el, r, q });
  const imWuerfel = (i, j, k, m) => i >= 0 && j >= 0 && k >= 0 && i <= m && j <= m && k <= m;
  if (st.stoff === 'nacl') for (let i = 0; i <= 2 * n; i++) for (let j = 0; j <= 2 * n; j++) for (let k = 0; k <= 2 * n; k++) ((i + j + k) % 2 ? add(i * a / 2, j * a / 2, k * a / 2, 'Na', 1.02, 1) : add(i * a / 2, j * a / 2, k * a / 2, 'Cl', 1.81, -1));
  if (st.stoff === 'cscl') { for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) for (let k = 0; k <= n; k++) add(i * a, j * a, k * a, 'Cl', 1.81, -1); for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) add((i + 0.5) * a, (j + 0.5) * a, (k + 0.5) * a, 'Cs', 1.74, 1); }
  if (st.stoff === 'kupfer') for (let i = 0; i <= 2 * n; i++) for (let j = 0; j <= 2 * n; j++) for (let k = 0; k <= 2 * n; k++) if ((i + j + k) % 2 === 0) add(i * a / 2, j * a / 2, k * a / 2, 'Cu', 1.28);
  if (st.stoff === 'eisen') { for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) for (let k = 0; k <= n; k++) add(i * a, j * a, k * a, 'Fe', 1.24); for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) add((i + 0.5) * a, (j + 0.5) * a, (k + 0.5) * a, 'Fe', 1.24); }
  if (st.stoff === 'diamant') {
    const m = 4 * n;
    for (let i = 0; i <= m; i++) for (let j = 0; j <= m; j++) for (let k = 0; k <= m; k++) {
      // Diamantstruktur in Viertel-Koordinaten: kfz (alle gerade, Summe ≡ 0 mod 4) und um (1,1,1) verschoben
      const gerade = i % 2 === 0 && j % 2 === 0 && k % 2 === 0 && (i + j + k) % 4 === 0;
      const ungerade = i % 2 === 1 && j % 2 === 1 && k % 2 === 1 && (i + j + k - 3) % 4 === 0;
      if (gerade || ungerade) add(i * a / 4, j * a / 4, k * a / 4, 'C', 0.77);
    }
    for (let x = 0; x < teilchen.length; x++) for (let y = x + 1; y < teilchen.length; y++) if (Math.abs(teilchen[x].p.distanceTo(teilchen[y].p) - a * Math.sqrt(3) / 4) < 0.05) bonds.push([x, y]);
  }
  if (st.stoff === 'graphit') {
    const d = 1.42, c = 3.35, R = n + 1;
    for (let lage = 0; lage < 3; lage++) {
      const ver = lage % 2 ? d : 0;
      for (let i = -R; i <= R; i++) for (let j = -R; j <= R; j++) {
        const bx = i * a + j * a / 2, bz = j * a * Math.sqrt(3) / 2;
        for (const [ox, oz] of [[0, 0], [0, d]]) { const x = bx + ox, z = bz + oz + ver; if (Math.hypot(x, z) <= R * a * 0.95) add(x, lage * c, z, 'C', 0.77); }
      }
    }
    for (let x = 0; x < teilchen.length; x++) for (let y = x + 1; y < teilchen.length; y++) if (Math.abs(teilchen[x].p.distanceTo(teilchen[y].p) - d) < 0.05) bonds.push([x, y]);
  }
  void imWuerfel;
  const mitte = teilchen.reduce((s, t) => s.add(t.p), new THREE.Vector3()).divideScalar(teilchen.length);
  teilchen.forEach(t => t.p.sub(mitte));
  const matF = {};
  const mat = el => matF[el] ||= new THREE.MeshStandardMaterial({ color: EL[el].farbe, roughness: 0.35, metalness: ['Cu', 'Fe'].includes(el) ? 0.5 : 0.05 });
  // Instanzen je Element
  const nachEl = {};
  teilchen.forEach(t => (nachEl[t.el] ||= []).push(t));
  for (const [el, liste] of Object.entries(nachEl)) {
    const r0 = kugeln ? liste[0].r : (st.stoff === 'diamant' || st.stoff === 'graphit' ? 0.28 : liste[0].r * 0.3);
    const im = new THREE.InstancedMesh(new THREE.SphereGeometry(r0, 32, 22), mat(el), liste.length);
    liste.forEach((t, i) => im.setMatrixAt(i, new THREE.Matrix4().makeTranslation(t.p.x, t.p.y, t.p.z)));
    wurzel.add(im);
  }
  if (!kugeln || st.stoff === 'diamant' || st.stoff === 'graphit') {
    // Verbindungslinien zu nächsten Nachbarn
    const linMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.5 });
    let paare = bonds;
    if (!paare.length) {
      const dn = { nacl: a / 2, cscl: a * Math.sqrt(3) / 2, kupfer: a / Math.SQRT2, eisen: a * Math.sqrt(3) / 2 }[st.stoff];
      paare = [];
      for (let x = 0; x < teilchen.length; x++) for (let y = x + 1; y < teilchen.length; y++) if (Math.abs(teilchen[x].p.distanceTo(teilchen[y].p) - dn) < 0.05) paare.push([x, y]);
    }
    if (paare.length < 4000 && !(kugeln && st.stoff !== 'diamant' && st.stoff !== 'graphit')) {
      const im = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 8), linMat, paare.length);
      paare.forEach(([x, y], i) => im.setMatrixAt(i, zylinderMatrix(teilchen[x].p, teilchen[y].p, 0.06)));
      wurzel.add(im);
    }
  }
  // Elementarzelle hervorheben
  if (st.stoff !== 'graphit') {
    const o = new THREE.Vector3(0, 0, 0).sub(mitte), box = new THREE.BoxGeometry(a, a, a); box.translate(a / 2, a / 2, a / 2);
    const kanten = new THREE.LineSegments(new THREE.EdgesGeometry(box), new THREE.LineBasicMaterial({ color: 0xf59e0b }));
    kanten.position.copy(o); wurzel.add(kanten);
    if (st.symbole) { const t = textSprite(`Elementarzelle  a = ${zahl(a / 10, 3)} nm`, '#b45309', 0.42); t.position.copy(o).add(new THREE.Vector3(a / 2, -0.9, a + 0.3)); wurzel.add(t); }
  }
  if (st.symbole && G.g === 'ion') {
    for (const [el, q] of Object.entries(nachEl).map(([e, l]) => [e, l[0].q])) {
      const t0 = nachEl[el].reduce((best, t) => (t.p.x + t.p.y + t.p.z > best.p.x + best.p.y + best.p.z ? t : best));
      const s = textSprite(`${el}${q > 0 ? '⁺' : '⁻'}`, '#111827', 0.55); s.position.copy(t0.p).add(new THREE.Vector3(0, t0.r + 0.6, 0)); wurzel.add(s);
    }
  }
  const TEXT = {
    nacl: ['Koordinationszahl 6 : 6 – jedes Na⁺ ist von 6 Cl⁻ umgeben und umgekehrt.', 'Ionenbindung: Natrium gibt ein Elektron an Chlor ab, die entgegengesetzt geladenen Ionen ziehen sich in alle Richtungen an. Daher bilden sie ein Gitter statt einzelner Moleküle. Salze sind hart, spröde, schmelzen erst bei hohen Temperaturen (NaCl: 801 °C) und leiten geschmolzen oder gelöst den Strom. Cl⁻ ist deutlich größer als Na⁺ (Radien 0,181 und 0,102 nm).'],
    cscl: ['Koordinationszahl 8 : 8 – jedes Cs⁺ sitzt im Würfelzentrum, umgeben von 8 Cl⁻.', 'Cs⁺ ist viel größer als Na⁺, deshalb passen mehr Gegenionen um ein Ion. Das Verhältnis der Ionenradien bestimmt den Gittertyp.'],
    kupfer: ['Kubisch-flächenzentriert: Atome an den Ecken und in den Flächenmitten, Koordinationszahl 12 (dichteste Kugelpackung).', 'Metallbindung: Die Atomrümpfe bilden ein Gitter, die Außenelektronen bewegen sich frei als „Elektronengas“. Deshalb leiten Metalle Strom und Wärme, glänzen und lassen sich verformen – die Schichten können aneinander abgleiten.'],
    eisen: ['Kubisch-raumzentriert: Atome an den Ecken und eines in der Würfelmitte, Koordinationszahl 8.', 'Metallbindung mit frei beweglichen Außenelektronen. Eisen hat bei Raumtemperatur diese Struktur; über 912 °C wechselt es ins kubisch-flächenzentrierte Gitter.'],
    diamant: ['Jedes C-Atom ist tetraedrisch an 4 andere gebunden (Atombindungen in alle Raumrichtungen).', 'Das starre dreidimensionale Netz aus Atombindungen macht Diamant zum härtesten natürlichen Stoff. Er leitet keinen Strom, weil alle Außenelektronen in Bindungen festgelegt sind. C–C-Abstand 0,154 nm.'],
    graphit: ['Jedes C-Atom ist an 3 andere gebunden: ebene Sechseck-Schichten, die nur schwach zusammenhalten (Abstand 0,335 nm).', 'Die Schichten gleiten leicht aufeinander ab – deshalb schreibt ein Bleistift. Das vierte Außenelektron jedes Atoms ist innerhalb der Schicht beweglich: Graphit leitet den Strom. Gleiches Element wie Diamant, andere Anordnung, ganz andere Eigenschaften.'],
  }[st.stoff];
  const z = [`<b>${G.name}</b> · ${G.f} · ${GRUPPEN[G.g].slice(0, -1)}`, TEXT[0], `<i>${TEXT[1]} ${kugeln ? 'Kugelpackung: Teilchen mit ihren echten Radien.' : 'Gitterdarstellung: Teilchen verkleinert, Linien zu den nächsten Nachbarn; orange: eine Elementarzelle.'}</i>`];
  const R = teilchen.reduce((m, t) => Math.max(m, t.p.length() + t.r), 0);
  return { info: z.join('<br>'), titel: G.name, radius: R * 1.05 };
}

// =====================================================================
export function erzeuge(st) {
  const wurzel = new THREE.Group(), dreh = new THREE.Group(); wurzel.add(dreh);
  const istGitter = !!GITTER[st.stoff];
  const e = istGitter ? gitter(st, dreh) : molekuel(st, dreh);
  return {
    objekt: wurzel, radius: e.radius, titel: e.titel, info: e.info,
    update: dt => { if (st.bewegung) dreh.rotation.y += dt * 0.25; },
  };
}
export const entsorge = entsorgeObj;

export function ausUrl(p) {
  const st = standard();
  const s = p.get('s'); if (MOL[s] || GITTER[s]) st.stoff = s;
  const d = p.get('d'); if (DARST_MOL[d] || DARST_GIT[d]) st.darstellung = d;
  if (GITTER[st.stoff] && !DARST_GIT[st.darstellung]) st.darstellung = 'kugeln';
  if (MOL[st.stoff] && !DARST_MOL[st.darstellung]) st.darstellung = 'kugelstab';
  const z = +p.get('n'); if (z >= 1 && z <= 3) st.zellen = z;
  return st;
}
export const zuUrl = st => `&s=${st.stoff}&d=${st.darstellung}${GITTER[st.stoff] ? '&n=' + st.zellen : ''}`;

export function bedienung(ort, st, neu) {
  stil(); ort.innerHTML = '';
  const sStoff = document.createElement('select'); sStoff.title = 'Stoff wählen';
  for (const [gk, gname] of Object.entries(GRUPPEN)) {
    const og = document.createElement('optgroup'); og.label = gname;
    for (const [k, v] of [...Object.entries(MOL), ...Object.entries(GITTER)]) if (v.g === gk) og.appendChild(new Option(`${v.name} (${v.f})`, k));
    sStoff.appendChild(og);
  }
  ort.appendChild(sStoff);
  const sDar = document.createElement('select'); ort.appendChild(sDar);
  const zellen = zahlKnopf(ort, 'Anzahl der Elementarzellen je Richtung');
  const knopf = t => { const b = document.createElement('button'); b.textContent = t; ort.appendChild(b); return b; };
  const bSym = knopf('Beschriftung'), bPaar = knopf('Elektronenpaare'), bDip = knopf('Ladungen/Dipol'), bBew = knopf('Drehen');
  function auffrischen() {
    const git = !!GITTER[st.stoff];
    sStoff.value = st.stoff;
    sDar.innerHTML = ''; for (const [k, v] of Object.entries(git ? DARST_GIT : DARST_MOL)) sDar.add(new Option(v, k));
    if (!(git ? DARST_GIT : DARST_MOL)[st.darstellung]) st.darstellung = git ? 'kugeln' : 'kugelstab';
    sDar.value = st.darstellung;
    zellen.w.hidden = !git || st.stoff === 'graphit'; zellen.t.textContent = `${st.zellen} Zelle${st.zellen > 1 ? 'n' : ''}`; zellen.m.disabled = st.zellen <= 1; zellen.p.disabled = st.zellen >= 3;
    bPaar.hidden = git || st.darstellung === 'kalotte'; bDip.hidden = git;
    bSym.classList.toggle('on', st.symbole); bPaar.classList.toggle('on', st.paare); bDip.classList.toggle('on', st.dipol); bBew.classList.toggle('on', st.bewegung);
  }
  const aendern = (f, bauen = true) => () => { f(); auffrischen(); if (bauen) neu(); };
  sStoff.onchange = aendern(() => st.stoff = sStoff.value);
  sDar.onchange = aendern(() => st.darstellung = sDar.value);
  zellen.m.onclick = aendern(() => st.zellen--); zellen.p.onclick = aendern(() => st.zellen++);
  bSym.onclick = aendern(() => st.symbole = !st.symbole); bPaar.onclick = aendern(() => st.paare = !st.paare);
  bDip.onclick = aendern(() => st.dipol = !st.dipol); bBew.onclick = aendern(() => st.bewegung = !st.bewegung, false);
  auffrischen();
}

// Für Tests: berechnete Struktur abfragen
export const _struktur = k => { const s = struktur(MOL[k]); return { P: s.P.map(p => p.toArray()), atome: s.atome.map(a => a.el) }; };
