import * as THREE from 'three';
import { FEEL, BODY } from '../data/tuning';
import type { PhysicsWorld } from '../world/physics';
import type { PlayerController } from './controller';

const DEG = Math.PI / 180;
interface Framing {
  behind: number;
  right: number;
  height: number;
  fov: number;
}
function lerpF(a: Framing, b: Framing, k: number): void {
  a.behind += (b.behind - a.behind) * k;
  a.right += (b.right - a.right) * k;
  a.height += (b.height - a.height) * k;
  a.fov += (b.fov - a.fov) * k;
}

/** Over-the-right-shoulder camera with collision, framing blends, recoil kick, shake and a dialogue shot. */
export class CameraRig {
  yaw = 0;
  pitch = -8;
  kickPitch = 0;
  kickYaw = 0;
  shoulder = 1;
  private shoulderCur = 1;
  readonly cur: Framing = { behind: FEEL.camBehind, right: FEEL.camRight, height: FEEL.camHeight, fov: FEEL.camFov };
  readonly pos = new THREE.Vector3();
  readonly prevPos = new THREE.Vector3();
  readonly pivot = new THREE.Vector3();
  readonly quat = new THREE.Quaternion();
  readonly prevQuat = new THREE.Quaternion();
  fov = FEEL.camFov;
  private prevFov = FEEL.camFov;
  /** Distance from camera to the commander's head, for fading. */
  headDist = 3;
  trauma = 0;
  private bobT = 0;
  private dialogue: { pos: THREE.Vector3; look: THREE.Vector3 } | null = null;
  private dBlend = 0;
  shakeEnabled = true;

  /** Forward vector including recoil kick. */
  forward(out = new THREE.Vector3()): THREE.Vector3 {
    const y = (this.yaw + this.kickYaw) * DEG, p = (this.pitch + this.kickPitch) * DEG;
    return out.set(-Math.sin(y) * Math.cos(p), Math.sin(p), -Math.cos(y) * Math.cos(p));
  }
  look(dxDeg: number, dyDeg: number): void {
    this.yaw -= dxDeg;
    this.pitch = Math.max(BODY.pitchMin, Math.min(BODY.pitchMax, this.pitch + dyDeg));
    if (this.yaw > 360 || this.yaw < -360) this.yaw %= 360;
  }
  addKick(deg: number, side = 0): void {
    this.kickPitch += deg * FEEL.recoilScale;
    this.kickYaw += side * FEEL.recoilScale;
  }
  addShake(v: number): void {
    this.trauma = Math.min(1, this.trauma + v * FEEL.shakeScale);
  }
  setDialogue(pos: THREE.Vector3 | null, look?: THREE.Vector3): void {
    this.dialogue = pos && look ? { pos: pos.clone(), look: look.clone() } : null;
  }
  get inDialogue(): boolean {
    return this.dBlend > 0.01;
  }

