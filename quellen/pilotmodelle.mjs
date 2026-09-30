// Erzeugt die Pilotmodelle als .glb
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import fs from 'fs';

// Node-Polyfill für GLTFExporter
globalThis.FileReader = class {
  readAsArrayBuffer(b) { b.arrayBuffer().then(r => { this.result = r; this.onloadend && this.onloadend(); }); }
  readAsDataURL(b) { b.arrayBuffer().then(r => { this.result = 'data:' + (b.type||'application/octet-stream') + ';base64,' + Buffer.from(r).toString('base64'); this.onloadend && this.onloadend(); }); }
};

const OUT = process.argv[2];
const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.2, roughness: 0.6, ...o });

function gearShape(teeth, rRoot, rTip) {
  const s = new THREE.Shape();
  const n = teeth * 4;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = i % 4;
    const r = (k === 1 || k === 2) ? rTip : rRoot;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    i === 0 ? s.moveTo(x, y) : s.lineTo(x, y);
  }
  const hole = new THREE.Path();
  hole.absarc(0, 0, rRoot * 0.2, 0, Math.PI * 2, true);
  s.holes.push(hole);
  return s;
}

function gear(teeth, module, color) {
  const rPitch = teeth * module / 2;
  const g = new THREE.ExtrudeGeometry(gearShape(teeth, rPitch - module, rPitch + module), { depth: 0.12, bevelEnabled: false });
  g.translate(0, 0, -0.06);
  g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, mat(color, { metalness: 0.5, roughness: 0.4 }));
  m.userData.rPitch = rPitch;
  return m;
}

function zahnrad() {
  const root = new THREE.Group(); root.name = 'Zahnradgetriebe';
  const mod = 0.035;
  const g1 = gear(20, mod, 0x3b82f6); g1.name = 'Antriebsrad (20 Zähne)';
  const g2 = gear(10, mod, 0xf59e0b); g2.name = 'Abtriebsrad (10 Zähne)';
  const d = g1.userData.rPitch + g2.userData.rPitch;
  g1.position.x = -d / 2 + 0.1; g2.position.x = d / 2 + 0.1;
  g2.rotation.y = Math.PI / 10; // Zähne ineinander
  const axleMat = mat(0x9ca3af, { metalness: 0.8 });
  for (const g of [g1, g2]) {
    const ax = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 16), axleMat);
    ax.position.set(g.position.x, 0, 0); ax.name = 'Welle';
    root.add(ax);
  }
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 0.5), mat(0x6b7280));
  base.position.y = -0.25; base.name = 'Grundplatte';
  root.add(g1, g2, base);
  return root;
}

function magnet() {
  const root = new THREE.Group(); root.name = 'Stabmagnet';
  const n = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.12), mat(0xdc2626)); n.position.x = 0.15; n.name = 'Nordpol';
  const s = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.12), mat(0x16a34a)); s.position.x = -0.15; s.name = 'Suedpol';
  root.add(n, s);
  // Dipol-Feldlinien: r = k·sin²(θ), θ gemessen von der Magnetachse (x)
  const lineMat = mat(0x60a5fa, { metalness: 0, roughness: 0.8 });
  const ks = [0.35, 0.5, 0.7];
  const planes = 6;
  for (let p = 0; p < planes; p++) {
    const phi = (p / planes) * Math.PI * 2;
    for (const k of ks) {
      const pts = [];
      for (let i = 0; i <= 60; i++) {
        const th = 0.35 + (Math.PI - 0.7) * (i / 60);
        const r = k * Math.sin(th) ** 2 / Math.sin(0.35) ** 2 * 0.2;
        const x = r * Math.cos(th), rho = r * Math.sin(th);
        pts.push(new THREE.Vector3(x, rho * Math.cos(phi), rho * Math.sin(phi)));
      }
      const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.006, 6), lineMat);
      tube.name = 'Feldlinie';
      root.add(tube);
    }
  }
  return root;
}

function ikosaeder() {
  const root = new THREE.Group(); root.name = 'Ikosaeder';
  const g = new THREE.IcosahedronGeometry(0.45, 0);
  const m = new THREE.Mesh(g, mat(0x8b5cf6, { flatShading: true, transparent: true, opacity: 0.85 }));
  m.name = 'Flaechen';
  root.add(m);
  // Kanten als dünne Zylinder
  const edges = new THREE.EdgesGeometry(g);
  const pos = edges.attributes.position;
  const eMat = mat(0x1f2937);
  for (let i = 0; i < pos.count; i += 2) {
    const a = new THREE.Vector3().fromBufferAttribute(pos, i);
    const b = new THREE.Vector3().fromBufferAttribute(pos, i + 1);
    const len = a.distanceTo(b);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, len, 6), eMat);
    c.position.copy(a).add(b).multiplyScalar(0.5);
    c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    c.name = 'Kante';
    root.add(c);
  }
  return root;
}

const exporter = new GLTFExporter();
for (const [name, fn] of [['zahnrad', zahnrad], ['magnet', magnet], ['ikosaeder', ikosaeder]]) {
  const scene = new THREE.Scene(); scene.add(fn());
  const glb = await exporter.parseAsync(scene, { binary: true });
  fs.writeFileSync(`${OUT}/${name}.glb`, Buffer.from(glb));
  console.log(name, fs.statSync(`${OUT}/${name}.glb`).size, 'Bytes');
}
