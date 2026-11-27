// Computer-Generator: (1) geöffneter PC (Tower, Seitenwand ab), Maße in cm (ATX-Mainboard 30,5 × 24,4 cm); jedes Bauteil
// einzeln hervorhebbar. (2) EVA-Prinzip: Eingabe – Verarbeitung – Ausgabe mit Speicher; ein Tastendruck „A“ wandert als
// Bitfolge 01000001 (ASCII 65) über den Bus zur CPU, in den Arbeitsspeicher, auf die SSD und als Bild auf den Monitor.
import * as THREE from 'three';
import { textSprite, entsorge as entsorgeObj, stil } from './hilfen.js';

export const ANSICHTEN = { pc: 'Geöffneter PC', eva: 'EVA-Prinzip: Eingabe – Verarbeitung – Ausgabe' };
export const TEILE = {
  board: ['Hauptplatine (Mainboard)', 'Die große Leiterplatte verbindet alle Bauteile. Ihre feinen Leiterbahnen bilden den Bus, über den Daten, Adressen und Steuersignale fließen.'],
  cpu: ['Prozessor (CPU)', 'Das „Gehirn“ des Computers: Er führt die Befehle der Programme aus. Das Steuerwerk holt und entschlüsselt Befehle, das Rechenwerk rechnet und vergleicht. Heutige CPUs haben mehrere Kerne und arbeiten mit einigen Milliarden Takten pro Sekunde (GHz). Dabei werden sie heiß und brauchen einen Kühler.'],
  ram: ['Arbeitsspeicher (RAM)', 'Hier liegen die Programme und Daten, mit denen gerade gearbeitet wird. Der RAM ist sehr schnell, aber flüchtig: Beim Ausschalten ist sein Inhalt verloren. Typische Größe: 8 bis 32 GB.'],
  ssd: ['Massenspeicher (SSD)', 'Speichert Dateien und Programme dauerhaft, auch ohne Strom. Er ist viel größer (z. B. 1 TB), aber langsamer als der Arbeitsspeicher. Eine SSD speichert in Flash-Chips, eine Festplatte (HDD) auf drehenden Magnetscheiben.'],
  gpu: ['Grafikkarte (GPU)', 'Berechnet die Bilder für den Bildschirm. Sie hat einen eigenen, auf viele gleichartige Rechnungen spezialisierten Prozessor und eigenen Speicher – wichtig für Spiele, Videos und KI.'],
  netzteil: ['Netzteil', 'Wandelt die 230-V-Wechselspannung aus der Steckdose in die Gleichspannungen 12 V, 5 V und 3,3 V um, die die Bauteile brauchen.'],
  kuehlung: ['Kühler und Lüfter', 'Prozessor und Grafikkarte wandeln viel elektrische Energie in Wärme um. Kühlkörper aus Metall nehmen sie auf, Lüfter blasen die warme Luft aus dem Gehäuse.'],
  anschluesse: ['Anschlüsse (Schnittstellen)', 'Über USB, HDMI, Netzwerk (LAN) und Audio werden Eingabe- und Ausgabegeräte wie Tastatur, Maus, Monitor und Lautsprecher angeschlossen.'],
};
export const standard = () => ({ ansicht: 'pc', fokus: 'alle', bewegung: false, beschriftung: false });
const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);

