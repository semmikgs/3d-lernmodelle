// Klima-Generator: (1) Klimazonen der Erde (vereinfacht als Gürtel) mit der Ursache: Einstrahlungswinkel der Sonne –
// gleich breite Lichtbündel beleuchten am Äquator eine kleine, nahe den Polen eine große Fläche (bei 60° Breite doppelt so groß).
// (2) Höhenstufen der Vegetation: Alpen (gemäßigte Zone) und Anden (Tropen); Temperatur nimmt um ca. 0,65 °C je 100 m ab.
import * as THREE from 'three';
import { textSprite, entsorge as entsorgeObj, stil, zufall } from './hilfen.js';

export const ANSICHTEN = { zonen: 'Klimazonen der Erde', alpen: 'Höhenstufen der Alpen', anden: 'Höhenstufen der Anden (Tropen)' };
export const standard = () => ({ ansicht: 'zonen', strahlen: true, beschriftung: false, bewegung: false });
const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const RAD = THREE.MathUtils.degToRad;
const ZONEN = [                                     // vereinfachte Gürtel (Breitengrade)
  ['Polare Zone', 66.5, 90, 0xdbeafe], ['Subpolare Zone', 60, 66.5, 0x99f6e4], ['Gemäßigte Zone', 40, 60, 0x86efac],
  ['Subtropen', 23.5, 40, 0xfde68a], ['Tropen', 0, 23.5, 0xf87171],
];
// Höhenstufen: [Name, von m, bis m, Farbe, Bewuchs, Beschreibung]
const STUFEN = {
  alpen: { T0: 9, h0: 500, hMax: 4200, stufen: [
    ['Hügelstufe (kollin)', 0, 800, 0x6aa84f, 'laub', 'Laubwald, Obstbau, Ackerbau'],
    ['Bergstufe (montan)', 800, 1600, 0x3f7f3a, 'misch', 'Mischwald aus Buchen, Tannen, Fichten'],
    ['subalpine Stufe', 1600, 2200, 0x2c5f34, 'nadel', 'Nadelwald (Fichten, Lärchen) bis zur Waldgrenze'],
    ['alpine Stufe', 2200, 3000, 0x9bbf6a, 'matte', 'Almwiesen (Matten), Zwergsträucher – Almwirtschaft'],
    ['nivale Stufe', 3000, 5000, 0xf3f4f6, 'fels', 'Fels, Schnee und Gletscher (oberhalb der Schneegrenze)'],
  ] },
  anden: { T0: 27, h0: 0, hMax: 6200, stufen: [
    ['Tierra caliente', 0, 1000, 0x2f7d32, 'regen', 'heiß: tropischer Regenwald, Bananen, Kakao, Zuckerrohr'],
    ['Tierra templada', 1000, 2500, 0x5f9e3a, 'misch', 'gemäßigt warm: Bergwald, Kaffee, Mais'],
    ['Tierra fría', 2500, 3800, 0xa3b35a, 'matte', 'kühl: Kartoffeln, Gerste, Weizen'],
    ['Tierra helada', 3800, 4800, 0xb59f6a, 'puna', 'eisig: Grasland (Páramo/Puna), Lama- und Alpakaweide'],
    ['Tierra nevada', 4800, 7000, 0xf3f4f6, 'fels', 'Fels, Schnee und Gletscher'],
  ] },
};

