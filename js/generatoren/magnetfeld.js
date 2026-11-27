// Magnetfeld-Generator: Feldlinien werden aus dem Feld berechnet (nicht gezeichnet).
// Dauermagnete und Spule als Stromschleifen (Biot-Savart), die Erde als magnetischer Dipol.
// Die Linien werden schrittweise entlang des Feldes verfolgt; sie treten am Nordpol aus, am Südpol ein
// und laufen im Inneren des Magneten weiter – Feldlinien sind geschlossen. Nordpol rot, Südpol grün.
import * as THREE from 'three';
import { textSprite, entsorge as entsorgeObj, stil } from './hilfen.js';

export const QUELLEN = { stab: 'Stabmagnet', hufeisen: 'Hufeisenmagnet', anziehen: 'Zwei Magnete – Anziehung', abstossen: 'Zwei Magnete – Abstoßung', spule: 'Spule mit Strom', erde: 'Erde' };
export const standard = () => ({ quelle: 'stab', raeumlich: false, kompass: true, beschriftung: false });
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const NORD = 0xdc2626, SUED = 0x16a34a;

// ---------- Feldquellen ----------
// Stromschleife: Kreis mit Mittelpunkt c, Normale n (Strom so, dass das Feld innen in Richtung n zeigt), Radius r
function schleife(c, n, r, seg = 20) {
  n = n.clone().normalize();
  const a = Math.abs(n.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0), u = a.clone().cross(n).normalize(), w = n.clone().cross(u);
  const pts = Array.from({ length: seg + 1 }, (_, i) => { const t = i / seg * Math.PI * 2; return c.clone().addScaledVector(u, r * Math.cos(t)).addScaledVector(w, r * Math.sin(t)); });
  const s = []; for (let i = 0; i < seg; i++) s.push({ m: pts[i].clone().lerp(pts[i + 1], 0.5), d: pts[i + 1].clone().sub(pts[i]) });
  return s;
}
// Magnet längs eines Weges (Punkte von Süd nach Nord): viele Schleifen = gleichmäßig magnetisiert
function magnetWeg(pfad, r, n = 18) {
  const kurve = new THREE.CatmullRomCurve3(pfad), s = [];
  for (let i = 0; i < n; i++) { const u = (i + 0.5) / n; s.push(...schleife(kurve.getPointAt(u), kurve.getTangentAt(u), r)); }
  return s;
}
function feldVon(segmente) {
  const d = V(0, 0, 0), q = V(0, 0, 0);
  return p => {
    const B = V(0, 0, 0);
    for (const s of segmente) {
      d.subVectors(p, s.m); const r2 = Math.max(d.lengthSq(), 0.004), r3 = r2 * Math.sqrt(r2);
      q.crossVectors(s.d, d).divideScalar(r3); B.add(q);
    }
    return B;
  };
}
const dipol = (m, R) => p => { const r = p.length(); if (r < 0.2) return V(0, 0, 0); const rh = p.clone().divideScalar(r); return rh.multiplyScalar(3 * m.dot(rh)).sub(m).divideScalar(r * r * r); };

// Feldlinie verfolgen (Runge-Kutta 2. Ordnung)
function verfolgen(B, start, { schritt = 0.05, max = 1400, grenze = 9.5, stopp = null, richtung = 1 } = {}) {
  const pts = [start.clone()]; let p = start.clone();
  for (let i = 0; i < max; i++) {
    const b1 = B(p); if (b1.lengthSq() < 1e-12) break;
    const mid = p.clone().addScaledVector(b1.normalize(), richtung * schritt / 2);
    const b2 = B(mid); if (b2.lengthSq() < 1e-12) break;
    p = p.clone().addScaledVector(b2.normalize(), richtung * schritt);
    pts.push(p);
    if (p.length() > grenze) break;
    if (stopp && stopp(p, i)) break;
    if (i > 60 && p.distanceTo(start) < schritt * 1.2) { pts.push(start.clone()); break; }   // Linie hat sich geschlossen
  }
  return pts;
}

