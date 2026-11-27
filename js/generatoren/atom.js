// Atomgenerator: erzeugt Atommodelle für alle 118 Elemente – ohne fremde Modelldateien.
// Darstellungen: Kern-Hülle-Modell, Schalenmodell (Kugelschalen), Bohr'sches Modell (Kreisbahnen), Orbitalmodell.
// Isotope (Neutronenzahl) und Ionen (Ladung) einstellbar. Genutzt von viewer.html und tafel.html.
import * as THREE from 'three';

// ---------- Elementdaten: Symbol, deutscher Name, Massenzahl des häufigsten (bzw. stabilsten) Isotops ----------
const ROH = `H Wasserstoff 1|He Helium 4|Li Lithium 7|Be Beryllium 9|B Bor 11|C Kohlenstoff 12|N Stickstoff 14|O Sauerstoff 16|F Fluor 19|Ne Neon 20|
Na Natrium 23|Mg Magnesium 24|Al Aluminium 27|Si Silicium 28|P Phosphor 31|S Schwefel 32|Cl Chlor 35|Ar Argon 40|K Kalium 39|Ca Calcium 40|
Sc Scandium 45|Ti Titan 48|V Vanadium 51|Cr Chrom 52|Mn Mangan 55|Fe Eisen 56|Co Cobalt 59|Ni Nickel 58|Cu Kupfer 63|Zn Zink 64|
Ga Gallium 69|Ge Germanium 74|As Arsen 75|Se Selen 80|Br Brom 79|Kr Krypton 84|Rb Rubidium 85|Sr Strontium 88|Y Yttrium 89|Zr Zirconium 90|
Nb Niob 93|Mo Molybdän 98|Tc Technetium 98|Ru Ruthenium 102|Rh Rhodium 103|Pd Palladium 106|Ag Silber 107|Cd Cadmium 114|In Indium 115|Sn Zinn 120|
Sb Antimon 121|Te Tellur 130|I Iod 127|Xe Xenon 132|Cs Caesium 133|Ba Barium 138|La Lanthan 139|Ce Cer 140|Pr Praseodym 141|Nd Neodym 142|
Pm Promethium 145|Sm Samarium 152|Eu Europium 153|Gd Gadolinium 158|Tb Terbium 159|Dy Dysprosium 164|Ho Holmium 165|Er Erbium 166|Tm Thulium 169|Yb Ytterbium 174|
Lu Lutetium 175|Hf Hafnium 180|Ta Tantal 181|W Wolfram 184|Re Rhenium 187|Os Osmium 192|Ir Iridium 193|Pt Platin 195|Au Gold 197|Hg Quecksilber 202|
Tl Thallium 205|Pb Blei 208|Bi Bismut 209|Po Polonium 209|At Astat 210|Rn Radon 222|Fr Francium 223|Ra Radium 226|Ac Actinium 227|Th Thorium 232|
Pa Protactinium 231|U Uran 238|Np Neptunium 237|Pu Plutonium 244|Am Americium 243|Cm Curium 247|Bk Berkelium 247|Cf Californium 251|Es Einsteinium 252|Fm Fermium 257|
Md Mendelevium 258|No Nobelium 259|Lr Lawrencium 266|Rf Rutherfordium 267|Db Dubnium 268|Sg Seaborgium 269|Bh Bohrium 270|Hs Hassium 270|Mt Meitnerium 278|Ds Darmstadtium 281|
Rg Roentgenium 282|Cn Copernicium 285|Nh Nihonium 286|Fl Flerovium 289|Mc Moscovium 290|Lv Livermorium 293|Ts Tenness 294|Og Oganesson 294`;
export const ELEMENTE = ROH.split('|').map((s, i) => { const [sym, name, a] = s.trim().split(' '); return { z: i + 1, sym, name, a: +a }; });

// Natürliche Isotope der Elemente 1–20 (alle stabilen + wichtige radioaktive) und Uran
const ISOTOPE = {
  1: { stabil: [1, 2], radioaktiv: [3], namen: { 1: 'Protium', 2: 'Deuterium', 3: 'Tritium' } },
  2: { stabil: [3, 4] }, 3: { stabil: [6, 7] }, 4: { stabil: [9] }, 5: { stabil: [10, 11] },
  6: { stabil: [12, 13], radioaktiv: [14] }, 7: { stabil: [14, 15] }, 8: { stabil: [16, 17, 18] }, 9: { stabil: [19] },
  10: { stabil: [20, 21, 22] }, 11: { stabil: [23] }, 12: { stabil: [24, 25, 26] }, 13: { stabil: [27] },
  14: { stabil: [28, 29, 30] }, 15: { stabil: [31] }, 16: { stabil: [32, 33, 34, 36] }, 17: { stabil: [35, 37] },
  18: { stabil: [36, 38, 40] }, 19: { stabil: [39, 41], radioaktiv: [40] }, 20: { stabil: [40, 42, 43, 44, 46], praktisch: [48] },
  92: { radioaktiv: [234, 235, 238] },
};
function stabilitaet(z, a) {
  const i = ISOTOPE[z];
  if (z <= 20) {
    if (i.stabil.includes(a)) return 'stabil';
    if (i.praktisch && i.praktisch.includes(a)) return 'praktisch stabil (Halbwertszeit weit über dem Alter des Universums)';
    return 'radioaktiv' + (i.radioaktiv && i.radioaktiv.includes(a) ? ' (kommt in der Natur vor)' : ' (künstlich)');
  }
  if (z === 43 || z === 61 || z >= 84) return 'radioaktiv – das Element hat kein stabiles Isotop';
  if (z === 83) return 'praktisch stabil (Bi-209 zerfällt extrem langsam)';
  if (i && i.radioaktiv.includes(a)) return 'radioaktiv (kommt in der Natur vor)';
  return null;
}

