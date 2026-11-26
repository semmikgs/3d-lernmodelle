// Teilchenmodell: Aggregatzustände aus einer echten Molekulardynamik-Rechnung.
// Teilchen ziehen sich auf kurze Entfernung an und stoßen sich bei Berührung ab (Lennard-Jones-Potential),
// unten wirkt die Schwerkraft, ein Thermostat hält die eingestellte Temperatur. Fest, flüssig und gasförmig
// ergeben sich daraus von selbst. Temperaturskala an Wasser angelehnt (Schmelzen 0 °C, Sieden 100 °C).
import * as THREE from 'three';
import { textSprite, entsorge as entsorgeObj, stil, zahlKnopf } from './hilfen.js';

const L = 9, H = 13, G = 0.06, RC = 2.5, DT = 0.004;
// Umrechnung Modelltemperatur ↔ °C (kalibriert an der Simulation, siehe README)
export const T_SCHMELZ = 0.44, T_SIEDE = 0.9;   // Ordnung bricht zwischen 0,35 und 0,5 ein; unter 50 % kondensiert ab ≈ 0,9
const zuC = t => (t - T_SCHMELZ) / (T_SIEDE - T_SCHMELZ) * 100, vonC = c => T_SCHMELZ + c / 100 * (T_SIEDE - T_SCHMELZ);
export const standard = () => ({ temp: 20, farbe: true, beschriftung: true, bewegung: true, auto: false });
const zustand = c => c < 0 ? 'fest' : c < 100 ? 'flüssig' : 'gasförmig';

export function simulation(n0 = 3) {
  // Start: kubisch-flächenzentrierter Kristall unten in der Mitte
  const a = 1.59, pos = [], vel = [];
  for (let i = 0; i < n0; i++) for (let j = 0; j < n0; j++) for (let k = 0; k < n0; k++)
    for (const [x, y, z] of [[0, 0, 0], [0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5]]) pos.push(new THREE.Vector3((i + x) * a + (L - n0 * a) / 2 + 0.4, (j + y) * a + 0.6, (k + z) * a + (L - n0 * a) / 2 + 0.4));
  const N = pos.length; let s = 7; const zuf = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296 - 0.5;
  for (let i = 0; i < N; i++) vel.push(new THREE.Vector3(zuf(), zuf(), zuf()).multiplyScalar(0.3));
  const F = pos.map(() => new THREE.Vector3());
  const kraefte = () => {
    for (const f of F) f.set(0, -G, 0);
    const rc2 = RC * RC;
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      const dx = pos[i].x - pos[j].x, dy = pos[i].y - pos[j].y, dz = pos[i].z - pos[j].z, r2 = dx * dx + dy * dy + dz * dz;
      if (r2 > rc2) continue;
      const ir2 = 1 / Math.max(r2, 0.64), ir6 = ir2 * ir2 * ir2, f = 24 * ir2 * ir6 * (2 * ir6 - 1);
      F[i].x += f * dx; F[i].y += f * dy; F[i].z += f * dz; F[j].x -= f * dx; F[j].y -= f * dy; F[j].z -= f * dz;
    }
  };
  kraefte();
  const sim = {
    pos, vel, N, tZiel: vonC(20),
    schritt(n = 10) {
      for (let k = 0; k < n; k++) {
        for (let i = 0; i < N; i++) { vel[i].addScaledVector(F[i], DT / 2); pos[i].addScaledVector(vel[i], DT); }
        for (let i = 0; i < N; i++) {     // Wände
          const p = pos[i], v = vel[i];
          if (p.x < 0.5) { p.x = 0.5; v.x = Math.abs(v.x); } if (p.x > L - 0.5) { p.x = L - 0.5; v.x = -Math.abs(v.x); }
          if (p.z < 0.5) { p.z = 0.5; v.z = Math.abs(v.z); } if (p.z > L - 0.5) { p.z = L - 0.5; v.z = -Math.abs(v.z); }
          // Boden mit etwas Reibung (sonst rutscht der Kristall reibungslos), Decke
          if (p.y < 0.5) { p.y = 0.5; v.y = Math.abs(v.y); v.x *= 0.9; v.z *= 0.9; }
          if (p.y > H - 0.5) { p.y = H - 0.5; v.y = -Math.abs(v.y); }
        }
        kraefte();
        let ek = 0; for (let i = 0; i < N; i++) { vel[i].addScaledVector(F[i], DT / 2); ek += vel[i].lengthSq(); }
        const T = ek / (3 * N);   // Thermostat (Berendsen)
        const f = Math.sqrt(1 + 0.01 * (sim.tZiel / Math.max(T, 1e-4) - 1));
        for (let i = 0; i < N; i++) vel[i].multiplyScalar(f);
        sim.T = T;
      }
    },
    // Anteil der Teilchen mit vielen Nachbarn (= kondensiert) und Ordnung
    analyse() {
      let kond = 0, ord = 0;
      for (let i = 0; i < N; i++) {
        let nb = 0; for (let j = 0; j < N; j++) if (i !== j && pos[i].distanceToSquared(pos[j]) < 1.5 * 1.5) nb++;
        if (nb >= 4) kond++; if (nb >= 10) ord++;
      }
      return { kondensiert: kond / N, dicht: ord / N };
    },
  };
  return sim;
}

