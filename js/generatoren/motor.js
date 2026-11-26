// Elektromotor-Generator: Gleichstrommotor mit Leiterschleife im Magnetfeld.
// Die Drehung wird aus dem Drehmoment berechnet: Kraft auf die stromdurchflossenen Leiterseiten (F = I·l·B),
// Drehmoment τ = 2·R·F·cos φ. Mit Kommutator wird der Strom bei senkrechter Spule umgepolt → τ = 2RF·|cos φ|.
// Ohne Kommutator (Schleifringe) pendelt die Spule um die senkrechte Lage und bleibt stehen.
// Achse = z (zum Betrachter), Feld von N (links, −x) nach S (rechts, +x). Technische Stromrichtung (+ → −).
import * as THREE from 'three';
import { textSprite, zylinderMatrix, entsorge as entsorgeObj, stil, zahlKnopf } from './hilfen.js';

export const BAUART = { kommutator: 'mit Kommutator (Gleichstrommotor)', schleifring: 'ohne Kommutator (Schleifringe)' };
export const standard = () => ({ bauart: 'kommutator', spannung: 3, feld: true, kraefte: true, beschriftung: true, bewegung: true });

const R = 1.0, L = 2.6, ZK = L / 2 + 0.75;          // Spulenradius, Länge der Leiterseiten, Lage des Kommutators
const KUPFER = 0xc87533, STAHL = 0x9aa3ad;
const pfeil = (farbe, r = 0.06, l = 0.8) => {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: farbe, roughness: 0.4, emissive: farbe, emissiveIntensity: 0.2 });
  const s = new THREE.Mesh(new THREE.CylinderGeometry(r, r, l * 0.7, 10), m); s.position.y = l * 0.35; g.add(s);
  const k = new THREE.Mesh(new THREE.ConeGeometry(r * 2.6, l * 0.3, 16), m); k.position.y = l * 0.85; g.add(k);
  return g;
};
const richte = (obj, pos, dir) => { obj.position.copy(pos); obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()); };