// ---------- Periodensystem: Lage und Elementfamilie ----------
const PERIODENENDE = [2, 10, 18, 36, 54, 86, 118];
export function lage(z) {
  const p = PERIODENENDE.findIndex(e => z <= e) + 1, start = p === 1 ? 1 : PERIODENENDE[p - 2] + 1, i = z - start;
  if (p === 1) return { periode: 1, gruppe: z === 1 ? 1 : 18 };
  if (p <= 3) return { periode: p, gruppe: i < 2 ? i + 1 : i + 11 };
  if (p <= 5) return { periode: p, gruppe: i + 1 };
  if (i < 2) return { periode: p, gruppe: i + 1 };
  if (i <= 16) return { periode: p, gruppe: 3, f: i - 2 };          // Lanthanoide / Actinoide (eigene Zeile)
  return { periode: p, gruppe: i - 13 };
}
const HALBMETALLE = [5, 14, 32, 33, 51, 52], NICHTMETALLE = [1, 6, 7, 8, 15, 16, 34], HALOGENE = [9, 17, 35, 53, 85, 117];
export const FAMILIEN = {
  alkali: ['Alkalimetalle', '#ffab91'], erdalkali: ['Erdalkalimetalle', '#ffcc80'], uebergang: ['Übergangsmetalle', '#90caf9'],
  lanthanoid: ['Lanthanoide', '#ce93d8'], actinoid: ['Actinoide', '#f48fb1'], metall: ['Metalle', '#b0bec5'],
  halbmetall: ['Halbmetalle', '#a5d6a7'], nichtmetall: ['Nichtmetalle', '#fff59d'], halogen: ['Halogene', '#80deea'], edelgas: ['Edelgase', '#b39ddb'],
};
export function familie(z) {
  const { gruppe } = lage(z);
  if (z >= 57 && z <= 71) return 'lanthanoid';
  if (z >= 89 && z <= 103) return 'actinoid';
  if (HALBMETALLE.includes(z)) return 'halbmetall';
  if (NICHTMETALLE.includes(z)) return 'nichtmetall';
  if (HALOGENE.includes(z)) return 'halogen';
  if (gruppe === 18) return 'edelgas';
  if (gruppe === 1) return 'alkali';
  if (gruppe === 2) return 'erdalkali';
  if (gruppe >= 3 && gruppe <= 12) return 'uebergang';
  return 'metall';
}

// ---------- Elektronenkonfiguration ----------
const L_BUCHST = 'spdf';
const REIHENFOLGE = ['1s', '2s', '2p', '3s', '3p', '4s', '3d', '4p', '5s', '4d', '5p', '6s', '4f', '5d', '6p', '7s', '5f', '6d', '7p']
  .map(s => ({ name: s, n: +s[0], l: L_BUCHST.indexOf(s[1]) }));
const KAPAZ = l => 2 * (2 * l + 1);
// Bekannte Abweichungen vom Aufbauprinzip (Grundzustand neutraler Atome)
const AUSNAHMEN = {
  24: { '3d': 5, '4s': 1 }, 29: { '3d': 10, '4s': 1 }, 41: { '4d': 4, '5s': 1 }, 42: { '4d': 5, '5s': 1 }, 44: { '4d': 7, '5s': 1 },
  45: { '4d': 8, '5s': 1 }, 46: { '4d': 10, '5s': 0 }, 47: { '4d': 10, '5s': 1 }, 57: { '4f': 0, '5d': 1 }, 58: { '4f': 1, '5d': 1 },
  64: { '4f': 7, '5d': 1 }, 78: { '5d': 9, '6s': 1 }, 79: { '5d': 10, '6s': 1 }, 89: { '5f': 0, '6d': 1 }, 90: { '5f': 0, '6d': 2 },
  91: { '5f': 2, '6d': 1 }, 92: { '5f': 3, '6d': 1 }, 93: { '5f': 4, '6d': 1 }, 96: { '5f': 7, '6d': 1 }, 103: { '6d': 0, '7p': 1 },
};
// Liefert [{ name, n, l, e }] in Aufbaureihenfolge (nur besetzte Unterschalen)
export function konfiguration(z, ladung = 0) {
  const k = new Map(REIHENFOLGE.map(u => [u.name, 0]));
  let rest = z;
  for (const u of REIHENFOLGE) { const e = Math.min(rest, KAPAZ(u.l)); k.set(u.name, e); rest -= e; }
  if (AUSNAHMEN[z]) for (const [u, e] of Object.entries(AUSNAHMEN[z])) k.set(u, e);
  if (ladung > 0) {          // Kation: zuerst aus der äußersten Schale (höchstes n, dann höchstes l) entfernen
    for (let i = 0; i < ladung; i++) {
      const u = REIHENFOLGE.filter(u => k.get(u.name) > 0).sort((a, b) => b.n - a.n || b.l - a.l)[0];
      if (!u) break; k.set(u.name, k.get(u.name) - 1);
    }
  } else if (ladung < 0) {   // Anion: nächste freie Plätze nach dem Aufbauprinzip
    for (let i = 0; i < -ladung; i++) {
      const u = REIHENFOLGE.find(u => k.get(u.name) < KAPAZ(u.l)); if (u) k.set(u.name, k.get(u.name) + 1);
    }
  }
  return REIHENFOLGE.filter(u => k.get(u.name) > 0).map(u => ({ ...u, e: k.get(u.name) }));
}
const SCHALEN = 'KLMNOPQ';
export function schalen(konf) {
  const s = [0, 0, 0, 0, 0, 0, 0];
  for (const u of konf) s[u.n - 1] += u.e;
  while (s.length && !s[s.length - 1]) s.pop();
  return s;
}
const HOCH = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '+': '⁺', '-': '⁻' };
const hoch = s => String(s).split('').map(c => HOCH[c] || c).join('');
const ladungText = q => q === 0 ? '' : (Math.abs(q) === 1 ? '' : Math.abs(q)) + (q > 0 ? '+' : '-');
const ROEMISCH = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

