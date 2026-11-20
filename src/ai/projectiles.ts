import * as THREE from 'three';
import { SPITTER, FOREMAN } from '../data/enemies';

export interface Lob {
  from: THREE.Vector3;
  to: THREE.Vector3;
  t: number;
  dur: number;
  pos: THREE.Vector3;
}
export interface Pool {
  x: number;
  y: number;
  z: number;
  r: number;
  t: number;
}
export interface Mortar {
  x: number;
  y: number;
  z: number;
  t: number;
}

/** Acid lobs, acid pools and mortar strikes. */
export class Projectiles {
  lobs: Lob[] = [];
  pools: Pool[] = [];
  mortars: Mortar[] = [];

  lob(from: THREE.Vector3, to: THREE.Vector3): void {
    this.lobs.push({ from: from.clone(), to: to.clone(), t: 0, dur: SPITTER.flight, pos: from.clone() });
  }
  mortar(x: number, y: number, z: number): void {
    this.mortars.push({ x, y, z, t: 0 });
  }

  /** Advance; calls back for splashes, pool ticks and mortar blasts. */
  update(dt: number, cb: { splash(p: THREE.Vector3): void; poolTick(p: Pool): void; blast(m: Mortar): void }): void {
    for (const l of this.lobs) {
      l.t += dt;
      const k = Math.min(1, l.t / l.dur);
      l.pos.lerpVectors(l.from, l.to, k);
      l.pos.y += Math.sin(k * Math.PI) * Math.max(4, l.from.distanceTo(l.to) * 0.35);
      if (k >= 1) {
        cb.splash(l.to);
        this.pools.push({ x: l.to.x, y: l.to.y, z: l.to.z, r: SPITTER.radius, t: 0 });
      }
    }
    this.lobs = this.lobs.filter((l) => l.t < l.dur);
    for (const p of this.pools) {
      p.t += dt;
      cb.poolTick(p);
    }
    this.pools = this.pools.filter((p) => p.t < SPITTER.poolTime);
    for (const m of this.mortars) {
      m.t += dt;
      if (m.t >= FOREMAN.mortarWarn && m.t - dt < FOREMAN.mortarWarn) cb.blast(m);
    }
    this.mortars = this.mortars.filter((m) => m.t < FOREMAN.mortarWarn + 0.4);
  }
  clear(): void {
    this.lobs = [];
    this.pools = [];
    this.mortars = [];
  }
}
