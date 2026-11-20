import * as THREE from 'three';
import type { PlanetDef } from '../data/planets';
import { fbm } from '../core/rng';

/** Vertex-colored low-poly planet sphere with a per-planet surface feature. */
export function buildPlanetMesh(p: PlanetDef, detail = 4): THREE.Group {
  const g = new THREE.Group();
  const geo = new THREE.IcosahedronGeometry(p.size, detail);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const col = new Float32Array(pos.count * 3);
  const [c0, c1, c2] = p.colors.map((c) => new THREE.Color(c));
  const tmp = new THREE.Color();
  const seed = p.index * 31;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) / p.size, y = pos.getY(i) / p.size, z = pos.getZ(i) / p.size;
    const n = fbm(x * 2.2 + 5, z * 2.2 + y * 1.7, seed, 4);
    let k = 0, accent = 0;
    switch (p.feature) {
      case 'cracks': accent = Math.abs(n - 0.5) < 0.035 ? 1 : 0; break;
      case 'garden': k = n > 0.52 ? 1 : 0; accent = Math.abs(y) > 0.85 || fbm(x * 4, z * 4 + y * 3, seed + 5, 3) > 0.68 ? 1 : 0; break;
      case 'canyons': k = n > 0.5 ? 1 : 0; accent = Math.abs(y) > 0.8 ? 1 : 0; break;
      case 'bands': k = (Math.sin(y * 14 + n * 3) + 1) / 2; break;
      case 'storm': k = (Math.sin(y * 10 + n * 2) + 1) / 2; accent = Math.hypot(x - 0.55, y + 0.25, z - 0.6) < 0.32 ? 1 : 0; break;
      case 'clouds': k = (Math.sin(y * 8 + n * 6) + 1) / 2; break;
      case 'dust': k = n; accent = fbm(x * 3 + 9, y * 3, seed + 2, 2) > 0.62 ? 1 : 0; break;
      case 'ice': k = n; accent = Math.abs(fbm(x * 3, y * 3 + z, seed + 9, 3) - 0.5) < 0.03 ? 1 : 0; break;
      case 'basin': k = n; accent = Math.hypot(x - 0.6, y - 0.3, z - 0.7) < 0.5 ? 1 : 0; break;
      case 'craters': k = n; accent = fbm(x * 6, y * 6 + z * 2, seed + 3, 2) > 0.7 ? 1 : 0; break;
      default: k = n;
    }
    tmp.copy(c0).lerp(c1, k);
    if (accent) tmp.copy(p.feature === 'basin' || p.feature === 'craters' ? c1.clone().multiplyScalar(0.7) : c2);
    col.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: p.feature === 'glossy' ? 0.25 : 0.9,
    metalness: p.feature === 'glossy' ? 0.4 : 0,
    flatShading: true,
    emissive: p.feature === 'cracks' ? 0x401000 : 0x000000,
  });
  const mesh = new THREE.Mesh(geo, m);
  mesh.rotation.z = p.tilt ?? 0;
  mesh.name = 'surface';
  g.add(mesh);
  if (p.rings) {
    const rg = new THREE.RingGeometry(p.rings.inner, p.rings.outer, 64, 3);
    const rc = new Float32Array(rg.attributes.position.count * 3);
    const base = new THREE.Color(p.rings.color);
    for (let i = 0; i < rg.attributes.position.count; i++) {
      const r = Math.hypot(rg.attributes.position.getX(i), rg.attributes.position.getY(i));
      const t = (r - p.rings.inner) / (p.rings.outer - p.rings.inner);
      const v = 0.6 + 0.4 * Math.sin(t * 22);
      rc.set([base.r * v, base.g * v, base.b * v], i * 3);
    }
    rg.setAttribute('color', new THREE.BufferAttribute(rc, 3));
    const ring = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: 0.7, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2 + p.rings.tilt;
    ring.name = 'rings';
    g.add(ring);
  }
  return g;
}