// Hundsche Regel: Elektronen erst einzeln, dann gepaart auf die Orbitale einer Unterschale
function besetzung(l, e) {
  const m = 2 * l + 1, b = new Array(m).fill(0);
  for (let i = 0; i < e; i++) b[i % m]++;
  return b;
}

// ---------- Orbitalformen (reelle Kugelflächenfunktionen; „oben“ = z-Achse) ----------
const ORBITALE = [
  [['s', () => 1]],
  [['px', (x) => x], ['py', (x, y) => y], ['pz', (x, y, z) => z]],
  [['dz²', (x, y, z) => 3 * z * z - 1], ['dxz', (x, y, z) => x * z], ['dyz', (x, y, z) => y * z], ['dxy', (x, y) => x * y], ['dx²−y²', (x, y) => x * x - y * y]],
  [['fz³', (x, y, z) => z * (5 * z * z - 3)], ['fxz²', (x, y, z) => x * (5 * z * z - 1)], ['fyz²', (x, y, z) => y * (5 * z * z - 1)],
   ['fxyz', (x, y, z) => x * y * z], ['fz(x²−y²)', (x, y, z) => z * (x * x - y * y)], ['fx(x²−3y²)', (x, y) => x * (x * x - 3 * y * y)], ['fy(3x²−y²)', (x, y) => y * (3 * x * x - y * y)]],
];
const ORB_FARBEN = [0xe53935, 0x1e88e5, 0x43a047, 0xfb8c00, 0x8e24aa, 0x00acc1, 0xfdd835];
function orbitalGeometrie(f, groesse, segmente) {
  const g = new THREE.SphereGeometry(1, segmente, Math.round(segmente * 0.66));
  const p = g.attributes.position, werte = [], v = new THREE.Vector3();
  let max = 0;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    const w = f(v.x, -v.z, v.y);                    // three.js: y nach oben → Orbital-z = y
    werte.push(w); max = Math.max(max, Math.abs(w));
  }
  const farben = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize().multiplyScalar(Math.max((werte[i] / max) ** 2, 0.002) * groesse);
    p.setXYZ(i, v.x, v.y, v.z);
    const t = werte[i] >= 0 ? 1 : 0.62;              // Vorzeichen der Wellenfunktion: heller / dunkler Farbton
    farben.set([t, t, t], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(farben, 3));
  g.computeVertexNormals();
  // Richtung der größten Keule (für die Beschriftung)
  let spitze = new THREE.Vector3(0, 1, 0), best = -1;
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const l = v.length() + v.y * 1e-3 + v.x * 1e-4; if (l > best) { best = l; spitze = v.clone(); } }
  g.userData.spitze = spitze;
  return g;
}

// ---------- Hilfen ----------
function zufall(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
function textSprite(text, farbe = '#1f2937', hoehe = 0.16) {
  const c = document.createElement('canvas'), g = c.getContext('2d');
  g.font = 'bold 64px system-ui, sans-serif';
  c.width = Math.ceil(g.measureText(text).width) + 24; c.height = 84;
  g.font = 'bold 64px system-ui, sans-serif'; g.textBaseline = 'middle';
  g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.roundRect(0, 0, c.width, c.height, 18); g.fill();
  g.fillStyle = farbe; g.fillText(text, 12, 44);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
  s.scale.set(hoehe * c.width / c.height, hoehe, 1); s.renderOrder = 10;
  return s;
}
function fibonacci(k, r) {
  const pts = [], gold = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < k; i++) {
    const y = k === 1 ? 0 : 1 - 2 * (i + 0.5) / k, rr = Math.sqrt(1 - y * y), th = i * gold;
    pts.push(new THREE.Vector3(Math.cos(th) * rr * r, y * r, Math.sin(th) * rr * r));
  }
  return pts;
}