function leiterTex() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 410; const g = c.getContext('2d');
  g.fillStyle = '#1f5f3a'; g.fillRect(0, 0, 512, 410);
  g.strokeStyle = 'rgba(214,180,90,0.55)'; g.lineWidth = 1.5;
  let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 260; i++) { let x = r() * 512, y = r() * 410; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { if (r() < 0.5) x += (r() - 0.5) * 160; else y += (r() - 0.5) * 160; g.lineTo(x, y); } g.stroke(); }
  for (let i = 0; i < 300; i++) { g.fillStyle = '#c9b06a'; g.beginPath(); g.arc(r() * 512, r() * 410, 1.6, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function pcAnsicht(wurzel, st, schild, bewegt) {
  const gr = {}; for (const k of Object.keys(TEILE)) { gr[k] = new THREE.Group(); wurzel.add(gr[k]); }
  const m = (farbe, o = {}) => new THREE.MeshStandardMaterial({ color: farbe, roughness: 0.5, metalness: 0.2, ...o });
  const kasten = (x0, x1, y0, y1, z0, z1, mm, g) => { const b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mm); b.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); g.add(b); return b; };
  // Gehäuse (Tower, linke Seitenwand entfernt): Rückwand, Boden, Deckel, Front, Rückseite
  const geh = new THREE.Group(); wurzel.add(geh); const gM = m(0x2b2f36, { metalness: 0.5 });
  kasten(-24, 24, -24, 24, -10.5, -10, gM, geh); kasten(-24, 24, -24.5, -24, -10.5, 10, gM, geh); kasten(-24, 24, 24, 24.5, -10.5, 10, gM, geh);
  kasten(-24.5, -24, -24, 24, -10.5, 10, m(0x3a3f48), geh);
  // Mainboard (ATX) an der Rückwand
  const board = new THREE.Mesh(new THREE.BoxGeometry(30.5, 24.4, 0.16), new THREE.MeshStandardMaterial({ map: leiterTex(), roughness: 0.6 })); board.position.set(-4, 6, -9.4); gr.board.add(board);
  const B = (x, y) => V(-4 - 15.25 + x, 6 + 12.2 - y, -9.3);           // Koordinaten auf dem Board (von oben links, in cm)
  // CPU-Sockel, CPU, Kühler mit Lüfter
  { const p = B(11, 7); kasten(p.x - 2.5, p.x + 2.5, p.y - 2.5, p.y + 2.5, p.z, p.z + 0.4, m(0x9ca3af), gr.cpu); kasten(p.x - 1.9, p.x + 1.9, p.y - 1.9, p.y + 1.9, p.z + 0.4, p.z + 0.7, m(0xd1d5db, { metalness: 0.8 }), gr.cpu);
    const t = textSprite('CPU', '#111827', 0.8, 'rgba(0,0,0,0)'); t.position.set(p.x, p.y, p.z + 0.9); gr.cpu.add(t);
    if (st.fokus !== 'cpu') { const k = new THREE.Group(); k.position.set(p.x, p.y, p.z + 0.7); gr.kuehlung.add(k);
      for (let i = 0; i < 14; i++) kasten(-4.5, 4.5, -4.5 + i * 0.68, -4.5 + i * 0.68 + 0.12, 0, 4, m(0xc0c6cc, { metalness: 0.8 }), k);
      const fan = new THREE.Group(); fan.position.z = 4.4; k.add(fan); kasten(-4.8, 4.8, -4.8, 4.8, -0.3, 0.3, m(0x111827), fan);
      const rotor = new THREE.Group(); rotor.position.z = 0.4; fan.add(rotor); for (let i = 0; i < 7; i++) { const f = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.1, 0.12), m(0x374151)); f.position.x = 2; f.rotation.x = 0.4; const h = new THREE.Group(); h.rotation.z = i / 7 * Math.PI * 2; h.add(f); rotor.add(h); }
      bewegt.push(t2 => { rotor.rotation.z = t2 * 12; }); } }
  // RAM: vier Steckplätze, zwei Module
  for (let i = 0; i < 4; i++) { const p = B(19 + i * 1.2, 12); kasten(p.x - 0.25, p.x + 0.25, p.y - 6.7, p.y + 6.7, p.z, p.z + 0.8, m(i % 2 ? 0x111827 : 0x334155), gr.ram);
    if (i % 2 === 0) { kasten(p.x - 0.08, p.x + 0.08, p.y - 6.65, p.y + 6.65, p.z + 0.8, p.z + 3.8, m(0x14532d), gr.ram); for (let c = 0; c < 8; c++) kasten(p.x + 0.08, p.x + 0.2, p.y - 6 + c * 1.6, p.y - 4.9 + c * 1.6, p.z + 1.6, p.z + 2.8, m(0x111827), gr.ram); } }
  // Chipsatz mit Kühlkörper, M.2-SSD, PCIe-Steckplätze, Grafikkarte
  { const p = B(22, 19); kasten(p.x - 2, p.x + 2, p.y - 2, p.y + 2, p.z, p.z + 1, m(0x6b7280, { metalness: 0.7 }), gr.board); }
  { const p = B(10, 15.5); kasten(p.x - 4, p.x + 4, p.y - 1.1, p.y + 1.1, p.z, p.z + 0.3, m(0x1e3a8a), gr.ssd); for (let c = 0; c < 3; c++) kasten(p.x - 3.5 + c * 2.4, p.x - 1.7 + c * 2.4, p.y - 0.8, p.y + 0.8, p.z + 0.3, p.z + 0.5, m(0x111827), gr.ssd); }
  for (const y of [13, 20.5]) { const p = B(13, y); kasten(p.x - 4.5, p.x + 4.5, p.y - 0.4, p.y + 0.4, p.z, p.z + 1, m(0x111827), gr.board); }
  { const p = B(13, 13); kasten(p.x - 9, p.x + 18, p.y - 0.3, p.y + 0.3, p.z + 1, p.z + 12, m(0x1f2937), gr.gpu); kasten(p.x - 9, p.x + 18, p.y - 2.2, p.y - 0.3, p.z + 1, p.z + 12, m(0x374151), gr.gpu);
    for (const dx of [-2.5, 9.5]) { const f = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 0.3, 24), m(0x111827)); f.position.set(p.x + dx, p.y - 2.4, p.z + 6.5); gr.gpu.add(f); }
    const t = textSprite('GPU', '#e5e7eb', 0.8, 'rgba(0,0,0,0)'); t.position.set(p.x + 4, p.y - 1.2, p.z + 12.3); gr.gpu.add(t); }
  // Anschlüsse am I/O-Feld (hinten links)
  { const p = B(0.5, 4); kasten(p.x - 0.5, p.x + 0.5, p.y - 4, p.y + 4, p.z, p.z + 3, m(0x9ca3af, { metalness: 0.7 }), gr.anschluesse); for (let i = 0; i < 6; i++) kasten(p.x - 0.6, p.x - 0.5, p.y - 3.4 + i * 1.2, p.y - 2.8 + i * 1.2, p.z + 0.5, p.z + 2.3, m(i < 4 ? 0x2563eb : 0x111827), gr.anschluesse); }
  // Netzteil unten, 2,5"-SSD vorne, Gehäuselüfter, Kabel
  kasten(-24, -9, -24, -15.4, -10, 4, m(0x1f2937), gr.netzteil); { const t = textSprite('230 V → 12 V / 5 V / 3,3 V', '#e5e7eb', 1.2, 'rgba(0,0,0,0)'); t.position.set(-16.5, -19.7, 4.3); gr.netzteil.add(t); }
  kasten(14, 23, -22, -21, -6, 4, m(0x6b7280, { metalness: 0.6 }), gr.ssd);
  for (const [x, y] of [[-23.4, 14]]) { const f = new THREE.Group(); f.position.set(x, y, -3); f.rotation.y = Math.PI / 2; gr.kuehlung.add(f); kasten(-6, 6, -6, 6, -0.4, 0.4, m(0x111827), f); const r = new THREE.Group(); r.position.z = 0.5; f.add(r); for (let i = 0; i < 7; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.4, 0.12), m(0x374151)); b.position.x = 2.5; b.rotation.x = 0.4; const h = new THREE.Group(); h.rotation.z = i / 7 * Math.PI * 2; h.add(b); r.add(h); } bewegt.push(t2 => { r.rotation.z = t2 * 9; }); }
  { const pts = [V(-12, -15.4, 2), V(-8, -8, 4), V(10.5, 2, 3), B(29.5, 14).setZ(-8.6)]; gr.netzteil.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.8, 8), m(0x111827))); }
  // Hervorheben
  if (st.fokus !== 'alle') for (const [k, g] of Object.entries(gr)) if (k !== st.fokus) g.traverse(o => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.12; o.material.depthWrite = false; } });
  schild('Hauptplatine (Mainboard)', B(3, 22), V(-30, 26, 0), 'board');
  schild('Prozessor (CPU)\nunter dem Kühler', B(11, 7).setZ(-4), V(-14, 32, 2), 'cpu');
  schild('Arbeitsspeicher (RAM)', B(20, 8).setZ(-7), V(14, 32, 2), 'ram');
  schild('Grafikkarte', B(25, 12).setZ(0), V(30, 12, 6), 'gpu');
  schild('SSD (Massenspeicher)', B(10, 15.5).setZ(-8.5), V(30, 3, 6), 'ssd');
  schild('Netzteil', V(-16, -16, 4), V(-32, -20, 6), 'netzteil');
  schild('Lüfter', V(-23.4, 14, 3), V(-34, 16, 4), 'kuehlung');
  schild('Anschlüsse (USB, HDMI, LAN)', B(0.5, 1).setZ(-7), V(-34, 6, 4), 'anschluesse');
  return 40;
}

