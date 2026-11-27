// Limes-Generator: Obergermanischer Limes (2./3. Jh. n. Chr.), Maße in m.
// Ansicht „Grenze“: Abschnitt mit Palisade, Graben und Wall, Wachtürmen (Stein, ca. 5 × 5 m, ca. 9 m hoch, Eingang im
// Obergeschoss) und einem bewachten Durchgang; links germanisches Gebiet (Wald), rechts römisches (Straße, Felder).
// Abstände zwischen den Türmen verkürzt (in Wirklichkeit meist einige hundert Meter).
// Ansicht „Kastell“: Kohortenkastell wie die Saalburg (ca. 150 × 220 m, Spielkartenform) mit Toren, Mauer, Gräben,
// Stabsgebäude, Kommandantenhaus, Speichern, Mannschaftsbaracken; davor Lagerdorf mit Bad.
import * as THREE from 'three';
import { textSprite, entsorge as entsorgeObj, stil, zufall } from './hilfen.js';

export const ANSICHTEN = { grenze: 'Grenze mit Wachtürmen', kastell: 'Kastell (wie die Saalburg)' };
export const standard = () => ({ ansicht: 'grenze', beschriftung: true });
const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);

function textur(zeichne, w = 256, h = 256) { const c = document.createElement('canvas'); c.width = w; c.height = h; zeichne(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
const TEX = {};
function texturen() {
  if (TEX.putz) return TEX;
  const z = zufall(3);
  // weiß verputzt mit aufgemalten roten Fugen (wie bei rekonstruierten Limestürmen)
  TEX.putz = textur((g, w, h) => { g.fillStyle = '#efe9dc'; g.fillRect(0, 0, w, h); g.strokeStyle = '#b4412f'; g.lineWidth = 3; for (let y = 0; y <= h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); for (let x = (y / 32) % 2 ? 0 : 32; x < w; x += 64) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 32); g.stroke(); } } });
  TEX.ziegel = textur((g, w, h) => { g.fillStyle = '#a64b2a'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 16) for (let x = (y / 16) % 2 ? 0 : 12; x < w; x += 24) { const c = 140 + z() * 40; g.fillStyle = `rgb(${c + 30},${c - 50},${c - 80})`; g.fillRect(x + 1, y + 1, 22, 14); } });
  TEX.wiese = textur((g, w, h) => { g.fillStyle = '#6b8f3e'; g.fillRect(0, 0, w, h); for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(${60 + z() * 60},${110 + z() * 50},${40 + z() * 30},0.4)`; g.fillRect(z() * w, z() * h, 2, 3); } });
  TEX.holz = textur((g, w, h) => { g.fillStyle = '#7a5532'; g.fillRect(0, 0, w, h); for (let i = 0; i < 50; i++) { g.strokeStyle = `rgba(50,30,15,${0.2 + z() * 0.3})`; g.beginPath(); const x = z() * w; g.moveTo(x, 0); g.lineTo(x + 3, h); g.stroke(); } });
  TEX.stein = textur((g, w, h) => { g.fillStyle = '#9a9488'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 20) { let x = -z() * 30; while (x < w) { const b = 24 + z() * 26, c = 130 + z() * 45; g.fillStyle = `rgb(${c},${c - 5},${c - 15})`; g.fillRect(x + 1.5, y + 1.5, b - 3, 17); x += b; } } });
  return TEX;
}

export function erzeuge(st) {
  const T = texturen(), zf = zufall(8), grenze = st.ansicht === 'grenze';
  const wurzel = new THREE.Group(), etik = new THREE.Group(); wurzel.add(etik);
  const mat = o => new THREE.MeshStandardMaterial({ roughness: 0.85, ...o });
  const tex = (t, rx, ry) => { const c = t.clone(); c.repeat.set(rx, ry); c.needsUpdate = true; return c; };
  const kasten = (x0, x1, y0, y1, z0, z1, m, ziel = wurzel) => { const b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), m); b.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); ziel.add(b); return b; };
  const dach = (x, z, bx, bz, y, h, ziel = wurzel) => { const d = new THREE.Mesh(new THREE.ConeGeometry(Math.max(bx, bz) * 0.72, h, 4), mat({ map: tex(T.ziegel, 1, 1) })); d.rotation.y = Math.PI / 4; d.scale.set(bx / Math.max(bx, bz), 1, bz / Math.max(bx, bz)); d.position.set(x, y + h / 2, z); ziel.add(d); };
  const satteldach = (x0, x1, z0, z1, y, h, ziel = wurzel) => { const lx = x1 - x0, lz = z1 - z0, f = new THREE.Shape([new THREE.Vector2(-lz / 2 - 0.4, 0), new THREE.Vector2(lz / 2 + 0.4, 0), new THREE.Vector2(0, h)]); const g = new THREE.ExtrudeGeometry(f, { depth: lx + 0.6, bevelEnabled: false }); g.translate(0, 0, -(lx + 0.6) / 2); const m = new THREE.Mesh(g, mat({ map: tex(T.ziegel, 0.15, 0.15) })); m.rotation.y = Math.PI / 2; m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); ziel.add(m); };
  const mensch = (x, z, farbe, y = 0) => { const g = new THREE.Group(); const k = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 1.3, 8), mat({ color: farbe })); k.position.y = 0.65; g.add(k); const kp = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), mat({ color: 0xd7a57a })); kp.position.y = 1.5; g.add(kp); g.position.set(x, y, z); wurzel.add(g); return g; };
  const schilder = [];
  const schild = (txt, a, z) => schilder.push([txt, a, z]);

  if (grenze) {
    const LX = 160, LZ = 90;
    // Gelände: links (−z) germanisches Gebiet, rechts (+z) römisches; leichte Hügel
    const hoehe = (x, z) => 1.2 * Math.sin(x * 0.03 + 0.4) * Math.cos(z * 0.04) + 0.6 * Math.sin(x * 0.07 - z * 0.05);
    const geo = new THREE.PlaneGeometry(LX, LZ, 160, 90); geo.rotateX(-Math.PI / 2); const P = geo.attributes.position;
    const ZG = 0;                                                   // Grenzlinie (Palisade) bei z = 0
    const graben = z => { const d = z - 4; return Math.abs(d) < 3 ? -2 * (1 - (d / 3) ** 2) : 0; };
    const wall = z => { const d = z - 9.5; return Math.abs(d) < 3.5 ? 1.6 * (1 - (d / 3.5) ** 2) : 0; };
    const damm = x => Math.abs(x - 20) < 2.5 ? 0 : 1;                // Durchgang: Graben und Wall unterbrochen
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), z = P.getZ(i); P.setY(i, hoehe(x, z) + damm(x) * (graben(z) + wall(z))); }
    geo.computeVertexNormals(); wurzel.add(new THREE.Mesh(geo, mat({ map: tex(T.wiese, 14, 8) })));
    const H = (x, z) => hoehe(x, z) + damm(x) * (graben(z) + wall(z));
    // Palisade aus angespitzten Eichenstämmen (Lücke am Durchgang)
    const pf = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.15, 0.15, 3.2, 6), mat({ map: tex(T.holz, 1, 2) }), 600), spitz = new THREE.InstancedMesh(new THREE.ConeGeometry(0.15, 0.4, 6), mat({ color: 0x5b3d22 }), 600);
    let n = 0; const m4 = new THREE.Matrix4();
    for (let x = -LX / 2; x < LX / 2 && n < 600; x += 0.3) { if (Math.abs(x - 20) < 2.2) continue; const y = H(x, ZG); pf.setMatrixAt(n, m4.makeTranslation(x, y + 1.4, ZG)); spitz.setMatrixAt(n, m4.makeTranslation(x, y + 3.2, ZG)); n++; }
    pf.count = spitz.count = n; wurzel.add(pf, spitz);
    // Tor in der Palisade
    kasten(17.6, 18, 0, 3.6, -0.3, 0.3, mat({ map: T.holz })); kasten(22, 22.4, 0, 3.6, -0.3, 0.3, mat({ map: T.holz })); kasten(17.6, 22.4, 3.4, 3.8, -0.3, 0.3, mat({ map: T.holz }));
    const torfluegel = kasten(18, 19.9, 0.2, 3.3, 0.35, 0.45, mat({ map: T.holz })); torfluegel.rotation.y = 0.9; torfluegel.position.x -= 0.5; torfluegel.position.z += 0.8;
    // Wachtürme hinter dem Wall (verkürzte Abstände)
    const turm = (x, z) => {
      const y = H(x, z);
      kasten(x - 2.5, x + 2.5, y - 0.5, y + 8.5, z - 2.5, z + 2.5, mat({ map: tex(T.putz, 1.2, 2.2) }));
      dach(x, z, 5.8, 5.8, y + 8.5, 3.2);
      for (const [dx, dz] of [[-2.51, 0], [2.51, 0], [0, 2.51]]) kasten(x + dx - (dx ? 0.05 : 0.5), x + dx + (dx ? 0.05 : 0.5), y + 6.6, y + 7.6, z + dz - (dz ? 0.05 : 0.5), z + dz + (dz ? 0.05 : 0.5), mat({ color: 0x1f2937 }));   // Fenster
      // umlaufende Holzgalerie im Obergeschoss
      kasten(x - 3.2, x + 3.2, y + 6.0, y + 6.2, z - 3.2, z + 3.2, mat({ map: T.holz }));
      for (const [a, b] of [[[-3.2, -3.2], [3.2, -3.2]], [[3.2, -3.2], [3.2, 3.2]], [[3.2, 3.2], [-3.2, 3.2]], [[-3.2, 3.2], [-3.2, -3.2]]]) kasten(x + Math.min(a[0], b[0]) - 0.05, x + Math.max(a[0], b[0]) + 0.05, y + 7.0, y + 7.1, z + Math.min(a[1], b[1]) - 0.05, z + Math.max(a[1], b[1]) + 0.05, mat({ map: T.holz }));
      // Leiter zum Eingang (auf der römischen Seite)
      for (const dx of [-0.35, 0.35]) { const l = kasten(x + dx - 0.05, x + dx + 0.05, y, y + 4.6, z + 2.6, z + 2.7, mat({ map: T.holz })); void l; }
      kasten(x - 0.6, x + 0.6, y + 4.2, y + 6.2, z + 2.45, z + 2.55, mat({ color: 0x3b2a1a }));
      // Signalfeuer
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.2, 8), new THREE.MeshBasicMaterial({ color: 0xffa000 })); f.position.set(x + 4, y + 0.6, z); wurzel.add(f);
      return y;
    };
    turm(-45, 22); turm(25, 22); turm(80, 22);
    // Wege: römische Straße zum Durchgang, Felder, Gutshof; germanische Seite: Wald und Siedlung
    { const g = new THREE.Mesh(new THREE.PlaneGeometry(4, 34), mat({ color: 0xb8a37a })); g.rotation.x = -Math.PI / 2; g.position.set(20, 0.08, 18); wurzel.add(g); }
    for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.PlaneGeometry(22, 12), mat({ color: [0xc9b45a, 0x9cae52, 0xb79a5a, 0xa9bd5e][i] })); f.rotation.x = -Math.PI / 2; f.position.set(-60 + i * 26, 0.6, 38); wurzel.add(f); }
    for (let i = 0; i < 160; i++) { const x = -LX / 2 + zf() * LX, z = -6 - zf() * 38; if (Math.abs(x - 20) < 6 && z > -20) continue; const b = new THREE.Mesh(new THREE.ConeGeometry(1.6, 7, 7), mat({ color: zf() < 0.5 ? 0x2f5d2a : 0x3c6e2f })); b.position.set(x, H(x, z) + 3.5, z); wurzel.add(b); }
    // Händler mit Karren am Durchgang, Soldaten
    { const k = kasten(18.9, 21.1, 0.6, 1.6, -6, -3, mat({ map: T.holz })); void k; for (const [dx, dz] of [[-1.15, -5.3], [1.15, -5.3], [-1.15, -3.7], [1.15, -3.7]]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.12, 14), mat({ color: 0x5b3d22 })); r.rotation.z = Math.PI / 2; r.position.set(20 + dx, 0.55, dz); wurzel.add(r); } }
    mensch(20, -7.2, 0x6b5b3e); mensch(18.6, 1.6, 0x991b1b); mensch(21.6, 1.8, 0x991b1b); mensch(24, 26, 0x991b1b, H(24, 26));
    schild('Palisade aus Eichenstämmen', V(-20, 3.2, 0), V(-30, 14, -8));
    schild('Graben', V(-10, -1.5, 4), V(-12, 10, 6));
    schild('Wall', V(0, 1.6, 9.5), V(2, 12, 12));
    schild('Wachturm aus Stein: Eingang\nim Obergeschoss, Leiter einziehbar', V(25, 10, 22), V(40, 20, 22));
    schild('bewachter Durchgang:\nHandel nur unter Kontrolle', V(20, 3.8, 0), V(5, 16, -6));
    schild('germanisches Gebiet', V(-40, 4, -30), V(-50, 13, -36));
    schild('Römisches Reich', V(-40, 1, 38), V(-52, 9, 44));
    schild('Signalfeuer', V(84, 1.2, 22), V(84, 10, 32));
    wurzel.position.set(-10, -4, 0);
  } else {
    // Kohortenkastell: 147 × 221 m (Saalburg), abgerundete Ecken; porta praetoria zur Grenze (−z)
    const BX = 147 / 2, BZ = 221 / 2, RE = 14;
    const boden = new THREE.Mesh(new THREE.PlaneGeometry(360, 380), mat({ map: tex(T.wiese, 24, 24) })); boden.rotation.x = -Math.PI / 2; wurzel.add(boden);
    // Umriss (Spielkartenform)
    const umriss = []; const ecke = (cx, cz, w0) => { for (let i = 0; i <= 6; i++) { const w = w0 + i / 6 * Math.PI / 2; umriss.push(V(cx + RE * Math.cos(w), 0, cz + RE * Math.sin(w))); } };
    ecke(BX - RE, BZ - RE, 0); ecke(-BX + RE, BZ - RE, Math.PI / 2); ecke(-BX + RE, -BZ + RE, Math.PI); ecke(BX - RE, -BZ + RE, Math.PI * 1.5); umriss.push(umriss[0].clone());
    // Gräben (zwei Spitzgräben) als dunkle Bänder
    for (const d of [6, 12]) { const pts = umriss.map(p => p.clone().add(V(Math.sign(p.x) * d, 0, Math.sign(p.z) * d)).setY(0.05)); const g = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 200, 2.2, 4, true), mat({ color: 0x4b3b2a })); g.scale.y = 0.08; wurzel.add(g); }
    // Mauer mit Zinnen, Tore an den vier Seiten
    const torBei = (p, q) => { const m = p.clone().add(q).multiplyScalar(0.5); return (Math.abs(m.x) < 8 && Math.abs(Math.abs(m.z) - BZ) < 1) || (Math.abs(m.z - (-BZ + 80)) < 7 && Math.abs(Math.abs(m.x) - BX) < 1); };
    const segs = [];
    for (let i = 0; i < umriss.length - 1; i++) { const a = umriss[i], b = umriss[i + 1], l = a.distanceTo(b), n2 = Math.max(1, Math.round(l / 6)); for (let k = 0; k < n2; k++) segs.push([a.clone().lerp(b, k / n2), a.clone().lerp(b, (k + 1) / n2)]); }
    const steinM = mat({ map: tex(T.stein, 1.5, 1) });
    for (const [a, b] of segs) {
      if (torBei(a, b)) continue;
      const d = b.clone().sub(a), l = d.length(), m = a.clone().add(b).multiplyScalar(0.5);
      const w = new THREE.Mesh(new THREE.BoxGeometry(l + 0.3, 5, 2), steinM); w.position.set(m.x, 2.5, m.z); w.rotation.y = Math.atan2(-d.z, d.x); wurzel.add(w);
      const zn = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 0.6), steinM); const nrm = V(-d.z, 0, d.x).normalize(); if (nrm.dot(m) < 0) nrm.negate(); zn.position.copy(m).addScaledVector(nrm, 0.7).setY(5.6); zn.rotation.y = w.rotation.y; wurzel.add(zn);
    }
    // Tore mit Doppeltürmen
    const tor = (x, z, quer) => { for (const s of [-1, 1]) { const tx = quer ? x : x + s * 7, tz = quer ? z + s * 7 : z; kasten(tx - 3.5, tx + 3.5, 0, 9, tz - 3.5, tz + 3.5, mat({ map: tex(T.putz, 0.9, 1.6) })); dach(tx, tz, 7.6, 7.6, 9, 3.5); } const b = quer ? kasten(x - 2, x + 2, 5, 7.5, z - 3.6, z + 3.6, mat({ map: tex(T.putz, 0.6, 0.4) })) : kasten(x - 3.6, x + 3.6, 5, 7.5, z - 2, z + 2, mat({ map: tex(T.putz, 0.6, 0.4) })); void b; };
    tor(0, -BZ, false); tor(0, BZ, false); tor(-BX, -BZ + 80, true); tor(BX, -BZ + 80, true);
    // Straßen: via praetoria, via principalis
    const strasse = (x0, x1, z0, z1) => { const s = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), mat({ color: 0xbca983 })); s.rotation.x = -Math.PI / 2; s.position.set((x0 + x1) / 2, 0.06, (z0 + z1) / 2); wurzel.add(s); };
    strasse(-4, 4, -BZ, BZ); strasse(-BX, BX, -BZ + 75, -BZ + 85);
    // Stabsgebäude (principia) mit Innenhof und Fahnenheiligtum; Kommandantenhaus; Speicher; Baracken
    const P0 = -BZ + 88;
    for (const [x0, x1, z0, z1] of [[-22, 22, P0, P0 + 6], [-22, 22, P0 + 30, P0 + 40], [-22, -16, P0 + 6, P0 + 30], [16, 22, P0 + 6, P0 + 30]]) { kasten(x0, x1, 0, 6, z0, z1, mat({ map: tex(T.putz, (x1 - x0) / 6, 1) })); satteldach(x0, x1, z0, z1, 6, 3); }
    kasten(-4, 4, 0, 9, P0 + 40, P0 + 46, mat({ map: tex(T.putz, 1, 1.5) })); satteldach(-4, 4, P0 + 40, P0 + 46, 9, 3);
    kasten(26, 46, 0, 6, P0 + 4, P0 + 34, mat({ map: tex(T.putz, 3, 1) })); satteldach(26, 46, P0 + 4, P0 + 34, 6, 3.5);           // Kommandantenhaus
    for (const x0 of [-46, -36]) { kasten(x0, x0 + 8, 0, 7, P0 + 4, P0 + 34, mat({ map: tex(T.stein, 1, 1) })); satteldach(x0, x0 + 8, P0 + 4, P0 + 34, 7, 3); }   // Speicher (horrea)
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) { const x0 = s < 0 ? -BX + 8 : 10, z0 = -BZ + 8 + i * 17; kasten(x0, x0 + 55, 0, 4, z0, z0 + 10, mat({ map: tex(T.putz, 9, 0.7) })); satteldach(x0, x0 + 55, z0, z0 + 10, 4, 2.5); }   // Baracken (praetentura)
    for (let i = 0; i < 2; i++) for (const s of [-1, 1]) { const x0 = s < 0 ? -BX + 8 : 10, z0 = P0 + 50 + i * 18; kasten(x0, x0 + 55, 0, 4, z0, z0 + 10, mat({ map: tex(T.putz, 9, 0.7) })); satteldach(x0, x0 + 55, z0, z0 + 10, 4, 2.5); }
    // Lagerdorf (vicus) vor dem Kastell und Bad
    for (let i = 0; i < 14; i++) { const x = -70 + i * 11, z = BZ + 40 + (i % 2) * 14; kasten(x, x + 7, 0, 4, z, z + 12, mat({ color: 0xe5dccb })); satteldach(x, x + 7, z, z + 12, 4, 2.5); }
    kasten(60, 90, 0, 6, BZ + 20, BZ + 36, mat({ map: tex(T.putz, 4, 1) })); for (let i = 0; i < 3; i++) { const k = new THREE.Mesh(new THREE.SphereGeometry(4, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat({ color: 0xb4532a })); k.position.set(65 + i * 10, 6, BZ + 28); wurzel.add(k); }
    for (let i = 0; i < 6; i++) mensch(-2 + (i % 2) * 3, -BZ + 30 + i * 18, 0x991b1b);
    schild('Tor zur Grenze\n(porta praetoria)', V(0, 10, -BZ), V(-30, 34, -BZ - 30));
    schild('Mauer mit Wehrgang und Zinnen', V(-BX, 5, -20), V(-BX - 40, 26, -20));
    schild('zwei Spitzgräben', V(-BX - 12, 0, 40), V(-BX - 50, 14, 50));
    schild('Stabsgebäude (principia)\nmit Fahnenheiligtum', V(0, 10, P0 + 43), V(0, 40, P0 + 20));
    schild('Haus des Kommandanten', V(36, 8, P0 + 20), V(70, 30, P0 + 10));
    schild('Getreidespeicher (horrea)', V(-38, 9, P0 + 20), V(-75, 32, P0 + 30));
    schild('Mannschaftsbaracken:\nje 8 Soldaten teilen sich 2 Räume', V(38, 5, -BZ + 30), V(80, 24, -BZ + 10));
    schild('Lagerdorf (vicus) mit Läden\nund Familien der Soldaten', V(0, 5, BZ + 50), V(-20, 24, BZ + 80));
    schild('Bad (Thermen)', V(75, 8, BZ + 28), V(100, 22, BZ + 50));
    wurzel.position.set(0, -10, -10);
  }
  // Beschriftung
  if (st.beschriftung) for (const [txt, a, z] of schilder) {
    const s = textSprite(txt, '#1f2937', grenze ? 3.2 : 9); s.position.copy(z); etik.add(s);
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, z]), new THREE.LineBasicMaterial({ color: 0x334155, depthTest: false })); l.renderOrder = 9; etik.add(l);
  }
  const info = grenze
    ? 'Der <b>Limes</b> war die befestigte Grenze des Römischen Reiches in Germanien. Der Obergermanisch-Raetische Limes zog sich rund 550 km lang vom Rhein bei Koblenz bis zur Donau bei Regensburg; seit 2005 ist er UNESCO-Welterbe. Gebaut wurde er ab etwa 100 n. Chr. und immer weiter ausgebaut: erst ein Weg mit hölzernen Türmen, dann eine <b>Palisade</b>, später <b>Graben und Wall</b> (in Raetien eine Steinmauer). Rund 900 <b>Wachtürme</b> standen in Sichtweite; mit Signalen konnten die Soldaten Hilfe aus den Kastellen holen. Der Limes war keine undurchdringliche Mauer: An <b>Durchgängen</b> wurden Händler und Reisende kontrolliert, Zoll erhoben und Waren ausgetauscht. Um 260 n. Chr. gaben die Römer ihn auf. Abstände hier verkürzt.'
    : 'Hinter dem Limes lagen <b>Kastelle</b>, in denen die Grenztruppen wohnten – wie die wieder aufgebaute <b>Saalburg</b> bei Bad Homburg für eine Kohorte (rund 500 Soldaten). Alle Kastelle waren nach demselben Plan gebaut: Spielkartenform, vier Tore, zwei Hauptstraßen, in der Mitte das <b>Stabsgebäude</b> mit dem Fahnenheiligtum, daneben das Haus des Kommandanten und die Getreidespeicher, ringsum die <b>Mannschaftsbaracken</b>. Vor dem Tor entstand ein Lagerdorf mit Händlern, Handwerkern, Gasthäusern, einem Bad und den Familien der Soldaten. Die großen <b>Legionslager</b> mit rund 5 000 Mann (z. B. Mainz, Xanten) lagen weiter hinten am Rhein.';
  return { objekt: wurzel, radius: grenze ? 62 : 150, titel: `Limes – ${ANSICHTEN[st.ansicht]}`, info: `<b>Römer am Limes (2.–3. Jh. n. Chr.)</b><br><i>${info}</i>`, update: () => {} };
}
export const entsorge = entsorgeObj;
export function ausUrl(p) { const st = standard(); if (ANSICHTEN[p.get('v')]) st.ansicht = p.get('v'); return st; }
export const zuUrl = st => `&v=${st.ansicht}`;
export function bedienung(ort, st, neu) {
  stil(); ort.innerHTML = '';
  const s = document.createElement('select'); for (const [k, v] of Object.entries(ANSICHTEN)) s.add(new Option(v, k)); ort.appendChild(s);
  const b = document.createElement('button'); b.textContent = 'Beschriftung'; ort.appendChild(b);
  const auff = () => { s.value = st.ansicht; b.classList.toggle('on', st.beschriftung); };
  s.onchange = () => { st.ansicht = s.value; auff(); neu(); };
  b.onclick = () => { st.beschriftung = !st.beschriftung; auff(); neu(); };
  auff();
}