function globus(wurzel, st, schild, bewegt) {
  const R = 5, erde = new THREE.Group(); wurzel.add(erde);
  const tex = new THREE.TextureLoader().load(new URL('../../hintergruende/erde.jpg', import.meta.url).href); tex.colorSpace = THREE.SRGBColorSpace;
  erde.add(new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.35 })));
  // Zonen als halb durchsichtige Gürtel (beide Halbkugeln)
  for (const [name, b0, b1, farbe] of ZONEN) for (const s of [1, -1]) {
    const t0 = RAD(90 - (s > 0 ? b1 : -b0)), t1 = RAD(90 - (s > 0 ? b0 : -b1));
    const g = new THREE.SphereGeometry(R * 1.012, 96, 24, 0, Math.PI * 2, t0, t1 - t0);
    erde.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: farbe, transparent: true, opacity: 0.58, depthWrite: false })));
    void name;
  }
  // Breitenkreise: Äquator, Wendekreise, Polarkreise
  for (const [b, f] of [[0, 0xdc2626], [23.44, 0xf59e0b], [-23.44, 0xf59e0b], [66.56, 0x2563eb], [-66.56, 0x2563eb]]) {
    const r = R * 1.02 * Math.cos(RAD(b)), k = new THREE.Mesh(new THREE.TorusGeometry(r, 0.035, 6, 120), new THREE.MeshBasicMaterial({ color: f })); k.rotation.x = Math.PI / 2; k.position.y = R * 1.02 * Math.sin(RAD(b)); erde.add(k);
  }
  bewegt.push(t => { erde.rotation.y = t * 0.15; });
  // Sonnenstrahlen: zwei gleich breite Lichtbündel (Sonne über dem Äquator, Tagundnachtgleiche) und ihre Lichtflecken
  if (st.strahlen) {
    const breite = 1.1, sonnenX = 16, licht = new THREE.Group(); licht.rotation.y = -0.75; wurzel.add(licht);
    for (const [b, farbe] of [[0, 0xfacc15], [60, 0xfb923c]]) {
      const y0 = R * Math.sin(RAD(b)), g = new THREE.Group(); licht.add(g);
      // Bündel als durchsichtiger Kasten von der Sonne bis zur Oberfläche
      const xs = R * Math.cos(RAD(b));
      const k = new THREE.Mesh(new THREE.BoxGeometry(sonnenX - xs, breite, breite), new THREE.MeshBasicMaterial({ color: farbe, transparent: true, opacity: 0.25, depthWrite: false }));
      k.position.set((sonnenX + xs) / 2, y0, 0); g.add(k);
      for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.5, 10), new THREE.MeshBasicMaterial({ color: farbe })); p.rotation.z = Math.PI / 2; p.position.set(xs + 1.6 + i * 3.2, y0, 0); g.add(p); }
      // Lichtfleck auf der Kugel: Strahlen des Bündels treffen die Oberfläche
      const n = 16, pos = [];
      for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) {
        const y = y0 + breite * (i / n - 0.5), z = breite * (j / n - 0.5), x = Math.sqrt(Math.max(0, (R * 1.03) ** 2 - y * y - z * z));
        pos.push(x, y, z);
      }
      const idx = []; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const a = i * (n + 1) + j; idx.push(a, a + 1, a + n + 1, a + 1, a + n + 2, a + n + 1); }
      const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); fg.setIndex(idx); fg.computeVertexNormals();
      g.add(new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ color: farbe, side: THREE.DoubleSide })));
    }
    const s = new THREE.Mesh(new THREE.SphereGeometry(1.2, 24, 16), new THREE.MeshBasicMaterial({ color: 0xfde047 })); s.position.set(17, 2.5, 0); licht.add(s);
    const W = p => p.clone().applyAxisAngle(V(0, 1, 0), -0.75);
    schild('gleich breite Lichtbündel', W(V(10, 0.6, 0)), W(V(11, -4.5, 0)));
    schild('Äquator: Licht fällt steil ein,\nkleine Fläche – sehr warm', W(V(5.1, 0, 0)), V(9, -8, 4));
    schild('60° Breite: Licht fällt schräg ein,\ndoppelt so große Fläche – kühler', W(V(2.6, 4.4, 0)), V(8, 9, 4));
  }
  // Legende der Zonen
  ZONEN.slice().reverse().forEach(([name, b0, b1, farbe], i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), new THREE.MeshBasicMaterial({ color: farbe })); m.position.set(-18, 3 - i * 1.3, 0); wurzel.add(m);
    const t = textSprite(`${name} (${String(b0).replace('.', ',')}–${String(b1).replace('.', ',')}°)`, '#1f2937', 0.85); t.position.set(-18 + 0.6 + t.scale.x / 2, 3 - i * 1.3, 0); wurzel.add(t);
  });
  schild('Äquator', V(-5.1, 0, 0.5), V(-8, -4.5, 0)); schild('nördlicher Wendekreis', V(-4.6, 2, 0.5), V(-9, -6.5, 0)); schild('nördlicher Polarkreis', V(-2, 4.6, 0.5), V(-8, 7.5, 0));
  wurzel.position.x = 0;
  return 17;
}

