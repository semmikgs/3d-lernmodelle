// Generator „Glaziale Serie“ (Norddeutschland): Blockbild, vorne aufgeschnitten. Waagerecht ca. 1 Einheit = 1 km,
// Höhen sehr stark überhöht (in Wirklichkeit nur wenige Dutzend Meter Unterschied).
// Abfolge vom Eis nach außen: Zungenbecken – Grundmoräne – Endmoräne – Sander – Urstromtal.
// Ansicht „Eiszeit“: Inlandeis liegt hinter der Endmoräne, Schmelzwasser strömt aus Gletschertoren über den Sander ins Urstromtal.
// Ansicht „Heute“: See im Zungenbecken, Äcker auf der Grundmoräne, Wald auf der Endmoräne, Heide und Kiefern auf dem Sander,
// Fluss mit Wiesen und Moor im Urstromtal, Findlinge und Sölle.
import * as THREE from 'three';
import { textSprite, entsorge as entsorgeObj, stil, zufall } from './hilfen.js';

export const ZEITEN = { eiszeit: 'Während der Eiszeit', heute: 'Heute' };
export const standard = () => ({ zeit: 'eiszeit', bewegung: true, beschriftung: true });
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const BX = 16, BZ = 10, UNTEN = -2.5, SEE = 1.15;

const rausch = (x, z) => 0.5 * Math.sin(x * 1.7 + 0.4) * Math.cos(z * 1.3 - 0.2) + 0.3 * Math.sin(x * 3.1 - z * 2.3 + 1.1) + 0.2 * Math.cos(x * 5.3 + z * 4.1);
const xEnd = z => 1.5 - 0.035 * (z + 5) ** 2;                                     // Endmoräne: Bogen um die Gletscherzunge
const glatt = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function hoehe(x, z) {
  const xe = xEnd(z), d = x - xe;
  let h;
  if (d < 0) {                                                                    // Grundmoräne (flachwellig) mit Zungenbecken
    h = 1.75 + 0.18 * rausch(x, z) - 1.15 * Math.exp(-(((x + 8) / 4.2) ** 2) - ((z + 5) / 3.2) ** 2);
  } else {                                                                        // Sander: flach nach außen abfallend
    h = 2.15 - 1.25 * glatt(0, 10, d) + 0.03 * rausch(x * 2, z * 2);
  }
  h += 1.35 * Math.exp(-((d / 1.15) ** 2)) * (0.8 + 0.25 * rausch(x * 1.5, z * 1.5));      // Endmoräne
  // Urstromtal (verläuft quer, entlang z)
  if (x > 10.2) { const boden = 0.55 + 0.02 * rausch(x * 3, z * 3); h = h * (1 - glatt(10.2, 11.2, x)) + boden * glatt(10.2, 11.2, x); }
  if (x > 14.2) h = Math.max(h, 0.55 + 1.0 * glatt(14.2, 15.4, x));              // gegenüberliegender Talrand
  return h;
}
const flussX = z => 12.3 + 0.7 * Math.sin(z * 0.55) + 0.25 * Math.sin(z * 1.4);

