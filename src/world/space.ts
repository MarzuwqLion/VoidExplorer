import * as THREE from 'three';
import { Rng } from '../core/rng';

/** Point starfield on a sphere shell. */
export function makeStarfield(count: number, radius: number, seed = 7): THREE.Points {
  const r = new Rng(seed);
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = r.next() * 2 - 1, t = r.next() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const rr = radius * (0.8 + r.next() * 0.2);
    pos.set([s * Math.cos(t) * rr, u * rr, s * Math.sin(t) * rr], i * 3);
    const warm = r.next();
    const b = 0.5 + r.next() * 0.5;
    col.set([b, b * (0.85 + warm * 0.15), b * (1 - warm * 0.25)], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, fog: false, depthWrite: false });
  const p = new THREE.Points(g, m);
  p.frustumCulled = false;
  return p;
}

/** Radial glow texture generated on a canvas. */
export function glowTexture(inner: string, outer: string, size = 128): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, inner);
  grd.addColorStop(0.25, inner);
  grd.addColorStop(1, outer);
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** An emissive star with a corona sprite. */
export function makeStar(radius: number, color = 0xffa040): THREE.Group {
  const grp = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(radius, 4),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(1.6) }),
  );
  grp.add(core);
  const tex = glowTexture('rgba(255,200,120,0.9)', 'rgba(255,120,30,0)');
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  sp.scale.setScalar(radius * 5.5);
  grp.add(sp);
  return grp;
}
