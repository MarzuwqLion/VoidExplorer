import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mat } from '../materials';

/** Smooth-shaded character material; per-part roughness is lost when parts merge, so only colour matters. */
export function smooth(color: number): THREE.MeshStandardMaterial {
  return mat(color, { rough: 0.75, metal: 0.05, flat: false });
}

/** A shadow-casting mesh placed and rotated in its parent group. */
export function part(geo: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** A thin cylinder from a to b. */
export function rod(a: THREE.Vector3, b: THREE.Vector3, r: number, m: THREE.Material): THREE.Mesh {
  const d = new THREE.Vector3().subVectors(b, a);
  const mesh = part(new THREE.CylinderGeometry(r, r, d.length(), 6), m);
  mesh.position.copy(a).addScaledVector(d, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return mesh;
}

/** Box with rounded edges; falls back to a plain box when too thin to round. */
export function rbox(w: number, h: number, d: number, r = 0.02): THREE.BufferGeometry {
  const lim = Math.min(w, h, d) / 2 - 0.0005;
  return lim < 0.003 ? new THREE.BoxGeometry(w, h, d) : new RoundedBoxGeometry(w, h, d, 2, Math.min(r, lim));
}

/** Ellipsoid. */
export function ell(r: number, sx = 1, sy = 1, sz = 1, ws = 16, hs = 12): THREE.BufferGeometry {
  return new THREE.SphereGeometry(r, ws, hs).scale(sx, sy, sz);
}

/** Tapered cylinder (top radius, bottom radius). */
export function tube(rt: number, rb: number, h: number, seg = 12): THREE.BufferGeometry {
  return new THREE.CylinderGeometry(rt, rb, h, seg);
}

/** Spherical cap from the top down to the given polar angle. */
export function dome(r: number, theta: number, sx = 1, sy = 1, sz = 1): THREE.BufferGeometry {
  return new THREE.SphereGeometry(r, 20, 10, 0, Math.PI * 2, 0, theta).scale(sx, sy, sz);
}

/** Spherical band between two polar angles. */
export function band(r: number, from: number, to: number, sx = 1, sy = 1, sz = 1): THREE.BufferGeometry {
  return new THREE.SphereGeometry(r, 16, 8, 0, Math.PI * 2, from, to - from).scale(sx, sy, sz);
}

/** Scale x (and half as much z) linearly from bottom to top, for torsos that narrow to the waist. */
export function taper(geo: THREE.BufferGeometry, bottom: number, top: number): THREE.BufferGeometry {
  geo.computeBoundingBox();
  const b = geo.boundingBox!;
  const p = geo.attributes.position as THREE.BufferAttribute;
  const h = b.max.y - b.min.y || 1;
  for (let i = 0; i < p.count; i++) {
    const k = bottom + (top - bottom) * ((p.getY(i) - b.min.y) / h);
    p.setX(i, p.getX(i) * k);
    p.setZ(i, p.getZ(i) * (1 + (k - 1) * 0.5));
  }
  p.needsUpdate = true;
  return geo;
}

/** Colour scaled toward black (k < 1) or white (k > 1). */
export function shade(hex: number, k: number): number {
  const c = new THREE.Color(hex);
  return k <= 1 ? c.multiplyScalar(k).getHex() : c.lerp(new THREE.Color(0xffffff), k - 1).getHex();
}

/** Linear blend of two colours. */
export function mix(a: number, b: number, t: number): number {
  return new THREE.Color(a).lerp(new THREE.Color(b), t).getHex();
}