// ---------- Darstellung ----------
// Startpunkte am Südende rückwärts verfolgen; nur offene Linien behalten (geschlossene sind schon vom Nordpol aus gezeichnet)
function rueckwaerts(gruppe, B, starts, farbe, grenze = 9) {
  for (const s of starts) { const pts = verfolgen(B, s, { grenze, richtung: -1 }); if (pts[pts.length - 1].length() > grenze - 0.2) linieZeichnen(gruppe, pts.reverse(), farbe, B); }
}
function linieZeichnen(gruppe, pts, farbe, B) {
  if (pts.length < 4) return;
  const kurve = new THREE.CatmullRomCurve3(pts);
  gruppe.add(new THREE.Mesh(new THREE.TubeGeometry(kurve, Math.min(pts.length, 600), 0.028, 5), new THREE.MeshBasicMaterial({ color: farbe })));
  // Pfeile in Feldrichtung
  const L = kurve.getLength(), n = Math.max(1, Math.floor(L / 1.8));
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n, p = kurve.getPointAt(u), b = B(p);
    if (b.lengthSq() < 1e-12) continue;
    const k = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.26, 10), new THREE.MeshBasicMaterial({ color: farbe }));
    k.position.copy(p); k.quaternion.setFromUnitVectors(V(0, 1, 0), b.normalize()); gruppe.add(k);
  }
}
function stabmagnet(gruppe, a, b, r) {      // a = Südende, b = Nordende
  const achse = b.clone().sub(a), L = achse.length(), mitte = a.clone().lerp(b, 0.5);
  for (const [s, farbe] of [[-1, SUED], [1, NORD]]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(L / 2, 2 * r, 2 * r), new THREE.MeshStandardMaterial({ color: farbe, roughness: 0.4, transparent: true, opacity: 0.55, depthWrite: false }));
    m.position.copy(mitte).addScaledVector(achse.clone().normalize(), s * L / 4); m.quaternion.setFromUnitVectors(V(1, 0, 0), achse.clone().normalize()); gruppe.add(m);
    const t = textSprite(s > 0 ? 'N' : 'S', '#fff', 0.8, s > 0 ? 'rgba(185,28,28,0.95)' : 'rgba(21,128,61,0.95)'); t.position.copy(m.position).add(V(0, r + 0.45, 0)); gruppe.add(t);
  }
}
// Startpunkte am Nordende eines Magneten (Kreis um das Ende) – in der Ebene oder räumlich verteilt
function startpunkte(nordEnde, richtung, r, raeumlich, ebenenNormale = V(0, 0, 1)) {
  const n = richtung.clone().normalize(), e1 = ebenenNormale.clone().cross(n).normalize(), e2 = n.clone().cross(e1).normalize(), s = [];
  const winkel = raeumlich ? [0, 1, 2, 3, 4, 5].map(i => i * Math.PI / 3) : [0, Math.PI];
  for (const w of winkel) for (const rr of [0.12, 0.32, 0.52, r * 0.92]) s.push(nordEnde.clone().addScaledVector(n, 0.03).addScaledVector(e1, rr * Math.cos(w)).addScaledVector(e2, rr * Math.sin(w)));
  if (!raeumlich) s.push(nordEnde.clone().addScaledVector(n, 0.03));
  return s;
}