const FARBE = { proton: 0xe53935, neutron: 0xb0b7c0, elektron: 0x1e63d6, aussen: 0xf59e0b };
const R_NUKLEON = 0.06, R_ELEKTRON = 0.055;

// Protonen und Neutronen gut durchmischen: Protonen stoßen sich ab, also soll ein Proton möglichst
// wenige Protonen als direkte Nachbarn haben (und wenige in der zweiten Nachbarschaft). Start zufällig,
// dann so lange Proton und Neutron tauschen, wie dadurch Proton-Proton-Berührungen verschwinden.
// Bewusst nur Nachbarschaft: eine Abstoßung über den ganzen Kern würde die Protonen nach außen drängen.
function protonenVerteilen(pos, z, zuf) {
  const a = pos.length, art = Array.from({ length: a }, (_, i) => i < z);
  for (let i = a - 1; i > 0; i--) { const j = Math.floor(zuf() * (i + 1)); [art[i], art[j]] = [art[j], art[i]]; }
  if (z === 0 || z >= a) return art;
  const d1 = (R_NUKLEON * 1.9 * 1.15) ** 2, d2 = (R_NUKLEON * 1.9 * 1.75) ** 2;
  const nah = pos.map(() => []), weiter = pos.map(() => []);
  for (let i = 0; i < a; i++) for (let j = i + 1; j < a; j++) {
    const q = pos[i].distanceToSquared(pos[j]);
    if (q < d1) { nah[i].push(j); nah[j].push(i); } else if (q < d2) { weiter[i].push(j); weiter[j].push(i); }
  }
  // Abstoßung, die ein Proton an Stelle x spüren würde (ohne Teilchen `ohne`)
  // Anteil statt Anzahl: Teilchen an der Oberfläche haben weniger Nachbarn und wären sonst bevorzugt
  const druck = (x, ohne) => {
    let e = 0, w = 0;
    for (const j of nah[x]) { if (j === ohne) continue; w += 1; if (art[j]) e += 1; }
    for (const j of weiter[x]) { if (j === ohne) continue; w += 0.25; if (art[j]) e += 0.25; }
    return w ? e / w : 0;
  };
  const prot = () => art.map((t, i) => t ? i : -1).filter(i => i >= 0), neut = () => art.map((t, i) => t ? -1 : i).filter(i => i >= 0);
  for (let runde = 0; runde < 30; runde++) {
    let getauscht = 0;
    const P = prot().sort(() => zuf() - 0.5), N = neut();
    for (const i of P) {
      if (!art[i]) continue;
      const hier = druck(i, i);
      let best = -1, bestE = hier - 1e-6;
      for (const j of N) { if (art[j]) continue; const e = druck(j, i); if (e < bestE) { bestE = e; best = j; } }
      if (best >= 0) { art[i] = false; art[best] = true; N[N.indexOf(best)] = i; getauscht++; }
    }
    if (!getauscht) break;
  }
  return art;
}

// Atomkern aus einzelnen Protonen und Neutronen (dicht gepackt)
function kern(z, n) {
  const a = z + n, gruppe = new THREE.Group();
  if (!a) return { objekt: gruppe, radius: 0 };
  const d = R_NUKLEON * 1.9, kandidaten = [], m = Math.ceil(Math.cbrt(a)) + 2;
  for (let i = -m; i <= m; i++) for (let j = -m; j <= m; j++) for (let k = -m; k <= m; k++) {
    if ((i + j + k) % 2) continue;                    // kubisch flächenzentriertes Gitter
    kandidaten.push(new THREE.Vector3(i, j, k).multiplyScalar(d / Math.SQRT2));
  }
  const zuf = zufall(z * 1000 + n + 7);
  kandidaten.forEach(p => p.r = p.length() + zuf() * 1e-4);
  kandidaten.sort((p, q) => p.r - q.r);
  const pos = kandidaten.slice(0, a), mitte = pos.reduce((s, p) => s.add(p), new THREE.Vector3()).divideScalar(a);
  const art = protonenVerteilen(pos, z, zuf);                       // true = Proton
  const geo = new THREE.SphereGeometry(R_NUKLEON, 20, 14);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.05 }), a);
  const mat = new THREE.Matrix4(), col = new THREE.Color();
  let radius = 0;
  pos.forEach((p, i) => {
    p.sub(mitte); radius = Math.max(radius, p.length() + R_NUKLEON);
    mesh.setMatrixAt(i, mat.makeTranslation(p.x, p.y, p.z));
    mesh.setColorAt(i, col.setHex(art[i] ? FARBE.proton : FARBE.neutron));
  });
  gruppe.add(mesh);
  return { objekt: gruppe, radius };
}

function elektronenMesh(k, farbe) {
  const m = new THREE.InstancedMesh(new THREE.SphereGeometry(R_ELEKTRON, 16, 12),
    new THREE.MeshStandardMaterial({ color: farbe, roughness: 0.3, emissive: farbe, emissiveIntensity: 0.25 }), Math.max(k, 1));
  m.count = k;
  return m;
}

// ---------- Darstellungen ----------
export const DARSTELLUNGEN = {
  kernhuelle: 'Kern-Hülle-Modell',
  schalen: 'Schalenmodell',
  bohr: 'Bohr’sches Atommodell',
  orbital: 'Orbitalmodell',
};

