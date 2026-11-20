import * as THREE from 'three';
import type { PhysicsWorld } from './physics';
import { SNOW } from '../data/tuning';

/**
 * Camera-following snowfall. Flakes under a roof are hidden: each 1 m cell around the player is probed once with an
 * upward ray from the walkable floor, and any flake below the first overhead surface in its cell is not drawn.
 */
export class Snow {
  readonly points: THREE.Points;
  private sim: Float32Array;
  private shown: Float32Array;
  private roofs = new Map<number, number>();
  private origin = new THREE.Vector3();

  /**
   * @param overhead visual-only slabs (roofs without colliders) that also keep snow out, as centre, half extents,
   * yaw and underside height.
   */
  constructor(
    private physics: PhysicsWorld,
    private floorAt: (x: number, z: number) => number,
    private overhead: { x: number; z: number; hw: number; hd: number; rotY: number; y: number }[] = [],
  ) {
    const n = SNOW.count;
    this.sim = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) this.sim.set([(Math.random() - 0.5) * SNOW.box, Math.random() * SNOW.height, (Math.random() - 0.5) * SNOW.box], i * 3);
    this.shown = new Float32Array(n * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.shown, 3));
    this.points = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xe8f0ff, size: SNOW.size, transparent: true, opacity: 0.75, depthWrite: false }));
    this.points.frustumCulled = false;
  }

  /** Height of the first surface above the floor in this cell, or -Infinity in the open. */
  roofAt(x: number, z: number): number {
    const cx = Math.floor(x), cz = Math.floor(z);
    const key = (cx + 4096) * 8192 + (cz + 4096);
    let r = this.roofs.get(key);
    if (r === undefined) {
      const fx = cx + 0.5, fz = cz + 0.5;
      const y0 = this.floorAt(fx, fz) + SNOW.probeLift;
      const hit = this.physics.ray({ x: fx, y: y0, z: fz }, { x: 0, y: 1, z: 0 }, SNOW.height);
      r = hit ? hit.point.y : Infinity;
      for (const o of this.overhead) {
        if (o.y < y0 || o.y >= r) continue;
        const c = Math.cos(o.rotY), s = Math.sin(o.rotY);
        const dx = fx - o.x, dz = fz - o.z;
        const lx = dx * c - dz * s, lz = dx * s + dz * c;
        if (Math.abs(lx) <= o.hw && Math.abs(lz) <= o.hd) r = o.y;
      }
      if (r === Infinity) r = -Infinity;
      this.roofs.set(key, r);
    }
    return r;
  }

  update(dt: number, centre: THREE.Vector3): void {
    this.origin.set(centre.x, centre.y - SNOW.below, centre.z);
    const s = this.sim, out = this.shown, half = SNOW.box / 2;
    for (let i = 0; i < s.length; i += 3) {
      let y = s[i + 1] - dt * SNOW.fall;
      if (y < 0) y += SNOW.height;
      let x = s[i] + dt * SNOW.drift;
      if (x > half) x -= SNOW.box;
      s[i] = x;
      s[i + 1] = y;
      const wx = this.origin.x + x, wy = this.origin.y + y, wz = this.origin.z + s[i + 2];
      const hidden = wy < this.roofAt(wx, wz);
      out[i] = wx;
      out[i + 1] = hidden ? -9999 : wy;
      out[i + 2] = wz;
    }
    (this.points.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }
}