export function erzeuge(st) {
  const wurzel = new THREE.Group(), rotor = new THREE.Group(), etik = new THREE.Group();
  wurzel.add(rotor, etik);
  const mit = st.bauart === 'kommutator';
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, metalness: 0.2, ...o });

  // ---------- Feldmagnet: Polschuhe N (rot) und S (grün), Joch (grau) ----------
  const polschuh = (links) => {
    // Schale: Kreisringausschnitt ±55°, entlang der Achse ausgezogen
    const form = new THREE.Shape(), a0 = THREE.MathUtils.degToRad(-55), a1 = THREE.MathUtils.degToRad(55);
    form.absarc(0, 0, 1.95, a0, a1, false); form.absarc(0, 0, 1.4, a1, a0, true);
    const geo = new THREE.ExtrudeGeometry(form, { depth: L + 0.4, bevelEnabled: false, curveSegments: 32 }); geo.translate(0, 0, -(L + 0.4) / 2);
    if (links) geo.rotateZ(Math.PI);
    return new THREE.Mesh(geo, mat(links ? 0xdc2626 : 0x16a34a, { metalness: 0.1, transparent: true, opacity: 0.72 }));   // durchscheinend: Spule bleibt sichtbar
  };
  wurzel.add(polschuh(true), polschuh(false));
  {   // Joch: verbindet die Magnete außen (oben und unten), hinten
    const form = new THREE.Shape(); form.absarc(0, 0, 2.35, 0, Math.PI * 2, false);
    const loch = new THREE.Path(); loch.absarc(0, 0, 1.95, 0, Math.PI * 2, true); form.holes.push(loch);
    const geo = new THREE.ExtrudeGeometry(form, { depth: L + 0.4, bevelEnabled: false, curveSegments: 48 }); geo.translate(0, 0, -(L + 0.4) / 2);
    wurzel.add(new THREE.Mesh(geo, mat(0x6b7280, { transparent: true, opacity: 0.35, depthWrite: false })));
  }
  for (const [x, t] of [[-2.15, 'N'], [2.15, 'S']]) { const s = textSprite(t, '#fff', 0.5, x < 0 ? 'rgba(185,28,28,0.95)' : 'rgba(21,128,61,0.95)'); s.position.set(x, 0, (L + 0.4) / 2 + 0.05); wurzel.add(s); }

  // ---------- Feldlinien (N → S) ----------
  const feld = new THREE.Group(); wurzel.add(feld);
  const feldMat = new THREE.MeshBasicMaterial({ color: 0x2563eb, transparent: true, opacity: 0.75 });
  for (const z of [-0.9, 0.9]) for (const y of [-0.9, -0.45, 0, 0.45, 0.9]) {
    const x0 = -Math.sqrt(1.4 ** 2 - y * y), x1 = -x0;
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1, 6), feldMat); l.applyMatrix4(zylinderMatrix(new THREE.Vector3(x0, y, z), new THREE.Vector3(x1, y, z), 1)); feld.add(l);
    const k = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 10), feldMat); richte(k, new THREE.Vector3(0.35, y, z), new THREE.Vector3(1, 0, 0)); feld.add(k);
  }
  feld.visible = st.feld;

  // ---------- Rotor: Achse, Leiterschleife (3 Windungen), Kommutator bzw. Schleifringe ----------
  const achse = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, L + 3.2, 16), mat(STAHL, { metalness: 0.7 })); achse.rotation.x = Math.PI / 2; achse.position.z = 0.6; rotor.add(achse);
  const kupfer = mat(KUPFER, { metalness: 0.6, roughness: 0.3 });
  const spule = new THREE.Group(); rotor.add(spule);
  for (let w = -1; w <= 1; w++) {
    const r = R + w * 0.07, z = L / 2 + w * 0.05, ecken = [
      new THREE.Vector3(r, 0, -z), new THREE.Vector3(r, 0, z), new THREE.Vector3(0.25, 0, z), new THREE.Vector3(-0.25, 0, z), new THREE.Vector3(-r, 0, z), new THREE.Vector3(-r, 0, -z), new THREE.Vector3(r, 0, -z)];
    const kurve = new THREE.CurvePath(); for (let i = 0; i < ecken.length - 1; i++) kurve.add(new THREE.LineCurve3(ecken[i], ecken[i + 1]));
    spule.add(new THREE.Mesh(new THREE.TubeGeometry(kurve, 120, 0.045, 8), kupfer));
  }
  // Zuleitungen von der Spule zum Kommutator / zu den Schleifringen
  const zul = (a, b) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 8), kupfer); m.applyMatrix4(zylinderMatrix(a, b, 1)); rotor.add(m); };
  const segMat = mat(0xb45309, { metalness: 0.7, roughness: 0.25 });
  if (mit) {
    // zwei Halbschalen; Lücken in Richtung der Leiterseiten (φ und φ+π); Segment A liegt bei φ+90°
    for (const s of [0, 1]) {
      const g = new THREE.CylinderGeometry(0.32, 0.32, 0.5, 32, 1, false, 0, Math.PI - 0.35);
      g.rotateX(Math.PI / 2); g.rotateZ(Math.PI / 2 + 0.175 + s * Math.PI);   // Segment über 10°…170° bzw. 190°…350° (Lücken bei 0° und 180°)
      const m = new THREE.Mesh(g, segMat); m.position.z = ZK; rotor.add(m);
    }
    // Leiterseite A (bei φ) hängt am unteren Segment, Seite B am oberen: oben liegt die Plus-Bürste an
    zul(new THREE.Vector3(0.25, 0, L / 2), new THREE.Vector3(0.0, -0.3, ZK - 0.2));
    zul(new THREE.Vector3(-0.25, 0, L / 2), new THREE.Vector3(0.0, 0.3, ZK - 0.2));
  } else {
    for (const [z, y] of [[ZK - 0.3, 0.3], [ZK + 0.35, -0.3]]) {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 32), segMat); ring.rotation.x = Math.PI / 2; ring.position.z = z; rotor.add(ring);
      zul(new THREE.Vector3(y > 0 ? -0.25 : 0.25, 0, L / 2), new THREE.Vector3(0, y, z));
    }
  }

  // ---------- Bürsten und Batterie (fest) ----------
  const buerstenZ = mit ? [ZK, ZK] : [ZK - 0.3, ZK + 0.35];
  const buerste = (y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.45, 0.22), mat(0x262626, { metalness: 0, roughness: 0.9 })); b.position.set(0, y * (0.32 + 0.225), z); wurzel.add(b); return b; };
  buerste(1, buerstenZ[0]); buerste(-1, buerstenZ[1]);
  const batt = new THREE.Group(); batt.position.set(-3.1, 0, ZK); wurzel.add(batt);
  batt.add(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.6, 24), mat(0x1f2937, { metalness: 0.1 })));
  const kap = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.5, 24), mat(0xd97706)); kap.position.y = 0.55; batt.add(kap);
  const pol = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.15, 12), mat(0x9ca3af, { metalness: 0.8 })); pol.position.y = 0.87; batt.add(pol);
  const kabel = (pts, farbe) => wurzel.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.04, 8), mat(farbe, { metalness: 0 })));
  kabel([new THREE.Vector3(-3.1, 0.95, ZK), new THREE.Vector3(-3.1, 2.3, ZK), new THREE.Vector3(0, 2.3, buerstenZ[0]), new THREE.Vector3(0, 0.8, buerstenZ[0])], 0xdc2626);
  kabel([new THREE.Vector3(-3.1, -0.8, ZK), new THREE.Vector3(-3.1, -2.3, ZK), new THREE.Vector3(0, -2.3, buerstenZ[1]), new THREE.Vector3(0, -0.8, buerstenZ[1])], 0x1d4ed8);
  { const p = textSprite('+', '#b91c1c', 0.45); p.position.set(-2.55, 0.9, ZK); wurzel.add(p); const m = textSprite('−', '#1d4ed8', 0.45); m.position.set(-2.55, -0.7, ZK); wurzel.add(m); }

  // ---------- Pfeile: Strom (orange, entlang der Leiterseiten) und Kraft (grün) ----------
  const strom = [pfeil(0xf59e0b, 0.05, 0.9), pfeil(0xf59e0b, 0.05, 0.9)], kraft = [pfeil(0x16a34a, 0.07, 1.0), pfeil(0x16a34a, 0.07, 1.0)];
  for (const p of [...strom, ...kraft]) wurzel.add(p);
  const umpol = textSprite('Kommutator polt um!', '#b45309', 0.32); umpol.position.set(1.4, 1.05, ZK + 0.2); wurzel.add(umpol); umpol.visible = false;
  const steht = textSprite('Spule pendelt und bleibt\nsenkrecht stehen', '#b91c1c', 0.32); steht.position.set(0, 2.9, 0); wurzel.add(steht); steht.visible = false;

  // ---------- Beschriftung ----------
  const schild = (t, pos, farbe = '#1f2937', h = 0.27) => { const s = textSprite(t, farbe, h); s.position.copy(pos); etik.add(s); };
  schild('Nordpol', new THREE.Vector3(-2.3, 1.75, -0.6), '#b91c1c'); schild('Südpol', new THREE.Vector3(2.3, 1.75, -0.6), '#15803d');
  schild(mit ? 'Kommutator\n(Stromwender)' : 'Schleifringe', new THREE.Vector3(1.35, -0.55, ZK + 0.4), '#92400e');
  schild('Bürsten', new THREE.Vector3(0.75, 0.95, ZK + 0.5));
  schild('Spule\n(Leiterschleife)', new THREE.Vector3(1.6, -1.7, L / 2 + 0.2), '#9a3412');
  schild('Achse', new THREE.Vector3(0.6, 0.3, L / 2 + 2.3));
  schild('Batterie', new THREE.Vector3(-3.1, -1.25, ZK + 0.45));
  if (st.feld) schild('Magnetfeld', new THREE.Vector3(0, -1.15, -1.6), '#1d4ed8');
  if (st.kraefte) schild('Strom', new THREE.Vector3(-1.75, 1.0, 0.9), '#b45309'), schild('Kraft', new THREE.Vector3(-1.75, -1.0, 0.9), '#15803d');
  etik.visible = st.beschriftung;

  // ---------- Bewegung: Drehmoment, Trägheit, Reibung ----------
  let phi = mit ? 0.35 : 0.05, omega = 0, letzteRichtung = 0, umpolZeit = 0;
  const J = 0.3, C = 0.28;
  // Strom in Leiterseite A: +1 = nach vorne (+z). Plus-Bürste oben → oberes Segment → Seite B (nach hinten) → Seite A (nach vorne)
  const stromA = p => mit ? (Math.cos(p) >= 0 ? 1 : -1) : 1;
  function setze() {
    rotor.rotation.z = phi;
    const iA = stromA(phi), T = st.spannung / 3;
    for (const s of [0, 1]) {
      const w = phi + s * Math.PI, pos = new THREE.Vector3(R * Math.cos(w), R * Math.sin(w), 0);
      const i = s === 0 ? iA : -iA;                                // Seite B führt den Strom zurück
      // F = I · (ẑ × x̂) · B = +y für Strom nach vorne
      richte(strom[s], pos.clone().add(new THREE.Vector3(0, 0, -0.45 * i)), new THREE.Vector3(0, 0, i));
      const f = new THREE.Vector3(0, i, 0);
      richte(kraft[s], pos.clone().add(new THREE.Vector3(0, 0, 0)), f);
      kraft[s].scale.setScalar(0.6 + 0.4 * T);
      strom[s].visible = kraft[s].visible = st.kraefte;
    }
  }
  setze();

  const info = [
    `<b>${BAUART[st.bauart]}</b> · Spannung ${st.spannung} von 5`,
    '<span style="color:#d97706">➜</span> Strom (technische Richtung + → −) · <span style="color:#16a34a">➜</span> Kraft auf den Leiter · <span style="color:#2563eb">➜</span> Magnetfeld von N nach S',
    mit
      ? '<i>Fließt Strom durch einen Leiter im Magnetfeld, wirkt eine Kraft auf ihn (Lorentzkraft, Drei-Finger-Regel). Auf die beiden Seiten der Spule wirken entgegengesetzte Kräfte – die Spule dreht sich. Steht sie senkrecht, zeigen beide Kräfte genau nach außen und erzeugen keine Drehung (Totpunkt); der Schwung trägt sie weiter. Genau dann vertauscht der Kommutator die Anschlüsse: Der Strom in der Spule kehrt sich um, die Kräfte auch – so dreht sie immer in dieselbe Richtung. Mehr Spannung → mehr Strom → größere Kraft → schnellere Drehung.</i>'
      : '<i>Ohne Kommutator fließt der Strom immer gleich herum. Die Kräfte drehen die Spule bis in die senkrechte Lage – danach bremsen sie sie wieder. Die Spule pendelt hin und her und bleibt schließlich senkrecht stehen. Deshalb braucht ein Gleichstrommotor den Kommutator (Stromwender).</i>',
  ];

  return {
    objekt: wurzel, radius: 3.9, titel: `Elektromotor – ${mit ? 'Gleichstrommotor' : 'ohne Kommutator'}`, info: info.join('<br>'),
    update: dt => {
      if (!st.bewegung) return;
      const T = st.spannung / 3;
      for (let k = 0; k < 4; k++) {                          // kleine Teilschritte für stabile Rechnung
        const h = Math.min(dt, 0.05) / 4;
        const tau = 1.0 * T * stromA(phi) * Math.cos(phi);
        omega += (tau - C * omega) / J * h; phi += omega * h;
      }
      const r = stromA(phi);
      if (mit && letzteRichtung && r !== letzteRichtung) umpolZeit = 0.6;
      letzteRichtung = r;
      umpolZeit = Math.max(umpolZeit - dt, 0); umpol.visible = umpolZeit > 0;
      steht.visible = !mit && Math.abs(omega) < 0.05 && Math.abs(Math.cos(phi)) < 0.05;
      setze();
    },
  };
}
export const entsorge = entsorgeObj;