function gebirge(wurzel, st, schild) {
  const S = STUFEN[st.ansicht], zf = zufall(5), UEB = 2, M = 1 / 1000;     // 1 Einheit = 1 km, Höhen doppelt überhöht
  const basis = st.ansicht === 'alpen' ? S.h0 : 0, HM = (S.hMax - basis) * M * UEB;   // Talboden und Gipfel
  const hoehe = (x, z) => { const r = Math.hypot(x, z), n = 0.12 * Math.sin(x * 1.3 + 0.5) * Math.cos(z * 1.1) + 0.07 * Math.sin(x * 3.1 - z * 2.3); return Math.max(0, (S.hMax - basis) * M * Math.pow(Math.max(0, 1 - r / 9), 1.35) * (1 + n)); };
  const stufeVon = hKm => { const hm = hKm * 1000 + (st.ansicht === 'alpen' ? S.h0 : 0); return S.stufen.find(([, a, b]) => hm >= a && hm < b) || S.stufen[S.stufen.length - 1]; };
  // Berg mit Farben nach Höhenstufe
  const geo = new THREE.PlaneGeometry(20, 20, 200, 200); geo.rotateX(-Math.PI / 2);
  const P = geo.attributes.position, col = [];
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), z = P.getZ(i), h = hoehe(x, z), hm = h * 1000 + (st.ansicht === 'alpen' ? S.h0 : 0) + 120 * Math.sin(x * 2.3 + z * 1.7);
    const sf = S.stufen.find(([, a, b]) => hm >= a && hm < b) || S.stufen[S.stufen.length - 1];
    const c = new THREE.Color(sf[3]); if (sf[4] === 'fels' && hm < sf[1] + 400 && Math.sin(x * 5 + z * 4) > 0.3) c.set(0x8b8680);
    P.setY(i, h * UEB); col.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
  wurzel.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 })));
  // Bäume und Pflanzen nach Stufe
  const laub = new THREE.MeshStandardMaterial({ color: 0x4d8a35 }), nadel = new THREE.MeshStandardMaterial({ color: 0x1f4d2a }), palme = new THREE.MeshStandardMaterial({ color: 0x2e7d32 });
  for (let i = 0; i < 900; i++) {
    const x = (zf() - 0.5) * 18, z = (zf() - 0.5) * 18, h = hoehe(x, z), [, , , , art] = stufeVon(h);
    if (Math.hypot(x, z) > 9.3) continue;
    let m;
    if (art === 'laub' || art === 'regen') { m = new THREE.Mesh(new THREE.SphereGeometry(art === 'regen' ? 0.2 : 0.16, 7, 5), art === 'regen' ? palme : laub); m.position.set(x, h * UEB + 0.18, z); }
    else if (art === 'nadel' || (art === 'misch' && zf() < 0.5)) { m = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.38, 6), nadel); m.position.set(x, h * UEB + 0.19, z); }
    else if (art === 'misch') { m = new THREE.Mesh(new THREE.SphereGeometry(0.14, 7, 5), laub); m.position.set(x, h * UEB + 0.16, z); }
    else continue;
    wurzel.add(m);
  }
  // Höhenskala mit Stufengrenzen und Temperaturen
  const X = 11.5, t = hm => S.T0 - 0.65 * (hm - S.h0) / 100;
  const latte = new THREE.Mesh(new THREE.BoxGeometry(0.12, HM, 0.12), new THREE.MeshBasicMaterial({ color: 0x334155 })); latte.position.set(X, HM / 2, 0); wurzel.add(latte);
  for (const [name, a, b, farbe, , text] of S.stufen) {
    const y0 = Math.max(0, (a - basis) * M * UEB), y1 = Math.min(HM, (b - basis) * M * UEB);
    if (y1 <= 0) continue;
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.5, y1 - y0, 0.2), new THREE.MeshBasicMaterial({ color: farbe })); band.position.set(X + 0.35, (y0 + y1) / 2, 0); wurzel.add(band);
    if (st.beschriftung) { const s = textSprite(`${name}: ${text}`, '#1f2937', 0.62); s.position.set(X + 1 + s.scale.x / 2, (y0 + y1) / 2, 0); wurzel.add(s); }
    const m = textSprite(`${a.toLocaleString('de-DE')} m · ${Math.round(t(Math.max(a, basis)))} °C`, '#334155', 0.55); m.position.set(X - 0.4 - m.scale.x / 2, y0, 0); wurzel.add(m);
  }
  const m = textSprite(`${S.hMax.toLocaleString('de-DE')} m · ${Math.round(t(S.hMax))} °C`, '#334155', 0.55); m.position.set(X - 0.4 - m.scale.x / 2, HM, 0); wurzel.add(m);
  if (st.ansicht === 'alpen') { schild('Waldgrenze', V(-4.4, (2200 - S.h0) * M * UEB, 3), V(-10, 5.5, 3)); schild('Schneegrenze', V(-2.6, (3000 - S.h0) * M * UEB, 1.5), V(-10, 7.5, 1.5)); }
  else { schild('Schneegrenze', V(-1.6, 4.8 * UEB, 1), V(-10, 9.5, 1)); }
  wurzel.position.set(-3.5, -HM / 2, 0);
  return 15;
}

