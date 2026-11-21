import type { Pose } from '../world/models/humanoid';
import { ROADIE } from '../data/tuning';

export interface CommanderAnim {
  t: number;
  /** Distance travelled (m), drives the gait phase. */
  dist: number;
  speed: number;
  armed: boolean;
  crouch: number;
  aim: number;
  /** Camera pitch in degrees, for aim lean. */
  aimPitch: number;
  sprint: number;
  roll: number;
  reload: number;
  swap: number;
  melee: number;
  hit: number;
  knock: number;
  dead: number;
  harvest: number;
  recoil: number;
  heavy: boolean;
  /** Turn rate (rad/s, positive turning left), for leaning into roadie-run turns. */
  turn?: number;
}

const sin = Math.sin, cos = Math.cos, PI = Math.PI;

/** Gait for legs, shared by every humanoid. */
export function legs(phase: number, amp: number, crouch: number): Pose {
  const sL = sin(phase), sR = sin(phase + PI);
  const kneeL = -Math.max(0, -cos(phase)) * amp * 1.3 - 0.05;
  const kneeR = -Math.max(0, -cos(phase + PI)) * amp * 1.3 - 0.05;
  return {
    upperLegL: [sL * amp + crouch * 1.15, 0, 0],
    upperLegR: [sR * amp + crouch * 1.15, 0, 0],
    lowerLegL: [kneeL - crouch * 1.7, 0, 0],
    lowerLegR: [kneeR - crouch * 1.7, 0, 0],
    footL: [crouch * 0.55 - sL * amp * 0.3, 0, 0],
    footR: [crouch * 0.55 - sR * amp * 0.3, 0, 0],
  };
}

/** Commander pose from controller and weapon state. */
export function commanderPose(a: CommanderAnim): Pose {
  const sp = a.sprint;
  const stride = sp > 0.5 ? ROADIE.stride : a.speed > 3 ? 1.9 : 1.3;
  const phase = (a.dist / stride) * PI * 2;
  const amp = Math.min(0.95, a.speed * 0.13) * (1 - a.crouch * 0.45);
  const breathe = sin(a.t * 1.7) * 0.025;
  const bob = Math.abs(sin(phase)) * Math.min(0.05 + sp * 0.015, a.speed * 0.01);
  // Roadie run: low, hunched charge with high knees, rocking shoulders and the weapon held low across the chest.
  const p: Pose = { ...legs(phase, amp, a.crouch), lift: -a.crouch * 0.4 + bob - 0.02 - sp * ROADIE.drop };
  if (sp > 0) {
    p.lowerLegL![0] *= 1 + ROADIE.knee * sp;
    p.lowerLegR![0] *= 1 + ROADIE.knee * sp;
    p.upperLegL![0] += 0.12 * sp;
    p.upperLegR![0] += 0.12 * sp;
    p.roll = Math.max(-ROADIE.maxLean, Math.min(ROADIE.maxLean, (a.turn ?? 0) * ROADIE.turnLean)) * sp;
  }
  // Joint x rotation: positive tips the upper body back (the rig faces -z), negative hunches it forward.
  const hunch = sp * ROADIE.hunch + a.crouch * 0.25;
  const pitchLean = a.aimPitch * (Math.PI / 180) * 0.6 * a.aim;
  p.torso = [-hunch * 0.6 + breathe, sin(phase) * ROADIE.twist * sp, 0];
  p.chest = [-hunch * 0.4 + pitchLean * 0.5 + a.recoil * 0.08, 0, sin(phase) * ROADIE.rock * sp];
  p.neck = [sp * ROADIE.neck + a.crouch * 0.15 + pitchLean * 0.5, 0, 0];
  p.head = [0, 0, 0];
  if (a.armed) {
    // Two-handed hold, raised to the shoulder when aiming.
    const up = 0.5 + a.aim * 0.75 - sp * 0.3;
    p.upperArmR = [up + a.recoil * 0.12, 0, -0.18];
    p.lowerArmR = [1.25 - a.aim * 0.35, 0, 0];
    p.upperArmL = [up + 0.35, 0, 0.55];
    p.lowerArmL = [0.95 - a.aim * 0.25, 0, 0];
    p.handR = [-0.2, 0, 0];
    p.handL = [-0.2, 0, 0];
    p.shoulderL = [0, -0.25, 0];
    if (a.reload > 0) {
      const k = sin(a.reload * PI);
      p.upperArmL![0] -= k * 0.9;
      p.lowerArmL![0] += k * 0.4;
      p.chest![1] = k * 0.15;
    }
    if (a.swap > 0) {
      const k = sin(a.swap * PI);
      p.upperArmR![0] -= k * 0.8;
      p.upperArmL![0] -= k * 0.9;
    }
    if (a.melee > 0) {
      const m = a.melee;
      const wind = m < 0.3 ? m / 0.3 : 0;
      const strike = m >= 0.3 && m < 0.55 ? (m - 0.3) / 0.25 : m >= 0.55 ? 1 - (m - 0.55) / 0.45 : 0;
      p.chest![1] = wind * 0.6 - strike * 0.7;
      p.upperArmR![0] += strike * 0.6;
      p.upperArmL![0] += strike * 0.4;
      p.torso![1] = -strike * 0.2;
    }
    if (a.harvest > 0) {
      p.upperArmL = [1.45, 0, 0.1];
      p.lowerArmL = [0.15, 0, 0];
      p.head = [-0.25, 0, 0];
    }
  } else {
    // Relaxed arms swinging opposite the legs.
    const sw = sin(phase) * amp * 0.8;
    p.upperArmL = [-sw + breathe, 0, 0.08];
    p.upperArmR = [sw + breathe, 0, -0.08];
    p.lowerArmL = [0.2 + amp * 0.3, 0, 0];
    p.lowerArmR = [0.2 + amp * 0.3, 0, 0];
  }
  if (a.hit > 0) {
    p.chest![0] += a.hit * 0.3;
    p.head![0] += a.hit * 0.25;
  }
  if (a.roll > 0) {
    const r = a.roll;
    p.pitch = -r * PI * 2;
    p.pivot = 0.5;
    const tuck = sin(r * PI);
    p.lift = -tuck * 0.45;
    p.upperLegL = [1.8 * tuck, 0, 0];
    p.upperLegR = [1.8 * tuck, 0, 0];
    p.lowerLegL = [-2.2 * tuck, 0, 0];
    p.lowerLegR = [-2.2 * tuck, 0, 0];
    p.torso = [0.6 * tuck, 0, 0];
  }
  const fall = Math.max(a.knock, a.dead);
  if (fall > 0) {
    p.pitch = (p.pitch ?? 0) * (1 - fall) + 1.45 * fall;
    p.pivot = 0;
    p.lift = (p.lift ?? 0) * (1 - fall) + 0.12 * fall;
    p.roll = a.dead * 0.25;
    p.upperArmL = [0.3 * fall, 0, 0.9 * fall];
    p.upperArmR = [0.3 * fall, 0, -0.9 * fall];
    p.upperLegL = [0.2 * fall, 0, 0.1];
    p.upperLegR = [0.5 * fall, 0, -0.1];
    p.lowerLegR = [-0.6 * fall, 0, 0];
  }
  return p;
}