export function standard() {
  return { z: 6, n: 6, ladung: 0, darstellung: 'schalen', unterschale: '', aussen: true, bewegung: false };
}

// Erzeugt das 3D-Objekt zum Zustand. Rückgabe: { objekt, radius, update(dt), titel, info (HTML) }
export function erzeuge(st) {
  const el = ELEMENTE[st.z - 1], konf = konfiguration(st.z, st.ladung), sch = schalen(konf);
  const wurzel = new THREE.Group(), animiert = [], etiketten = [];
  const k = kern(st.z, st.n);
  let radius = 1;

  if (st.darstellung === 'kernhuelle') {
    const R = 1.6;
    k.objekt.scale.setScalar(Math.min(0.07 * R / Math.max(k.radius, 1e-3), 1));   // Kern stark verkleinert (trotzdem viel zu groß)
    wurzel.add(k.objekt);
    const huelle = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 48),
      new THREE.MeshStandardMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }));
    huelle.renderOrder = 2; wurzel.add(huelle);
    const ne = st.z - st.ladung, em = elektronenMesh(ne, FARBE.elektron), zuf = zufall(st.z * 31 + 3);
    const teil = Array.from({ length: ne }, () => {
      const p = new THREE.Vector3(zuf() - 0.5, zuf() - 0.5, zuf() - 0.5).normalize().multiplyScalar(R * (0.35 + 0.55 * Math.cbrt(zuf())));
      const v = new THREE.Vector3(zuf() - 0.5, zuf() - 0.5, zuf() - 0.5).normalize().multiplyScalar(0.6);
      return { p, v };
    });
    const mat = new THREE.Matrix4();
    const setze = () => { teil.forEach((t, i) => em.setMatrixAt(i, mat.makeTranslation(t.p.x, t.p.y, t.p.z))); em.instanceMatrix.needsUpdate = true; };
    setze(); wurzel.add(em);
    animiert.push(dt => {
      for (const t of teil) {
        t.v.add(new THREE.Vector3(zuf() - 0.5, zuf() - 0.5, zuf() - 0.5).multiplyScalar(3 * dt)).clampLength(0.3, 0.9);
        t.p.addScaledVector(t.v, dt);
        const l = t.p.length();
        if (l > R * 0.94) { t.p.multiplyScalar(R * 0.94 / l); t.v.reflect(t.p.clone().normalize()); }
        if (l < R * 0.2) { t.p.multiplyScalar(R * 0.2 / l); t.v.reflect(t.p.clone().normalize()); }
      }
      setze();
    });
    radius = R;
  } else if (st.darstellung === 'schalen' || st.darstellung === 'bohr') {
    wurzel.add(k.objekt);
    const r1 = Math.max(k.radius, 0.12) + 0.3, abst = 0.3, bohr = st.darstellung === 'bohr';
    sch.forEach((anz, i) => {
      const r = r1 + i * abst, aussen = st.aussen && i === sch.length - 1;
      const schale = new THREE.Group(); wurzel.add(schale);
      if (bohr) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.008, 8, 160), new THREE.MeshBasicMaterial({ color: 0x64748b }));
        schale.add(ring);
      } else {
        const kugel = new THREE.Mesh(new THREE.SphereGeometry(r, 64, 48),
          new THREE.MeshStandardMaterial({ color: aussen ? 0xfbbf24 : 0x60a5fa, transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide }));
        kugel.renderOrder = 2 + i; schale.add(kugel);
        const aequator = new THREE.Mesh(new THREE.TorusGeometry(r, 0.004, 6, 160), new THREE.MeshBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.5 }));
        aequator.rotation.x = Math.PI / 2; schale.add(aequator);
      }
      const em = elektronenMesh(anz, aussen ? FARBE.aussen : FARBE.elektron), mat = new THREE.Matrix4();
      const punkte = bohr
        ? Array.from({ length: anz }, (_, j) => new THREE.Vector3(Math.cos(j / anz * Math.PI * 2) * r, Math.sin(j / anz * Math.PI * 2) * r, 0))
        : fibonacci(anz, r);
      punkte.forEach((p, j) => em.setMatrixAt(j, mat.makeTranslation(p.x, p.y, p.z)));
      schale.add(em);
      const etikett = textSprite(`${SCHALEN[i]} ${anz}`, aussen ? '#b45309' : '#334155', 1);
      const phi = sch.length > 1 ? (0.1 + 0.85 * i / (sch.length - 1)) * (sch.length > 3 ? Math.PI : Math.PI / 2) : Math.PI / 4;
      etikett.position.set(r * Math.sin(phi), r * Math.cos(phi), 0); etiketten.push(etikett); wurzel.add(etikett);
      // Drehung: innere Schalen schneller, Achse je Schale anders
      const achse = bohr ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(Math.sin(i * 1.7), 1, Math.cos(i * 2.3)).normalize();
      const w = (bohr ? 1.2 : 0.5) / (i + 1);
      animiert.push(dt => schale.rotateOnAxis(achse, w * dt));
    });
    if (!sch.length) { const t = textSprite('keine Elektronen', '#334155', 0.1); t.position.set(0, 0.3, 0); wurzel.add(t); }
    radius = r1 + Math.max(sch.length - 1, 0) * abst + 0.1;
    for (const e of etiketten) e.scale.multiplyScalar((sch.length > 4 ? 0.075 : 0.11) * Math.max(radius, 0.8));
  } else {                                                // Orbitalmodell
    const kleinkern = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), new THREE.MeshStandardMaterial({ color: FARBE.proton }));
    wurzel.add(kleinkern);
    const auswahl = konf.find(u => u.name === st.unterschale);
    const liste = auswahl ? [auswahl] : konf;
    let gross = 0;
    for (const u of liste) {
      const groesse = (auswahl ? 1 : 0.28 + 0.22 * u.n + 0.04 * u.l) * (u.l === 0 ? 0.7 : 1);   // s-Kugel kleiner, sonst verdeckt sie alles
      gross = Math.max(gross, groesse);
      const bes = besetzung(u.l, u.e);
      ORBITALE[u.l].forEach(([, f], m) => {
        const leer = bes[m] === 0;
        if (leer && !auswahl) return;
        const mat = new THREE.MeshStandardMaterial({
          color: auswahl ? ORB_FARBEN[m] : ORB_FARBEN[(u.n + u.l) % ORB_FARBEN.length], vertexColors: true, roughness: 0.5,
          transparent: true, opacity: auswahl ? (leer ? 0.12 : bes[m] === 1 ? 0.55 : 0.9) : 0.22, depthWrite: !!auswahl && !leer, side: THREE.DoubleSide,
        });
        const o = new THREE.Mesh(orbitalGeometrie(f, groesse, auswahl ? 96 : 48), mat);
        o.renderOrder = auswahl ? 1 : 2 + u.n;
        wurzel.add(o);
        if (auswahl) {
          const t = textSprite(ORBITALE[u.l][m][0] + ' ' + (bes[m] === 2 ? '↑↓' : bes[m] === 1 ? '↑' : 'leer'), leer ? '#6b7280' : '#111827', 0.085);
          t.position.copy(o.geometry.userData.spitze).multiplyScalar(1.08); wurzel.add(t);
        }
      });
    }
    radius = gross;
  }

  // ---- Titel und Info ----
  const a = st.z + st.n, lg = lage(st.z), q = st.ladung;
  const formel = el.sym + hoch(ladungText(q));
  const iso = ISOTOPE[st.z] && ISOTOPE[st.z].namen && ISOTOPE[st.z].namen[a];
  const stab = stabilitaet(st.z, a);
  const gruppeText = lg.f !== undefined ? null
    : [1, 2].includes(lg.gruppe) || lg.gruppe >= 13 ? `Hauptgruppe ${ROEMISCH[lg.gruppe > 12 ? lg.gruppe - 10 : lg.gruppe]} (Gruppe ${lg.gruppe})` : `Nebengruppe (Gruppe ${lg.gruppe})`;
  const zeilen = [
    [`Ordnungszahl ${st.z}`, `Periode ${lg.periode}`, gruppeText, FAMILIEN[familie(st.z)][0]].filter(Boolean).join(' · '),
    `<span style="color:#e53935">●</span> ${st.z} Protonen · <span style="color:#8a929c">●</span> ${st.n} Neutronen · <span style="color:#1e63d6">●</span> ${st.z - q} Elektronen`,
    `Isotop ${el.sym}-${a}${iso ? ' (' + iso + ')' : ''}: Massenzahl ${a} = ${st.z} + ${st.n}` + (a === el.a ? ' – häufigstes Isotop' : '') + (stab ? ` · ${stab}` : ''),
  ];
  if (q) zeilen.push(`Ion ${formel}: ${q > 0 ? q + ' Elektron' + (q > 1 ? 'en' : '') + ' abgegeben' : -q + ' Elektron' + (q < -1 ? 'en' : '') + ' aufgenommen'} – ${q > 0 ? 'positiv' : 'negativ'} geladen.`);
  if (sch.length) zeilen.push(`Schalen: ${sch.map((x, i) => SCHALEN[i] + ' ' + x).join(' · ')} · Außenelektronen: <b style="display:inline">${sch[sch.length - 1]}</b>`);
  zeilen.push(`Elektronenkonfiguration: ${konf.map(u => u.name + hoch(u.e)).join(' ') || '–'}` + (st.z >= 104 ? ' (berechnet, nicht gemessen)' : ''));
  const HINWEIS = {
    kernhuelle: 'Fast die ganze Masse steckt im winzigen Kern, die Elektronen bilden die Hülle. Der Kern ist hier noch viel zu groß gezeichnet: Wäre das Atom so groß wie ein Fußballstadion, wäre der Kern nur so groß wie eine Erbse.',
    schalen: 'Nicht maßstäblich. Die Elektronen befinden sich auf Schalen um den Kern (K, L, M …); auf die n-te Schale passen höchstens 2n² Elektronen. Die Außenelektronen (orange) bestimmen das chemische Verhalten.'
      + (st.z > 18 ? ' Ab Kalium wird die N-Schale besetzt, bevor die M-Schale voll ist – das erklärt erst das Orbitalmodell.' : ''),
    bohr: 'Niels Bohr (1913): Elektronen kreisen auf festen Bahnen mit bestimmter Energie. Heute weiß man, dass es keine festen Bahnen gibt – das Modell erklärt aber gut, warum Atome nur bestimmte Lichtfarben aussenden. Nicht maßstäblich.',
    orbital: 'Ein Orbital ist der Raum, in dem sich ein Elektron mit hoher Wahrscheinlichkeit aufhält. Jedes Orbital fasst höchstens zwei Elektronen (↑↓). Innerhalb einer Unterschale werden die Orbitale erst einfach, dann doppelt besetzt (Hundsche Regel). Kräftig = doppelt, halb durchsichtig = einfach, blass = leer besetzt. Hell/dunkel: Vorzeichen der Wellenfunktion.',
  };
  if (st.darstellung === 'orbital') {
    const u = konf.find(x => x.name === st.unterschale);
    if (u) zeilen.push(`Unterschale ${u.name}: ${besetzung(u.l, u.e).map(b => '[' + (b === 2 ? '↑↓' : b === 1 ? '↑ ' : '  ') + ']').join(' ')}`);
    else zeilen.push('Gesamtbild aller besetzten Unterschalen (größer = höhere Schale). Für Einzelheiten unten eine Unterschale wählen.');
  }
  zeilen.push(`<i>${HINWEIS[st.darstellung]}</i>`);

  return {
    objekt: wurzel, radius,
    titel: `${el.name} (${formel}) – ${DARSTELLUNGEN[st.darstellung]}`,
    info: zeilen.join('<br>'),
    update: dt => { if (st.bewegung) for (const f of animiert) f(dt); },
  };
}