export function erzeuge(st) {
  const wurzel = new THREE.Group(), etik = new THREE.Group(); wurzel.add(etik);
  const schild = (txt, a, z) => { const s = textSprite(txt, '#1f2937', 0.95); s.position.copy(z); etik.add(s); const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, z]), new THREE.LineBasicMaterial({ color: 0x334155, depthTest: false })); l.renderOrder = 9; etik.add(l); };
  const bewegt = [];
  const radius = st.ansicht === 'zonen' ? globus(wurzel, st, schild, bewegt) : gebirge(wurzel, st, schild);
  etik.visible = st.beschriftung;
  let t = st._zeit || 0; for (const f of bewegt) f(t);
  const info = st.ansicht === 'zonen'
    ? 'Die Sonne erwärmt die Erde ungleich: Am Äquator fallen die Sonnenstrahlen steil ein, ein Lichtbündel beleuchtet eine kleine Fläche – es wird sehr warm. Zu den Polen hin fällt das Licht immer schräger ein, dieselbe Lichtmenge verteilt sich auf eine größere Fläche (bei 60° Breite auf die doppelte), es bleibt kühler. So entstehen gürtelförmige <b>Klimazonen</b>: Tropen, Subtropen, gemäßigte, subpolare und polare Zone. Hier sind sie vereinfacht als gleichmäßige Gürtel gezeichnet; in Wirklichkeit verschieben Meeresströmungen, Gebirge und die Verteilung von Land und Meer ihre Grenzen – Deutschland liegt trotz 52° Breite dank des Golfstroms in der gemäßigten Zone. Wendekreise (23,4°) und Polarkreise (66,6°) sind eingezeichnet.'
    : st.ansicht === 'alpen'
      ? 'Mit jedem Höhenmeter wird es kälter – um etwa 0,65 °C je 100 m. Deshalb ändert sich die Pflanzenwelt am Berg in <b>Höhenstufen</b>, ähnlich wie auf dem Weg vom Äquator zum Pol. In den Alpen folgen auf Laubwald und Mischwald der Nadelwald, oberhalb der <b>Waldgrenze</b> (ca. 2 000 m) Almwiesen und oberhalb der <b>Schneegrenze</b> (ca. 3 000 m) Fels, Schnee und Gletscher. Die Höhengrenzen sind Mittelwerte; an Südhängen liegen sie höher als an Nordhängen. Höhen doppelt überhöht.'
      : 'In den tropischen Anden liegen die Höhenstufen viel höher als in den Alpen, weil es am Fuß des Gebirges das ganze Jahr heiß ist. Die Menschen nutzen jede Stufe anders: unten Bananen und Kakao (<b>Tierra caliente</b>), darüber Kaffee (<b>Tierra templada</b>), Kartoffeln und Getreide in der <b>Tierra fría</b> und oben Weiden für Lamas und Alpakas in der <b>Tierra helada</b>. Die Schneegrenze liegt erst bei etwa 4 800 m. Höhen doppelt überhöht.';
  return {
    objekt: wurzel, radius, titel: `Klima – ${ANSICHTEN[st.ansicht]}`, info: `<b>${ANSICHTEN[st.ansicht]}</b><br><i>${info}</i>`,
    update: dt => { if (!st.bewegung) return; t += Math.min(dt, 0.1); st._zeit = t; for (const f of bewegt) f(t); },
  };
}
export const entsorge = entsorgeObj;
export function ausUrl(p) { const st = standard(); if (ANSICHTEN[p.get('v')]) st.ansicht = p.get('v'); return st; }
export const zuUrl = st => `&v=${st.ansicht}`;
export function bedienung(ort, st, neu) {
  stil(); ort.innerHTML = '';
  const s = document.createElement('select'); for (const [k, v] of Object.entries(ANSICHTEN)) s.add(new Option(v, k)); ort.appendChild(s);
  const knopf = t => { const b = document.createElement('button'); b.textContent = t; ort.appendChild(b); return b; };
  const bL = knopf('Sonnenstrahlen'), bB = knopf('Drehen'), bS = knopf('Beschriftung');
  const auff = () => { s.value = st.ansicht; bL.hidden = bB.hidden = st.ansicht !== 'zonen'; bL.classList.toggle('on', st.strahlen); bB.classList.toggle('on', st.bewegung); bS.classList.toggle('on', st.beschriftung); };
  s.onchange = () => { st.ansicht = s.value; auff(); neu(); };
  bL.onclick = () => { st.strahlen = !st.strahlen; auff(); neu(); };
  bB.onclick = () => { st.bewegung = !st.bewegung; auff(); };
  bS.onclick = () => { st.beschriftung = !st.beschriftung; auff(); neu(); };
  auff();
}
