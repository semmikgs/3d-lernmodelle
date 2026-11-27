// Getriebe-Generator: Stirnräder mit echter Evolventenverzahnung (Eingriffswinkel 20°, Modul 1).
// Die Räder greifen exakt ineinander; Drehzahlen und Drehrichtungen folgen aus den Zähnezahlen.
import * as THREE from 'three';
import { textSprite, entsorge as entsorgeObj, stil, zahlKnopf } from './hilfen.js';

export const ARTEN = { paar: 'Zahnradpaar', zwischen: 'Mit Zwischenrad', stufen: 'Zweistufiges Getriebe' };
export const standard = () => ({ art: 'paar', z: [20, 40, 12, 36], teilkreise: false, bewegung: false, beschriftung: false });
const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const ALPHA = THREE.MathUtils.degToRad(20), inv = a => Math.tan(a) - a, B = 4;   // Zahnbreite 4 mm
const FARBEN = [0x2563eb, 0xf59e0b, 0x16a34a, 0xdc2626];
const N1 = 60;                                    // Antrieb: 60 Umdrehungen pro Minute (Darstellung verlangsamt)
const MIN_Z = 8, MAX_Z = 60;

// Umriss eines Zahnrads (Mittelpunkt 0, Zahn 0 zeigt nach +x)
function zahnradForm(z) {
  const rp = z / 2, rb = rp * Math.cos(ALPHA), ra = rp + 1, rf = rp - 1.25, r0 = Math.max(rf, rb);
  const psi = r => Math.PI / (2 * z) + inv(ALPHA) - inv(Math.acos(Math.min(1, rb / r)));
  const pts = [], pol = (r, w) => pts.push(new THREE.Vector2(r * Math.cos(w), r * Math.sin(w)));
  const n = 8;
  for (let k = 0; k < z; k++) {
    const c = 2 * Math.PI * k / z;
    for (let i = 0; i <= 3; i++) pol(rf, c - Math.PI / z + (Math.PI / z - psi(r0)) * i / 3);         // Fußkreis
    for (let i = 0; i <= n; i++) { const r = r0 + (ra - r0) * i / n; pol(r, c - psi(r)); }           // Flanke hinauf
    for (let i = 1; i < 3; i++) pol(ra, c - psi(ra) + 2 * psi(ra) * i / 3);                           // Kopfkreis
    for (let i = n; i >= 0; i--) { const r = r0 + (ra - r0) * i / n; pol(r, c + psi(r)); }           // Flanke hinab
    for (let i = 1; i <= 3; i++) pol(rf, c + psi(r0) + (Math.PI / z - psi(r0)) * i / 3);
  }
  const s = new THREE.Shape(pts);
  const loch = new THREE.Path(); loch.absarc(0, 0, Math.min(1.6, rf * 0.3), 0, Math.PI * 2, true); s.holes.push(loch);
  if (rf > 7) {                                   // große Räder: Aussparungen (Speichen)
    const ri = Math.min(1.6, rf * 0.3) + 1.6, ro = rf - 1.8, sp = 5;
    for (let k = 0; k < sp; k++) {
      const a0 = 2 * Math.PI * k / sp + 0.22, a1 = 2 * Math.PI * (k + 1) / sp - 0.22, h = new THREE.Path();
      h.absarc(0, 0, ro, a0, a1, false); h.absarc(0, 0, ri, a1, a0, true); h.closePath(); s.holes.push(h);
    }
  }
  return { s, rp, ra, rf };
}
function zahnrad(z, farbe) {
  const { s, rp, ra } = zahnradForm(z);
  const g = new THREE.ExtrudeGeometry(s, { depth: B, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.12, bevelSegments: 1, curveSegments: 12 });
  g.translate(0, 0, -B / 2);
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: farbe, metalness: 0.35, roughness: 0.45 }));
  const rad = new THREE.Group(); rad.add(m);
  // Markierung auf Zahn 0: so sieht man, wie oft sich das Rad dreht
  const mk = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 20), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x666666 }));
  mk.rotation.x = Math.PI / 2; mk.position.set(rp - 0.4, 0, B / 2 + 0.2); rad.add(mk);
  return { rad, rp, ra };
}
// gebogener Drehrichtungspfeil um eine Achse
function drehpfeil(r, links, farbe) {
  const g = new THREE.Group(), w0 = 0.35 * Math.PI, w1 = 0.85 * Math.PI, pts = [];
  for (let i = 0; i <= 24; i++) { const w = w0 + (w1 - w0) * i / 24; pts.push(V(r * Math.cos(w), r * Math.sin(w))); }
  if (!links) pts.reverse();
  const mat = new THREE.MeshBasicMaterial({ color: farbe });
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.28, 8), mat));
  const e = pts[pts.length - 1], t = e.clone().sub(pts[pts.length - 2]).normalize();
  const k = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.6, 14), mat); k.position.copy(e); k.quaternion.setFromUnitVectors(V(0, 1), t); g.add(k);
  return g;
}
const zahl = x => (Math.round(x * 10) / 10).toLocaleString('de-DE');

