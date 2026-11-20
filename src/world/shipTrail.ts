import * as THREE from 'three';
import { glowTexture } from './space';
import { TRAIL } from '../data/systemMap';

/** Engine exhaust on the system map: glowing particles left behind each nozzle that cool and fade. */
export class ShipTrail {
  readonly points: THREE.Points;
  private pos: Float32Array;
  private col: Float32Array;
  private life: Float32Array;
  private next = 0;
  private acc = 0;
  private tmp = new THREE.Vector3();
  /** Nozzle positions at the previous update, so particles fill the path between frames. */
  private last: THREE.Vector3[] | null = null;

  constructor() {
    const n = TRAIL.count;
    this.pos = new Float32Array(n * 3).fill(-99999);
    this.col = new Float32Array(n * 3);
    this.life = new Float32Array(n);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    const map = typeof document !== 'undefined' ? glowTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)', 64) : null;
    this.points = new THREE.Points(
      g,
      new THREE.PointsMaterial({ size: TRAIL.size, map, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }),
    );
    this.points.frustumCulled = false;
  }

  /** Emit from the ship's nozzles (local offsets) at a rate scaled by throttle 0..1, then age every particle. */
  update(dt: number, ship: THREE.Object3D, throttle: number): void {
    ship.updateMatrixWorld();
    const now = TRAIL.nozzles.map((n) => new THREE.Vector3(n[0], n[1], n[2]).applyMatrix4(ship.matrixWorld));
    const prev = this.last ?? now;
    this.acc += dt * TRAIL.rate * throttle;
    const emit = Math.floor(this.acc);
    this.acc -= emit;
    for (let e = 0; e < emit; e++) {
      const f = (e + 1) / emit;
      now.forEach((p, k) => {
        const i = this.next++ % TRAIL.count;
        this.tmp.lerpVectors(prev[k], p, f);
        this.pos.set([this.tmp.x + (Math.random() - 0.5) * TRAIL.jitter, this.tmp.y, this.tmp.z + (Math.random() - 0.5) * TRAIL.jitter], i * 3);
        // Older points along the path start part-way through their life.
        this.life[i] = TRAIL.life * (0.4 + 0.6 * throttle) - (1 - f) * dt;
      });
    }
    this.last = now;
    const hot = new THREE.Color(TRAIL.hot), cold = new THREE.Color(TRAIL.cold);
    for (let i = 0; i < TRAIL.count; i++) {
      if (this.life[i] <= 0) {
        this.col.fill(0, i * 3, i * 3 + 3);
        continue;
      }
      this.life[i] -= dt;
      const k = Math.max(0, this.life[i] / TRAIL.life);
      const c = cold.clone().lerp(hot, k);
      this.col.set([c.r * k, c.g * k, c.b * k], i * 3);
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
}
