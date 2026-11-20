import * as THREE from 'three';
import { buildHumanoid, applyPose, type Humanoid, type HumanoidLook } from './models/humanoid';
import { idlePose } from '../player/anim';

/** A friendly character: idle animation, turns to face whoever is talking to it. */
export class Npc {
  readonly rig: Humanoid;
  readonly root: THREE.Group;
  yaw: number;
  talking = 0;
  private t = 0;
  private face: THREE.Vector3 | null = null;
  constructor(
    readonly id: string,
    look: HumanoidLook,
    readonly pos: THREE.Vector3,
    readonly baseYaw: number,
    readonly seated = false,
    private seed = 1,
  ) {
    this.rig = buildHumanoid(look);
    this.root = this.rig.root;
    this.root.position.copy(pos);
    this.yaw = baseYaw;
    this.root.rotation.y = baseYaw;
  }
  /** Head position in world space. */
  head(out = new THREE.Vector3()): THREE.Vector3 {
    return out.set(this.pos.x, this.pos.y + (this.seated ? 1.25 : 1.68), this.pos.z);
  }
  faceToward(p: THREE.Vector3 | null): void {
    this.face = p ? p.clone() : null;
  }
  update(dt: number): void {
    this.t += dt;
    const want = this.face ? Math.atan2(-(this.face.x - this.pos.x), -(this.face.z - this.pos.z)) : this.baseYaw;
    let d = want - this.yaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.yaw += d * Math.min(1, dt * 4);
    this.root.rotation.y = this.yaw;
    this.talking += ((this.face ? 1 : 0) - this.talking) * Math.min(1, dt * 3);
    applyPose(this.rig, idlePose(this.t, this.seed, this.talking, this.seated));
  }
}
