import * as THREE from 'three';
import { FEEL, BODY, DIALOGUE_CAM, SHAKE, ROADIE } from '../data/tuning';
import type { PhysicsWorld } from '../world/physics';
import type { PlayerController } from './controller';

const DEG = Math.PI / 180;
interface Framing {
  behind: number;
  right: number;
  height: number;
  fov: number;
}
/** Smooth handheld noise in -1..1 from layered sines; k picks an independent channel. */
function noise(t: number, k: number): number {
  return Math.sin(t + k * 12.9898) * 0.5 + Math.sin(t * 2.13 + k * 78.233) * 0.3 + Math.sin(t * 3.71 + k * 37.719) * 0.2;
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
  private shakeT = 0;
  /** 0 to 1 blend into the roadie run's bob, sway and handheld shake. */
  private runK = 0;
  /** Current dialogue shot, if any (read by tests). */
  dialogue: { pos: THREE.Vector3; look: THREE.Vector3 } | null = null;
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
  /**
   * Over-the-shoulder shot from behind the commander's head toward the speaker. Tries the right shoulder first,
   * then the left, sphere-casting so the camera never ends up inside a wall; pulls in if both sides are tight.
   */
  static dialogueShot(me: THREE.Vector3, them: THREE.Vector3, physics: PhysicsWorld): { pos: THREE.Vector3; look: THREE.Vector3 } {
    const D = DIALOGUE_CAM;
    const fwd = them.clone().sub(me).setY(0);
    if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, -1);
    fwd.normalize();
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    let best = { pos: me.clone(), side: 1, clear: -1 };
    for (const side of [1, -1]) {
      const want = me.clone().addScaledVector(fwd, -D.back).addScaledVector(right, D.side * side).add(new THREE.Vector3(0, D.rise, 0));
      const dir = want.clone().sub(me);
      const len = dir.length();
      dir.normalize();
      const toi = physics.sphereCast(me, dir, D.probe, len);
      const dist = toi === null ? len : Math.max(0.05, toi - 0.02);
      const pos = me.clone().addScaledVector(dir, dist);
      // The shot also needs a clear line to the speaker's face.
      const sees = physics.clear(pos, them);
      const clear = dist / len + (sees ? 1 : 0);
      if (clear > best.clear + 1e-3) best = { pos, side, clear };
      if (dist >= len - 1e-3 && sees) break;
    }
    if (best.pos.distanceTo(me) < D.minBack) best.pos.y += 0.15;
    // Aim so the speaker sits just off centre, away from the commander, and the commander stays in frame.
    const flat = (v: THREE.Vector3) => Math.atan2(-(v.x - best.pos.x), -(v.z - best.pos.z));
    const toThem = flat(them), toMe = flat(me);
    let rel = toMe - toThem;
    while (rel > Math.PI) rel -= Math.PI * 2;
    while (rel < -Math.PI) rel += Math.PI * 2;
    const sgn = Math.sign(rel) || 1;
    let yaw = toThem + sgn * D.speakerDeg * DEG;
    if (Math.abs(rel) - D.speakerDeg * DEG > D.commanderMaxDeg * DEG) yaw = toMe - sgn * D.commanderMaxDeg * DEG;
    const dist = Math.hypot(them.x - best.pos.x, them.z - best.pos.z);
    const look = new THREE.Vector3(best.pos.x - Math.sin(yaw) * dist, them.y - 0.08, best.pos.z - Math.cos(yaw) * dist);
    return { pos: best.pos, look };
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
    this.trauma = Math.max(0, this.trauma - dt * SHAKE.decay);
    this.runK += ((opts.running ? 1 : 0) - this.runK) * Math.min(1, dt * 6);
    this.shoulderCur += (this.shoulder - this.shoulderCur) * Math.min(1, dt * 10);

    const crouchDrop = p.crouched ? (FEEL.camHeight - 1.05) * (1 - p.popUp) : 0;
    let target: Framing;
    let blend = 0.25;
    if (opts.aiming) {
      target = { behind: FEEL.aimBehind, right: FEEL.aimRight, height: FEEL.aimHeight - crouchDrop, fov: FEEL.aimFov };
      blend = FEEL.aimBlend;
    } else if (opts.running) {
      target = { behind: FEEL.runBehind, right: FEEL.runRight, height: FEEL.runHeight, fov: FEEL.runFov };
    } else {
      target = { behind: FEEL.camBehind, right: FEEL.camRight, height: FEEL.camHeight - crouchDrop, fov: FEEL.camFov };
    }
    lerpF(this.cur, target, 1 - Math.exp((-dt * 3) / blend));
    // Footfall-synced bob: the camera dips each time a foot lands.
    const phase = (p.odometer / ROADIE.stride) * Math.PI * 2;
    const bob = (Math.abs(Math.sin(phase)) - 0.6) * FEEL.runBob * this.runK;

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
    // Shake: impact trauma plus the roadie run's handheld floor, and stride sway; held still in conversations.
    const calm = 1 - this.dBlend;
    const tr = Math.max(this.trauma, this.runK * FEEL.runShake);
    this.shakeT += dt * SHAKE.freq * (1 + this.trauma);
    if (this.shakeEnabled && calm > 0 && (tr > 0.001 || this.runK > 0.001)) {
      const s = tr * tr * calm;
      const sway = Math.sin(phase) * FEEL.runRoll * this.runK * calm;
      const e = new THREE.Euler(noise(this.shakeT, 1) * SHAKE.maxDeg * s * DEG, noise(this.shakeT, 2) * SHAKE.maxDeg * s * DEG, (noise(this.shakeT, 3) * SHAKE.maxRoll * s + sway) * DEG, 'YXZ');
      q.multiply(new THREE.Quaternion().setFromEuler(e));
      camPos.addScaledVector(right, noise(this.shakeT, 4) * SHAKE.maxMove * s).y += noise(this.shakeT, 5) * SHAKE.maxMove * s;
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
