import * as THREE from 'three';
import { mat, glow } from '../materials';
import { optimizeModel } from './optimize';

export type JointName =
  | 'pelvis' | 'torso' | 'chest' | 'neck' | 'head'
  | 'shoulderL' | 'upperArmL' | 'lowerArmL' | 'handL'
  | 'shoulderR' | 'upperArmR' | 'lowerArmR' | 'handR'
  | 'upperLegL' | 'lowerLegL' | 'footL'
  | 'upperLegR' | 'lowerLegR' | 'footR';

export interface HumanoidLook {
  skin: number;
  hair: number;
  hairStyle: 'short' | 'crop' | 'bun' | 'shaved' | 'curly' | 'none';
  suit: number;
  armor: number;
  trim: number;
  /** Width multiplier for shoulders and torso. */
  build: number;
  height?: number;
  helmet?: boolean;
  visor?: number;
  stripe?: boolean;
  /** Lighter armor coverage for crew uniforms. */
  uniform?: boolean;
  /** Raider extras. */
  cloak?: number;
  cloth?: number;
  antenna?: boolean;
  roundVisor?: number;
}

export interface Humanoid {
  root: THREE.Group;
  /** Body group offset vertically for crouch and knockdown. */
  body: THREE.Group;
  joints: Record<JointName, THREE.Group>;
  /** Mount on the chest for a held weapon. */
  gunMount: THREE.Group;
  /** Holster points for carried weapons. */
  backMount: THREE.Group;
  thighMount: THREE.Group;
  materials: THREE.MeshStandardMaterial[];
  head: THREE.Group;
}

