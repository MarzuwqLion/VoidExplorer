import * as THREE from 'three';
import { mat, glow, box, cyl } from '../materials';
import { buildHumanoid, applyPose, type Pose } from './humanoid';
import { legs } from '../../player/anim';
import { buildWeapon } from './weapons';
import { LOOKS } from '../../data/characters';
import type { EnemyType } from '../../data/names';
import { buildCreature, buildSpitter, damp, ease, fader } from './creature';

export type EnemyAnimState = 'idle' | 'move' | 'telegraph' | 'attack' | 'recover' | 'flinch' | 'stagger' | 'stunned' | 'cover' | 'dead';
export interface EnemyVisualState {
  state: EnemyAnimState;
  /** Seconds in current state. */
  stateT: number;
  /** Ground speed m/s. */
  speed: number;
  /** Distance travelled (m), for gait phase. */
  dist: number;
  /** 0..1, decays; adds a quick recoil. */
  flinch: number;
  /** 0..1 telegraph colour cue intensity (attack wind-up). */
  glow: number;
  /** 0..1, raiders crouched behind cover. */
  crouch: number;
  /** Radians, positive aims up (raiders and foreman). */
  aimPitch: number;
  /** 0..1, foreman heat sinks open; alpha flank patches glow. */
  weakOpen: number;
  /** Seconds since death. */
  deadT: number;
}
export interface EnemyVisual {
  /** Caller sets position (feet on ground) and rotation.y (model faces -Z at yaw 0). */
  root: THREE.Group;
  update(dt: number, s: EnemyVisualState): void;
  setOpacity(o: number): void;
  /** World position of weapon muzzle / spit origin / cannon tip. */
  muzzle(out: THREE.Vector3): THREE.Vector3;
}

type V3 = [number, number, number];
const mix3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const TAU = Math.PI * 2;

type RaiderType = 'rifleman' | 'rusher' | 'marksman';

