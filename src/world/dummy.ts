import * as THREE from 'three';
import type { Damageable, DamageInfo, DamageResult, Hitbox } from '../ai/types';
import { applyDamage, vitals, type Vitals } from '../ai/vitals';
import { mat, glow, box, cyl } from './materials';

let uidSeq = 10000;
export const DUMMY = { health: 100, shield: 50, armor: 100, respawn: 3 };

/** Target dummy with health and optional shield or armor. Respawns. */
export class Dummy implements Damageable {
  readonly uid = uidSeq++;
  readonly pos: THREE.Vector3;
  alive = true;
  readonly isEnemy = false;
  readonly radius = 0.4;
  material: 'flesh' | 'metal';
  v: Vitals;
  deadT = 0;
  hits = 0;
  kills = 0;
  flinch = 0;
  constructor(x: number, y: number, z: number, readonly kind: 'flesh' | 'shield' | 'armor') {
    this.pos = new THREE.Vector3(x, y, z);
    this.material = kind === 'armor' ? 'metal' : 'flesh';
    this.v = this.fresh();
  }
  private fresh(): Vitals {
    return vitals(DUMMY.health, this.kind === 'shield' ? DUMMY.shield : 0, this.kind === 'armor' ? DUMMY.armor : 0);
  }
  hitboxes(out: Hitbox[]): void {
    out.push({ kind: 'capsule', part: 'body', x: this.pos.x, y: this.pos.y + 0.2, z: this.pos.z, r: 0.3, h: 1.1 });
    out.push({ kind: 'sphere', part: 'head', x: this.pos.x, y: this.pos.y + 1.62, z: this.pos.z, r: 0.14 });
  }
  damage(d: DamageInfo): DamageResult {
    const r = applyDamage(this.v, d);
    this.hits++;
    this.flinch = 1;
    if (r.killed) {
      this.alive = false;
      this.deadT = 0;
      this.kills++;
    }
    return r;
  }
  update(dt: number): void {
    this.flinch = Math.max(0, this.flinch - dt * 5);
    if (!this.alive) {
      this.deadT += dt;
      if (this.deadT >= DUMMY.respawn) {
        this.alive = true;
        this.v = this.fresh();
      }
    }
  }
}

/** Dummy visual: post and a silhouette that tips when hit and lies down when destroyed. */
export function buildDummyView(d: Dummy): THREE.Group {
  const g = new THREE.Group();
  g.position.copy(d.pos);
  const pivot = new THREE.Group();
  pivot.name = 'pivot';
  g.add(pivot);
  const body = mat(d.kind === 'armor' ? 0xd8b030 : 0xc8a070, { rough: 0.8 });
  pivot.add(box(0.5, 1.0, 0.25, body, 0, 0.75, 0));
  pivot.add(cyl(0.14, 0.14, 0.28, body, 8).translateY(1.6));
  pivot.add(box(0.12, 0.6, 0.12, mat(0x555a60), 0, 0.3, 0));
  if (d.kind === 'shield') {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.75, 12, 8), new THREE.MeshBasicMaterial({ color: 0x5cc8ff, transparent: true, opacity: 0.18, depthWrite: false }));
    s.position.y = 0.9;
    s.name = 'shield';
    pivot.add(s);
  }
  pivot.add(box(0.2, 0.2, 0.02, glow(0xff5030, 1.2), 0, 0.95, -0.14));
  g.add(cyl(0.3, 0.35, 0.06, mat(0x333840), 10).translateY(0.03));
  return g;
}
export function updateDummyView(g: THREE.Group, d: Dummy): void {
  const p = g.getObjectByName('pivot')!;
  p.rotation.x = d.alive ? d.flinch * 0.25 : Math.min(1.45, d.deadT * 6);
  const s = g.getObjectByName('shield');
  if (s) s.visible = d.alive && d.v.shield > 0;
}
