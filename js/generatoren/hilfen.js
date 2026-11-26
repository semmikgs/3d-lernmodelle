// Gemeinsame Hilfen für die Generatoren
import * as THREE from 'three';

export function zufall(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }

// Beschriftung als Sprite (immer zur Kamera gedreht, nie verdeckt)
export function textSprite(text, farbe = '#1f2937', hoehe = 0.16, hintergrund = 'rgba(255,255,255,0.88)') {
  const c = document.createElement('canvas'), g = c.getContext('2d');
  const zeilen = String(text).split('\n');
  g.font = 'bold 64px system-ui, sans-serif';
  c.width = Math.ceil(Math.max(...zeilen.map(z => g.measureText(z).width))) + 28; c.height = 84 * zeilen.length;
  g.font = 'bold 64px system-ui, sans-serif'; g.textBaseline = 'middle';
  g.fillStyle = hintergrund; g.beginPath(); g.roundRect(0, 0, c.width, c.height, 18); g.fill();
  g.fillStyle = farbe; zeilen.forEach((z, i) => g.fillText(z, 14, 44 + i * 84));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
  s.scale.set(hoehe * c.width / 84, hoehe * zeilen.length, 1); s.renderOrder = 10;
  return s;
}

// Instanzen-Helfer: Zylinder von a nach b
const _y = new THREE.Vector3(0, 1, 0), _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _d = new THREE.Vector3(), _s = new THREE.Vector3();
export function zylinderMatrix(a, b, r) {
  _d.subVectors(b, a); const l = _d.length();
  _q.setFromUnitVectors(_y, l > 1e-9 ? _d.divideScalar(l) : _y);
  return _m.compose(_s.addVectors(a, b).multiplyScalar(0.5), _q, new THREE.Vector3(r, l, r));
}

export function entsorge(o) {
  o.traverse(x => {
    if (x.geometry) x.geometry.dispose();
    if (x.material) { for (const m of [].concat(x.material)) { if (m.map) m.map.dispose(); m.dispose(); } }
  });
}

// einheitlicher Stil für Zahlen-Knöpfe (− Wert +)
let stilDa = false;
export function stil() {
  if (stilDa) return; stilDa = true;
  const s = document.createElement('style');
  s.textContent = `.gen-zahl { display: inline-flex; align-items: center; gap: 4px; } .gen-zahl span { min-width: 4.6em; text-align: center; }
  .gen-eingabe { font: inherit; padding: 6px 8px; border-radius: 8px; border: 1px solid #94a3b8; width: 11em; text-transform: uppercase; letter-spacing: 1px; }`;
  document.head.appendChild(s);
}
export function zahlKnopf(ort, titel) {
  const w = document.createElement('span'); w.className = 'gen-zahl'; w.title = titel;
  const m = document.createElement('button'), t = document.createElement('span'), p = document.createElement('button');
  m.textContent = '−'; p.textContent = '+'; w.append(m, t, p); ort.appendChild(w);
  return { m, t, p, w };
}