export function erzeuge(st) {
  const wurzel = new THREE.Group(), innen = new THREE.Group(); wurzel.add(innen); innen.position.set(-L / 2, -H / 2, -L / 2);
  const sim = st._sim || (st._sim = simulation()); sim.tZiel = vonC(st.temp);
  // Gefäß
  const kasten = new THREE.Mesh(new THREE.BoxGeometry(L, H, L), new THREE.MeshStandardMaterial({ color: 0xbfdbfe, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.BackSide }));
  kasten.position.set(L / 2, H / 2, L / 2); innen.add(kasten);
  const kanten = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(L, H, L)), new THREE.LineBasicMaterial({ color: 0x64748b })); kanten.position.copy(kasten.position); innen.add(kanten);
  // Heizplatte
  const platte = new THREE.Mesh(new THREE.BoxGeometry(L + 0.6, 0.4, L + 0.6), new THREE.MeshStandardMaterial({ color: 0x475569, emissive: 0xff3d00, emissiveIntensity: 0 }));
  platte.position.set(L / 2, -0.25, L / 2); innen.add(platte);
  // Teilchen
  const kugeln = new THREE.InstancedMesh(new THREE.SphereGeometry(0.34, 20, 14), new THREE.MeshStandardMaterial({ roughness: 0.35 }), sim.N);
  innen.add(kugeln);
  const m4 = new THREE.Matrix4(), farbe = new THREE.Color();
  // Thermometer
  const thermo = new THREE.Group(); thermo.position.set(L + 1.6, 0, L / 2); innen.add(thermo);
  thermo.add(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, H, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 })).translateY(H / 2));
  const saeule = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1, 12), new THREE.MeshStandardMaterial({ color: 0xdc2626 })); thermo.add(saeule);
  const kugelT = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 12), new THREE.MeshStandardMaterial({ color: 0xdc2626 })); kugelT.position.y = -0.1; thermo.add(kugelT);
  const cMin = -100, cMax = 250, yVon = c => 0.5 + (c - cMin) / (cMax - cMin) * (H - 1);
  for (const [c, t] of [[0, '0 °C'], [100, '100 °C']]) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.05), new THREE.MeshBasicMaterial({ color: 0x111827 })); s.position.y = yVon(c); thermo.add(s);
    const l = textSprite(t, '#111827', 0.55); l.position.set(1.5, yVon(c), 0); thermo.add(l);
  }
  const schild = textSprite(' ', '#111', 1);
  wurzel.add(schild);
  let letzterZustand = zustand(st.temp), uebergang = '', uebergangZeit = 0, infoZeit = 0;
  const UEBERGANG = { 'fest>flüssig': 'Schmelzen', 'flüssig>fest': 'Erstarren', 'flüssig>gasförmig': 'Verdampfen (Sieden)', 'gasförmig>flüssig': 'Kondensieren', 'fest>gasförmig': 'Sublimieren', 'gasförmig>fest': 'Resublimieren' };
  function beschriften() {
    wurzel.remove(schild); schild.material.map.dispose();
    const z = zustand(st.temp), neu = textSprite(`${st.temp} °C – ${z}${uebergangZeit > 0 ? `\n${uebergang}` : ''}`, z === 'fest' ? '#1d4ed8' : z === 'flüssig' ? '#0f766e' : '#b91c1c', 0.75);
    schild.material = neu.material; schild.scale.copy(neu.scale); schild.position.set(0, H / 2 + 1.2, 0); wurzel.add(schild); schild.visible = st.beschriftung;
  }
  beschriften();
  function zeichnen() {
    for (let i = 0; i < sim.N; i++) {
      kugeln.setMatrixAt(i, m4.makeTranslation(sim.pos[i].x, sim.pos[i].y, sim.pos[i].z));
      const v = sim.vel[i].length() / Math.sqrt(3 * Math.max(sim.tZiel, 0.05));
      if (st.farbe) farbe.setHSL(THREE.MathUtils.clamp(0.62 - 0.62 * (v - 0.3) / 1.4, 0, 0.62), 0.85, 0.52); else farbe.setHex(0x3b82f6);
      kugeln.setColorAt(i, farbe);
    }
    kugeln.instanceMatrix.needsUpdate = true; kugeln.instanceColor.needsUpdate = true;
    saeule.scale.y = yVon(THREE.MathUtils.clamp(st.temp, cMin, cMax)); saeule.position.y = saeule.scale.y / 2;
    platte.material.emissiveIntensity = THREE.MathUtils.clamp((st.temp + 50) / 300, 0, 0.8);
  }
  zeichnen();
  const TEXT = {
    fest: 'Fest: Die Teilchen sitzen dicht an festen Plätzen in einem regelmäßigen Gitter. Sie schwingen nur hin und her, je wärmer, desto stärker. Feste Körper haben eine feste Form und ein festes Volumen.',
    flüssig: 'Flüssig: Die Teilchen sind noch dicht beieinander und ziehen sich an, können sich aber aneinander vorbeibewegen. Deshalb passt sich eine Flüssigkeit der Form des Gefäßes an, ihr Volumen bleibt aber gleich.',
    gasförmig: 'Gasförmig: Die Teilchen fliegen schnell und frei durch den ganzen Raum, stoßen gegeneinander und gegen die Wände (Gasdruck). Zwischen ihnen ist viel leerer Raum. Ein Gas füllt jedes Gefäß ganz aus.',
  };
  const info = () => {
    const z = zustand(st.temp);
    return [`<b>${st.temp} °C – ${z}</b> · ${sim.N} Teilchen · Farbe: <span style="color:#2563eb">langsam</span> → <span style="color:#dc2626">schnell</span>`,
      `<i>${TEXT[z]} Temperatur ist ein Maß für die Bewegungsenergie der Teilchen: Beim Erwärmen bewegen sie sich schneller. Teilchenzahl stark verkleinert, Temperaturskala an Wasser angelehnt; die Zustände ergeben sich aus der berechneten Teilchenbewegung.</i>`].join('<br>');
  };
  const erg = {
    objekt: wurzel, radius: H * 0.72, titel: 'Teilchenmodell – Aggregatzustände', info: info(),
    update: dt => {
      if (st.auto && st.bewegung) {        // langsam aufheizen und wieder abkühlen
        st._autoZeit = (st._autoZeit || 0) + dt;
        const p = (st._autoZeit % 60) / 60, c = Math.round((-60 + 260 * (p < 0.5 ? p * 2 : 2 - p * 2)) / 5) * 5;
        if (c !== st.temp) { st.temp = c; st._neu = true; }
      }
      sim.tZiel = vonC(st.temp);
      if (st.bewegung) sim.schritt(12);
      const z = zustand(st.temp);
      if (z !== letzterZustand) { uebergang = UEBERGANG[letzterZustand + '>' + z] || ''; uebergangZeit = 4; letzterZustand = z; st._neu = true; }
      if (uebergangZeit > 0) { uebergangZeit -= dt; if (uebergangZeit <= 0) st._neu = true; }
      if (st._neu) { st._neu = false; beschriften(); if (erg.beiInfo) erg.beiInfo(info()); if (st._knopf) st._knopf(); }
      zeichnen();
      void infoZeit;
    },
  };
  return erg;
}
export const entsorge = entsorgeObj;

