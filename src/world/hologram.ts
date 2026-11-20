import * as THREE from 'three';
import { PLANETS } from '../data/planets';

/** Small holographic model of the system for the map table. */
export function buildHologram(): THREE.Group {
  const g = new THREE.Group();
  const holo = (c: number, o = 0.8) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false });
  const sun = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 2), holo(0xffb060, 1));
  g.add(sun);
  const scale = 1.2 / 410;
  const ringMat = holo(0x4fa8e8, 0.35);
  for (const p of PLANETS) {
    const r = p.orbit * scale + 0.12;
    const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.004, r + 0.004, 48), ringMat);
    ring.rotation.x = -Math.PI / 2;
    g.add(ring);
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.02 + p.size * 0.006, 1), holo(p.landing.viable ? 0x7be38a : 0x9fd0ff, 0.9));
    m.position.set(Math.cos(p.phase) * r, 0, Math.sin(p.phase) * r);
    g.add(m);
  }
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.45, 0.6, 32, 1, true), holo(0x2a6aa8, 0.08));
  cone.position.y = -0.3;
  g.add(cone);
  return g;
}