export function entsorge(o) {
  o.traverse(x => { if (x.geometry) x.geometry.dispose(); if (x.material) { if (x.material.map) x.material.map.dispose(); x.material.dispose(); } });
}

// ---------- URL ----------
export function ausUrl(p) {
  const st = standard();
  const z = +p.get('z'); if (z >= 1 && z <= 118) { st.z = z; st.n = ELEMENTE[z - 1].a - z; }
  if (p.has('a')) st.n = Math.max(0, +p.get('a') - st.z);
  if (p.has('q')) st.ladung = THREE.MathUtils.clamp(+p.get('q') || 0, -4, st.z);
  if (DARSTELLUNGEN[p.get('d')]) st.darstellung = p.get('d');
  if (p.get('u')) st.unterschale = p.get('u');
  return st;
}
export const zuUrl = st => `&z=${st.z}&a=${st.z + st.n}&q=${st.ladung}&d=${st.darstellung}${st.unterschale && st.darstellung === 'orbital' ? '&u=' + st.unterschale : ''}`;

// ---------- Bedienung (in Viewer und Tafel gleich) ----------
let stilDa = false;
function stil() {
  if (stilDa) return; stilDa = true;
  const s = document.createElement('style');
  s.textContent = `
  .pse-hg { position: fixed; inset: 0; z-index: 60; background: rgba(15,23,42,.75); display: flex; align-items: center; justify-content: center; padding: 1vmin; }
  .pse { background: #fff; border-radius: 14px; padding: 1.6vmin; max-width: 100%; max-height: 100%; overflow: auto; font-family: system-ui, sans-serif; color: #111; }
  .pse-kopf { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1vmin; font-size: clamp(14px, 2.2vmin, 22px); font-weight: 600; }
  .pse-kopf button { font-size: clamp(16px, 2.6vmin, 26px); border: 0; background: #e5e7eb; border-radius: 8px; padding: 4px 14px; }
  .pse-raster { display: grid; grid-template-columns: repeat(18, minmax(0, 1fr)); gap: 0.35vmin; width: min(96vw, 160vmin); }
  .pse-z { border: 0; border-radius: 0.6vmin; padding: 0.3vmin 0 0.5vmin; text-align: center; cursor: pointer; line-height: 1.05; color: #111; }
  .pse-z small { display: block; font-size: clamp(7px, 1.25vmin, 13px); opacity: .7; }
  .pse-z b { display: block; font-size: clamp(11px, 2.3vmin, 24px); }
  .pse-z.akt { outline: 0.5vmin solid #111; }
  .pse-z:hover { filter: brightness(.9); }
  .pse-platz { font-size: clamp(7px, 1.1vmin, 12px); color: #6b7280; display: flex; align-items: center; justify-content: center; text-align: center; }
  .pse-leg { display: flex; flex-wrap: wrap; gap: 0.6vmin 1.4vmin; margin-top: 1.2vmin; font-size: clamp(10px, 1.6vmin, 16px); }
  .pse-leg span::before { content: ''; display: inline-block; width: 1em; height: 1em; border-radius: 3px; margin-right: 4px; vertical-align: -2px; background: var(--f); }
  .gen-zahl { display: inline-flex; align-items: center; gap: 4px; }
  .gen-zahl span { min-width: 4.6em; text-align: center; }`;
  document.head.appendChild(s);
}