// =====================================================================
export function erzeuge(st) {
  const wurzel = new THREE.Group(), etik = new THREE.Group(); wurzel.add(etik);
  const [z1, z2, z3, z4] = st.z, art = st.art;
  // Räder: [Zähne, Mittelpunkt, Ebene z, Antreiber-Index, Richtung vom Antreiber (Winkel), gleiche Welle wie]
  const R = [];
  const a12 = (z1 + z2) / 2;
  if (art === 'paar') { R.push({ z: z1, c: V(-a12 / 2, 0) }, { z: z2, c: V(a12 / 2, 0), von: 0 }); }
  else if (art === 'zwischen') {
    const a1 = (z1 + z3) / 2, a2 = (z3 + z2) / 2;
    R.push({ z: z1, c: V(-(a1 + a2) / 2, 0) }, { z: z3, c: V(-(a1 + a2) / 2 + a1, 0), von: 0 }, { z: z2, c: V((a1 + a2) / 2, 0), von: 1 });
  } else {
    const a34 = (z3 + z4) / 2;
    R.push({ z: z1, c: V(-a12 / 2, a34 / 2) }, { z: z2, c: V(a12 / 2, a34 / 2), von: 0 },
      { z: z3, c: V(a12 / 2, a34 / 2), welle: 1, ebene: B + 1.5 }, { z: z4, c: V(a12 / 2, -a34 / 2), von: 2, ebene: B + 1.5 });
  }
  // Übersetzungsfaktoren (Drehwinkel relativ zum Antrieb) und Phasen
  for (const [i, r] of R.entries()) {
    r.ebene ||= 0;
    if (i === 0) { r.f = 1; r.p = 0; continue; }
    if (r.welle !== undefined) { r.f = R[r.welle].f; r.p = R[r.welle].p; continue; }
    const a = R[r.von], beta = Math.atan2(r.c.y - a.c.y, r.c.x - a.c.x);
    r.beta = beta; r.f = -a.f * a.z / r.z;
    // φ_j = β + π + π/z_j − (z_i/z_j)(φ_i − β)  →  Phase für φ_Antrieb = 0
    r.p = beta + Math.PI + Math.PI / r.z - (a.z / r.z) * (a.p - beta);
  }
  // Grundplatte und Wellen
  let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
  for (const r of R) { const ra = r.z / 2 + 1; xmin = Math.min(xmin, r.c.x - ra); xmax = Math.max(xmax, r.c.x + ra); ymin = Math.min(ymin, r.c.y - ra); ymax = Math.max(ymax, r.c.y + ra); }
  const platte = new THREE.Mesh(new THREE.BoxGeometry(xmax - xmin + 4, ymax - ymin + 4, 1), new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 }));
  platte.position.set((xmin + xmax) / 2, (ymin + ymax) / 2, -B / 2 - 2.5); wurzel.add(platte);
  const wMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.8, roughness: 0.3 });
  for (const r of R) {
    if (r.welle !== undefined) continue;
    const lang = art === 'stufen' && (r === R[1]) ? 2 * B + 6 : B + 5;
    const w = new THREE.Mesh(new THREE.CylinderGeometry(Math.min(1.5, (r.z / 2 - 1.25) * 0.3) - 0.05, Math.min(1.5, (r.z / 2 - 1.25) * 0.3) - 0.05, lang, 20), wMat);
    w.rotation.x = Math.PI / 2; w.position.set(r.c.x, r.c.y, -B / 2 - 2 + lang / 2); wurzel.add(w);
  }
  // Räder
  const farbIdx = art === 'zwischen' ? [0, 2, 1] : [0, 1, 2, 3];
  R.forEach((r, i) => {
    const { rad, rp } = zahnrad(r.z, FARBEN[farbIdx[i]]); rad.position.set(r.c.x, r.c.y, r.ebene); wurzel.add(rad); r.obj = rad; r.rp = rp;
    if (st.teilkreise) {
      const kreis = new THREE.Mesh(new THREE.TorusGeometry(rp, 0.12, 6, 120), new THREE.MeshBasicMaterial({ color: 0x111827 }));
      kreis.position.set(r.c.x, r.c.y, r.ebene + B / 2 + 0.35); wurzel.add(kreis);
    }
  });
  // Drehzahlen und Drehrichtungen
  const n = R.map(r => N1 * Math.abs(r.f)), links = R.map(r => r.f > 0);    // Antrieb dreht gegen den Uhrzeigersinn
  const iGes = 1 / Math.abs(R[R.length - 1].f);
  const H = Math.max(1.3, (Math.max(xmax - xmin, ymax - ymin) / 2 + 6) * 0.075);
  if (st.beschriftung) {
    R.forEach((r, i) => {
      if (r.welle !== undefined) return;
      const p = drehpfeil(r.z / 2 + 2.2, links[i], 0x334155); p.position.set(r.c.x, r.c.y, r.ebene + B / 2 + 0.5);
      if (art === 'stufen' && i === 3) p.rotation.z = Math.PI;
      etik.add(p);
    });
    const name = i => i === 0 ? 'Antriebsrad' : i === R.length - 1 ? 'Abtriebsrad' : art === 'zwischen' ? 'Zwischenrad' : i === 1 ? 'Rad 2' : 'Rad 3';
    R.forEach((r, i) => {
      const s = textSprite(`${name(i)}\n${r.z} Zähne · ${zahl(n[i])} U/min`, '#1f2937', H);
      const oben = art === 'stufen' && i >= 2 ? -1 : 1;
      s.position.set(r.c.x + (art === 'stufen' && i === 2 ? r.z / 2 + 9 : 0), r.c.y + oben * (r.z / 2 + 3 + 1.6 * H), r.ebene + 4);
      etik.add(s);
    });
    if (st.teilkreise && art !== 'stufen') {
      const wp = R[0].c.clone().add(V(R[0].rp, 0)); const s = textSprite('Wälzpunkt: Teilkreise\nberühren sich', '#111827', H * 0.8);
      s.position.set(wp.x, wp.y - (R[0].z / 2 + 5), B + 2); etik.add(s);
    }
  }
  // Info
  const iTxt = x => x >= 1 ? `${zahl(x)} : 1` : `1 : ${zahl(1 / x)}`;
  const zeilen = [];
  if (art === 'paar') {
    zeilen.push(`<b>Zahnradpaar</b> · Übersetzung i = z₂ / z₁ = ${z2} / ${z1} = <b>${iTxt(z2 / z1)}</b> · Antrieb ${N1} U/min → Abtrieb ${zahl(n[1])} U/min`);
    zeilen.push(`<i>Greifen zwei Zahnräder ineinander, drehen sie sich in entgegengesetzter Richtung. Pro Umdrehung des Antriebsrads wandern ${z1} Zähne am Eingriff vorbei – das Abtriebsrad mit ${z2} Zähnen dreht sich deshalb ${z2 > z1 ? 'langsamer' : z2 < z1 ? 'schneller' : 'genauso schnell'}. ${z2 > z1 ? 'Übersetzung ins Langsame: Das Drehmoment wird größer (ohne Reibung im selben Verhältnis), die Drehzahl kleiner – wie im ersten Gang beim Fahrrad oder Auto.' : z2 < z1 ? 'Übersetzung ins Schnelle: Die Drehzahl wird größer, das Drehmoment kleiner.' : ''} Es gilt: n₁ · z₁ = n₂ · z₂.</i>`);
  } else if (art === 'zwischen') {
    zeilen.push(`<b>Getriebe mit Zwischenrad</b> · i = z₂ / z₁ = ${z2} / ${z1} = <b>${iTxt(z2 / z1)}</b> · Abtrieb ${zahl(n[2])} U/min, gleiche Drehrichtung wie der Antrieb`);
    zeilen.push(`<i>Das Zwischenrad (${z3} Zähne) kehrt nur die Drehrichtung um: Antriebs- und Abtriebsrad drehen sich jetzt in dieselbe Richtung. Auf die Übersetzung hat es keinen Einfluss – probiere es aus, indem du seine Zähnezahl änderst. Mit Zwischenrädern überbrückt man außerdem größere Abstände.</i>`);
  } else {
    zeilen.push(`<b>Zweistufiges Getriebe</b> · i = (z₂ / z₁) · (z₄ / z₃) = (${z2} / ${z1}) · (${z4} / ${z3}) = <b>${iTxt(iGes)}</b> · Abtrieb ${zahl(n[3])} U/min`);
    zeilen.push(`<i>Rad 2 und Rad 3 sitzen auf derselben Welle und drehen sich gleich schnell. Die Übersetzungen der beiden Stufen werden multipliziert – so erreicht man große Übersetzungen mit kleinen Rädern, z. B. im Uhrwerk, im Akkuschrauber oder in der Gangschaltung. Zwei Zahnradpaare kehren die Drehrichtung zweimal um: Antrieb und Abtrieb drehen gleich herum.</i>`);
  }
  zeilen.push('<i>Die Zähne haben eine Evolventenform: Sie rollen aufeinander ab, statt zu reiben. Die weißen Punkte zeigen, wie oft sich jedes Rad dreht. Die Bewegung ist verlangsamt dargestellt.</i>');
  etik.visible = st.beschriftung;
  let phi = st._phi || 0;
  const setze = () => R.forEach(r => { r.obj.rotation.z = r.p + r.f * phi; });
  setze();
  const radius = Math.max(xmax - xmin, ymax - ymin) / 2 + 6;
  wurzel.position.set(-(xmin + xmax) / 2, -(ymin + ymax) / 2, 0);
  const huelle = new THREE.Group(); huelle.add(wurzel);
  return {
    objekt: huelle, radius, titel: `Getriebe – ${ARTEN[art]}`, info: zeilen.join('<br>'),
    update: dt => { if (!st.bewegung) return; phi += Math.min(dt, 0.1) * 2 * Math.PI / 8; st._phi = phi; setze(); },
  };
}
export const entsorge = entsorgeObj;
export function ausUrl(p) {
  const st = standard(); if (ARTEN[p.get('a')]) st.art = p.get('a');
  const z = (p.get('z') || '').split('-').map(Number); if (z.length === 4 && z.every(x => x >= MIN_Z && x <= MAX_Z)) st.z = z;
  return st;
}
export const zuUrl = st => `&a=${st.art}&z=${st.z.join('-')}`;
export function bedienung(ort, st, neu) {
  stil(); ort.innerHTML = '';
  const s = document.createElement('select'); for (const [k, v] of Object.entries(ARTEN)) s.add(new Option(v, k)); ort.appendChild(s);
  const titel = ['Zähne Antriebsrad', 'Zähne Abtriebsrad / Rad 2', 'Zähne Zwischenrad / Rad 3', 'Zähne Rad 4 (Abtrieb)'];
  const k = st.z.map((_, i) => zahlKnopf(ort, titel[i]));
  const knopf = t => { const b = document.createElement('button'); b.textContent = t; ort.appendChild(b); return b; };
  const bTeil = knopf('Teilkreise'), bBew = knopf('Bewegung'), bSchild = knopf('Beschriftung');
  const kurz = art => ['z₁', 'z₂', art === 'zwischen' ? 'z Zw.' : 'z₃', 'z₄'];
  const auff = () => {
    s.value = st.art;
    k.forEach((kk, i) => {
      kk.w.hidden = (i === 3 && st.art !== 'stufen') || (i === 2 && st.art === 'paar');
      kk.t.textContent = `${kurz(st.art)[i]} = ${st.z[i]}`;
    });
    bTeil.classList.toggle('on', st.teilkreise); bBew.classList.toggle('on', st.bewegung); bSchild.classList.toggle('on', st.beschriftung);
  };
  k.forEach((kk, i) => {
    kk.m.onclick = () => { st.z[i] = Math.max(MIN_Z, st.z[i] - 1); auff(); neu(); };
    kk.p.onclick = () => { st.z[i] = Math.min(MAX_Z, st.z[i] + 1); auff(); neu(); };
  });
  s.onchange = () => { st.art = s.value; auff(); neu(); };
  bTeil.onclick = () => { st.teilkreise = !st.teilkreise; auff(); neu(); };
  bBew.onclick = () => { st.bewegung = !st.bewegung; auff(); };
  bSchild.onclick = () => { st.beschriftung = !st.beschriftung; auff(); neu(); };
  auff();
}