/** Idle for crew and friendly NPCs: breathing, weight shifts, a glance aside. */
export function idlePose(t: number, seed: number, talking: number, seated = false): Pose {
  const s = seed * 1.37;
  const breathe = sin(t * 1.5 + s) * 0.03;
  const shift = sin(t * 0.31 + s) * 0.5 + 0.5;
  const glancePhase = (t * 0.13 + s) % 1;
  const glance = glancePhase > 0.8 ? sin(((glancePhase - 0.8) / 0.2) * PI) * 0.7 : 0;
  const gest = talking * sin(t * 2.3 + s) * 0.25;
  const p: Pose = {
    pelvis: [0, 0, (shift - 0.5) * 0.06],
    torso: [breathe, 0, -(shift - 0.5) * 0.05],
    chest: [breathe * 0.5, 0, 0],
    head: [glance * 0.15, glance * (seed % 2 ? 1 : -1) * (1 - talking), 0],
    upperArmL: [0.05 + gest * 0.6, 0, 0.1],
    upperArmR: [0.05 - gest * 0.3, 0, -0.1],
    lowerArmL: [0.25 + talking * 0.5 + gest, 0, 0],
    lowerArmR: [0.25 + talking * 0.3, 0, 0],
    upperLegL: [0, 0, 0.03 + shift * 0.04],
    upperLegR: [0, 0, -0.03 - (1 - shift) * 0.04],
    lowerLegL: [-shift * 0.12, 0, 0],
    lowerLegR: [-(1 - shift) * 0.12, 0, 0],
  };
  if (seated) {
    p.lift = -0.45;
    p.upperLegL = [1.5, 0, 0.05];
    p.upperLegR = [1.5, 0, -0.05];
    p.lowerLegL = [-1.5, 0, 0];
    p.lowerLegR = [-1.5, 0, 0];
    p.upperArmL = [0.7, 0, 0.1];
    p.upperArmR = [0.7 + gest, 0, -0.1];
    p.lowerArmL = [0.6, 0, 0];
    p.lowerArmR = [0.6, 0, 0];
  }
  return p;
}
