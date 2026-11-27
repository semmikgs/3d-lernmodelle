// Augen-Generator: menschliches Auge im waagerechten Schnitt, Maße in mm, mit echter Strahlenoptik.
// Hornhaut R 7,8/6,5 mm, n 1,376 · Kammerwasser/Glaskörper n 1,336 · Linse n 1,413 (Gullstrand, vereinfacht),
// Linse fern R 10/6 mm, 3,6 mm dick; beim Akkommodieren runder (bis ca. 5 dpt). Augenlänge so, dass das
// normalsichtige Auge in der Ferne scharf sieht. Kurz-/Weitsichtigkeit: Augapfel 1,2 mm länger/kürzer; Brille im
// Abstand von 12 mm mit automatisch berechneter Stärke. Rechtes Auge, von oben gesehen; Nase bei +x.
import * as THREE from 'three';
import { textSprite, entsorge as entsorgeObj, stil } from './hilfen.js';

const A = 12;                                   // Hornhautscheitel (z), optische Achse = z, vorne = +z
const N_LUFT = 1, N_HORN = 1.376, N_KAMMER = 1.336, N_LINSE = 1.413, N_GLAS = 1.336;
const HORN = { R1: 7.8, R2: 6.5, d: 0.55, rand: 5.8 };
const WAND = { lederhaut: 0.8, aderhaut: 0.25, netzhaut: 0.3 };
const FEHL = { normal: 0, kurz: 1.2, weit: -1.2 };

// ---------- Linse in Abhängigkeit von der Akkommodation (0 = fern, 1 = maximal nah) ----------
function linse(acc) {
  return {
    Ra: 10 - 4.6 * acc, Rp: 6 - 0.6 * acc,
    vorn: A - 3.6 + 0.35 * acc, dicke: 3.6 + 0.6 * acc,
  };
}
// Flächen (Kugelflächen auf der Achse) für die Strahlrechnung: Scheitel z, Radius R (+ = Mittelpunkt hinten), n danach
function flaechen(acc) {
  const L = linse(acc);
  return [
    { z: A, R: HORN.R1, n: N_HORN },
    { z: A - HORN.d, R: HORN.R2, n: N_KAMMER },
    { z: L.vorn, R: L.Ra, n: N_LINSE },
    { z: L.vorn - L.dicke, R: -L.Rp, n: N_GLAS },
  ];
}
// Strahl (x, z, Richtung) durch Kugelfläche brechen; Strahlen laufen in −z-Richtung
function brich(p, d, f, n1) {
  const c = new THREE.Vector2(0, f.z - f.R), o = new THREE.Vector2(p.x - c.x, p.y - c.y);
  const b = o.dot(d), cc = o.lengthSq() - f.R * f.R, disk = b * b - cc;
  if (disk < 0) return null;
  const s = Math.sign(f.R) > 0 ? -b - Math.sqrt(disk) : -b + Math.sqrt(disk);   // vordere Kugelkappe
  const t = s < 1e-6 ? -b + Math.sqrt(disk) : s;
  const q = new THREE.Vector2(p.x + d.x * t, p.y + d.y * t);
  let nrm = new THREE.Vector2(q.x - c.x, q.y - c.y).normalize(); if (nrm.dot(d) > 0) nrm.negate();
  const eta = n1 / f.n, ci = -nrm.dot(d), k = 1 - eta * eta * (1 - ci * ci);
  if (k < 0) return null;
  const neu = d.clone().multiplyScalar(eta).add(nrm.multiplyScalar(eta * ci - Math.sqrt(k))).normalize();
  return { p: q, d: neu };
}
// Brille als dünne Linse bei z = A + 12: Steigung ändert sich um −x·P (P in dpt, x in mm)
const Z_BRILLE = A + 12;
const SCHARF = 0.1;     // mm Abstand Bildpunkt–Netzhaut, ab dem das Bild als unscharf gilt (≈ 0,3 dpt)
function strahl(x0, z0, d0, acc, P) {
  const pts = [new THREE.Vector2(x0, z0)];
  let p = new THREE.Vector2(x0, z0), d = d0.clone().normalize(), n = N_LUFT;
  if (P) {
    const t = (Z_BRILLE - p.y) / d.y; p = new THREE.Vector2(p.x + d.x * t, Z_BRILLE); pts.push(p.clone());
    const s = d.x / -d.y - p.x * P / 1000; d = new THREE.Vector2(s, -1).normalize();
  }
  for (const f of flaechen(acc)) {
    const r = brich(p, d, f, n); if (!r) return { pts, p, d, ok: false };
    p = r.p; d = r.d; n = f.n; pts.push(p.clone());
  }
  return { pts, p, d, ok: true };
}
// paraxialer Brennpunkt (z, wo der Strahl die Achse schneidet) für Gegenstand bei z = zG (Infinity = fern)
function bildort(acc, P, zG) {
  const h = 0.4;
  const r = zG === Infinity ? strahl(h, A + 30, new THREE.Vector2(0, -1), acc, P)
    : strahl(0, zG, new THREE.Vector2(h / (zG - A), -1), acc, P);
  if (!r.ok || Math.abs(r.d.x) < 1e-9) return -Infinity;
  return r.p.y - r.p.x / r.d.x * r.d.y;
}
const Z_NETZ_NORMAL = bildort(0, 0, Infinity);       // Netzhaut so, dass das normale Auge fern scharf sieht
const bisekt = (f, a, b, ziel, n = 50) => { let fa = f(a) - ziel; for (let i = 0; i < n; i++) { const m = (a + b) / 2, fm = f(m) - ziel; if ((fm > 0) === (fa > 0)) { a = m; fa = fm; } else b = m; } return (a + b) / 2; };