export function ausUrl(p) {
  const st = standard();
  if (BAUART[p.get('b')]) st.bauart = p.get('b');
  const u = +p.get('u'); if (u >= 1 && u <= 5) st.spannung = u;
  return st;
}
export const zuUrl = st => `&b=${st.bauart}&u=${st.spannung}`;

export function bedienung(ort, st, neu) {
  stil(); ort.innerHTML = '';
  const s = document.createElement('select'); for (const [k, v] of Object.entries(BAUART)) s.add(new Option(v, k)); ort.appendChild(s);
  const u = zahlKnopf(ort, 'Spannung der Batterie');
  const knopf = t => { const b = document.createElement('button'); b.textContent = t; ort.appendChild(b); return b; };
  const bFeld = knopf('Feldlinien'), bKraft = knopf('Strom & Kraft'), bSchild = knopf('Beschriftung'), bBew = knopf('Bewegung');
  function auffrischen() {
    s.value = st.bauart; u.t.textContent = `Spannung ${st.spannung}`; u.m.disabled = st.spannung <= 1; u.p.disabled = st.spannung >= 5;
    bFeld.classList.toggle('on', st.feld); bKraft.classList.toggle('on', st.kraefte); bSchild.classList.toggle('on', st.beschriftung); bBew.classList.toggle('on', st.bewegung);
  }
  const aendern = (f, bauen = true) => () => { f(); auffrischen(); if (bauen) neu(); };
  s.onchange = aendern(() => st.bauart = s.value);
  u.m.onclick = aendern(() => st.spannung--); u.p.onclick = aendern(() => st.spannung++);
  bFeld.onclick = aendern(() => st.feld = !st.feld); bKraft.onclick = aendern(() => st.kraefte = !st.kraefte);
  bSchild.onclick = aendern(() => st.beschriftung = !st.beschriftung); bBew.onclick = aendern(() => st.bewegung = !st.bewegung, false);
  auffrischen();
}