  update(dt: number, p: PlayerController, physics: PhysicsWorld, opts: { aiming: boolean; running: boolean }): void {
    this.prevPos.copy(this.pos);
    this.prevQuat.copy(this.quat);
    this.prevFov = this.fov;
    // Recoil recovery.
    const rec = Math.min(1, FEEL.kickRecovery * dt);
    this.kickPitch -= this.kickPitch * rec;
    this.kickYaw -= this.kickYaw * rec;
    this.trauma = Math.max(0, this.trauma - dt * 1.8);
    this.shoulderCur += (this.shoulder - this.shoulderCur) * Math.min(1, dt * 10);

    const crouchDrop = p.crouched ? (FEEL.camHeight - 1.05) * (1 - p.popUp) : 0;
    let target: Framing;
    let blend = 0.25;
    if (opts.aiming) {
      target = { behind: FEEL.aimBehind, right: FEEL.aimRight, height: FEEL.aimHeight - crouchDrop, fov: FEEL.aimFov };
      blend = FEEL.aimBlend;
    } else if (opts.running) {
      target = { behind: FEEL.runBehind, right: FEEL.camRight, height: FEEL.runHeight, fov: FEEL.runFov };
    } else {
      target = { behind: FEEL.camBehind, right: FEEL.camRight, height: FEEL.camHeight - crouchDrop, fov: FEEL.camFov };
    }
    lerpF(this.cur, target, 1 - Math.exp((-dt * 3) / blend));
    this.bobT += dt * (opts.running ? 11 : 0);
    const bob = opts.running ? Math.sin(this.bobT) * FEEL.runBob : 0;

    const yaw = this.yaw * DEG;
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const fwd = this.forward();
    const leanOff = p.lean * BODY.leanDistance;
    this.pivot.set(p.pos.x, p.pos.y + this.cur.height + bob, p.pos.z).addScaledVector(right, leanOff);
    const anchor = new THREE.Vector3(p.pos.x, this.pivot.y, p.pos.z);
    const desired = this.pivot.clone().addScaledVector(fwd, -this.cur.behind).addScaledVector(right, this.cur.right * this.shoulderCur);
    // Sphere-cast from the commander's head out to the desired spot.
    const dir = desired.clone().sub(anchor);
    const len = dir.length();
    dir.normalize();
    const r = 0.22;
    const toi = physics.sphereCast(anchor, dir, r, len);
    const dist = toi === null ? len : Math.max(0.05, toi - 0.02);
    const camPos = anchor.clone().addScaledVector(dir, dist);
    this.headDist = camPos.distanceTo(new THREE.Vector3(p.pos.x, p.pos.y + p.height * 0.85, p.pos.z));

    // Orientation looks along forward.
    const m = new THREE.Matrix4().lookAt(camPos, camPos.clone().add(fwd), new THREE.Vector3(0, 1, 0));
    const q = new THREE.Quaternion().setFromRotationMatrix(m);
    let fov = this.cur.fov;

    // Dialogue shot blend.
    const dTarget = this.dialogue ? 1 : 0;
    const dr = dt / FEEL.dialogueBlend;
    this.dBlend += Math.max(-dr, Math.min(dr, dTarget - this.dBlend));
    if (this.dBlend > 0 && this.dialogue) {
      const k = this.dBlend * this.dBlend * (3 - 2 * this.dBlend);
      camPos.lerp(this.dialogue.pos, k);
      const dm = new THREE.Matrix4().lookAt(this.dialogue.pos, this.dialogue.look, new THREE.Vector3(0, 1, 0));
      q.slerp(new THREE.Quaternion().setFromRotationMatrix(dm), k);
      fov += (FEEL.dialogueFov - fov) * k;
    }
    // Shake.
    if (this.trauma > 0 && this.shakeEnabled) {
      const s = this.trauma * this.trauma * 0.6 * DEG;
      const e = new THREE.Euler((Math.random() - 0.5) * s * 2, (Math.random() - 0.5) * s * 2, (Math.random() - 0.5) * s, 'YXZ');
      q.multiply(new THREE.Quaternion().setFromEuler(e));
    }
    this.pos.copy(camPos);
    this.quat.copy(q);
    this.fov = fov;
  }

  /** Snap without interpolation (scene start, teleports). */
  snap(): void {
    this.prevPos.copy(this.pos);
    this.prevQuat.copy(this.quat);
    this.prevFov = this.fov;
  }

  apply(cam: THREE.PerspectiveCamera, alpha: number): void {
    cam.position.lerpVectors(this.prevPos, this.pos, alpha);
    cam.quaternion.slerpQuaternions(this.prevQuat, this.quat, alpha);
    const f = this.prevFov + (this.fov - this.prevFov) * alpha;
    if (Math.abs(cam.fov - f) > 0.01) {
      cam.fov = f;
      cam.updateProjectionMatrix();
    }
  }
}