// ---------- Geometrie-Hilfen: halbe Drehkörper (untere Hälfte bleibt, Schnittfläche zeigt nach oben) ----------
const MAT = {};
function mat(name, farbe, opt = {}) {
  return MAT[name] ||= new THREE.MeshStandardMaterial({ color: farbe, roughness: 0.55, side: THREE.DoubleSide, ...opt });
}
function halbDreh(profil, material, achseUrsprung = new THREE.Vector3(), achse = new THREE.Vector3(0, 0, 1), seg = 64) {
  const g = new THREE.Group();
  const pts = profil.map(([r, a]) => new THREE.Vector2(Math.max(r, 0), a));
  g.add(new THREE.Mesh(new THREE.LatheGeometry([...pts, pts[0]], seg, 0, Math.PI), material));
  for (const s of [1, -1]) {
    const form = new THREE.Shape(pts.map(p => new THREE.Vector2(p.x * s, p.y)));
    const geo = new THREE.ShapeGeometry(form, 24);
    geo.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0)));
    g.add(new THREE.Mesh(geo, material));
  }
  const Yl = achse.clone().normalize(), Xl = new THREE.Vector3(0, -1, 0), Zl = new THREE.Vector3().crossVectors(Xl, Yl);
  g.applyMatrix4(new THREE.Matrix4().makeBasis(Xl, Yl, Zl).setPosition(achseUrsprung));
  return g;
}
const bogen = (cz, R, t1, t2, n = 48) => Array.from({ length: n + 1 }, (_, i) => { const t = t1 + (t2 - t1) * i / n; return [R * Math.sin(t), cz + R * Math.cos(t)]; });
// Linsenprofil aus zwei Kugelkappen
function linsenProfil(L) {
  const cA = L.vorn - L.Ra, cP = L.vorn - L.dicke + L.Rp;
  let lo = 0, hi = Math.min(L.Ra, L.Rp);
  for (let i = 0; i < 60; i++) { const r = (lo + hi) / 2; const ya = cA + Math.sqrt(L.Ra ** 2 - r * r), yp = cP - Math.sqrt(L.Rp ** 2 - r * r); if (ya > yp) lo = r; else hi = r; }
  const re = lo, ta = Math.asin(re / L.Ra), tp = Math.asin(re / L.Rp);
  const vorne = bogen(cA, L.Ra, 0, ta, 40), hinten = bogen(cP, L.Rp, Math.PI - tp, Math.PI, 40);
  return { profil: [...vorne, ...hinten], aequator: { r: re, z: cA + Math.sqrt(L.Ra ** 2 - re * re) } };
}

