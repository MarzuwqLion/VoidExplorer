import type * as THREE from 'three';
import type { V3 } from '../world/physics';

export type HitPart = 'body' | 'head' | 'weak' | 'sink';
export interface Hitbox {
  kind: 'sphere' | 'capsule';
  part: HitPart;
  /** Sphere center, or capsule bottom. */
  x: number;
  y: number;
  z: number;
  r: number;
  /** Capsule height (segment length). */
  h?: number;
  /** Damage multiplier for this part (weak spots). */
  mul?: number;
}
export interface DamageInfo {
  amount: number;
  armorMul: number;
  part: HitPart;
  partMul: number;
  from: V3;
  melee?: boolean;
  stagger?: boolean;
}
export interface DamageResult {
  dealt: number;
  killed: boolean;
  shield: boolean;
  armor: boolean;
}
/** Anything the commander can shoot. */
export interface Damageable {
  readonly uid: number;
  readonly pos: THREE.Vector3;
  alive: boolean;
  readonly isEnemy: boolean;
  readonly radius: number;
  hitboxes(out: Hitbox[]): void;
  damage(d: DamageInfo): DamageResult;
  material: 'flesh' | 'metal';
}

/** Ray vs hitbox: returns distance along the (normalized) ray or null. */
export function rayHitbox(o: V3, d: V3, hb: Hitbox, maxT: number): number | null {
  if (hb.kind === 'sphere') return raySphere(o, d, hb.x, hb.y, hb.z, hb.r, maxT);
  // Vertical capsule: closest approach between the ray and the segment.
  const h = hb.h ?? 1;
  const wx = o.x - hb.x, wy = o.y - hb.y, wz = o.z - hb.z;
  const b = d.y; // dot(d, up)
  const dd = wx * d.x + wy * d.y + wz * d.z;
  const e = wy;
  const denom = 1 - b * b;
  let t: number, s: number;
  if (denom < 1e-6) {
    t = 0;
    s = e;
  } else {
    t = (b * e - dd) / denom;
    s = (e - b * dd) / denom;
  }
  s = Math.max(0, Math.min(h, s));
  // Re-solve t for the clamped s.
  t = (hb.x - o.x) * d.x + (hb.y + s - o.y) * d.y + (hb.z - o.z) * d.z;
  if (t < 0 || t > maxT) return null;
  const px = o.x + d.x * t - hb.x, py = o.y + d.y * t - (hb.y + s), pz = o.z + d.z * t - hb.z;
  const dist2 = px * px + py * py + pz * pz;
  if (dist2 > hb.r * hb.r) return null;
  return Math.max(0, t - Math.sqrt(hb.r * hb.r - dist2));
}
export function raySphere(o: V3, d: V3, cx: number, cy: number, cz: number, r: number, maxT: number): number | null {
  const lx = cx - o.x, ly = cy - o.y, lz = cz - o.z;
  const tca = lx * d.x + ly * d.y + lz * d.z;
  const d2 = lx * lx + ly * ly + lz * lz - tca * tca;
  if (d2 > r * r) return null;
  const thc = Math.sqrt(r * r - d2);
  let t = tca - thc;
  if (t < 0) t = tca + thc;
  if (t < 0 || t > maxT) return null;
  return t;
}
