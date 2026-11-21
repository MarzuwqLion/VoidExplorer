import * as THREE from 'three';
import { buildHumanoid, applyPose, type Humanoid } from '../world/models/humanoid';
import { animateFace } from '../world/models/humanoidHead';
import { buildWeapon } from '../world/models/weapons';
import { commanderPose, type CommanderAnim } from './anim';
import { LOOKS } from '../data/characters';
import type { PlayerController } from './controller';
import type { WeaponId } from '../data/names';
import { FEEL, SURVIVAL, MELEE } from '../data/tuning';

export interface WeaponPose {
  current: WeaponId;
  reload: number;
  swap: number;
  recoil: number;
  harvest: number;
  hit: number;
  aimPitch: number;
}

/** Visual commander: rig, held and stowed weapons, animation. */
export class CommanderView {
  readonly rig: Humanoid;
  readonly weapons: Record<WeaponId, THREE.Group>;
  readonly root: THREE.Group;
  private t = 0;
  private aim = 0;
  private sprint = 0;
  private crouch = 0;
  private opacity = 1;

  constructor(
    private armed: boolean,
    helmet: boolean,
  ) {
    this.rig = buildHumanoid({ ...LOOKS.kade, helmet });
    this.root = this.rig.root;
    this.weapons = { pistol: buildWeapon('pistol'), smg: buildWeapon('smg'), rifle: buildWeapon('rifle') };
    this.stow(armed ? 'rifle' : null);
  }

  /** Put the held weapon in the gun mount and the rest on back and thigh. */
  stow(held: WeaponId | null): void {
    const w = this.weapons;
    this.rig.thighMount.add(w.pistol);
    w.pistol.position.set(0.04, 0, 0);
    w.pistol.rotation.set(Math.PI / 2, 0, 0);
    this.rig.backMount.add(w.rifle);
    w.rifle.position.set(0, 0, 0.02);
    w.rifle.rotation.set(0, 0, 0);
    this.rig.backMount.add(w.smg);
    w.smg.position.set(0.12, -0.1, 0.06);
    w.smg.rotation.set(0, 0, 0.3);
    w.smg.visible = this.armed;
    w.rifle.visible = this.armed;
    if (held) {
      this.rig.gunMount.add(w[held]);
      w[held].position.set(0, 0, 0);
      w[held].rotation.set(0, 0, 0);
      w[held].visible = true;
    }
  }
  private held: WeaponId | null = null;

  muzzleWorld(out = new THREE.Vector3()): THREE.Vector3 {
    const w = this.held ? this.weapons[this.held] : null;
    const m = w?.getObjectByName('muzzle');
    if (m) return m.getWorldPosition(out);
    return this.rig.gunMount.getWorldPosition(out);
  }

  update(dt: number, alpha: number, p: PlayerController, w: WeaponPose | null, headDist: number): void {
    this.t += dt;
    const pos = new THREE.Vector3().lerpVectors(p.prev, p.pos, alpha);
    this.root.position.copy(pos);
    let df = p.facing - p.prevFacing;
    while (df > Math.PI) df -= Math.PI * 2;
    while (df < -Math.PI) df += Math.PI * 2;
    this.root.rotation.y = p.prevFacing + df * alpha;
    const k = Math.min(1, dt * 12);
    this.aim += ((p.aiming ? 1 : 0) - this.aim) * k;
    this.sprint += ((p.sprinting ? 1 : 0) - this.sprint) * k;
    const crouchTarget = p.crouched ? 1 - p.popUp : 0;
    this.crouch += (crouchTarget - this.crouch) * Math.min(1, dt * 14);
    if (w && this.armed && w.current !== this.held) {
      this.held = w.current;
      this.stow(w.current);
    } else if (!this.armed && this.held) {
      this.held = null;
      this.stow(null);
    }
    const a: CommanderAnim = {
      t: this.t,
      dist: p.odometer,
      speed: p.speed,
      armed: this.armed,
      crouch: this.crouch,
      aim: this.aim,
      aimPitch: w?.aimPitch ?? 0,
      sprint: this.sprint,
      roll: p.state === 'roll' ? Math.min(1, p.stateT / FEEL.rollTime) : 0,
      reload: w?.reload ?? 0,
      swap: w?.swap ?? 0,
      melee: p.state === 'melee' ? Math.min(1, p.stateT / MELEE.time) : 0,
      hit: w?.hit ?? 0,
      knock: p.state === 'knockdown' ? Math.min(1, p.stateT / 0.25) : p.state === 'getup' ? 1 - p.stateT / SURVIVAL.getupTime : 0,
      dead: p.state === 'dead' ? Math.min(1, p.stateT / 0.6) : 0,
      harvest: w?.harvest ?? 0,
      recoil: w?.recoil ?? 0,
      heavy: false,
    };
    applyPose(this.rig, commanderPose(a));
    animateFace(this.rig.face, this.t, 0.5, 0);
    // Fade when the camera is very close.
    const target = headDist < 0.6 ? Math.max(0.15, headDist / 0.6) : 1;
    if (Math.abs(target - this.opacity) > 0.01) {
      this.opacity = target;
      this.root.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
        if (m && 'opacity' in m) {
          m.transparent = target < 1;
          m.opacity = target;
        }
      });
    }
  }
}
