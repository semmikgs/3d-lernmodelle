// Tierzelle-Generator: typische Tierzelle (z. B. aus der Leber), Maße in µm, vorne aufgeschnitten (Schnitt bei z = 0).
// Zelle ca. 22 × 15 × 12 µm, Zellkern Ø 6 µm, Mitochondrien ca. 2 × 0,8 µm, Lysosomen Ø 0,6 µm.
// Zu klein zum Sehen und deshalb vergrößert: Membranen (eigentlich 0,008 µm), Ribosomen (eigentlich 0,025 µm),
// Zentriolen (eigentlich 0,25 × 0,5 µm). Zwei Stufen: Lichtmikroskop (Kl. 5–6) und Elektronenmikroskop (ab Kl. 7).
import * as THREE from 'three';
import { textSprite, entsorge as entsorgeObj, stil, zufall } from './hilfen.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const RX = 11, RY = 7.5, RZ = 6;                                  // Halbachsen der Zelle
const KERN = { c: V(-1.5, 0.4, 0), r: 3 }, NUK = { c: V(-2.0, 1.0, 0), r: 0.95 };
export const STUFEN = { lm: 'Lichtmikroskop (Kl. 5–6)', em: 'Elektronenmikroskop (ab Kl. 7)' };
export const ORGANELLEN = {
  membran: { name: 'Zellmembran', stufe: 'lm', info: 'Ein hauchdünnes, bewegliches Häutchen aus einer doppelten Schicht von Fettteilchen (Lipiddoppelschicht), nur etwa 0,008 µm dick – hier stark verdickt gezeichnet. Es grenzt die Zelle ab und kontrolliert, welche Stoffe hinein- und hinausgelangen. Weil Tierzellen keine feste Zellwand haben, ist ihre Form unregelmäßig und veränderlich.' },
  plasma: { name: 'Zellplasma (Zytoplasma)', stufe: 'lm', info: 'Eine wässrige, zähe Flüssigkeit, die die Zelle ausfüllt. Darin laufen viele Stoffwechselvorgänge ab, und in ihr liegen alle Zellbestandteile.' },
  kern: { name: 'Zellkern', stufe: 'lm', info: 'Die Steuerzentrale der Zelle, etwa 6 µm groß. Er enthält die Erbinformation (DNA) als Chromatin. Die doppelte Kernhülle hat viele Kernporen, durch die Botenstoffe (mRNA) aus dem Kern ins Zellplasma gelangen.' },
  nukleolus: { name: 'Kernkörperchen (Nukleolus)', stufe: 'em', info: 'Ein dichter Bereich im Zellkern. Hier werden die Bausteine der Ribosomen hergestellt.' },
  rer: { name: 'Raues endoplasmatisches Retikulum', stufe: 'em', info: 'Ein Netz aus flachen Membransäckchen, das direkt an die Kernhülle anschließt. Es ist mit Ribosomen besetzt („rau“), die hier Eiweiße (Proteine) herstellen. Die Eiweiße werden in Bläschen zum Golgi-Apparat gebracht.' },
  ser: { name: 'Glattes endoplasmatisches Retikulum', stufe: 'em', info: 'Ein Netz aus feinen Membranröhren ohne Ribosomen. Hier werden Fette hergestellt und in der Leber Giftstoffe abgebaut.' },
  golgi: { name: 'Golgi-Apparat', stufe: 'em', info: 'Ein Stapel aus gewölbten Membransäckchen – die „Post“ der Zelle. Er nimmt Eiweiße vom ER auf (Seite zum Kern), verändert und sortiert sie und schnürt sie auf der anderen Seite in Bläschen (Vesikel) ab.' },
  mito: { name: 'Mitochondrien', stufe: 'em', info: 'Die „Kraftwerke“ der Zelle, etwa 1–2 µm lang. In ihnen wird bei der Zellatmung Traubenzucker mit Sauerstoff abgebaut; die freiwerdende Energie wird als ATP gespeichert. Die innere Membran ist stark gefaltet (Cristae), um viel Fläche zu haben. Eine Leberzelle hat über 1000 Mitochondrien.' },
  lyso: { name: 'Lysosomen', stufe: 'em', info: 'Kleine Bläschen mit Verdauungsenzymen. Sie bauen verbrauchte Zellbestandteile und aufgenommene Stoffe ab – die „Recyclinghöfe“ der Zelle.' },
  vesikel: { name: 'Vesikel', stufe: 'em', info: 'Kleine Transportbläschen aus Membran. Sie bringen Stoffe vom ER zum Golgi-Apparat und vom Golgi-Apparat zur Zellmembran, wo sie ihren Inhalt nach außen abgeben.' },
  ribo: { name: 'Ribosomen', stufe: 'em', info: 'Winzige Körnchen (0,025 µm, hier vergrößert), an denen Eiweiße nach dem Bauplan der DNA zusammengesetzt werden. Sie liegen frei im Zellplasma oder sitzen auf dem rauen ER.' },
  zentriol: { name: 'Zentriolen (Zentrosom)', stufe: 'em', info: 'Zwei kleine, rechtwinklig zueinander stehende Röhrchen aus je neun Dreiergruppen von Mikrotubuli (hier vergrößert). Von hier aus wächst das Zellskelett; bei der Zellteilung bilden sie die Pole des Spindelapparats. Pflanzenzellen haben keine Zentriolen.' },
  skelett: { name: 'Zellskelett (Mikrotubuli)', stufe: 'em', info: 'Feine Eiweißröhrchen, die vom Zentrosom aus durch die Zelle laufen. Sie geben der Zelle Halt und dienen als „Schienen“, auf denen Vesikel und Organellen transportiert werden.' },
};
export const standard = () => ({ stufe: 'em', fokus: 'alle', beschriftung: false });