export function ausUrl(p) { const st = standard(); const t = +p.get('t'); if (Number.isFinite(t) && p.has('t')) st.temp = THREE.MathUtils.clamp(Math.round(t / 10) * 10, -100, 250); return st; }
export const zuUrl = st => `&t=${st.temp}`;

export function bedienung(ort, st, neu) {
  stil(); ort.innerHTML = '';
  const t = zahlKnopf(ort, 'Temperatur');
  const knopf = x => { const b = document.createElement('button'); b.textContent = x; ort.appendChild(b); return b; };
  const bAuto = knopf('Heizen & Kühlen'), bFarbe = knopf('Farben'), bSchild = knopf('Beschriftung'), bBew = knopf('Bewegung'), bNeu = knopf('Neu (Kristall)');
  function auffrischen() {
    t.t.textContent = `${st.temp} °C`; t.m.disabled = st.temp <= -100; t.p.disabled = st.temp >= 250;
    bAuto.classList.toggle('on', st.auto); bFarbe.classList.toggle('on', st.farbe); bSchild.classList.toggle('on', st.beschriftung); bBew.classList.toggle('on', st.bewegung);
  }
  st._knopf = auffrischen;
  const live = f => () => { f(); st._neu = true; auffrischen(); };     // ohne Neuaufbau: Simulation läuft weiter
  t.m.onclick = live(() => { st.auto = false; st.temp -= 10; });
  t.p.onclick = live(() => { st.auto = false; st.temp += 10; });
  bAuto.onclick = live(() => { st.auto = !st.auto; st._autoZeit = 0; });
  bFarbe.onclick = live(() => st.farbe = !st.farbe);
  bSchild.onclick = () => { st.beschriftung = !st.beschriftung; auffrischen(); neu(); };
  bBew.onclick = live(() => st.bewegung = !st.bewegung);
  bNeu.onclick = () => { st._sim = null; neu(); };
  auffrischen();
}