export const BLICK = { fern: 'Blick in die Ferne', nah: 'Blick in die Nähe (25 cm)', nahStarr: 'Nähe ohne Akkommodation' };
export const AUGEN = { normal: 'normalsichtig', kurz: 'kurzsichtig', weit: 'weitsichtig' };
export const standard = () => ({ blick: 'fern', auge: 'normal', brille: false, beschriftung: false, strahlen: true });

// =====================================================================
export function erzeuge(st) {
  const wurzel = new THREE.Group(), fest = new THREE.Group(), beweglich = new THREE.Group();
  wurzel.add(fest, beweglich);
  const zNetz = Z_NETZ_NORMAL - FEHL[st.auge];              // Netzhaut-Innenfläche hinten (z)
  // Lederhaut-Kugel durch Hornhautrand und hinteren Pol
  const zLimbus = (A - HORN.R1) + Math.sqrt(HORN.R1 ** 2 - HORN.rand ** 2);
  const zHintenAussen = zNetz - WAND.netzhaut - WAND.aderhaut - WAND.lederhaut;
  const cS = (HORN.rand ** 2 + zLimbus ** 2 - zHintenAussen ** 2) / (2 * (zLimbus - zHintenAussen)), RS = cS - zHintenAussen;
  const tLimbus = Math.atan2(HORN.rand, zLimbus - cS);
  const schale = (r1, r2, t1, t2) => [...bogen(cS, r1, t1, t2), ...bogen(cS, r2, t2, t1)];
  const R1 = RS - WAND.lederhaut, R2 = R1 - WAND.aderhaut, R3 = R2 - WAND.netzhaut;
  const tOra = THREE.MathUtils.degToRad(62);                // Ora serrata: vorderes Ende der Netzhaut

  // Lederhaut, Aderhaut, Netzhaut
  fest.add(halbDreh(schale(RS, R1, tLimbus, Math.PI), mat('leder', 0xf4f1ea)));
  fest.add(halbDreh(schale(R1, R2, THREE.MathUtils.degToRad(40), Math.PI), mat('ader', 0x8e3b2f)));
  fest.add(halbDreh(schale(R2, R3, tOra, Math.PI), mat('netz', 0xf2a07b)));
  // Hornhaut
  const hornProfil = [...bogen(A - HORN.R1, HORN.R1, 0, Math.asin(HORN.rand / HORN.R1)), ...bogen(A - HORN.d - HORN.R2, HORN.R2, Math.asin((HORN.rand - 0.25) / HORN.R2), 0)];
  fest.add(halbDreh(hornProfil, mat('horn', 0xbfe3f5, { transparent: true, opacity: 0.45, roughness: 0.05, depthWrite: false })));
  // Glaskörper (Füllung hinter der Linse) und Kammerwasser – nur zart angedeutet
  fest.add(halbDreh([...bogen(cS, R3 - 0.02, THREE.MathUtils.degToRad(58), Math.PI), [0, A - 7.3]], mat('glas', 0xdff3ff, { transparent: true, opacity: 0.16, depthWrite: false })));
  // gelber Fleck (Sehgrube, 5° zur Schläfe) und blinder Fleck mit Sehnerv (15° zur Nase)
  const aufWand = (grad, r) => new THREE.Vector3(r * Math.sin(THREE.MathUtils.degToRad(grad)), 0, cS - r * Math.cos(THREE.MathUtils.degToRad(grad)));
  {
    const pts = Array.from({ length: 13 }, (_, i) => aufWand(-5 + (i - 6) * 0.9, R3 - 0.02).add(new THREE.Vector3(0, 0.03, 0)));
    const t = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.18, 8), mat('gelb', 0xf5c518)); fest.add(t);
  }
  const nervRicht = aufWand(15, 1).sub(new THREE.Vector3(0, 0, cS)).normalize();
  const nervStart = aufWand(15, R3);
  fest.add(halbDreh([[0, 0], [1.25, 0], [1.25, 11], [0, 11]], mat('nerv', 0xf3e6c4), nervStart, nervRicht, 32));
  fest.add(halbDreh([[1.25, WAND.netzhaut + WAND.aderhaut + WAND.lederhaut], [1.75, WAND.netzhaut + WAND.aderhaut + WAND.lederhaut], [1.75, 11], [1.25, 11]], mat('leder', 0xf4f1ea), nervStart, nervRicht, 32));
  {   // Papille: Nervenfasern durchqueren die Wandschichten (auf der Schnittfläche)
    const tief = WAND.netzhaut + WAND.aderhaut + WAND.lederhaut;
    const g = new THREE.PlaneGeometry(2.5, tief + 0.1); g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, mat('nerv', 0xf3e6c4)); m.position.copy(nervStart.clone().addScaledVector(nervRicht, tief / 2)).add(new THREE.Vector3(0, 0.02, 0));
    m.rotation.y = Math.atan2(nervRicht.x, nervRicht.z); fest.add(m);
    // Blutgefäße im Sehnerv (Arterie und Vene)
    for (const [dx, farbe] of [[-0.3, 0xc62828], [0.3, 0x283593]]) {
      const seite = new THREE.Vector3().crossVectors(nervRicht, new THREE.Vector3(0, 1, 0)).normalize();
      const a = nervStart.clone().addScaledVector(seite, dx).add(new THREE.Vector3(0, 0.04, 0)), b = a.clone().addScaledVector(nervRicht, 11);
      const t = new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(a, b), 4, 0.12, 6), new THREE.MeshStandardMaterial({ color: farbe })); fest.add(t);
    }
  }
  // äußere Augenmuskeln (innerer und äußerer gerader Muskel) als Bänder im Schnitt
  for (const s of [1, -1]) {
    const pts = []; for (let i = 0; i <= 16; i++) { const t = THREE.MathUtils.degToRad(55 + i * 6); pts.push(new THREE.Vector3(s * (RS + 0.45) * Math.sin(t), -0.6, cS + (RS + 0.45) * Math.cos(t))); }
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.6, 10); g.scale(1, 1, 1);
    const m = new THREE.Mesh(g, mat('muskel', 0xb5523b)); m.scale.set(1, 1, 1); fest.add(m);
  }

  // ---------- bewegliche Teile: Linse, Ziliarkörper, Zonulafasern, Iris, Strahlen ----------
  let acc = 0, accZiel = 0, P = 0;
  if (st.brille && st.auge !== 'normal') {
    const zN = zNetz;
    P = bisekt(p => bildort(0, p, Infinity), -12, 12, zN);
  }
  const zGegenstand = st.blick === 'fern' ? Infinity : A + 250;
  const accFuer = () => {
    if (st.blick === 'nahStarr') return 0;
    const f = a => bildort(a, P, zGegenstand);
    if (f(0) >= zNetz - 1e-3) return 0;                     // schon scharf oder Bild vor der Netzhaut: nicht akkommodieren
    if (f(1) < zNetz) return 1;                             // reicht nicht: maximal akkommodieren
    return bisekt(f, 0, 1, zNetz);
  };
  accZiel = accFuer(); acc = st._acc ?? accZiel;

  const strahlMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
  const strahlMatH = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.35, depthWrite: false });
  const unschaerfe = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.05, 32), new THREE.MeshBasicMaterial({ color: 0xff5722, transparent: true, opacity: 0.6 }));
  const punkt = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), new THREE.MeshBasicMaterial({ color: 0xff5722 }));

  let ergebnis = { brennpunkt: 0, streu: 0 };
  function bewegliche() {
    for (const c of [...beweglich.children]) { beweglich.remove(c); c.traverse(x => { if (x.geometry) x.geometry.dispose(); }); }
    const L = linse(acc), lp = linsenProfil(L);
    beweglich.add(halbDreh(lp.profil, mat('linse', 0xe8f4ff, { transparent: true, opacity: 0.7, roughness: 0.1, depthWrite: false }), undefined, undefined, 64));
    // Ziliarkörper mit Ziliarmuskel: zieht sich beim Nahsehen zusammen (Ring wird enger)
    const zc = L.vorn - L.dicke * 0.45, rInnen = 6.0 - 0.6 * acc;
    const wandR = t => R2 * Math.sin(t), wandZ = t => cS + R2 * Math.cos(t);
    const t1 = THREE.MathUtils.degToRad(40), t2 = tOra;
    const zil = [[wandR(t1), wandZ(t1)], [rInnen + 0.3, zc + 0.9], [rInnen, zc + 0.1], [rInnen + 0.4, zc - 0.7], [wandR(t2), wandZ(t2)]];
    beweglich.add(halbDreh(zil, mat('ziliar', 0x9c4a3c), undefined, undefined, 48));
    // Zonulafasern (Linsenbänder): straff beim Fernsehen, locker beim Nahsehen
    const fasern = [];
    for (let i = 0; i <= 12; i++) {
      const phi = Math.PI * i / 12, rot = v => new THREE.Vector3(v.x * Math.cos(phi), -v.x * Math.sin(phi), v.z);
      for (const [dz1, dz2] of [[0.35, 0.25], [-0.35, -0.25], [0, 0]]) {
        const a = new THREE.Vector3(rInnen - 0.05, 0, zc + 0.1 + dz1), b = new THREE.Vector3(lp.aequator.r, 0, lp.aequator.z + dz2);
        const m = a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, 0, 0)); m.x += 0; m.z -= 0.45 * acc;     // locker = durchhängend
        fasern.push(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(rot(a), rot(m), rot(b)), 8, 0.035, 4));
      }
    }
    for (const f of fasern) beweglich.add(new THREE.Mesh(f, mat('zonula', 0xd9d4c7)));
    // Iris (Regenbogenhaut) mit Pupille; Pupille beim Nahsehen enger
    const rPup = 2.0 - 0.5 * acc, zI = L.vorn + 0.25;
    beweglich.add(halbDreh([[rPup, zI + 0.15], [rPup + 0.2, zI + 0.3], [5.9, zI + 0.5], [6.1, zI - 0.1], [rPup + 0.1, zI - 0.25]], mat('iris', 0x5b7fa6), undefined, undefined, 64));
    // Brille
    if (P) {
      const dick = 1.2, rr = 9, kr = Math.min(Math.abs(1000 * 0.5 / P), 200), sag = rr * rr / (2 * kr);
      const prof = P < 0
        ? [[0, Z_BRILLE + dick / 2], [rr, Z_BRILLE + dick / 2 + sag], [rr, Z_BRILLE - dick / 2 - sag], [0, Z_BRILLE - dick / 2]]
        : [[0, Z_BRILLE + dick / 2 + sag], [rr, Z_BRILLE + dick / 2], [rr, Z_BRILLE - dick / 2], [0, Z_BRILLE - dick / 2 - sag]];
      const feiner = []; const [p0, p1, p2, p3] = prof;
      for (let i = 0; i <= 16; i++) { const r = rr * i / 16, s = (r * r) / (2 * kr); feiner.push([r, P < 0 ? Z_BRILLE + dick / 2 + s : Z_BRILLE + dick / 2 + sag - s]); }
      for (let i = 16; i >= 0; i--) { const r = rr * i / 16, s = (r * r) / (2 * kr); feiner.push([r, P < 0 ? Z_BRILLE - dick / 2 - s : Z_BRILLE - dick / 2 - sag + s]); }
      void p0; void p1; void p2; void p3;
      beweglich.add(halbDreh(feiner, mat('brille', 0xa5d8ff, { transparent: true, opacity: 0.45, roughness: 0.05, depthWrite: false }), undefined, undefined, 48));
    }
    // Lichtstrahlen in der Schnittebene
    const hs = [-1, -0.5, 0, 0.5, 1].map(f => f * (rPup - 0.25));
    const enden = [];
    for (const h of hs) {
      const start = zGegenstand === Infinity ? new THREE.Vector2(h, A + 26) : new THREE.Vector2(h * 26 / (zGegenstand - A - 0) + 0, A + 26);
      const d0 = zGegenstand === Infinity ? new THREE.Vector2(0, -1) : new THREE.Vector2(h / (zGegenstand - A), -1);
      const st0 = zGegenstand === Infinity ? start : new THREE.Vector2(d0.x / -d0.y * (zGegenstand - (A + 26)) * 0, A + 26);
      // Startpunkt so wählen, dass der Strahl die Hornhaut bei Höhe h trifft
      const z0 = A + 26, x0 = zGegenstand === Infinity ? h : h + d0.x / -d0.y * -(z0 - A);
      void start; void st0;
      const r = strahl(x0, z0, d0, acc, P);
      if (!r.ok) continue;
      // bis zur Netzhaut verlängern
      const p = r.p, d = r.d, o = new THREE.Vector2(p.x, p.y - cS), b = o.dot(d), cc = o.lengthSq() - R3 * R3, t = -b + Math.sqrt(Math.max(b * b - cc, 0));
      const ende = new THREE.Vector2(p.x + d.x * t, p.y + d.y * t); enden.push({ ende, p, d });
      const pts = [...r.pts, ende];
      for (let i = 0; i < pts.length - 1; i++) {
        const a3 = new THREE.Vector3(pts[i].x, 0.08, pts[i].y), b3 = new THREE.Vector3(pts[i + 1].x, 0.08, pts[i + 1].y);
        beweglich.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(a3, b3), 1, 0.07, 6), strahlMat));
      }
    }
    // Bildpunkt: wo schneiden sich die Strahlen? (Randstrahl mit Achse)
    const bp = bildort(acc, P, zGegenstand);
    const streu = enden.length ? Math.max(...enden.map(e => Math.abs(e.ende.x))) - Math.min(...enden.map(e => Math.abs(e.ende.x)) ) : 0;
    const spanne = enden.length ? Math.max(...enden.map(e => e.ende.x)) - Math.min(...enden.map(e => e.ende.x)) : 0;
    ergebnis = { brennpunkt: bp, streu: spanne }; void streu;
    if (Math.abs(bp - zNetz) > SCHARF) {     // unscharf: Strahlen bis zum Bildpunkt (gestrichelt wirkend, blass) weiterführen
      for (const e of enden) {
        const tB = (bp - e.p.y) / e.d.y;
        if (tB > 0 && bp < e.ende.y) {
          const b3 = new THREE.Vector3(e.p.x + e.d.x * tB, 0.08, bp);
          beweglich.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(e.ende.x, 0.08, e.ende.y), b3), 1, 0.05, 6), strahlMatH));
        }
      }
      const mitte = enden.reduce((s, e) => s + e.ende.x, 0) / enden.length, zM = enden.reduce((s, e) => s + e.ende.y, 0) / enden.length;
      unschaerfe.scale.set(spanne / 2 + 0.2, 1, spanne / 2 + 0.2); unschaerfe.position.set(mitte, 0.1, zM + 0.1); unschaerfe.rotation.set(Math.PI / 2, 0, 0);
      beweglich.add(unschaerfe);
      if (bp > zNetz) { punkt.position.set(0, 0.1, bp); beweglich.add(punkt); }
    } else if (enden.length) { punkt.position.set(enden[2] ? enden[2].ende.x : 0, 0.1, enden[2] ? enden[2].ende.y + 0.1 : zNetz); beweglich.add(punkt); }
    for (const c of beweglich.children) if (c.isMesh && c.material.color && (c.material === strahlMat || c.material === strahlMatH)) c.visible = st.strahlen;
    unschaerfe.visible = punkt.visible = st.strahlen;
  }
  bewegliche();

  // ---------- Beschriftungen mit Hinweislinien ----------
  const etik = new THREE.Group(); wurzel.add(etik);
  const L0 = linse(acc);
  const marke = (text, anker, ziel, farbe = '#1f2937') => {
    const s = textSprite(text, farbe, 1.25); s.position.copy(ziel); etik.add(s);
    const g = new THREE.BufferGeometry().setFromPoints([anker.clone().setY(anker.y + 0.15), ziel]); etik.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0x334155 })));
  };
  // Beschriftungen rings um das Auge in der Schnittebene (wie in einer Lehrbuchzeichnung)
  const V = (x, z) => new THREE.Vector3(x, 0.5, z);
  const rundum = (grad, r) => V(r * Math.sin(THREE.MathUtils.degToRad(grad)), cS - r * Math.cos(THREE.MathUtils.degToRad(grad)));
  const an = (grad, r) => { const p = aufWand(grad, r); p.y = 0.1; return p; };
  marke('Hornhaut', new THREE.Vector3(3.5, 0.1, A - 0.9), V(10, A + 3));
  marke('Regenbogenhaut\n(Iris)', new THREE.Vector3(-4.6, 0.1, L0.vorn + 0.45), V(-13, A + 2));
  marke('Pupille', new THREE.Vector3(-1.4, 0.1, L0.vorn + 0.3), V(-7, A + 7));
  marke('vordere Augenkammer\n(Kammerwasser)', new THREE.Vector3(2.2, 0.1, A - 1.6), V(15, A - 0.5));
  marke('Linse', new THREE.Vector3(2.6, 0.1, L0.vorn - 1.6), V(16, A - 4.5));
  marke('Linsenbänder\n(Zonulafasern)', new THREE.Vector3(5.4, 0.1, L0.vorn - 1.5), V(17.5, A - 8.5));
  marke('Ziliarmuskel', new THREE.Vector3(-6.3, 0.1, L0.vorn - 1.7), V(-17, A - 4.5));
  marke('Glaskörper', new THREE.Vector3(3, 0.1, -3), V(17.5, -1.5));
  marke('Augenmuskel', new THREE.Vector3(-(RS + 0.5), 0.1, 3), V(-18.5, 1.5));
  marke('Lederhaut', an(-62, RS - 0.4), rundum(-62, 19.5));
  marke('Aderhaut', an(-45, R1 - 0.12), rundum(-45, 19.5));
  marke('Netzhaut', an(-30, R2 - 0.15), rundum(-28, 19.5));
  marke('gelber Fleck\n(schärfstes Sehen)', an(-5, R3), rundum(-12, 19.5));
  marke('blinder Fleck', nervStart.clone().setY(0.1), rundum(8, 18));
  marke('Sehnerv', nervStart.clone().addScaledVector(nervRicht, 9).setY(0.1), rundum(36, 19.5));
  etik.visible = st.beschriftung;
  // Maßstab 10 mm
  {
    const z = zHintenAussen - 3;
    const lin = (a, b) => { const g = new THREE.BufferGeometry().setFromPoints([a, b]); wurzel.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0x111111 }))); };
    const W = (x, zz) => new THREE.Vector3(x, 0.1, zz);
    lin(W(-5, z), W(5, z)); lin(W(-5, z - 0.5), W(-5, z + 0.5)); lin(W(5, z - 0.5), W(5, z + 0.5));
    const s = textSprite('10 mm', '#111', 1.2); s.position.set(-8.5, 0.3, z); wurzel.add(s);
  }
  if (st.blick !== 'fern' && st.strahlen) { const s = textSprite('Licht von einem Gegenstand\nin 25 cm Entfernung', '#b45309', 0.9); s.position.set(0, 1, A + 28); wurzel.add(s); }
  else if (st.strahlen) { const s = textSprite('paralleles Licht\naus der Ferne', '#b45309', 0.9); s.position.set(0, 1, A + 28); wurzel.add(s); }
  if (P) { const s = textSprite(`Brille ${P > 0 ? '+' : '−'}${Math.abs(P).toFixed(1).replace('.', ',')} dpt`, '#1d4ed8', 1); s.position.set(-11, 1, Z_BRILLE); wurzel.add(s); }

  function infoText() {
    const scharf = Math.abs(ergebnis.brennpunkt - zNetz) <= SCHARF;
    const lage = !scharf ? (ergebnis.brennpunkt > zNetz ? 'vor der Netzhaut' : 'hinter der Netzhaut') : 'genau auf der Netzhaut';
    const L = linse(acc), kraft = l => 1000 * (N_LINSE - N_KAMMER) * (1 / l.Ra + 1 / l.Rp), brech = kraft(L), brech0 = kraft(linse(0));
    const akk = acc < 0.01 ? 'keine' : acc > 0.99 ? 'maximal – mehr geht nicht' : 'ja';
    const z = [
      `<b>${AUGEN[st.auge]}</b> · ${BLICK[st.blick]}${P ? ` · mit Brille (${P > 0 ? 'Sammellinse +' : 'Zerstreuungslinse −'}${Math.abs(P).toFixed(1).replace('.', ',')} dpt)` : ''}`,
      `Bild ${lage} → <b>${scharf ? 'scharf' : 'unscharf'}</b> · Akkommodation: ${akk} · Linse ${L.dicke.toFixed(1).replace('.', ',')} mm dick, Brechkraft ≈ ${Math.round(brech)} dpt${acc > 0.01 ? ` (entspannt ${Math.round(brech0)} dpt)` : ''} · Pupille ${(2 * (2 - 0.5 * acc)).toFixed(1).replace('.', ',')} mm`,
    ];
    const T = {
      fern: 'Ferne: Der Ziliarmuskel ist entspannt, die Linsenbänder sind gespannt und ziehen die Linse flach. Die flache Linse bricht das Licht schwächer – für paralleles Licht aus der Ferne genau richtig.',
      nah: 'Nähe: Der ringförmige Ziliarmuskel zieht sich zusammen, der Ring wird enger, die Linsenbänder werden locker. Die elastische Linse wölbt sich von selbst stärker und bricht das Licht stärker – das nennt man Akkommodation. Gleichzeitig wird die Pupille enger.',
      nahStarr: 'Bleibt die Linse flach, ist sie für nahe Gegenstände zu schwach: Die Lichtstrahlen würden sich erst hinter der Netzhaut treffen, auf der Netzhaut entsteht ein unscharfer Fleck. Im Alter wird die Linse steifer und kann sich kaum noch wölben (Alterssichtigkeit).',
    };
    const F = {
      normal: '', kurz: ' Kurzsichtig: Der Augapfel ist etwas zu lang. Licht aus der Ferne trifft sich schon vor der Netzhaut – auch mit ganz flacher Linse. Nahes sieht man scharf. Eine Zerstreuungslinse (Minus-Glas) behebt das.',
      weit: ' Weitsichtig: Der Augapfel ist etwas zu kurz. Das Auge muss schon für die Ferne akkommodieren; für die Nähe reicht die Wölbung der Linse dann nicht mehr. Eine Sammellinse (Plus-Glas) hilft.',
    };
    z.push(`<i>${T[st.blick]}${F[st.auge]} Waagerechter Schnitt durch ein rechtes Auge (≈ 24 mm lang), von oben gesehen; Strahlen nach dem Brechungsgesetz berechnet.</i>`);
    return z.join('<br>');
  }

  const erg = {
    objekt: wurzel, radius: 21, titel: `Auge – ${BLICK[st.blick]}`, info: infoText(),
    update: dt => {
      if (Math.abs(acc - accZiel) > 1e-4) {
        acc += Math.sign(accZiel - acc) * Math.min(Math.abs(accZiel - acc), dt * 0.6); st._acc = acc;
        bewegliche();
        if (Math.abs(acc - accZiel) <= 1e-4 && erg.beiInfo) erg.beiInfo(infoText());
      }
    },
  };
  st._acc = acc;
  return erg;
}
export const entsorge = entsorgeObj;