function kompassnadeln(gruppe, B, frei, bereich = 7, abstand = 1.1, y = 0) {
  const nM = new THREE.MeshStandardMaterial({ color: NORD }), sM = new THREE.MeshStandardMaterial({ color: 0xe5e7eb });
  const kegel = new THREE.ConeGeometry(0.1, 0.32, 10);
  for (let x = -bereich; x <= bereich + 1e-6; x += abstand) for (let yy = -bereich; yy <= bereich + 1e-6; yy += abstand) {
    const p = V(x, yy + y, 0); if (p.length() > bereich || !frei(p)) continue;
    const b = B(p); b.z = 0; if (b.lengthSq() < 1e-14) continue; b.normalize();
    const g = new THREE.Group(); g.position.copy(p);
    const n = new THREE.Mesh(kegel, nM); n.position.y = 0.16; g.add(n); const s = new THREE.Mesh(kegel, sM); s.position.y = -0.16; s.rotation.z = Math.PI; g.add(s);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.015, 4, 20), new THREE.MeshBasicMaterial({ color: 0x94a3b8 })); ring.position.copy(p); gruppe.add(ring);
    g.quaternion.setFromUnitVectors(V(0, 1, 0), b); gruppe.add(g);
  }
}

// =====================================================================
export function erzeuge(st) {
  const wurzel = new THREE.Group(), etik = new THREE.Group(); wurzel.add(etik);
  const schild = (t, f, h, p) => { const s = textSprite(t, f, h); s.position.copy(p); etik.add(s); return s; };
  const q = st.quelle, linienFarbe = 0x2563eb;
  let B, frei = () => true, text = '', titel = QUELLEN[q];
  const linien = new THREE.Group(); wurzel.add(linien);
  const imMagnet = (a, b, r) => p => { const ach = b.clone().sub(a), t = p.clone().sub(a).dot(ach) / ach.lengthSq(); if (t < -0.05 || t > 1.05) return false; const nah = a.clone().addScaledVector(ach, t); return p.distanceTo(nah) < r * 1.45; };

  if (q === 'stab' || q === 'anziehen' || q === 'abstossen') {
    const r = 0.6;
    const magnete = q === 'stab' ? [[V(-3, 0, 0), V(3, 0, 0)]]
      : q === 'anziehen' ? [[V(-6, 0, 0), V(-1.4, 0, 0)], [V(1.4, 0, 0), V(6, 0, 0)]]
      : [[V(-6, 0, 0), V(-1.4, 0, 0)], [V(6, 0, 0), V(1.4, 0, 0)]];
    const seg = magnete.flatMap(([a, b]) => magnetWeg([a, b], r, 22));
    B = feldVon(seg);
    for (const [a, b] of magnete) stabmagnet(wurzel, a, b, r);
    const drin = magnete.map(([a, b]) => imMagnet(a, b, r)); frei = p => !drin.some(f => f(p));
    for (const [a, b] of magnete) {
      const ach = b.clone().sub(a).normalize();
      for (const s of startpunkte(b, ach, r, st.raeumlich)) {
        const pts = verfolgen(B, s, { grenze: q === 'stab' ? 9 : 10.5 });
        // offene Linien (verlassen den Bereich) auch rückwärts verlängern, damit sie im Magneten beginnen
        linieZeichnen(linien, pts, linienFarbe, B);
      }
      rueckwaerts(linien, B, startpunkte(a, ach.clone().negate(), r, st.raeumlich), linienFarbe, q === 'stab' ? 9 : 10.5);
    }
    text = q === 'stab'
      ? 'Die Feldlinien treten am Nordpol aus und am Südpol wieder ein; im Inneren laufen sie vom Süd- zum Nordpol weiter – Feldlinien sind immer geschlossen. Wo die Linien dicht liegen, ist das Feld stark: an den Polen. Eine Kompassnadel stellt sich in Richtung der Feldlinien, ihr Nordpol (rot) zeigt in Feldrichtung.'
      : q === 'anziehen'
        ? 'Nordpol und Südpol stehen sich gegenüber: Die Feldlinien laufen vom Nordpol des einen direkt in den Südpol des anderen Magneten. Ungleichnamige Pole ziehen sich an.'
        : 'Zwei Nordpole stehen sich gegenüber: Die Feldlinien weichen einander aus und laufen seitlich weg; in der Mitte ist das Feld fast null. Gleichnamige Pole stoßen sich ab.';
  } else if (q === 'hufeisen') {
    const r = 0.5, pfad = [V(-1.3, 2.6, 0), V(-1.3, 0, 0), V(-1.1, -1.0, 0), V(0, -1.55, 0), V(1.1, -1.0, 0), V(1.3, 0, 0), V(1.3, 2.6, 0)];
    B = feldVon(magnetWeg(pfad, r, 40));
    const kurve = new THREE.CatmullRomCurve3(pfad);
    const teile = [[0, 0.2, SUED], [0.2, 0.8, 0x9ca3af], [0.8, 1, NORD]];
    for (const [u0, u1, farbe] of teile) {
      const pts = []; for (let i = 0; i <= 30; i++) pts.push(kurve.getPointAt(u0 + (u1 - u0) * i / 30));
      wurzel.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, r, 20), new THREE.MeshStandardMaterial({ color: farbe, roughness: 0.4, transparent: true, opacity: 0.6, depthWrite: false })));
    }
    for (const [p, t] of [[V(1.3, 3.4, 0), 'N'], [V(-1.3, 3.4, 0), 'S']]) { const s = textSprite(t, '#fff', 0.8, t === 'N' ? 'rgba(185,28,28,0.95)' : 'rgba(21,128,61,0.95)'); s.position.copy(p); wurzel.add(s); }
    const nordEnde = V(1.3, 2.6, 0);
    for (const s of startpunkte(nordEnde, V(0, 1, 0), r, st.raeumlich)) linieZeichnen(linien, verfolgen(B, s, { grenze: 9 }), linienFarbe, B);
    rueckwaerts(linien, B, startpunkte(V(-1.3, 2.6, 0), V(0, 1, 0), r, st.raeumlich), linienFarbe);
    frei = p => { const t = kurve.getUtoTmapping ? 0 : 0; void t; for (let i = 0; i <= 40; i++) if (p.distanceTo(kurve.getPointAt(i / 40)) < r * 1.5) return false; return true; };
    text = 'Ein Hufeisenmagnet ist ein gebogener Stabmagnet: Nord- und Südpol liegen nebeneinander. Die meisten Feldlinien laufen auf kurzem Weg vom Nordpol zum benachbarten Südpol – zwischen den Polenden ist das Feld deshalb besonders stark. Stehen sich die Polenden eng gegenüber, verlaufen die Feldlinien dort fast parallel (homogenes Feld); das nutzt man z. B. im Elektromotor.';
  } else if (q === 'spule') {
    const R = 0.9, L = 4, windungen = 12;
    // Spule als Wendel aus Kupferdraht; Strom so, dass das Feld innen nach +x zeigt
    const helix = []; for (let i = 0; i <= windungen * 40; i++) { const t = i / 40 * Math.PI * 2, x = -L / 2 + L * i / (windungen * 40); helix.push(V(x, R * Math.cos(t), R * Math.sin(t))); }
    wurzel.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helix), windungen * 60, 0.07, 8), new THREE.MeshStandardMaterial({ color: 0xc87533, metalness: 0.6, roughness: 0.35 })));
    const seg = []; for (let i = 0; i < helix.length - 1; i += 2) seg.push({ m: helix[i].clone().lerp(helix[Math.min(i + 2, helix.length - 1)], 0.5), d: helix[Math.min(i + 2, helix.length - 1)].clone().sub(helix[i]) });
    B = feldVon(seg);
    // Stromrichtung der Wendel prüfen: zeigt das Feld innen nach −x, Pole tauschen
    const innen = B(V(0, 0, 0)), nordRechts = innen.x > 0;
    const sp = (x, t, farbe, hg) => { const s = textSprite(t, '#fff', 0.8, hg); s.position.set(x, 1.8, 0); wurzel.add(s); };
    sp(nordRechts ? L / 2 + 0.4 : -L / 2 - 0.4, 'N', 0, 'rgba(185,28,28,0.95)'); sp(nordRechts ? -L / 2 - 0.4 : L / 2 + 0.4, 'S', 0, 'rgba(21,128,61,0.95)');
    // Strompfeile auf dem Draht
    for (let k = 0; k < 4; k++) {
      const i = Math.floor((k + 0.5) / 4 * (helix.length - 2)), p = helix[i], d = helix[i + 1].clone().sub(p).normalize();
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.4, 10), new THREE.MeshBasicMaterial({ color: 0xf59e0b })); c.position.copy(p).add(V(0, 0, 0)); c.quaternion.setFromUnitVectors(V(0, 1, 0), d); wurzel.add(c);
    }
    // Zuleitungen und Batterie
    const ende = helix[helix.length - 1], anf = helix[0];
    for (const [p, y] of [[anf, -2.6], [ende, -2.6]]) wurzel.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([p, V(p.x, y, p.z), V(p.x * 0.3, y, 0)]), 20, 0.05, 6), new THREE.MeshStandardMaterial({ color: p === anf ? 0xdc2626 : 0x1d4ed8 })));
    schild('+', '#b91c1c', 0.8, V(anf.x, -3.0, 0)); schild('−', '#1d4ed8', 0.8, V(ende.x, -3.0, 0));
    const nordX = nordRechts ? L / 2 : -L / 2;
    for (const s of startpunkte(V(nordX, 0, 0), V(nordRechts ? 1 : -1, 0, 0), R * 0.7, st.raeumlich)) linieZeichnen(linien, verfolgen(B, s, { grenze: 9 }), linienFarbe, B);
    rueckwaerts(linien, B, startpunkte(V(-nordX, 0, 0), V(nordRechts ? -1 : 1, 0, 0), R * 0.7, st.raeumlich), linienFarbe);
    frei = p => !(Math.abs(p.x) < L / 2 + 0.3 && Math.hypot(p.y, p.z) < R + 0.4);
    text = 'Fließt Strom durch eine Spule, entsteht ein Magnetfeld wie bei einem Stabmagneten: Innen verlaufen die Feldlinien parallel (homogenes Feld), außen wie beim Stabmagneten. Wo Nord- und Südpol liegen, hängt von der Stromrichtung ab (Rechte-Hand-Regel: Finger in Stromrichtung um die Spule – der Daumen zeigt zum Nordpol). Polt man die Batterie um, tauschen die Pole. Mit Eisenkern wird das Feld viel stärker (Elektromagnet).';
  } else {
    // Erde: Dipol, um 11° gegen die Drehachse geneigt; magnetisches Moment zeigt nach Süden
    const R = 2, kipp = THREE.MathUtils.degToRad(11), m = V(Math.sin(kipp), -Math.cos(kipp), 0);
    B = dipol(m, R);
    const erde = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 48), new THREE.MeshStandardMaterial({ map: new THREE.TextureLoader().load(new URL('../../hintergruende/erde.jpg', import.meta.url).href), roughness: 0.8 }));
    wurzel.add(erde);
    const achse = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2 * R + 1.4, 8), new THREE.MeshBasicMaterial({ color: 0x334155 })); wurzel.add(achse);
    const mag = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2 * R + 1.0, 8), new THREE.MeshBasicMaterial({ color: 0x7c3aed })); mag.quaternion.setFromUnitVectors(V(0, 1, 0), m.clone().negate()); wurzel.add(mag);
    const mn = new THREE.Vector3().copy(m).negate().normalize();
    for (const lat of st.raeumlich ? [-62, -48, -36, -26] : [-70, -58, -48, -40, -33, -27]) {
      for (const lon of st.raeumlich ? [0, 45, 90, 135, 180, 225, 270, 315] : [0, 180]) {
        // Startpunkt in magnetischen Koordinaten (Süd-Halbkugel = magnetischer Nordpol der Erde), Feld tritt dort aus
        const a = THREE.MathUtils.degToRad(lat), o = THREE.MathUtils.degToRad(lon);
        const lokal = V(Math.cos(a) * Math.cos(o), Math.sin(a), Math.cos(a) * Math.sin(o)).multiplyScalar(R + 0.03);
        const p = lokal.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), mn));
        linieZeichnen(linien, verfolgen(B, p, { grenze: 9.5, stopp: (q, i) => i > 5 && q.length() < R }), linienFarbe, B);
      }
    }
    frei = p => p.length() > R + 0.3;
    if (st.beschriftung) {
      schild('geografischer Nordpol\n(Arktis)', '#1f2937', 0.5, V(-2.4, R + 1.3, 0));
      schild('magnetischer Pol, zu dem\nder Kompass-Nordpol zeigt –\nphysikalisch ein Südpol', '#6d28d9', 0.45, V(3.4, R + 1.8, 0));
      schild('geografischer Südpol', '#1f2937', 0.5, V(-2.4, -R - 1.1, 0));
    }
    text = 'Die Erde verhält sich wie ein riesiger Stabmagnet, dessen Achse um etwa 11° gegen die Drehachse geneigt ist. Der Nordpol einer Kompassnadel zeigt nach Norden – weil sich ungleichnamige Pole anziehen, liegt in der Arktis also physikalisch ein magnetischer Südpol. Das Magnetfeld schützt die Erde vor geladenen Teilchen aus dem Weltall (Polarlichter entstehen, wo sie an den Polen eindringen). Es entsteht durch Strömungen im flüssigen, eisenhaltigen äußeren Erdkern.';
  }
  if (st.kompass) kompassnadeln(wurzel, B, frei, q === 'erde' ? 6.5 : 7, q === 'erde' ? 1.0 : 1.1, q === 'hufeisen' ? 0 : 0);
  if (st.beschriftung && q !== 'erde') schild('Feldlinien', '#1d4ed8', 0.7, V(0, q === 'hufeisen' ? 5.6 : 3.6, 0));
  etik.visible = st.beschriftung;
  const info = [`<b>${titel}</b> · <span style="color:#2563eb">Feldlinien</span> mit Pfeilen in Feldrichtung (von N nach S) · Kompassnadeln: <span style="color:#dc2626">rot = Nordpol</span>`, `<i>${text} Die Feldlinien sind aus dem Magnetfeld berechnet.</i>`];
  return { objekt: wurzel, radius: q === 'erde' ? 7 : 9.5, titel: `Magnetfeld – ${titel}`, info: info.join('<br>'), update: () => {} };
}
export const entsorge = entsorgeObj;
export function ausUrl(p) { const st = standard(); if (QUELLEN[p.get('q')]) st.quelle = p.get('q'); st.raeumlich = p.get('r') === '1'; return st; }
export const zuUrl = st => `&q=${st.quelle}&r=${st.raeumlich ? 1 : 0}`;
export function bedienung(ort, st, neu) {
  stil(); ort.innerHTML = '';
  const s = document.createElement('select'); for (const [k, v] of Object.entries(QUELLEN)) s.add(new Option(v, k)); ort.appendChild(s);
  const knopf = t => { const b = document.createElement('button'); b.textContent = t; ort.appendChild(b); return b; };
  const bRaum = knopf('Räumlich'), bKomp = knopf('Kompassnadeln'), bSchild = knopf('Beschriftung');
  const auff = () => { s.value = st.quelle; bRaum.classList.toggle('on', st.raeumlich); bKomp.classList.toggle('on', st.kompass); bSchild.classList.toggle('on', st.beschriftung); };
  s.onchange = () => { st.quelle = s.value; auff(); neu(); };
  bRaum.onclick = () => { st.raeumlich = !st.raeumlich; auff(); neu(); };
  bKomp.onclick = () => { st.kompass = !st.kompass; auff(); neu(); };
  bSchild.onclick = () => { st.beschriftung = !st.beschriftung; auff(); neu(); };
  auff();
}