export function erzeuge(st) {
  const eis = st.zeit === 'eiszeit', zf = zufall(21);
  const wurzel = new THREE.Group(), etik = new THREE.Group(); wurzel.add(etik);
  const mat = o => new THREE.MeshStandardMaterial({ roughness: 0.9, ...o });
  const eisDicke = (x, z) => { const d = xEnd(z) - 0.7 - x; return d > 0 ? Math.min(4.2, 0.55 + 1.6 * Math.sqrt(d)) : 0; };
  // ---------- Schnittfläche (z = 0) pro Bildpunkt ----------
  const W = 1024, Hh = 400, ymax = 4.8;
  const farbe = (x, y) => {
    const top = hoehe(x, 0), xe = xEnd(0), d = x - xe;
    if (y > top) {
      if (eis && y < top + eisDicke(x, 0)) { const u = (y - top) / eisDicke(x, 0); return [200 + 30 * u, 225 + 20 * u, 245]; }    // Eis im Schnitt
      if (!eis && x < xe - 1 && y < SEE && hoehe(x, 0) < SEE) return [70, 130, 190];
      return null;
    }
    const tiefe = top - y, stein = (Math.sin(x * 91.7 + y * 47.3) * Math.cos(x * 23.1 - y * 77.9)) > 0.93;
    if (y < 0.15 + 0.06 * Math.sin(x * 0.8)) { const k = ((Math.floor((-y + 3) / 0.45) % 2) + 2) % 2; return k ? [178, 170, 150] : [160, 150, 128]; }   // älterer Untergrund
    if (Math.abs(d) < 1.6 && y > 1.7 - 0.25 * Math.abs(d)) return stein || (Math.sin(x * 37 + y * 53) > 0.75) ? [120, 118, 112] : [158, 140, 112];   // Endmoräne: Blockpackung
    if (d < 0) return stein ? [96, 92, 88] : [132 + 8 * Math.sin(x * 9), 112, 92];                                       // Grundmoräne: Geschiebemergel (Lehm mit Steinen)
    if (x > 10.6 && x < 14.6) return tiefe < 0.08 && !eis ? [70, 55, 40] : [214, 196, 150];                              // Talsand (heute mit Torf/Auelehm oben)
    // Sander: geschichtete Sande und Kiese, nahe der Endmoräne gröber
    const grob = Math.max(0, 1 - d / 9), lage = Math.floor((y + 0.08 * Math.sin(x * 4)) / 0.12) % 2;
    const korn = (Math.sin(x * 140 + y * 90) * Math.cos(x * 70 - y * 130)) > 1 - 0.25 * grob;
    return korn ? [150, 130, 100] : lage ? [222, 200, 150] : [205, 182, 132];
  };
  {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = Hh; const g = cv.getContext('2d'), bild = g.createImageData(W, Hh);
    for (let j = 0; j < Hh; j++) for (let i = 0; i < W; i++) {
      const x = -BX + 2 * BX * (i + 0.5) / W, y = ymax - (ymax - UNTEN) * (j + 0.5) / Hh, c = farbe(x, y), o = 4 * (j * W + i);
      if (c) { bild.data[o] = c[0]; bild.data[o + 1] = c[1]; bild.data[o + 2] = c[2]; bild.data[o + 3] = 255; }
    }
    g.putImageData(bild, 0, 0);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const pts = []; for (let i = 0; i <= 500; i++) { const x = -BX + 2 * BX * i / 500; pts.push(new THREE.Vector2(x, hoehe(x, 0) + (eis ? eisDicke(x, 0) : 0))); }
    if (!eis) for (const q of pts) if (q.x < xEnd(0) - 1 && q.y < SEE) q.y = SEE;
    pts.push(new THREE.Vector2(BX, UNTEN), new THREE.Vector2(-BX, UNTEN));
    const geo = new THREE.ShapeGeometry(new THREE.Shape(pts)), P = geo.attributes.position, uv = [];
    for (let i = 0; i < P.count; i++) uv.push((P.getX(i) + BX) / (2 * BX), (P.getY(i) - UNTEN) / (ymax - UNTEN));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    wurzel.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, transparent: true, alphaTest: 0.5 })));
  }
  // ---------- Oberfläche mit Landnutzung ----------
  const nutz = (x, z, h) => {
    const d = x - xEnd(z), n = 0.5 + 0.5 * rausch(x * 2.2, z * 2.2);
    if (eis) {                                                                     // Tundra / Schmelzwasserflächen
      if (x > 10.6 && x < 14.4) return new THREE.Color(0x9fb4b8).lerp(new THREE.Color(0xb9c2b0), n);
      if (d > 0.9) return new THREE.Color(0xc9bf98).lerp(new THREE.Color(0xb5b08a), n);   // Sander: kahler Sand und Kies
      return new THREE.Color(0x8a9a6a).lerp(new THREE.Color(0x9c9c7c), n);
    }
    if (x >= 14.4) return n > 0.5 ? new THREE.Color(0xb9a65a) : new THREE.Color(0x86a24a);   // jenseits des Tals: Äcker
    if (x > 10.6 && x < 14.4) return Math.abs(x - flussX(z)) < 1.4 ? new THREE.Color(0x6f9a48) : (n > 0.65 ? new THREE.Color(0x6b5a44) : new THREE.Color(0x7fa356));   // Auenwiesen, Moor
    if (Math.abs(d) < 1.3) return new THREE.Color(0x3f6b2c);                            // Endmoräne: Wald
    if (d > 0) return n > 0.55 ? new THREE.Color(0x9a6f9c) : new THREE.Color(0x6d7a3e);   // Sander: Heide (lila) und Kiefern
    const feld = (Math.floor(x / 1.6) + Math.floor(z / 1.3)) % 3;                        // Grundmoräne: Äcker
    return [new THREE.Color(0xc7b25a), new THREE.Color(0x8fae4c), new THREE.Color(0xa8844e)][(feld + 3) % 3];
  };
  {
    const geo = new THREE.PlaneGeometry(2 * BX, BZ, 260, 90); geo.rotateX(-Math.PI / 2); geo.translate(0, 0, -BZ / 2);
    const P = geo.attributes.position, col = [];
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), z = P.getZ(i), h = hoehe(x, z); P.setY(i, h); const c = nutz(x, z, h); col.push(c.r, c.g, c.b); }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
    wurzel.add(new THREE.Mesh(geo, mat({ vertexColors: true })));
    const wandM = mat({ color: 0xb8a888 });
    for (const [w, pos, r] of [[2 * BX, V(0, 0, -BZ), Math.PI], [BZ, V(-BX, 0, -BZ / 2), -Math.PI / 2], [BZ, V(BX, 0, -BZ / 2), Math.PI / 2]]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.8 - UNTEN), wandM); m.position.copy(pos).setY((1.8 + UNTEN) / 2 - 0.4); m.rotation.y = r; wurzel.add(m);
    }
  }
  const anim = [];
  if (eis) {
    // ---------- Inlandeis (hinter der Endmoräne), vorne aufgeschnitten ----------
    const geo = new THREE.PlaneGeometry(BX + 2, BZ, 120, 60); geo.rotateX(-Math.PI / 2); geo.translate(-BX + (BX + 2) / 2, 0, -BZ / 2);
    const P = geo.attributes.position;
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), z = P.getZ(i), e = eisDicke(x, z); P.setY(i, e > 0 ? hoehe(x, z) + e + 0.05 * rausch(x * 4, z * 4) : hoehe(x, z) - 0.05); }
    geo.computeVertexNormals();
    wurzel.add(new THREE.Mesh(geo, mat({ color: 0xe8f2fa, roughness: 0.35, metalness: 0.05 })));
    // Gletschertore und Schmelzwasser: verzweigte Rinnen über den Sander zum Urstromtal, Fluss im Urstromtal
    const wM = new THREE.MeshStandardMaterial({ color: 0x4f9bd9, roughness: 0.2, transparent: true, opacity: 0.85 });
    const rinnen = [];
    for (const z0 of [-2.2, -5, -7.6]) for (let k = 0; k < 3; k++) {
      const pts = []; let z = z0 + (k - 1) * 0.35;
      for (let i = 0; i <= 40; i++) { const x = xEnd(z0) - 0.6 + (11.2 - xEnd(z0) + 0.6) * i / 40; z += (zf() - 0.5) * 0.22 + (k - 1) * 0.015; z = Math.min(-0.25, Math.max(-BZ + 0.25, z)); pts.push(V(x, hoehe(x, z) + 0.04, z)); }
      const c = new THREE.CatmullRomCurve3(pts); rinnen.push(c); wurzel.add(new THREE.Mesh(new THREE.TubeGeometry(c, 80, 0.07, 5), wM));
    }
    const tal = new THREE.Mesh(new THREE.PlaneGeometry(3.6, BZ), wM); tal.rotation.x = -Math.PI / 2; tal.position.set(12.4, 0.62, -BZ / 2); wurzel.add(tal);
    for (const z0 of [-2.2, -5, -7.6]) { const tor = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat({ color: 0x1e3a5f })); tor.scale.set(0.6, 1, 1); tor.position.set(xEnd(z0) - 0.75, hoehe(xEnd(z0) - 0.75, z0) + 0.02, z0); wurzel.add(tor); }
    // Fließende Teilchen (Schmelzwasser) und Strömung im Urstromtal
    const tM = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (const [i, c] of rinnen.entries()) for (let k = 0; k < 4; k++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), tM), ph = k / 4 + i * 0.13; anim.push(t => m.position.copy(c.getPointAt((t * 0.08 + ph) % 1)).add(V(0, 0.06, 0))); wurzel.add(m); }
    for (let k = 0; k < 16; k++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), tM), x = 11 + 2.8 * zf(), ph = zf(); anim.push(t => m.position.set(x, 0.66, -BZ * ((t * 0.07 + ph) % 1))); wurzel.add(m); }
    // Pfeil: Eis fließt nach Süden
    const pf = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 12), mat({ color: 0x1d4ed8 })); pf.rotation.z = -Math.PI / 2; pf.position.set(-6, hoehe(-6, -3) + eisDicke(-6, -3) + 0.6, -3); wurzel.add(pf);
    const ps = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.2, 8), mat({ color: 0x1d4ed8 })); ps.rotation.z = -Math.PI / 2; ps.position.set(-7.5, pf.position.y, -3); wurzel.add(ps);
  } else {
    // ---------- Heute: See im Zungenbecken, Sölle, Fluss, Wald, Kiefern, Findlinge, Dorf ----------
    const wM = new THREE.MeshStandardMaterial({ color: 0x3d7fc2, roughness: 0.15, metalness: 0.1 });
    const see = new THREE.Mesh(new THREE.PlaneGeometry(12, BZ), wM); see.rotation.x = -Math.PI / 2; see.position.set(-9, SEE, -BZ / 2); wurzel.add(see);
    for (let i = 0; i < 7; i++) { const x = -3 - zf() * 5, z = -1 - zf() * 8, h = hoehe(x, z); if (h < SEE + 0.1) continue; const s = new THREE.Mesh(new THREE.CircleGeometry(0.18 + zf() * 0.12, 16), wM); s.rotation.x = -Math.PI / 2; s.position.set(x, h + 0.03, z); wurzel.add(s); }
    { const pts = []; for (let i = 0; i <= 60; i++) { const z = -BZ + BZ * i / 60; pts.push(V(flussX(z), 0.6, z)); } wurzel.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 100, 0.16, 6), wM)); }
    const baum = (x, z, art) => {
      const h = hoehe(x, z), g = new THREE.Group(); g.position.set(x, h, z);
      if (art === 'laub') { const k = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), mat({ color: 0x2f6b2a })); k.position.y = 0.32; g.add(k); }
      else { const k = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.45, 7), mat({ color: 0x2f5a35 })); k.position.y = 0.36; g.add(k); }
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.18, 5), mat({ color: 0x5d4027 })); s.position.y = 0.09; g.add(s); wurzel.add(g);
    };
    for (let i = 0; i < 260; i++) { const z = -0.3 - zf() * (BZ - 0.6), x = xEnd(z) + (zf() - 0.5) * 2.2; baum(x, z, 'laub'); }
    for (let i = 0; i < 70; i++) { const z = -0.3 - zf() * (BZ - 0.6), x = xEnd(z) + 1.5 + zf() * 8; if (0.5 + 0.5 * rausch(x * 2.2, z * 2.2) <= 0.55) baum(x, z, 'kiefer'); }
    for (let i = 0; i < 14; i++) { const x = -6 + zf() * 7.5, z = -0.5 - zf() * 9, h = hoehe(x, z); if (h < SEE + 0.05) continue; const f = new THREE.Mesh(new THREE.DodecahedronGeometry(0.09 + zf() * 0.08), mat({ color: 0x8d8a86 })); f.position.set(x, h + 0.05, z); wurzel.add(f); }
    for (let i = 0; i < 9; i++) { const x = 6.5 + (i % 3) * 0.35, z = -7.6 + Math.floor(i / 3) * 0.4, h = hoehe(x, z); const hs = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.16), mat({ color: 0xe5d5c0 })); hs.position.set(x, h + 0.08, z); wurzel.add(hs); const d = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.14, 4), mat({ color: 0xa33a2a })); d.rotation.y = Math.PI / 4; d.position.set(x, h + 0.23, z); wurzel.add(d); }
  }
  // ---------- Beschriftung ----------
  const schild = (txt, a, z, farbe = '#1f2937') => { const s = textSprite(txt, farbe, 0.8); s.position.copy(z); etik.add(s); const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, z]), new THREE.LineBasicMaterial({ color: 0x334155, depthTest: false })); l.renderOrder = 9; etik.add(l); };
  const auf = (x, z, dy = 0) => V(x, hoehe(x, z) + dy + (eis ? eisDicke(x, z) : 0), z);
  const oben = 6.4;
  schild('Zungenbecken', auf(-8, -5, 0.1), V(-11, oben, -3));
  schild('Grundmoräne', auf(-2.5, -2), V(-5.5, oben - 0.4, 0));
  schild('Endmoräne', auf(xEnd(-4), -4, 0.3), V(0.5, oben, -2));
  schild('Sander', auf(6, -3), V(5.5, oben - 0.4, 0));
  schild('Urstromtal', V(12.4, 0.7, -4), V(12.4, oben, -2));
  if (eis) {
    schild('Inlandeis (Gletscher)', auf(-11, -6, 0.2), V(-13.5, oben + 0.9, -6));
    schild('Gletschertor', V(xEnd(-5) - 0.75, hoehe(xEnd(-5), -5) + 0.3, -5), V(-1.5, oben + 1.2, -7));
    schild('Schmelzwasser', auf(7, -5, 0.1), V(8.5, oben + 0.9, -6));
    schild('Eis schürft den\nBoden aus', V(-8, 0.9, 0.02), V(-12.5, -3.2, 1));
  } else {
    schild('See', V(-9, SEE, -4), V(-13.5, oben + 0.9, -6));
    schild('Acker auf fruchtbarem\nLehmboden', auf(-3, -6, 0.1), V(-6.5, oben + 1.1, -7));
    schild('Laubwald auf\nhügeligem Gelände', auf(xEnd(-7), -7, 0.3), V(1, oben + 1.1, -7));
    schild('Heide und Kiefern auf\ntrockenem Sandboden', auf(6.5, -2, 0.1), V(7, oben + 1.1, -7));
    schild('Fluss (z. B. Aller)\nmit Wiesen und Moor', V(flussX(-6), 0.7, -6), V(13, oben + 1.1, -7));
    schild('Findlinge', auf(-3.5, -0.8, 0.1), V(-2.5, -3.2, 1));
  }
  schild('Geschiebemergel\n(Lehm mit Steinen)', V(-4, 1.2, 0.02), V(-7, -3.2, 1));
  schild('Blockpackung', V(xEnd(0), 2.3, 0.02), V(1.5, -3.2, 1));
  schild('Sand und Kies – nah grob,\nweiter weg immer feiner', V(5, 1.3, 0.02), V(6.5, -3.2, 1));
  schild('Talsand', V(12.2, 0.4, 0.02), V(12.5, -3.2, 1));
  { const t = textSprite('Norden ← → Süden · Höhen stark überhöht', '#334155', 0.7); t.position.set(0, -4.3, 1); etik.add(t); }
  etik.visible = st.beschriftung;
  wurzel.position.y = -1.2;
  const info = eis
    ? 'In der Eiszeit schob sich das Inlandeis von Skandinavien bis nach Norddeutschland. Unter dem Eis wurde Gestein zerrieben und als <b>Grundmoräne</b> abgelagert; die Gletscherzunge schürfte ein <b>Zungenbecken</b> aus. Wo der Eisrand lange stillstand, schob das Eis Schutt und Felsblöcke zu einem Hügelwall auf: der <b>Endmoräne</b>. Aus Gletschertoren strömte Schmelzwasser und lagerte davor Sand und Kies ab – grobes nah am Eis, feines weiter weg: der <b>Sander</b>. Das Wasser sammelte sich in einem breiten <b>Urstromtal</b>, das parallel zum Eisrand zur Nordsee floss.'
    : 'Heute erkennt man die glaziale Serie an Boden und Nutzung: Auf der lehmigen <b>Grundmoräne</b> liegen fruchtbare Äcker, im <b>Zungenbecken</b> ein See; kleine runde Tümpel (Sölle) entstanden, wo Eisreste im Boden tauten. Die hügelige, steinige <b>Endmoräne</b> trägt oft Wald. Auf dem trockenen, nährstoffarmen Sand des <b>Sanders</b> wachsen Heide und Kiefern. In den <b>Urstromtälern</b> fließen heute Flüsse wie Elbe, Aller oder Weser; bei Schwarmstedt liegt die Aller in einem solchen Urstromtal. In Niedersachsen stammen die Formen meist aus der älteren Saale-Eiszeit und sind schon stark abgeflacht; in Schleswig-Holstein und Mecklenburg sind sie aus der jüngsten Eiszeit noch frisch.';
  let t = st._zeit || 0;
  return {
    objekt: wurzel, radius: 17, titel: `Glaziale Serie – ${ZEITEN[st.zeit]}`, info: `<b>Glaziale Serie in Norddeutschland</b><br><i>${info}</i>`,
    update: dt => { if (!st.bewegung) return; t += Math.min(dt, 0.1); st._zeit = t; for (const f of anim) f(t); },
  };
}
export const entsorge = entsorgeObj;
export function ausUrl(p) { const st = standard(); if (ZEITEN[p.get('v')]) st.zeit = p.get('v'); return st; }
export const zuUrl = st => `&v=${st.zeit}`;
export function bedienung(ort, st, neu) {
  stil(); ort.innerHTML = '';
  const s = document.createElement('select'); for (const [k, v] of Object.entries(ZEITEN)) s.add(new Option(v, k)); ort.appendChild(s);
  const knopf = t => { const b = document.createElement('button'); b.textContent = t; ort.appendChild(b); return b; };
  const bB = knopf('Bewegung'), bS = knopf('Beschriftung');
  const auff = () => { s.value = st.zeit; bB.classList.toggle('on', st.bewegung); bS.classList.toggle('on', st.beschriftung); };
  s.onchange = () => { st.zeit = s.value; auff(); neu(); };
  bB.onclick = () => { st.bewegung = !st.bewegung; auff(); };
  bS.onclick = () => { st.beschriftung = !st.beschriftung; auff(); neu(); };
  auff();
}
