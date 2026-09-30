// Würfel-Tracking: fusioniert alle sichtbaren Würfelseiten zu einer Lage,
// glättet mit One-Euro-Filter und überbrückt Aussetzer mit dem Lagesensor des Geräts.
import * as THREE from 'three';

const v1 = new THREE.Vector3(), q1 = new THREE.Quaternion(), s1 = new THREE.Vector3(), m1 = new THREE.Matrix4();

// One-Euro-Filter (Casiez et al.): wenig Zittern in Ruhe, wenig Verzögerung bei schneller Bewegung
function alpha(cutoff, dt) { const tau = 1 / (2 * Math.PI * cutoff); return 1 / (1 + tau / dt); }
class EuroVec {
  constructor(minCutoff, beta) { this.min = minCutoff; this.beta = beta; this.x = null; this.speed = 0; }
  filter(x, dt) {
    if (!this.x) { this.x = x.clone(); return this.x; }
    const v = x.distanceTo(this.x) / dt;
    this.speed += (v - this.speed) * alpha(1.0, dt);
    this.x.lerp(x, alpha(this.min + this.beta * this.speed, dt));
    return this.x;
  }
  reset() { this.x = null; this.speed = 0; }
}
class EuroQuat {
  constructor(minCutoff, beta) { this.min = minCutoff; this.beta = beta; this.q = null; this.speed = 0; }
  filter(q, dt) {
    if (!this.q) { this.q = q.clone(); return this.q; }
    const v = this.q.angleTo(q) / dt;
    this.speed += (v - this.speed) * alpha(1.0, dt);
    this.q.slerp(q, alpha(this.min + this.beta * this.speed, dt));
    return this.q;
  }
  reset() { this.q = null; this.speed = 0; }
}

// Lagesensor → Orientierung der Rückkamera im Raum (wie three.js DeviceOrientationControls)
export class Lagesensor {
  constructor() {
    this.q = new THREE.Quaternion(); this.aktiv = false; this.e = null;
    this._euler = new THREE.Euler(); this._q0 = new THREE.Quaternion();
    this._q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
    this._z = new THREE.Vector3(0, 0, 1);
  }
  async start() {
    if (typeof DeviceOrientationEvent === 'undefined') return false;
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      try { if (await DeviceOrientationEvent.requestPermission() !== 'granted') return false; } catch { return false; }
    }
    addEventListener('deviceorientation', (e) => { if (e.alpha !== null) { this.e = e; this.aktiv = true; } });
    return true;
  }
  lesen() {
    if (!this.e) return null;
    const d = THREE.MathUtils.DEG2RAD, e = this.e;
    const orient = ((screen.orientation && screen.orientation.angle) ?? window.orientation ?? 0) * d;
    this._euler.set(e.beta * d, e.alpha * d, -e.gamma * d, 'YXZ');
    this.q.setFromEuler(this._euler).multiply(this._q1).multiply(this._q0.setFromAxisAngle(this._z, -orient));
    return this.q;
  }
}