function evaAnsicht(wurzel, st, schild, bewegt) {
  const m = (farbe, o = {}) => new THREE.MeshStandardMaterial({ color: farbe, roughness: 0.5, metalness: 0.15, ...o });
  const kasten = (w, h, d, farbe, p, g = wurzel) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m(farbe)); b.position.copy(p); g.add(b); return b; };
  const block = (txt, farbe, p, w, h) => { const b = kasten(w, h, 1, farbe, p); b.material.transparent = true; b.material.opacity = 0.25; const t = textSprite(txt, '#111827', 1.3); t.position.copy(p).add(V(0, h / 2 + 1.2, 0)); wurzel.add(t); return b; };
  block('Eingabe', 0x60a5fa, V(-24, 0, -1.5), 14, 16); block('Verarbeitung', 0xf59e0b, V(0, 2, -1.5), 18, 12); block('Ausgabe', 0x34d399, V(24, 0, -1.5), 14, 16); block('Speicher', 0xa78bfa, V(0, -10, -1.5), 18, 7);
  // Eingabegeräte: Tastatur, Maus
  const tast = kasten(10, 0.8, 4, 0x374151, V(-24, -3, 1)); tast.rotation.x = 0.6;
  const tasten = []; for (let r = 0; r < 3; r++) for (let c = 0; c < 9; c++) { const k = kasten(0.85, 0.3, 0.85, 0xe5e7eb, V(-28 + c * 1.0, -2.6 + r * 0.55, 1.6 - r * 0.85)); k.rotation.x = 0.6; tasten.push(k); }
  const tA = tasten[1]; const lbl = textSprite('A', '#111827', 0.5, 'rgba(0,0,0,0)'); lbl.position.copy(tA.position).add(V(0, 0.3, 0.1)); wurzel.add(lbl);
  { const maus = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), m(0x374151)); maus.scale.set(0.9, 0.5, 1.4); maus.position.set(-24, 4, 1); wurzel.add(maus); }
  // CPU mit Steuerwerk und Rechenwerk, RAM, SSD
  kasten(7, 7, 1, 0x9ca3af, V(-3.5, 2, 0)); { const t = textSprite('CPU\nSteuerwerk · Rechenwerk', '#111827', 0.75); t.position.set(-3.5, 2, 0.8); wurzel.add(t); }
  kasten(6.5, 2, 0.4, 0x14532d, V(5, 3.5, 0)); { const t = textSprite('RAM', '#fff', 0.7, 'rgba(0,0,0,0)'); t.position.set(5, 3.5, 0.5); wurzel.add(t); }
  kasten(6.5, 3, 0.6, 0x1e3a8a, V(0, -10, 0)); { const t = textSprite('SSD', '#fff', 0.8, 'rgba(0,0,0,0)'); t.position.set(0, -10, 0.5); wurzel.add(t); }
  // Ausgabegeräte: Monitor, Lautsprecher
  kasten(11, 7, 0.5, 0x111827, V(24, 2, 0)); kasten(1, 2.5, 1, 0x374151, V(24, -2.6, 0)); const bild = kasten(10.2, 6.2, 0.1, 0xf8fafc, V(24, 2, 0.3));
  const buchst = textSprite('A', '#111827', 3, 'rgba(0,0,0,0)'); buchst.position.set(24, 2, 0.5); wurzel.add(buchst);
  kasten(1.8, 3.5, 1.8, 0x374151, V(31, -4, 0)); void bild;
  // Bus: Leitungen zwischen den Blöcken
  const busM = new THREE.MeshBasicMaterial({ color: 0x64748b });
  const leitung = (a, b) => { const d = b.clone().sub(a), c = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, d.length(), 8), busM); c.position.copy(a).addScaledVector(d, 0.5); c.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); wurzel.add(c); };
  const wege = { ein: [V(-24, -1.5, 1.5), V(-17, 0, 1), V(-7, 1, 1)], ram: [V(0, 3, 1), V(5, 3.5, 1)], ssd: [V(-2, -1.5, 1), V(0, -8.5, 1)], aus: [V(0.5, 2, 1), V(17, 2, 1), V(24, 2, 1)] };
  for (const w of Object.values(wege)) for (let i = 0; i < w.length - 1; i++) leitung(w[i], w[i + 1]);
  { const t = textSprite('Bus (Leitungen auf der Hauptplatine)', '#475569', 0.7); t.position.set(-12, -1.5, 2); wurzel.add(t); }
  // Datenpaket mit Bitfolge
  const paket = textSprite('01000001', '#fff', 0.9, 'rgba(37,99,235,0.95)'); wurzel.add(paket);
  const phase = new THREE.Sprite(new THREE.SpriteMaterial({ depthTest: false, transparent: true })); phase.renderOrder = 12; phase.position.set(0, -16, 0); phase.visible = st.beschriftung; wurzel.add(phase);
  const SCHRITTE = [
    ['1. Eingabe: Die Taste „A“ wird gedrückt. Die Tastatur sendet den Code 01000001 (Zahl 65).', 'ein'],
    ['2. Verarbeitung: Die CPU legt das Zeichen im Arbeitsspeicher (RAM) ab und verarbeitet es.', 'ram'],
    ['3. Speichern: Beim Speichern wird der Text dauerhaft auf die SSD geschrieben.', 'ssd'],
    ['4. Ausgabe: Die Grafikeinheit erzeugt das Bild – der Monitor zeigt „A“.', 'aus'],
  ];
  let letzter = -1;
  const pfad = w => new THREE.CatmullRomCurve3(w.length > 2 ? w : [w[0], w[0].clone().lerp(w[1], 0.5), w[1]]);
  const kurven = Object.fromEntries(Object.entries(wege).map(([k, w]) => [k, pfad(w)]));
  bewegt.push(t => {
    const T = t % 16, s = Math.min(3, Math.floor(T / 4)), u = Math.min(1, (T % 4) / 2.5);
    paket.position.copy(kurven[SCHRITTE[s][1]].getPointAt(u)).add(V(0, 1.2, 0.5));
    tA.position.y = -2.6 + (s === 0 && u < 0.2 ? -0.2 : 0);
    buchst.visible = s === 3 && u > 0.95;
    if (s !== letzter) { letzter = s; const tx = textSprite(SCHRITTE[s][0], '#111827', 0.9); if (phase.material.map) phase.material.map.dispose(); phase.material.map = tx.material.map; phase.scale.copy(tx.scale); phase.material.needsUpdate = true; }
  });
  schild('Tastatur', V(-24, -3, 2), V(-30, -10, 2), null); schild('Maus', V(-24, 4, 2), V(-31, 7, 2), null); schild('Monitor', V(28, 5, 0.5), V(32, 10, 2), null); schild('Lautsprecher', V(31, -4, 1), V(33, -10, 2), null);
  return 36;
}