function pse(aktuell, waehle) {
  stil();
  const hg = document.createElement('div'); hg.className = 'pse-hg';
  const box = document.createElement('div'); box.className = 'pse'; hg.appendChild(box);
  box.innerHTML = '<div class="pse-kopf"><span>Element wählen</span><button aria-label="Schließen">✕</button></div>';
  const raster = document.createElement('div'); raster.className = 'pse-raster'; box.appendChild(raster);
  const zu = () => hg.remove();
  box.querySelector('button').onclick = zu;
  hg.onclick = e => { if (e.target === hg) zu(); };
  for (const e of ELEMENTE) {
    const l = lage(e.z), b = document.createElement('button');
    b.className = 'pse-z' + (e.z === aktuell ? ' akt' : '');
    b.style.background = FAMILIEN[familie(e.z)][1];
    b.innerHTML = `<small>${e.z}</small><b>${e.sym}</b>`; b.title = e.name;
    if (l.f !== undefined) { b.style.gridRow = l.periode + 3; b.style.gridColumn = l.f + 3; }
    else { b.style.gridRow = l.periode; b.style.gridColumn = l.gruppe; }
    b.onclick = () => { zu(); waehle(e.z); };
    raster.appendChild(b);
  }
  for (const [p, t] of [[6, '57–71'], [7, '89–103']]) {
    const d = document.createElement('div'); d.className = 'pse-platz'; d.textContent = t; d.style.gridRow = p; d.style.gridColumn = 3; raster.appendChild(d);
  }
  const luecke = document.createElement('div'); luecke.style.gridRow = 8; luecke.style.height = '1vmin'; raster.appendChild(luecke);
  const leg = document.createElement('div'); leg.className = 'pse-leg';
  for (const [name, f] of Object.values(FAMILIEN)) { const s = document.createElement('span'); s.textContent = name; s.style.setProperty('--f', f); leg.appendChild(s); }
  box.appendChild(leg);
  document.body.appendChild(hg);
}

