import { PLANETS, PLANET_BY_ID, STAR, BELT, type PlanetDef } from '../data/planets';
import { MAP } from '../data/systemMap';

export interface MapStepResult {
  near: string | null;
  newlySurveyed: string | null;
  sunWarn: boolean;
  boundary: boolean;
}

/** System map flight logic without rendering. */
export class MapSim {
  x = MAP.start.x;
  z = MAP.start.z;
  vx = 0;
  vz = 0;
  heading = MAP.start.heading;
  clock = 0;
  near: string | null = null;
  surveyed = new Set<string>();
  private boundaryCd = 0;

  planetPos(p: PlanetDef, t = this.clock): { x: number; y: number; z: number } {
    const a = p.phase + (Math.PI * 2 * t) / (p.period * 60);
    const inc = p.inclination ?? 0;
    return { x: Math.cos(a) * p.orbit, y: Math.sin(a) * p.orbit * Math.sin(inc), z: Math.sin(a) * p.orbit * Math.cos(inc) };
  }
  approachRange(p: PlanetDef): number {
    return p.size * MAP.approachMul + MAP.approachAdd;
  }
  get speed(): number {
    return Math.hypot(this.vx, this.vz);
  }
  get radius(): number {
    return Math.hypot(this.x, this.z);
  }

  /** Which body is the ship near: a planet id, 'oriel', 'shoal' or null. */
  findNear(): string | null {
    let best: string | null = null, bd = Infinity;
    for (const p of PLANETS) {
      const q = this.planetPos(p);
      const d = Math.hypot(q.x - this.x, q.z - this.z);
      if (d < this.approachRange(p) && d < bd) {
        bd = d;
        best = p.id;
      }
    }
    if (best) return best;
    if (this.radius < STAR.radius * MAP.approachMul + MAP.approachAdd) return STAR.id;
    if (this.radius >= BELT.inner && this.radius <= BELT.outer) return BELT.id;
    return null;
  }

  /** Move: x right, y up the screen (north = -Z). */
  step(dt: number, move: { x: number; y: number }, boost: boolean): MapStepResult {
    this.clock += dt;
    this.boundaryCd = Math.max(0, this.boundaryCd - dt);
    let max = boost ? MAP.boost : MAP.cruise;
    const nearPlanet = this.near && PLANET_BY_ID[this.near];
    if (nearPlanet) max *= MAP.approachSlow;
    const mag = Math.min(1, Math.hypot(move.x, move.y));
    const tx = mag > 0.05 ? (move.x / Math.max(mag, 1e-6)) * max * mag : 0;
    const tz = mag > 0.05 ? (-move.y / Math.max(mag, 1e-6)) * max * mag : 0;
    const rate = (Math.max(max, this.speed) / MAP.accelTime) * dt;
    let dx = tx - this.vx, dz = tz - this.vz;
    const dl = Math.hypot(dx, dz);
    if (dl > rate) {
      dx *= rate / dl;
      dz *= rate / dl;
    }
    this.vx += dx;
    this.vz += dz;
    const r = this.radius;
    let sunWarn = false, boundary = false;
    if (r < MAP.sunWarn) {
      sunWarn = true;
      const ox = this.x / Math.max(r, 0.01), oz = this.z / Math.max(r, 0.01);
      const push = MAP.sunPush * (1 - r / MAP.sunWarn) + 10;
      this.vx += ox * push * dt * 4;
      this.vz += oz * push * dt * 4;
    }
    if (r > MAP.boundary) {
      const ix = -this.x / r, iz = -this.z / r;
      const out = -(this.vx * ix + this.vz * iz);
      if (out > 0) {
        this.vx += ix * out * 2;
        this.vz += iz * out * 2;
      }
      this.x = ix * -MAP.boundary;
      this.z = iz * -MAP.boundary;
      if (this.boundaryCd <= 0) {
        boundary = true;
        this.boundaryCd = 6;
      }
    }
    this.x += this.vx * dt;
    this.z += this.vz * dt;
    if (this.speed > 0.5) {
      const want = Math.atan2(-this.vx, -this.vz);
      let d = want - this.heading;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      this.heading += d * Math.min(1, dt * MAP.turnRate);
    }
    this.near = this.findNear();
    let newlySurveyed: string | null = null;
    if (this.near && PLANET_BY_ID[this.near] && !this.surveyed.has(this.near)) {
      this.surveyed.add(this.near);
      newlySurveyed = this.near;
    }
    return { near: this.near, newlySurveyed, sunWarn, boundary };
  }

  /** Place the ship beside a body, inside its approach range. */
  placeBeside(id: string): void {
    if (id === STAR.id) {
      this.x = 0;
      this.z = 40;
    } else if (id === BELT.id) {
      this.x = 0;
      this.z = (BELT.inner + BELT.outer) / 2;
    } else {
      const p = PLANET_BY_ID[id];
      const q = this.planetPos(p);
      const r = Math.hypot(q.x, q.z);
      const d = p.size + 4;
      this.x = q.x + (q.x / r) * d;
      this.z = q.z + (q.z / r) * d;
    }
    this.vx = this.vz = 0;
    this.near = this.findNear();
    if (this.near && PLANET_BY_ID[this.near]) this.surveyed.add(this.near);
  }
}