export function erzeuge(st) {
  const wurzel = new THREE.Group(), etik = new THREE.Group(); wurzel.add(etik);
  const pc = st.ansicht === 'pc';
  const schild = (txt, a, z, teil) => { if (teil && st.fokus !== 'alle' && st.fokus !== teil) return; const s = textSprite(txt, '#1f2937', 2.0); s.position.copy(z); etik.add(s); const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, z]), new THREE.LineBasicMaterial({ color: 0x334155, depthTest: false })); l.renderOrder = 9; etik.add(l); };
  const bewegt = [];
  const radius = pc ? pcAnsicht(wurzel, st, schild, bewegt) : evaAnsicht(wurzel, st, schild, bewegt);
  etik.visible = st.beschriftung;
  let t = st._zeit || 0; for (const f of bewegt) f(t);
  const teil = TEILE[st.fokus];
  const info = pc
    ? (teil ? `<b>${teil[0]}</b><br><i>${teil[1]}</i>` : '<b>Ein geöffneter PC</b><br><i>Im Gehäuse steckt die Hauptplatine mit Prozessor, Arbeitsspeicher und Steckplätzen; dazu kommen Grafikkarte, Massenspeicher, Netzteil und Lüfter. Wähle oben ein Bauteil aus, um es hervorzuheben und mehr darüber zu erfahren.</i>')
    : '<b>EVA-Prinzip</b><br><i>Jeder Computer arbeitet nach dem Prinzip <b>E</b>ingabe – <b>V</b>erarbeitung – <b>A</b>usgabe. Eingabegeräte wandeln z. B. einen Tastendruck in eine Folge von Nullen und Einsen um. Der Prozessor verarbeitet die Daten; was er gerade braucht, liegt im schnellen <b>Arbeitsspeicher</b>, Dauerhaftes auf dem <b>Massenspeicher</b>. Ausgabegeräte machen das Ergebnis für uns sichtbar oder hörbar. Alle Teile sind über den <b>Bus</b> verbunden. Der Code 01000001 für „A“ stammt aus dem ASCII-Code.</i>';
  return { objekt: wurzel, radius, titel: `Computer – ${ANSICHTEN[st.ansicht]}`, info, update: dt => { if (!st.bewegung) return; t += Math.min(dt, 0.1); st._zeit = t; for (const f of bewegt) f(t); } };
}
export const entsorge = entsorgeObj;
export function ausUrl(p) { const st = standard(); if (ANSICHTEN[p.get('v')]) st.ansicht = p.get('v'); if (TEILE[p.get('o')]) st.fokus = p.get('o'); return st; }
export const zuUrl = st => `&v=${st.ansicht}&o=${st.fokus}`;
export function bedienung(ort, st, neu) {
  stil(); ort.innerHTML = '';
  const s = document.createElement('select'); for (const [k, v] of Object.entries(ANSICHTEN)) s.add(new Option(v, k)); ort.appendChild(s);
  const sO = document.createElement('select'); sO.add(new Option('Alle Bauteile', 'alle')); for (const [k, [n]] of Object.entries(TEILE)) sO.add(new Option(n, k)); ort.appendChild(sO);
  const knopf = t => { const b = document.createElement('button'); b.textContent = t; ort.appendChild(b); return b; };
  const bB = knopf('Bewegung'), bS = knopf('Beschriftung');
  const auff = () => { s.value = st.ansicht; sO.value = st.fokus; sO.hidden = st.ansicht !== 'pc'; bB.classList.toggle('on', st.bewegung); bS.classList.toggle('on', st.beschriftung); };
  s.onchange = () => { st.ansicht = s.value; st._zeit = 0; auff(); neu(); };
  sO.onchange = () => { st.fokus = sO.value; auff(); neu(); };
  bB.onclick = () => { st.bewegung = !st.bewegung; auff(); };
  bS.onclick = () => { st.beschriftung = !st.beschriftung; auff(); neu(); };
  auff();
}