// Baut die Bedienelemente in `ort` (ein Container mit display:flex o. ä.). `neu()` wird bei jeder Änderung aufgerufen.
export function bedienung(ort, st, neu) {
  stil();
  ort.innerHTML = '';
  const knopf = (text, titel) => { const b = document.createElement('button'); b.textContent = text; if (titel) b.title = titel; ort.appendChild(b); return b; };
  const bElement = knopf('', 'Element aus dem Periodensystem wählen');
  const sDar = document.createElement('select');
  for (const [k, v] of Object.entries(DARSTELLUNGEN)) sDar.add(new Option(v, k));
  ort.appendChild(sDar);
  const sUnter = document.createElement('select'); ort.appendChild(sUnter);
  const zahl = (titel) => {
    const w = document.createElement('span'); w.className = 'gen-zahl'; w.title = titel;
    const m = document.createElement('button'), t = document.createElement('span'), p = document.createElement('button');
    m.textContent = '−'; p.textContent = '+'; w.append(m, t, p); ort.appendChild(w);
    return { m, t, p, w };
  };
  const iso = zahl('Neutronen: Isotop wählen'), ion = zahl('Ladung: Ion bilden');
  const bAussen = knopf('Außenelektronen', 'Außenelektronen hervorheben');
  const bBew = knopf('Bewegung', 'Elektronen bewegen');

  function auffrischen() {
    const e = ELEMENTE[st.z - 1];
    bElement.textContent = `⚛ ${e.sym} – ${e.name}`;
    sDar.value = st.darstellung;
    const konf = konfiguration(st.z, st.ladung);
    if (st.unterschale && !konf.some(u => u.name === st.unterschale)) st.unterschale = '';
    sUnter.innerHTML = ''; sUnter.add(new Option('Alle Unterschalen', ''));
    for (const u of konf) sUnter.add(new Option(`${u.name}${hoch(u.e)}`, u.name));
    sUnter.value = st.unterschale; sUnter.hidden = st.darstellung !== 'orbital';
    iso.t.textContent = `${e.sym}-${st.z + st.n}`;
    ion.t.textContent = st.ladung ? e.sym + hoch(ladungText(st.ladung)) : 'neutral';
    iso.m.disabled = st.n <= 0; ion.m.disabled = st.ladung <= -4; ion.p.disabled = st.ladung >= st.z;
    bAussen.hidden = !['schalen', 'bohr'].includes(st.darstellung);
    bAussen.classList.toggle('on', st.aussen); bBew.classList.toggle('on', st.bewegung);
    bBew.hidden = st.darstellung === 'orbital';
  }
  const aendern = (f, neuBauen = true) => () => { f(); auffrischen(); if (neuBauen) neu(); };
  bElement.onclick = () => pse(st.z, z => { st.z = z; st.n = ELEMENTE[z - 1].a - z; st.ladung = 0; st.unterschale = ''; auffrischen(); neu(); });
  sDar.onchange = aendern(() => st.darstellung = sDar.value);
  sUnter.onchange = aendern(() => st.unterschale = sUnter.value);
  iso.m.onclick = aendern(() => st.n = Math.max(0, st.n - 1));
  iso.p.onclick = aendern(() => st.n = Math.min(st.n + 1, 200));
  ion.m.onclick = aendern(() => st.ladung = Math.max(-4, st.ladung - 1));
  ion.p.onclick = aendern(() => st.ladung = Math.min(st.z, st.ladung + 1));
  bAussen.onclick = aendern(() => st.aussen = !st.aussen);
  bBew.onclick = aendern(() => st.bewegung = !st.bewegung, false);
  auffrischen();
}
export { kern as _kern };   // für Tests