function buildRaider(type: RaiderType): EnemyVisual {
  const h = buildHumanoid(LOOKS[type]);
  const rusher = type === 'rusher';
  const gun = buildWeapon(rusher ? 'smg' : 'rifle');
  if (rusher) {
    gun.scale.set(1.6, 1.6, 0.95);
    const bore = cyl(0.032, 0.032, 0.14, mat(0x2a2c30, { rough: 0.5, metal: 0.5 }), 8);
    bore.rotation.x = Math.PI / 2;
    bore.position.set(0, 0.035, -0.29);
    gun.add(bore);
  } else if (type === 'marksman') gun.scale.z = 1.25 * 1.4;
  h.gunMount.add(gun);
  const tip = gun.getObjectByName('muzzle') ?? gun;
  const lampM = glow(0xff3020, 0.3);
  h.joints.head.add(box(0.05, 0.04, 0.06, lampM, 0.14, 0.13, -0.04));
  h.joints.shoulderL.add(box(0.06, 0.05, 0.06, lampM, -0.05, 0.08, -0.08));
  const mountBase = h.gunMount.position.clone();
  const over = new THREE.Vector3(0, 0.72, -0.05);
  const seed = Math.random() * 10;
  let tw = 0;
  let t = 0;
  function update(dt: number, s: EnemyVisualState): void {
    t += dt;
    tw = damp(tw, s.state === 'telegraph' ? 1 : 0, 10, dt);
    const crouch = Math.max(s.crouch, type === 'marksman' ? tw * 0.45 : 0);
    const phase = (s.dist / (s.speed > 3 ? 1.9 : 1.3)) * TAU;
    const amp = Math.min(0.9, s.speed * 0.14) * (1 - crouch * 0.45);
    const breathe = Math.sin(t * 1.7 + seed) * 0.025 * (1 - tw);
    const p: Pose = { ...legs(phase, amp, crouch), lift: -0.4 * crouch + Math.abs(Math.sin(phase)) * Math.min(0.05, s.speed * 0.008) };
    let rec = 0;
    if (s.state === 'attack') {
      if (type === 'rifleman') rec = Math.max(0, 1 - ((s.stateT * 8) % 1) * 4);
      else if (rusher) rec = Math.max(0, 1 - ((s.stateT * 1.5) % 1) * 3) * 1.6;
      else rec = Math.max(0, 1 - s.stateT * 4) * 1.5;
    }
    const shout = rusher ? tw : 0;
    p.torso = [0.04 + breathe, 0, 0];
    p.chest = [s.aimPitch * 0.7 + rec * 0.06 + s.flinch * 0.35 + shout * 0.15, 0, 0];
    p.neck = [s.aimPitch * 0.3 + s.flinch * 0.2 + shout * 0.55, 0, 0];
    p.upperArmR = mix3([1.25 + rec * 0.15, 0, -0.18], [2.9, 0, -0.3], shout);
    p.lowerArmR = mix3([0.9, 0, 0], [0.3, 0, 0], shout);
    p.upperArmL = mix3([1.6, 0, 0.55], [2.9, 0, 0.3], shout);
    p.lowerArmL = mix3([0.7, 0, 0], [0.3, 0, 0], shout);
    p.handR = [-0.2, 0, 0];
    p.handL = [-0.2, 0, 0];
    p.shoulderL = [0, -0.25 * (1 - shout), 0];
    h.gunMount.position.lerpVectors(mountBase, over, shout);
    h.gunMount.rotation.y = shout * Math.PI * 0.5;
    if (type === 'marksman' && tw > 0.01) {
      p.upperLegR![0] -= 0.5 * tw;
      p.lowerLegR![0] -= 0.6 * tw;
    }
    if (s.state === 'recover') {
      p.upperArmR[0] -= 0.4;
      p.upperArmL[0] -= 0.4;
    }
    if (s.state === 'stagger' || s.state === 'stunned') {
      const w = s.state === 'stagger' ? 1 : 0.6;
      const sw = Math.sin(t * (s.state === 'stagger' ? 6 : 2.5));
      p.pitch = 0.1 * w;
      p.pivot = 0;
      p.roll = sw * 0.12 * w;
      p.torso = [0.25 * w, sw * 0.3 * w, 0];
      p.upperArmL = [0.5 + Math.sin(t * 7) * 0.4 * w, 0, 0.9 * w];
      p.lowerArmL = [0.4, 0, 0];
      p.upperLegL![0] -= 0.35 * w;
      p.upperLegR![0] += 0.3 * w;
      if (s.state === 'stunned') p.neck = [-0.4, 0, 0];
    }
    if (s.state === 'dead') {
      const f = ease(s.deadT / 0.6);
      p.pitch = (p.pitch ?? 0) * (1 - f) + 1.45 * f;
      p.pivot = 0;
      p.lift = (p.lift ?? 0) * (1 - f) + 0.12 * f;
      p.roll = 0.2 * f;
      p.upperArmL = mix3(p.upperArmL, [0.3, 0, 0.9], f);
      p.upperArmR = mix3(p.upperArmR, [0.3, 0, -0.9], f);
      p.upperLegL = mix3(p.upperLegL!, [0.2, 0, 0.1], f);
      p.upperLegR = mix3(p.upperLegR!, [0.5, 0, -0.1], f);
      p.lowerLegR = mix3(p.lowerLegR!, [-0.6, 0, 0], f);
    }
    applyPose(h, p);
    lampM.emissiveIntensity = 0.25 + s.glow * 4;
  }
  return { root: h.root, update, setOpacity: fader(h.root), muzzle: (out) => tip.getWorldPosition(out) };
}