export function ausUrl(p) {
  const st = standard();
  if (BLICK[p.get('b')]) st.blick = p.get('b');
  if (AUGEN[p.get('a')]) st.auge = p.get('a');
  st.brille = p.get('br') === '1';
  return st;
}
export const zuUrl = st => `&b=${st.blick}&a=${st.auge}&br=${st.brille ? 1 : 0}`;

export function bedienung(ort, st, neu) {
  stil(); ort.innerHTML = '';
  const sel = (opts, titel) => { const s = document.createElement('select'); s.title = titel; for (const [k, v] of Object.entries(opts)) s.add(new Option(v, k)); ort.appendChild(s); return s; };
  const sBlick = sel(BLICK, 'Wohin schaut das Auge?'), sAuge = sel(AUGEN, 'Sehfehler');
  const knopf = t => { const b = document.createElement('button'); b.textContent = t; ort.appendChild(b); return b; };
  const bBrille = knopf('Brille'), bStrahl = knopf('Lichtstrahlen'), bSchild = knopf('Beschriftung');
  function auffrischen() {
    sBlick.value = st.blick; sAuge.value = st.auge; bBrille.hidden = st.auge === 'normal';
    bBrille.classList.toggle('on', st.brille); bStrahl.classList.toggle('on', st.strahlen); bSchild.classList.toggle('on', st.beschriftung);
  }
  const aendern = f => () => { f(); auffrischen(); neu(); };
  sBlick.onchange = aendern(() => st.blick = sBlick.value);
  sAuge.onchange = aendern(() => { st.auge = sAuge.value; if (st.auge === 'normal') st.brille = false; });
  bBrille.onclick = aendern(() => st.brille = !st.brille);
  bStrahl.onclick = aendern(() => st.strahlen = !st.strahlen);
  bSchild.onclick = aendern(() => st.beschriftung = !st.beschriftung);
  auffrischen();
}