export class WuerfelTracker {
  // marker: [{ root: Object3D (Pose der Seite in Kamerakoordinaten), inv: Matrix4 (Seite → Würfelmitte, invertiert) }]
  constructor(marker, sensor) {
    this.marker = marker; this.sensor = sensor;
    this.p = new EuroVec(1.2, 1.5); this.q = new EuroQuat(1.2, 0.8);
    this.pos = new THREE.Vector3(); this.rot = new THREE.Quaternion();
    this.verloren = 99; this.gueltig = false;
    this.kameraBeiLetzterSicht = new THREE.Quaternion(); this.poseBeiLetzterSicht = { p: new THREE.Vector3(), q: new THREE.Quaternion() };
    this.maxLuecke = 1.5;           // Sekunden, die mit dem Lagesensor überbrückt werden
    this.anzahlSeiten = 0;
    // Selbstkorrektur des Objektivunterschieds: Mittelpunkt = Seitenposition − Normale · (halbe Kante · skala).
    // skala wird aus Bildern mit ≥ 2 Seiten geschätzt, sodass alle Seiten denselben Mittelpunkt ergeben.
    this.halbeKante = 0.625; this.skala = 1; this.skalaProben = 0;
    // Selbstkalibrierung Sensor ↔ Kamera: 8 mögliche Zuordnungen (Richtung × Bildschirmdrehung)
    this.varianten = [];
    for (const inv of [false, true]) for (const k of [0, 1, 2, 3])
      this.varianten.push({ inv, rz: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), k * Math.PI / 2), fehler: 0 });
    this.kalibProben = 0; this.variante = null;
    this._vorher = null;   // { q: rohe Lage, s: Sensor, t: Zeit }
    this._zeit = 0;
  }

  // Sensor-Drehung G (Kameradrehung zwischen zwei Zeitpunkten) in Kamerakoordinaten gemäß Variante
  _anwenden(v, G) {
    const g = v.inv ? G.clone().invert() : G.clone();
    return v.rz.clone().multiply(g).multiply(v.rz.clone().invert());
  }

  _skalaSchaetzen(gut) {
    if (gut.length < 2) return;
    const tb = new THREE.Vector3(), nb = new THREE.Vector3();
    for (const k of gut) { tb.add(k.t); nb.add(k.n); }
    tb.divideScalar(gut.length); nb.divideScalar(gut.length);
    let z = 0, nn = 0;
    for (const k of gut) { const dn = k.n.clone().sub(nb); z += k.t.clone().sub(tb).dot(dn); nn += dn.lengthSq(); }
    if (nn < 0.3) return;                                  // Seiten zu ähnlich ausgerichtet
    const h = z / nn, s = THREE.MathUtils.clamp(h / this.halbeKante, 0.5, 2.5);
    this.skalaProben++;
    const a = this.skalaProben < 20 ? 0.2 : 0.03;           // anfangs schnell, dann ruhig
    this.skala += (s - this.skala) * a;
  }

  _kalibrieren(qRoh) {
    const s = this.sensor && this.sensor.lesen();
    if (!s) return;
    const jetzt = { q: qRoh.clone(), s: s.clone(), t: this._zeit };
    const v = this._vorher; this._vorher = jetzt;
    if (!v || jetzt.t - v.t > 0.25) return;
    const G = jetzt.s.clone().invert().multiply(v.s);               // Gerätedrehung
    if (2 * Math.acos(Math.min(1, Math.abs(G.w))) < THREE.MathUtils.degToRad(1.5)) return;  // zu wenig Bewegung
    const O = jetzt.q.clone().multiply(v.q.clone().invert());       // beobachtete Drehung im Bild
    for (const va of this.varianten) va.fehler = va.fehler * 0.97 + this._anwenden(va, G).angleTo(O);
    this.kalibProben++;
    const sortiert = [...this.varianten].sort((a, b) => a.fehler - b.fehler);
    // nur übernehmen, wenn eindeutig besser als alle anderen
    this.variante = (this.kalibProben >= 12 && sortiert[0].fehler < 0.6 * sortiert[1].fehler) ? sortiert[0] : null;
  }

  // neueDaten = true, wenn in diesem Frame ein Kamerabild ausgewertet wurde
  update(dt, neueDaten) {
    this._zeit += dt;
    if (!neueDaten) { this._ueberbruecken(dt, false); return; }
    const kand = [];
    for (const m of this.marker) {
      if (!m.root.visible) continue;
      m1.multiplyMatrices(m.root.matrix, m.inv).decompose(v1, q1, s1);
      // Gewicht: Seiten, die zur Kamera zeigen, sind genauer
      const n = new THREE.Vector3().setFromMatrixColumn(m.root.matrix, 1).normalize();
      if (n.z < 0.05) continue;   // Seite zeigt angeblich von der Kamera weg → Fehlerkennung (Kipp-Mehrdeutigkeit)
      const t = new THREE.Vector3().setFromMatrixPosition(m.root.matrix);
      kand.push({ id: m.id, t, n, p: t.clone().addScaledVector(n, -this.halbeKante * this.skala), q: q1.clone(), w: 0.25 + Math.max(0, n.z), nz: n.z });
    }
    this.anzahlSeiten = kand.length;
    this.diag = kand.map(k => [k.id, +k.nz.toFixed(2), +(THREE.MathUtils.radToDeg(k.q.angleTo(this.rot))).toFixed(0)]);
    if (!kand.length) { this._ueberbruecken(dt, true); return; }

    // Mehrheitsentscheid: Seiten, deren Lagen übereinstimmen, bilden eine Gruppe.
    // Stimmen ≥ 2 Seiten überein, gilt diese Gruppe. Bei nur einer Seite wird mit der letzten Lage verglichen.
    const frisch = this.gueltig && this.verloren < 0.5;
    const eng = THREE.MathUtils.degToRad(15);
    let gut = [];
    for (const k of kand) {
      const gruppe = kand.filter(o => o.q.angleTo(k.q) < eng);
      const besser = gruppe.length > gut.length ||
        (gruppe.length === gut.length && frisch && k.q.angleTo(this.rot) < gut[0].q.angleTo(this.rot));
      if (besser) gut = gruppe;
    }
    if (gut.length < 2) {
      const ref = frisch ? this.rot : kand.reduce((a, b) => (b.w > a.w ? b : a)).q;
      gut = kand.filter(k => k.q.angleTo(ref) < THREE.MathUtils.degToRad(30));
      if (gut.length > 1) gut = [gut.reduce((a, b) => (b.q.angleTo(ref) < a.q.angleTo(ref) ? b : a))];
    }
    if (!gut.length) {
      // alles weicht ab: nur akzeptieren, wenn es mehrere Frames so bleibt (Fehlerkennung vs. echte Drehung)
      this._abweichung = (this._abweichung || 0) + 1;
      if (this._abweichung < 3) { this._ueberbruecken(dt, true); return; }
      gut = kand; this.p.reset(); this.q.reset();
    }
    this._abweichung = 0;

    // gewichteter Mittelwert
    const p = new THREE.Vector3(), q = new THREE.Quaternion(0, 0, 0, 0); let wSum = 0;
    const r0 = gut[0].q;
    for (const k of gut) {
      const s = (k.q.dot(r0) < 0) ? -k.w : k.w;
      p.addScaledVector(k.p, k.w);
      q.set(q.x + k.q.x * s, q.y + k.q.y * s, q.z + k.q.z * s, q.w + k.q.w * s);
      wSum += k.w;
    }
    p.divideScalar(wSum); q.normalize();
    this._skalaSchaetzen(gut);
    this.streuung = gut.length > 1 ? Math.max(...gut.map(k => k.p.distanceTo(p))) / 1.25 : null;
    this._kalibrieren(q);

    if (!this.gueltig || this.verloren > 0.5) { this.p.reset(); this.q.reset(); }
    this.pos.copy(this.p.filter(p, Math.max(dt, 1 / 120)));
    this.rot.copy(this.q.filter(q, Math.max(dt, 1 / 120)));
    this.gueltig = true; this.verloren = 0;
    this.poseBeiLetzterSicht.p.copy(this.pos); this.poseBeiLetzterSicht.q.copy(this.rot);
    const s = this.sensor && this.sensor.lesen();
    if (s) this.kameraBeiLetzterSicht.copy(s);
  }

  _ueberbruecken(dt, zaehlen) {
    if (!this.gueltig) return;
    if (zaehlen || this.verloren > 0) this.verloren += dt;
    if (this.verloren <= 0) return;
    // Drehung des Geräts seit der letzten Sicht herausrechnen: P_neu = (C_neu⁻¹ · C_alt) · P_alt
    // nur mit sicher kalibriertem Sensor und bei plausibler Drehung (< 60°), sonst Modell einfach stehen lassen
    const s = this.sensor && this.sensor.lesen();
    if (s && this.variante && this.verloren < this.maxLuecke) {
      const R = this._anwenden(this.variante, s.clone().invert().multiply(this.kameraBeiLetzterSicht));
      if (2 * Math.acos(Math.min(1, Math.abs(R.w))) < THREE.MathUtils.degToRad(60)) {
        this.pos.copy(this.poseBeiLetzterSicht.p).applyQuaternion(R);
        this.rot.copy(R).multiply(this.poseBeiLetzterSicht.q);
      }
    }
  }

  // sichtbar? – mit Sensor länger, ohne kurz; im Hintergrund-Modus bleibt das Modell stehen
  sichtbar(festhalten) {
    if (!this.gueltig) return false;
    if (festhalten) return true;
    const grenze = this.variante ? this.maxLuecke : 0.3;
    return this.verloren < grenze;
  }
}