function grp(parent: THREE.Object3D, x: number, y: number, z: number, name = ''): THREE.Group {
  const g = new THREE.Group();
  g.name = name;
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

/** Industrial exo-rig boss, 2.8 m: operator cage, rotary cannon (right), loader claw (left), shoulder heat sinks. */
function buildForeman(): EnemyVisual {
  const yel = mat(0xd8a830, { rough: 0.75, metal: 0.25 });
  const blk = mat(0x18181a, { rough: 0.7 });
  const steel = mat(0x5a5e64, { rough: 0.45, metal: 0.6 });
  const dark = mat(0x23272d, { rough: 0.7, metal: 0.3 });
  const op = mat(0x3a2a20, { rough: 0.9 });
  const heat = mat(0x3a2018, { rough: 0.5, emissive: 0xff4a1a, emissiveIntensity: 0 });
  const lampM = glow(0xff3020, 0.3);
  const root = new THREE.Group();
  const body = grp(root, 0, 0, 0);
  const pelvis = grp(body, 0, 1.25, 0);
  pelvis.add(box(0.9, 0.3, 0.6, yel));
  const legJ: { hip: THREE.Group; knee: THREE.Group; ankle: THREE.Group }[] = [];
  for (const side of [-1, 1]) {
    const hip = grp(pelvis, side * 0.4, -0.05, 0);
    hip.add(box(0.3, 0.62, 0.36, steel, 0, -0.31, 0));
    const knee = grp(hip, 0, -0.62, 0);
    knee.add(box(0.38, 0.55, 0.44, yel, 0, -0.27, 0));
    const stripe = box(0.4, 0.08, 0.46, blk, 0, -0.24, 0);
    stripe.rotation.z = side * 0.4;
    knee.add(stripe);
    const ankle = grp(knee, 0, -0.55, 0);
    ankle.add(box(0.5, 0.16, 0.75, dark, 0, 0.05, -0.1));
    legJ.push({ hip, knee, ankle });
  }
  const torso = grp(pelvis, 0, 0.15, 0);
  torso.add(box(0.6, 0.25, 0.5, dark, 0, 0.05, 0));
  torso.add(box(1.0, 0.9, 0.14, yel, 0, 0.62, 0.38));
  torso.add(box(1.0, 0.08, 0.8, yel, 0, 0.22, 0));
  torso.add(box(1.05, 0.1, 0.85, yel, 0, 1.05, 0));
  for (const x of [-0.48, 0.48]) for (const z of [-0.38, 0.3]) torso.add(box(0.06, 0.8, 0.06, steel, x, 0.63, z));
  torso.add(box(0.96, 0.05, 0.05, steel, 0, 0.6, -0.4));
  for (const x of [-0.36, 0, 0.36]) {
    const st = box(0.1, 0.11, 0.02, blk, x, 1.05, -0.43);
    st.rotation.z = 0.7;
    torso.add(st);
  }
  torso.add(box(0.36, 0.08, 0.36, dark, 0, 0.4, 0.1));
  torso.add(box(0.3, 0.38, 0.22, op, 0, 0.62, 0.08));
  const opHead = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), op);
  opHead.position.set(0, 0.92, 0.05);
  opHead.castShadow = true;
  torso.add(opHead);
  const lamp = cyl(0.05, 0.06, 0.1, lampM, 8);
  lamp.position.set(0.35, 1.15, -0.25);
  torso.add(lamp);
  for (const x of [-0.3, 0.3]) {
    const ex = cyl(0.06, 0.07, 0.4, steel, 8);
    ex.position.set(x, 1.2, 0.4);
    torso.add(ex);
  }
  const lids: { lid: THREE.Group; side: number }[] = [];
  for (const side of [-1, 1]) {
    const sink = grp(torso, side * 0.68, 0.95, 0.05, side < 0 ? 'sinkL' : 'sinkR');
    sink.add(box(0.36, 0.3, 0.46, steel));
    for (const x of [-0.1, 0, 0.1]) sink.add(box(0.03, 0.12, 0.4, heat, x, 0.2, 0));
    const lid = grp(sink, side * 0.18, 0.27, 0);
    lid.add(box(0.36, 0.03, 0.46, yel, -side * 0.18, 0.015, 0));
    lids.push({ lid, side });
  }
  const arms: { sh: THREE.Group; el: THREE.Group }[] = [];
  const pincers: THREE.Group[] = [];
  const barrels = new THREE.Group();
  barrels.name = 'barrels';
  const tip = new THREE.Object3D();
  tip.name = 'muzzle';
  for (const side of [-1, 1]) {
    const sh = grp(torso, side * 0.72, 0.62, 0);
    sh.add(box(0.34, 0.2, 0.36, yel, 0, 0.08, 0));
    sh.add(box(0.26, 0.55, 0.3, yel, 0, -0.27, 0));
    const st = box(0.27, 0.06, 0.31, blk, 0, -0.18, 0);
    st.rotation.z = side * 0.4;
    sh.add(st);
    const el = grp(sh, 0, -0.55, 0);
    el.add(box(0.3, 0.3, 0.55, steel, 0, 0, -0.2));
    if (side > 0) {
      const housing = cyl(0.17, 0.17, 0.32, dark, 10);
      housing.rotation.x = Math.PI / 2;
      housing.position.z = -0.55;
      el.add(housing);
      barrels.position.z = -0.7;
      el.add(barrels);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        const b = cyl(0.035, 0.035, 0.6, steel, 6);
        b.rotation.x = Math.PI / 2;
        b.position.set(Math.cos(a) * 0.09, Math.sin(a) * 0.09, -0.3);
        barrels.add(b);
      }
      tip.position.z = -1.32;
      el.add(tip);
    } else {
      const claw = grp(el, 0, 0, -0.5);
      for (const dir of [-1, 1]) {
        const pc = grp(claw, 0, dir * 0.09, 0);
        pc.add(box(0.1, 0.05, 0.38, steel, 0, 0, -0.18));
        pc.add(box(0.1, 0.1, 0.06, dark, 0, -dir * 0.04, -0.36));
        pc.userData.dir = dir;
        pincers.push(pc);
      }
    }
    arms.push({ sh, el });
  }
  let t = 0;
  let tw = 0;
  let spin = 0;
  const c = { lean: 0, roll: 0, drop: 0 };
  type K = keyof typeof c;
  function update(dt: number, s: EnemyVisualState): void {
    t += dt;
    tw = damp(tw, s.state === 'telegraph' ? 1 : 0, s.state === 'attack' ? 18 : 5, dt);
    const spinT = s.state === 'telegraph' ? Math.min(28, 4 + s.stateT * 22) : s.state === 'attack' ? 32 : 0;
    spin = damp(spin, spinT, 3, dt);
    barrels.rotation.z += spin * dt;
    const ph = (s.dist / 1.8) * TAU;
    const amp = Math.min(1, s.speed / 2) * 0.42;
    const w = amp / 0.42;
    const g = { lean: 0, roll: 0, drop: 0 };
    if (s.state === 'recover') g.lean = -0.1;
    else if (s.state === 'stagger') Object.assign(g, { lean: 0.08, roll: Math.sin(t * 4) * 0.12 });
    else if (s.state === 'stunned') Object.assign(g, { lean: -0.28, drop: 0.5, roll: Math.sin(t * 1.8) * 0.08 });
    for (const k of Object.keys(c) as K[]) c[k] = damp(c[k], g[k], 6, dt);
    const f = s.state === 'dead' ? ease(s.deadT / 0.8) : 0;
    const f2 = s.state === 'dead' ? ease((s.deadT - 0.4) / 0.8) : 0;
    const jit = Math.sin(t * 70) * 0.015 * (s.state === 'attack' ? spin / 32 : 0);
    legJ.forEach((l, i) => {
      const off = i === 0 ? 0 : Math.PI;
      let hip = Math.sin(ph + off) * amp;
      let knee = -Math.max(0, -Math.cos(ph + off)) * amp * 1.6 - 0.06;
      if (i === 0) {
        hip += tw * 1.1;
        knee -= tw * 1.4;
      }
      hip *= 1 - f;
      knee = knee * (1 - f) - 1.5 * f;
      l.hip.rotation.x = hip;
      l.knee.rotation.x = knee;
      l.ankle.rotation.x = -(hip + knee) * (1 - f) + 1.5 * f;
    });
    body.position.y = (-Math.abs(Math.sin(ph)) * 0.07 * w) * (1 - f) - 0.32 * f;
    const roll = Math.sin(ph) * 0.05 * w - tw * 0.08 + c.roll;
    torso.rotation.set((c.lean + s.flinch * 0.12) * (1 - f) - 0.5 * f2 + jit, 0, roll * (1 - f) + 0.2 * f2);
    arms[1].sh.rotation.x = s.aimPitch * (1 - f) - c.drop - f * 0.4;
    arms[0].sh.rotation.x = 0.1 + Math.sin(t * 0.8) * 0.03 - c.drop - f * 0.4;
    arms[1].el.position.z = jit * 2;
    const open = f > 0 ? 0.4 : 0.12 + 0.1 * Math.sin(t * 1.3);
    for (const pc of pincers) pc.rotation.x = (pc.userData.dir as number) * open;
    for (const { lid, side } of lids) lid.rotation.z = -side * s.weakOpen * 1.9;
    heat.emissiveIntensity = s.weakOpen * (2.6 + 0.4 * Math.sin(t * 9));
    lampM.emissiveIntensity = (0.3 + s.glow * 4) * (1 - f);
  }
  return { root, update, setOpacity: fader(root), muzzle: (out) => tip.getWorldPosition(out) };
}

/** Build the animated visual for one enemy. Every call creates its own materials. */
export function buildEnemyVisual(type: EnemyType): EnemyVisual {
  switch (type) {
    case 'stalker':
      return buildCreature(false);
    case 'alpha':
      return buildCreature(true);
    case 'spitter':
      return buildSpitter();
    case 'foreman':
      return buildForeman();
    default:
      return buildRaider(type);
  }
}
