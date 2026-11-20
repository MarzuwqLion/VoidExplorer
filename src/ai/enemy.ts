import * as THREE from 'three';
import type { Damageable, DamageInfo, DamageResult, Hitbox } from './types';
import { applyDamage, vitals, type Vitals } from './vitals';
import { ENEMIES, AI, type EnemyDef } from '../data/enemies';
import type { EnemyType } from '../data/names';
import type { XZ } from '../data/layouts';
import type { EnemyAnimState } from './types';

let seq = 1;

/** One enemy: body state shared by every brain. */
export class Enemy implements Damageable {
  readonly uid = seq++;
  readonly def: EnemyDef;
  readonly pos = new THREE.Vector3();
  readonly prevPos = new THREE.Vector3();
  yaw = 0;
  prevYaw = 0;
  v: Vitals;
  alive = true;
  readonly isEnemy = true;
  readonly radius: number;
  readonly material: 'flesh' | 'metal';
  /** Brain state name and time in it. */
  state = 'idle';
  stateT = 0;
  anim: EnemyAnimState = 'idle';
  speedNow = 0;
  dist = 0;
  flinch = 0;
  staggerT = 0;
  deadT = 0;
  glow = 0;
  crouch = 0;
  aimPitch = 0;
  weakOpen = 0;
  stunned = false;
  alerted = false;
  alertPending = -1;
  sinceSeen = 99;
  seesPlayer = false;
  readonly lastKnown = new THREE.Vector3();
  path: XZ[] = [];
  pathGoal: XZ | null = null;
  repathT = 0;
  encounter: string | null = null;
  token = false;
  /** Scratch data for the brain. */
  mem: Record<string, number> = {};
  /** Cover point index held, or -1. */
  cover = -1;
  laser: THREE.Vector3 | null = null;
  removed = false;
  lastHitFrom: THREE.Vector3 | null = null;

  constructor(
    readonly type: EnemyType,
    x: number,
    y: number,
    z: number,
    yaw = 0,
  ) {
    this.def = ENEMIES[type];
    this.v = vitals(this.def.health, 0, this.def.armor ?? 0);
    this.radius = this.def.radius;
    this.material = this.def.material;
    this.pos.set(x, y, z);
    this.prevPos.copy(this.pos);
    this.yaw = this.prevYaw = yaw;
  }

  setState(s: string): void {
    this.state = s;
    this.stateT = 0;
  }
  forward(out = new THREE.Vector3()): THREE.Vector3 {
    return out.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }
  eye(out = new THREE.Vector3()): THREE.Vector3 {
    const h = this.def.raider ? (this.crouch > 0.5 ? 1.0 : 1.6) : this.def.height * 0.8;
    return out.set(this.pos.x, this.pos.y + h, this.pos.z);
  }

  hitboxes(out: Hitbox[]): void {
    const p = this.pos, f = this.forward(), t = this.type;
    const rx = -f.z, rz = f.x;
    if (t === 'stalker') {
      out.push({ kind: 'sphere', part: 'body', x: p.x, y: p.y + 0.5, z: p.z, r: 0.38 });
      out.push({ kind: 'sphere', part: 'body', x: p.x - f.x * 0.45, y: p.y + 0.5, z: p.z - f.z * 0.45, r: 0.32 });
      out.push({ kind: 'sphere', part: 'head', x: p.x + f.x * 0.65, y: p.y + 0.55, z: p.z + f.z * 0.65, r: 0.2 });
    } else if (t === 'spitter') {
      out.push({ kind: 'sphere', part: 'body', x: p.x, y: p.y + 0.85, z: p.z, r: 0.72 });
      out.push({ kind: 'sphere', part: 'weak', x: p.x + f.x * 0.75, y: p.y + 0.6, z: p.z + f.z * 0.75, r: 0.3, mul: 2 });
      out.push({ kind: 'sphere', part: 'head', x: p.x + f.x * 0.8, y: p.y + 1.05, z: p.z + f.z * 0.8, r: 0.25 });
    } else if (t === 'alpha') {
      for (const k of [-1.1, 0, 1.0]) out.push({ kind: 'sphere', part: 'body', x: p.x + f.x * k, y: p.y + 1.35, z: p.z + f.z * k, r: 0.95 });
      out.push({ kind: 'sphere', part: 'head', x: p.x + f.x * 2.0, y: p.y + 1.7, z: p.z + f.z * 2.0, r: 0.55 });
      for (const s of [-1, 1]) out.push({ kind: 'sphere', part: 'weak', x: p.x + f.x * 0.55 + rx * s * 0.85, y: p.y + 1.2, z: p.z + f.z * 0.55 + rz * s * 0.85, r: 0.45, mul: this.stunned ? 2 : 1 });
    } else if (t === 'foreman') {
      out.push({ kind: 'capsule', part: 'body', x: p.x, y: p.y + 0.5, z: p.z, r: 0.9, h: 1.7 });
      for (const s of [-1, 1]) out.push({ kind: 'sphere', part: 'sink', x: p.x + rx * s * 0.95 - f.x * 0.1, y: p.y + 2.55, z: p.z + rz * s * 0.95 - f.z * 0.1, r: 0.38, mul: 1 });
    } else {
      const crouch = this.crouch;
      const h = 1.05 - crouch * 0.45;
      out.push({ kind: 'capsule', part: 'body', x: p.x, y: p.y + 0.3, z: p.z, r: 0.32, h });
      out.push({ kind: 'sphere', part: 'head', x: p.x, y: p.y + 1.62 - crouch * 0.55, z: p.z, r: 0.15 });
    }
  }

  damage(d: DamageInfo): DamageResult {
    if (!this.alive) return { dealt: 0, killed: false, shield: false, armor: false };
    let partMul = d.partMul;
    if (this.type === 'foreman' && d.part === 'sink') {
      // Heat sinks only take bonus damage while open and hit from the front.
      const toShooter = new THREE.Vector3(d.from.x - this.pos.x, 0, d.from.z - this.pos.z).normalize();
      const front = toShooter.dot(this.forward()) > 0.2;
      partMul = this.weakOpen > 0.5 && front ? partMul * 2.5 : partMul * 0.5;
    }
    const res = applyDamage(this.v, { ...d, partMul });
    this.flinch = 1;
    this.alerted = true;
    this.lastHitFrom = new THREE.Vector3(d.from.x, d.from.y, d.from.z);
    if (d.stagger && !this.def.boss) this.staggerT = AI.staggerTime;
    if (res.killed) {
      this.alive = false;
      this.deadT = 0;
      this.anim = 'dead';
      this.laser = null;
    }
    return res;
  }
}