function part(geo: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
const B = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const C = (r: number, h: number, s = 8) => new THREE.CylinderGeometry(r, r * 0.9, h, s);

/** Build a jointed low-poly humanoid about 1.8 m tall facing -Z, feet at y = 0. */
export function buildHumanoid(look: HumanoidLook): Humanoid {
  const s = (look.height ?? 1.8) / 1.8;
  const bw = look.build;
  const skin = mat(look.skin, { rough: 0.7 });
  const suit = mat(look.suit, { rough: 0.85 });
  const armor = mat(look.armor, { rough: 0.6, metal: 0.2 });
  const trim = mat(look.trim, { rough: 0.5, emissive: look.stripe ? look.trim : 0, emissiveIntensity: 0.25 });
  const hair = mat(look.hair, { rough: 0.9 });
  const dark = mat(0x101216, { rough: 0.4 });
  const materials = [skin, suit, armor, trim, hair, dark];
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const j = {} as Record<JointName, THREE.Group>;
  const joint = (name: JointName, parent: THREE.Object3D, x: number, y: number, z: number) => {
    const g = new THREE.Group();
    g.name = name;
    g.position.set(x, y, z);
    parent.add(g);
    j[name] = g;
    return g;
  };
  // Pelvis at hip height.
  const pelvis = joint('pelvis', body, 0, 0.95 * s, 0);
  pelvis.add(part(B(0.36 * bw, 0.2, 0.22), suit, 0, -0.02, 0));
  pelvis.add(part(B(0.4 * bw, 0.08, 0.25), armor, 0, 0.06, 0));
  const torso = joint('torso', pelvis, 0, 0.08, 0);
  torso.add(part(B(0.34 * bw, 0.24, 0.2), suit, 0, 0.12, 0));
  const chest = joint('chest', torso, 0, 0.24, 0);
  chest.add(part(B(0.44 * bw, 0.3, 0.26), suit, 0, 0.12, 0));
  if (!look.uniform) {
    chest.add(part(B(0.46 * bw, 0.26, 0.08), armor, 0, 0.13, -0.15));
    chest.add(part(B(0.4 * bw, 0.22, 0.06), armor, 0, 0.12, 0.15));
  } else {
    chest.add(part(B(0.45 * bw, 0.05, 0.27), trim, 0, 0.27, 0));
  }
  if (look.stripe) {
    chest.add(part(B(0.06, 0.24, 0.02), trim, 0.12 * bw, 0.13, -0.195));
  }
  if (look.cloak !== undefined) {
    const cl = mat(look.cloak, { rough: 1 });
    materials.push(cl);
    const c = part(B(0.6 * bw, 1.0, 0.06), cl, 0, -0.32, 0.17);
    c.rotation.x = 0.12;
    chest.add(c);
  }
  if (look.antenna) chest.add(part(C(0.012, 1.1, 4), dark, -0.16 * bw, 0.6, 0.14));
  const neck = joint('neck', chest, 0, 0.3, 0);
  chest.add(part(C(0.06, 0.08), skin, 0, 0.33, 0));
  const head = joint('head', neck, 0, 0.07, 0);
  if (look.helmet) {
    head.add(part(new THREE.SphereGeometry(0.15, 10, 8), armor, 0, 0.12, 0.01));
    const visorM = look.roundVisor !== undefined ? mat(0x111111, { rough: 0.2, metal: 0.6 }) : glow(look.visor ?? 0xffa53a, 0.9);
    materials.push(visorM);
    if (look.roundVisor !== undefined) {
      const v = part(new THREE.SphereGeometry(0.09, 10, 8), visorM, 0, 0.12, -0.1);
      v.scale.set(1, 1, 0.5);
      head.add(v);
    } else head.add(part(B(0.22, 0.07, 0.06), visorM, 0, 0.13, -0.13));
    head.add(part(B(0.2, 0.05, 0.2), armor, 0, 0.02, 0));
  } else {
    head.add(part(B(0.17, 0.21, 0.19), skin, 0, 0.11, 0));
    head.add(part(B(0.035, 0.025, 0.02), dark, -0.045, 0.13, -0.096));
    head.add(part(B(0.035, 0.025, 0.02), dark, 0.045, 0.13, -0.096));
    head.add(part(B(0.15, 0.025, 0.04), hair, 0, 0.165, -0.085));
    head.add(part(B(0.04, 0.05, 0.04), skin, 0, 0.09, -0.105));
    const hs = look.hairStyle;
    if (hs === 'short' || hs === 'crop') head.add(part(B(0.185, hs === 'crop' ? 0.05 : 0.08, 0.205), hair, 0, 0.215, 0.005));
    if (hs === 'short') head.add(part(B(0.185, 0.12, 0.05), hair, 0, 0.16, 0.085));
    if (hs === 'bun') {
      head.add(part(B(0.185, 0.07, 0.205), hair, 0, 0.215, 0.005));
      head.add(part(new THREE.SphereGeometry(0.06, 8, 6), hair, 0, 0.2, 0.12));
    }
    if (hs === 'curly') head.add(part(new THREE.IcosahedronGeometry(0.13, 0), hair, 0, 0.2, 0.01));
    if (hs === 'shaved') head.add(part(B(0.18, 0.02, 0.2), hair, 0, 0.222, 0));
  }
  // Arms.
  for (const side of [-1, 1] as const) {
    const L = side < 0 ? 'L' : 'R';
    const sh = joint(('shoulder' + L) as JointName, chest, side * 0.25 * bw, 0.25, 0);
    if (!look.uniform) chest.add(part(B(0.16, 0.08, 0.2), side > 0 && look.stripe ? trim : armor, side * 0.25 * bw + side * 0.03, 0.27, 0));
    if (look.cloth !== undefined && side > 0) {
      const cm = mat(look.cloth, { rough: 1 });
      materials.push(cm);
      sh.add(part(B(0.17, 0.12, 0.22), cm, side * 0.03, -0.02, 0));
    }
    const ua = joint(('upperArm' + L) as JointName, sh, side * 0.03, -0.02, 0);
    ua.add(part(C(0.055 * bw, 0.28), suit, 0, -0.14, 0));
    const la = joint(('lowerArm' + L) as JointName, ua, 0, -0.28, 0);
    la.add(part(C(0.05 * bw, 0.26), look.uniform ? suit : armor, 0, -0.13, 0));
    joint(('hand' + L) as JointName, la, 0, -0.26, 0);
    la.add(part(B(0.07, 0.09, 0.08), look.uniform ? skin : dark, 0, -0.3, 0));
  }
  // Legs.
  for (const side of [-1, 1] as const) {
    const L = side < 0 ? 'L' : 'R';
    const ul = joint(('upperLeg' + L) as JointName, pelvis, side * 0.1 * bw, -0.07, 0);
    ul.add(part(C(0.075 * bw, 0.42), suit, 0, -0.21, 0));
    if (!look.uniform) ul.add(part(B(0.14 * bw, 0.2, 0.06), armor, 0, -0.18, -0.07));
    const ll = joint(('lowerLeg' + L) as JointName, ul, 0, -0.42, 0);
    ll.add(part(C(0.06 * bw, 0.4), look.uniform ? suit : armor, 0, -0.2, 0));
    joint(('foot' + L) as JointName, ll, 0, -0.42, 0);
    ll.add(part(B(0.11, 0.08, 0.24), dark, 0, -0.42, -0.05));
  }
  const gunMount = new THREE.Group();
  gunMount.position.set(0.06, 0.12, -0.32);
  chest.add(gunMount);
  const backMount = new THREE.Group();
  backMount.position.set(0, 0.15, 0.2);
  backMount.rotation.set(0, 0, Math.PI / 4);
  chest.add(backMount);
  const thighMount = new THREE.Group();
  thighMount.position.set(0.11 * bw, -0.15, 0.02);
  j.upperLegR.add(thighMount);
  optimizeModel(root);
  return { root, body, joints: j, gunMount, backMount, thighMount, materials, head };
}

/** Euler rotations per joint. */
export type Pose = Partial<Record<JointName, [number, number, number]>> & { lift?: number; pitch?: number; roll?: number; pivot?: number };

export function applyPose(h: Humanoid, p: Pose): void {
  for (const k in h.joints) {
    const r = p[k as JointName];
    const jn = h.joints[k as JointName];
    if (r) jn.rotation.set(r[0], r[1], r[2]);
    else jn.rotation.set(0, 0, 0);
  }
  // Rotate the body about a pivot height (0 = feet, ~0.55 = middle, for rolls).
  const th = p.pitch ?? 0, c = p.pivot ?? 0;
  h.body.rotation.set(th, 0, p.roll ?? 0);
  h.body.position.set(0, (p.lift ?? 0) + c - c * Math.cos(th), -c * Math.sin(th));
}

/** Linear blend between two poses. */
export function blendPose(a: Pose, b: Pose, t: number): Pose {
  const out: Pose = {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if (k === 'lift' || k === 'pitch' || k === 'roll' || k === 'pivot') {
      out[k] = ((a[k] as number) ?? 0) * (1 - t) + ((b[k] as number) ?? 0) * t;
      continue;
    }
    const ra = a[k as JointName] ?? [0, 0, 0], rb = b[k as JointName] ?? [0, 0, 0];
    out[k as JointName] = [ra[0] + (rb[0] - ra[0]) * t, ra[1] + (rb[1] - ra[1]) * t, ra[2] + (rb[2] - ra[2]) * t];
  }
  return out;
}