// Zellform: Ellipsoid mit sanften Beulen
const beule = (x, y, z) => 1 + 0.05 * Math.sin(x * 0.55 + 1.2) * Math.cos(y * 0.7) + 0.04 * Math.sin(y * 0.9 + z * 0.6 + 0.4) + 0.03 * Math.cos(x * 1.1 - z * 0.8);
const innen = (p, rand = 0) => { const s = beule(p.x, p.y, p.z); return (p.x / (RX * s - rand)) ** 2 + (p.y / (RY * s - rand)) ** 2 + (p.z / (RZ * s - rand)) ** 2 < 1; };

export function erzeuge(st) {
  const wurzel = new THREE.Group(), etik = new THREE.Group(); wurzel.add(etik);
  const em = st.stufe === 'em', zf = zufall(7);
  const gruppen = {}; for (const k of Object.keys(ORGANELLEN)) { gruppen[k] = new THREE.Group(); wurzel.add(gruppen[k]); }
  const mat = (farbe, o = {}) => new THREE.MeshStandardMaterial({ color: farbe, roughness: 0.55, ...o });
  const rnd = (a, b) => a + (b - a) * zf();
  const belegt = [];                                           // Kugeln, die schon belegt sind (gegen Überschneiden)
  const frei = (p, r) => innen(p, r + 0.4) && p.z < -r - 0.05 && p.distanceTo(KERN.c) > KERN.r + r + 0.35 && belegt.every(([q, s]) => p.distanceTo(q) > s + r + 0.15);
  const platz = (r, versuche = 300, bereich = null) => {
    for (let i = 0; i < versuche; i++) {
      const p = bereich ? bereich() : V(rnd(-RX, RX), rnd(-RY, RY), rnd(-RZ, 0));
      if (frei(p, r)) { belegt.push([p, r]); return p; }
    }
    return null;
  };

  // ---------- Zellmembran (hintere Hälfte) und Schnittkante ----------
  {
    const g = new THREE.SphereGeometry(1, 120, 80, Math.PI, Math.PI), P = g.attributes.position;
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), s = beule(x * RX, y * RY, z * RZ); P.setXYZ(i, x * RX * s, y * RY * s, Math.min(0, z * RZ * s)); }
    g.computeVertexNormals();
    gruppen.membran.add(new THREE.Mesh(g, mat(0xf6c9b8, { side: THREE.BackSide, roughness: 0.8 })));          // Innenseite = Plasma-Farbe
    gruppen.membran.add(new THREE.Mesh(g, mat(0xe8957f, { side: THREE.FrontSide, roughness: 0.6 })));
    const rand = []; for (let i = 0; i <= 200; i++) { const w = i / 200 * Math.PI * 2, x = Math.cos(w), y = Math.sin(w), s = beule(x * RX, y * RY, 0); rand.push(V(x * RX * s, y * RY * s, 0)); }
    gruppen.membran.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rand, true), 200, 0.12, 8, true), mat(0xc2410c)));
    // Zellplasma: zarte Schnittfläche
    const form = new THREE.Shape(rand.map(p => new THREE.Vector2(p.x, p.y)));
    const loch = new THREE.Path(); loch.absarc(KERN.c.x, KERN.c.y, KERN.r, 0, Math.PI * 2, true); form.holes.push(loch);
    const pl = new THREE.Mesh(new THREE.ShapeGeometry(form, 4), new THREE.MeshBasicMaterial({ color: 0xfde8de, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }));
    pl.position.z = 0.01; gruppen.plasma.add(pl);
  }
  // ---------- Zellkern (aufgeschnitten) ----------
  {
    const k = gruppen.kern; k.position.copy(KERN.c);
    for (const [r, f] of [[KERN.r, 0x7c3aed], [KERN.r - 0.12, 0x8b5cf6]]) k.add(new THREE.Mesh(new THREE.SphereGeometry(r, 64, 40, Math.PI, Math.PI), mat(f, { side: THREE.DoubleSide })));
    // Schnittfläche: Kernplasma mit Chromatin (Textur), Kernhülle als Ring
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), z2 = zufall(3);
    g.fillStyle = '#c4b5fd'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(76,29,149,${0.15 + 0.35 * z2()})`; g.beginPath(); g.arc(256 * z2(), 256 * z2(), 1 + 5 * z2(), 0, 7); g.fill(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    k.add(new THREE.Mesh(new THREE.CircleGeometry(KERN.r - 0.12, 64), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 })));
    const ring = new THREE.Mesh(new THREE.RingGeometry(KERN.r - 0.14, KERN.r + 0.02, 96), mat(0x5b21b6, { side: THREE.DoubleSide })); ring.position.z = 0.005; k.add(ring);
    if (em) {
      // Kernporen als Lücken in der Hülle: kleine Ringe auf der Oberfläche und im Schnitt
      const pore = new THREE.TorusGeometry(0.1, 0.045, 6, 12), pm = mat(0x2e1065);
      for (let i = 0; i < 70; i++) {
        const u = zf() * 2 - 1, w = Math.PI + zf() * Math.PI, d = V(Math.sqrt(1 - u * u) * Math.cos(w), u, Math.sqrt(1 - u * u) * Math.sin(w));
        if (d.z > -0.08) continue;
        const m = new THREE.Mesh(pore, pm); m.position.copy(d).multiplyScalar(KERN.r + 0.01); m.quaternion.setFromUnitVectors(V(0, 0, 1), d); k.add(m);
      }
      for (let i = 0; i < 10; i++) { const w = i / 10 * Math.PI * 2 + 0.2, l = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.2), new THREE.MeshBasicMaterial({ color: 0xc4b5fd })); l.position.set((KERN.r - 0.06) * Math.cos(w), (KERN.r - 0.06) * Math.sin(w), 0.012); l.rotation.z = w; k.add(l); }
    }
  }
  if (em) {
    const n = gruppen.nukleolus; n.position.copy(NUK.c);
    n.add(new THREE.Mesh(new THREE.SphereGeometry(NUK.r, 40, 24, Math.PI, Math.PI), mat(0x3b0764, { side: THREE.DoubleSide })));
    const d = new THREE.Mesh(new THREE.CircleGeometry(NUK.r, 40), mat(0x4c1d95)); d.position.z = 0.015; n.add(d);
  }
  if (em) {
    // ---------- Raues ER: gestapelte Membransäckchen um den Kern, an die Kernhülle anschließend ----------
    const rer = gruppen.rer, erM = mat(0x0ea5e9, { side: THREE.DoubleSide, roughness: 0.5 }), riboPos = [];
    for (const [i, r] of [3.45, 3.95, 4.45, 4.95].entries()) {
      for (const [w0, wl] of [[Math.PI * 0.45, Math.PI * 0.75], [Math.PI * 1.35, Math.PI * 0.45]]) {
        const a0 = w0 + i * 0.08, al = wl - i * 0.15;
        // Säckchen = flacher Ring-Ausschnitt der Dicke 0,14 µm, bis z = −2,5 nach hinten
        const pts = []; for (let j = 0; j <= 40; j++) { const w = a0 + al * j / 40; pts.push(new THREE.Vector2(r * Math.cos(w), r * Math.sin(w))); }
        const form = new THREE.Shape([...pts.map(p => p.clone().multiplyScalar(1 + 0.07 / r)), ...pts.reverse().map(p => p.clone().multiplyScalar(1 - 0.07 / r))]);
        const g = new THREE.ExtrudeGeometry(form, { depth: 2.6 - i * 0.3, bevelEnabled: false }); g.translate(0, 0, -(2.6 - i * 0.3));
        const m = new THREE.Mesh(g, erM); m.position.set(KERN.c.x, KERN.c.y, 0); rer.add(m);
        for (let j = 0; j < 60; j++) { const w = a0 + al * zf(), z = -zf() * (2.6 - i * 0.3), s = zf() < 0.5 ? 1 : -1; riboPos.push(V(KERN.c.x + (r + s * 0.13) * Math.cos(w), KERN.c.y + (r + s * 0.13) * Math.sin(w), z)); }
      }
      belegt.push([KERN.c.clone(), r + 0.2]);
    }
    const rib = new THREE.InstancedMesh(new THREE.SphereGeometry(0.065, 6, 4), mat(0x1e3a8a), riboPos.length);
    riboPos.forEach((p, i) => rib.setMatrixAt(i, new THREE.Matrix4().makeTranslation(p.x, p.y, p.z))); rer.add(rib);
    belegt.length = 0;                                         // Kern + ER als eine große Kugel
    belegt.push([KERN.c.clone().setZ(-1), 5.3]);
    // ---------- Golgi-Apparat: 6 gewölbte Zisternen, cis-Seite zum Kern ----------
    {
      const go = gruppen.golgi, c = V(5.3, 2.2, -2.3), achse = c.clone().sub(KERN.c).setZ(0).normalize();
      const gm = mat(0xf59e0b, { side: THREE.DoubleSide });
      for (let i = 0; i < 6; i++) {
        const R = 1.5 - Math.abs(i - 2.5) * 0.12, prof = [];
        for (let j = 0; j <= 12; j++) { const r = R * j / 12; prof.push(new THREE.Vector2(r, 0.32 * (r / R) ** 2 + 0.05)); }
        prof.push(new THREE.Vector2(R + 0.06, 0.32)); for (let j = 12; j >= 0; j--) { const r = R * j / 12; prof.push(new THREE.Vector2(r, 0.32 * (r / R) ** 2 - 0.05)); }
        const m = new THREE.Mesh(new THREE.LatheGeometry(prof, 32), gm); m.position.y = i * 0.27; m.scale.set(1, 1, 0.75);
        const halter = new THREE.Group(); halter.add(m); halter.position.copy(c); halter.quaternion.setFromUnitVectors(V(0, -1, 0), achse); go.add(halter);
      }
      belegt.push([c, 2.2]);
      // Vesikel: an der trans-Seite abgeschnürt, auf dem Weg zur Membran, eines verschmilzt gerade
      const vm = mat(0xfcd34d);
      for (let i = 0; i < 10; i++) {
        const p = c.clone().addScaledVector(achse, 2.1 + zf() * 2.2).add(V(rnd(-1.4, 1.4), rnd(-1.4, 1.4), rnd(-1, 1)));
        if (!innen(p, 0.5) || p.z > -0.3) continue; const s = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), vm); s.position.copy(p); gruppen.vesikel.add(s);
      }
      for (let i = 0; i < 5; i++) { const p = c.clone().addScaledVector(achse, -1.2 - zf() * 0.6).add(V(rnd(-1, 1), rnd(-1, 1), rnd(-0.8, 0.8))); const s = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), mat(0x7dd3fc)); s.position.copy(p); gruppen.vesikel.add(s); }
    }
    // ---------- Zentrosom mit zwei Zentriolen ----------
    {
      const z = gruppen.zentriol, c = V(3.0, -2.6, -2.0), skal = 2.5, tm = mat(0x16a34a);
      const zentriol = () => { const g = new THREE.Group(); for (let i = 0; i < 9; i++) { const w = i / 9 * Math.PI * 2; for (let j = 0; j < 3; j++) { const r = 0.1 - j * 0.017, ww = w + j * 0.12; const m = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.5, 6), tm); m.position.set(r * Math.cos(ww), 0, r * Math.sin(ww)); g.add(m); } } g.scale.setScalar(skal); return g; };
      const a = zentriol(); a.position.copy(c); z.add(a); const b = zentriol(); b.position.copy(c).add(V(0.65, 0.55, 0)); b.rotation.z = Math.PI / 2; z.add(b);
      const wolke = new THREE.Mesh(new THREE.SphereGeometry(1.0, 24, 16), new THREE.MeshBasicMaterial({ color: 0x86efac, transparent: true, opacity: 0.22, depthWrite: false })); wolke.position.copy(c).add(V(0.3, 0.3, 0)); z.add(wolke);
      belegt.push([c.clone().add(V(0.3, 0.3, 0)), 1.1]);
      // Zellskelett: Mikrotubuli strahlen vom Zentrosom aus bis zur Membran (um den Kern herum)
      const pts = [], start = c.clone().add(V(0.3, 0.3, 0));
      for (let i = 0; i < 70; i++) {
        const d = V(zf() * 2 - 1, zf() * 2 - 1, -zf()).normalize(); let p = start.clone(); const weg = [p.clone()];
        for (let s = 0; s < 60; s++) { const q = p.clone().addScaledVector(d, 0.35); if (!innen(q, 0.3) || q.z > -0.1 || q.distanceTo(KERN.c) < KERN.r + 0.6) break; p = q; weg.push(p.clone()); d.add(V(zf() - 0.5, zf() - 0.5, zf() - 0.5).multiplyScalar(0.08)).normalize(); }
        for (let s = 0; s < weg.length - 1; s++) pts.push(weg[s], weg[s + 1]);
      }
      gruppen.skelett.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x65a30d, transparent: true, opacity: 0.6 })));
    }
    // ---------- Glattes ER: Röhrennetz ----------
    {
      const sm = mat(0x67e8f9), knoten = [];
      for (let i = 0; i < 26; i++) { const p = V(rnd(-9.5, -5.2), rnd(-5.5, 1.5), rnd(-4.5, -0.6)); if (innen(p, 0.6)) knoten.push(p); }
      for (const [i, a] of knoten.entries()) for (const b of knoten.slice(i + 1)) if (a.distanceTo(b) < 2.1 && zf() < 0.6) {
        const m = a.clone().lerp(b, 0.5).add(V(rnd(-0.3, 0.3), rnd(-0.3, 0.3), 0));
        gruppen.ser.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, m, b), 10, 0.09, 6), sm));
      }
      belegt.push([V(-7.4, -2, -2.5), 2.4]);
    }
    // ---------- Mitochondrien: ganze im hinteren Teil, drei aufgeschnittene in der Schnittebene ----------
    {
      const aussen = mat(0xea580c), matrix = mat(0xfdba74), crista = mat(0xc2410c);
      for (let i = 0; i < 16; i++) {
        const L = rnd(1.0, 1.8), p = platz(L / 2 + 0.45); if (!p) continue;
        const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, L, 8, 16), aussen); m.position.copy(p); m.quaternion.setFromUnitVectors(V(0, 1, 0), V(zf() - 0.5, zf() - 0.5, zf() - 0.5).normalize()); gruppen.mito.add(m);
      }
      const schnitt = (p, w, L) => {
        const g = new THREE.Group(); g.position.copy(p); g.rotation.z = w;
        const halb = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, L, 8, 20), aussen); halb.rotation.z = Math.PI / 2; g.add(halb);
        // Schnittfläche: Stadionform, innere Membran mit eingefalteten Cristae
        const st2 = new THREE.Shape(); st2.absarc(0, L / 2, 0.36, 0, Math.PI, false); st2.absarc(0, -L / 2, 0.36, Math.PI, Math.PI * 2, false);
        const f = new THREE.Mesh(new THREE.ShapeGeometry(st2, 16), matrix); f.rotation.z = Math.PI / 2; f.position.z = 0.43; g.add(f);
        const n = Math.round(L / 0.3);
        for (let i = 0; i < n; i++) { const x = -L / 2 + (i + 0.5) * L / n, s = i % 2 ? 1 : -1; const c = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 0.02), crista); c.position.set(x, s * 0.17, 0.44); g.add(c); }
        gruppen.mito.add(g);
      };
      // Diese liegen genau in der Schnittebene (hintere Hälfte des Mitochondriums + Schnittfläche)
      for (const [x, y, w, L] of [[-6.8, 3.6, 0.3, 1.6], [2.8, 5.0, -0.2, 1.4], [6.5, -2.6, 0.9, 1.5], [-5.4, -4.6, -0.5, 1.3]]) schnitt(V(x, y, -0.43), w, L);
    }
    // ---------- Lysosomen und freie Ribosomen ----------
    {
      const lm = mat(0x9d174d);
      for (let i = 0; i < 9; i++) { const p = platz(0.32); if (p) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.32, 18, 12), lm); s.position.copy(p); gruppen.lyso.add(s); } }
      const pos = [];
      for (let i = 0; i < 4000 && pos.length < 450; i++) { const p = V(rnd(-RX, RX), rnd(-RY, RY), rnd(-RZ, -0.1)); if (innen(p, 0.3) && p.distanceTo(KERN.c) > KERN.r + 0.3 && belegt.every(([q, s]) => p.distanceTo(q) > s)) pos.push(p); }
      const r = new THREE.InstancedMesh(new THREE.SphereGeometry(0.065, 6, 4), mat(0x1e3a8a), pos.length);
      pos.forEach((p, i) => r.setMatrixAt(i, new THREE.Matrix4().makeTranslation(p.x, p.y, p.z))); gruppen.ribo.add(r);
    }
  }
  // ---------- Hervorheben: alle anderen blass ----------
  if (st.fokus !== 'alle' && gruppen[st.fokus]) {
    for (const [k, g] of Object.entries(gruppen)) {
      if (k === st.fokus) continue;
      g.traverse(o => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity *= k === 'membran' ? 0.35 : 0.15; o.material.depthWrite = false; } });
    }
  }
  // ---------- Beschriftung ----------
  const H = 0.95;
  const schild = (k, anker, ziel) => {
    if (!ORGANELLEN[k] || (st.fokus !== 'alle' && st.fokus !== k)) return;
    const s = textSprite(ORGANELLEN[k].name.replace(' endoplasmatisches Retikulum', 'es ER').replace(' (Zytoplasma)', '').replace(' (Mikrotubuli)', '').replace(' (Zentrosom)', '').replace(' (Nukleolus)', ''), '#1f2937', H);
    s.position.copy(ziel); etik.add(s);
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([anker, ziel]), new THREE.LineBasicMaterial({ color: 0x334155, depthTest: false })); l.renderOrder = 9; etik.add(l);
  };
  const L = -RX - 4.5, R = RX + 4.5;
  schild('membran', V(-8.5, 5.0, 0), V(L, 8.6, 0));
  schild('plasma', V(-8, -1.4, 0), V(L, -1.2, 0));
  schild('kern', V(KERN.c.x - 2.2, KERN.c.y + 2.0, 0), V(L + 1, 11, 0));
  if (em) {
    schild('nukleolus', V(NUK.c.x, NUK.c.y, 0), V(-4, 11.6, 0));
    schild('rer', V(KERN.c.x + 3.1, KERN.c.y + 3.1, -0.5), V(3, 11.2, 0));
    schild('ser', V(-7.4, -2.6, -1), V(L, -4.2, 0));
    schild('golgi', V(5.3, 2.5, -2), V(R, 6.2, 0));
    schild('vesikel', V(7.6, 3.4, -1.4), V(R, 3.4, 0));
    schild('mito', V(6.5, -2.6, 0), V(R, -1.6, 0));
    schild('lyso', gruppen.lyso.children[0] ? gruppen.lyso.children[0].position : V(0, 0, -2), V(R, -4.4, 0));
    schild('zentriol', V(3.3, -2.3, -2), V(R - 2, -9.6, 0));
    schild('skelett', V(-0.4, -5.2, -1), V(-2, -10.6, 0));
    schild('ribo', V(-3.8, 4.95, -0.5), V(L + 2, 6.0, 0));
  }
  // Maßstab: 5 µm
  { const b = new THREE.Mesh(new THREE.BoxGeometry(5, 0.22, 0.05), new THREE.MeshBasicMaterial({ color: 0x111827 })); b.position.set(RX - 3.5, -RY - 1.6, 0); etik.add(b); const t = textSprite('5 µm', '#111827', 0.85); t.position.set(RX - 3.5, -RY - 2.4, 0); etik.add(t); }
  etik.visible = st.beschriftung;
  const o = ORGANELLEN[st.fokus];
  const info = [
    `<b>Tierzelle – ${STUFEN[st.stufe]}</b> · vorne aufgeschnitten, ca. 22 µm (0,022 mm) breit${o ? ` · <b>${o.name}</b>` : ''}`,
    o ? `<i>${o.info}</i>` : (em
      ? '<i>So zeigt das Elektronenmikroskop eine Tierzelle: Neben dem Zellkern gibt es viele Zellbestandteile (Organellen) mit eigenen Aufgaben. Wähle oben einen aus, um mehr zu erfahren.</i>'
      : '<i>Im Lichtmikroskop erkennt man bei einer Tierzelle nur die Zellmembran, das Zellplasma und den Zellkern. Die vielen kleinen Organellen sieht man erst im Elektronenmikroskop.</i>'),
    '<b>Unterschiede zur Pflanzenzelle:</b> keine Zellwand (Form unregelmäßig) · keine Chloroplasten (keine Fotosynthese) · keine große Vakuole, nur kleine Bläschen' + (em ? ' · dafür Zentriolen und Lysosomen' : ''),
  ];
  return { objekt: wurzel, radius: 15.5, titel: `Tierzelle – ${STUFEN[st.stufe]}`, info: info.join('<br>'), update: () => {} };
}
export const entsorge = entsorgeObj;
export function ausUrl(p) { const st = standard(); if (STUFEN[p.get('s')]) st.stufe = p.get('s'); if (ORGANELLEN[p.get('o')]) st.fokus = p.get('o'); return st; }
export const zuUrl = st => `&s=${st.stufe}&o=${st.fokus}`;
export function bedienung(ort, st, neu) {
  stil(); ort.innerHTML = '';
  const sS = document.createElement('select'); for (const [k, v] of Object.entries(STUFEN)) sS.add(new Option(v, k)); ort.appendChild(sS);
  const sO = document.createElement('select'); ort.appendChild(sO);
  const b = document.createElement('button'); b.textContent = 'Beschriftung'; ort.appendChild(b);
  const auff = () => {
    sO.innerHTML = ''; sO.add(new Option('Alle Bestandteile', 'alle'));
    for (const [k, v] of Object.entries(ORGANELLEN)) if (st.stufe === 'em' || v.stufe === 'lm') sO.add(new Option(v.name, k));
    if (st.stufe === 'lm' && ORGANELLEN[st.fokus] && ORGANELLEN[st.fokus].stufe !== 'lm') st.fokus = 'alle';
    sS.value = st.stufe; sO.value = st.fokus; b.classList.toggle('on', st.beschriftung);
  };
  sS.onchange = () => { st.stufe = sS.value; auff(); neu(); };
  sO.onchange = () => { st.fokus = sO.value; auff(); neu(); };
  b.onclick = () => { st.beschriftung = !st.beschriftung; auff(); neu(); };
  auff();
}
