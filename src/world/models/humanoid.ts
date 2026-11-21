import * as THREE from 'three';
import { glow, mat } from '../materials';
import { optimizeModel } from './optimize';
import { smooth, part, ell, rbox, tube, shade, mix, taper } from './shapes';
import { buildHead, type Face } from './humanoidHead';
import { dressUniform, dressArmor, addGear, type Gear, type Rig } from './humanoidGear';

export type { Gear } from './humanoidGear';
export type JointName =
  | 'pelvis' | 'torso' | 'chest' | 'neck' | 'head'
  | 'shoulderL' | 'upperArmL' | 'lowerArmL' | 'handL'
  | 'shoulderR' | 'upperArmR' | 'lowerArmR' | 'handR'
  | 'upperLegL' | 'lowerLegL' | 'footL'
  | 'upperLegR' | 'lowerLegR' | 'footR';

export interface HumanoidLook {
  skin: number;
  hair: number;
  hairStyle: 'short' | 'crop' | 'bun' | 'shaved' | 'curly' | 'swept' | 'none';
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
  /** Iris colour. */
  eye?: number;
  /** Brow tilt (rad); positive lifts the inner ends. */
  brow?: number;
  beard?: 'full' | 'stubble';
  /** Signature items. */
  gear?: Gear[];
  /** Raider extras. */
  cloak?: number;
  cloth?: number;
  antenna?: boolean;
  roundVisor?: number;
}

/** Every material a character is built from. */
export interface Palette {
  skin: THREE.Material; lip: THREE.Material; white: THREE.Material; iris: THREE.Material; hair: THREE.Material; stubble: THREE.Material;
  suit: THREE.Material; suitDark: THREE.Material; suitLight: THREE.Material; armor: THREE.Material; armorDark: THREE.Material;
  trim: THREE.Material; board: THREE.Material; trimDark: THREE.Material; trimGlow: THREE.Material; tape: THREE.Material; gold: THREE.Material;
  dark: THREE.Material; boot: THREE.Material; sole: THREE.Material; leather: THREE.Material; brown: THREE.Material; brownDark: THREE.Material;
  glove: THREE.Material; metal: THREE.Material; glass: THREE.Material; screen: THREE.Material; visor: THREE.Material;
  cloak: THREE.Material; cloth: THREE.Material; scarf: THREE.Material;
}

function palette(look: HumanoidLook): Palette {
  const gloved = !!look.gear?.includes('gloves');
  return {
    skin: smooth(look.skin), lip: smooth(mix(shade(look.skin, 0.78), 0x8a3a30, 0.25)), white: smooth(0xe6e2da), iris: smooth(look.eye ?? 0x2a1a10),
    hair: smooth(look.hair), stubble: smooth(mix(look.skin, look.hair, 0.3)),
    suit: smooth(look.suit), suitDark: smooth(shade(look.suit, 0.7)), suitLight: smooth(shade(look.suit, 1.18)),
    armor: smooth(look.armor), armorDark: smooth(shade(look.armor, 0.6)),
    trim: smooth(look.trim), board: smooth(mix(look.trim, look.suit, 0.35)), trimDark: smooth(shade(look.trim, 0.55)),
    trimGlow: mat(look.trim, { rough: 0.5, emissive: look.stripe ? look.trim : 0, emissiveIntensity: 0.25, flat: false }),
    tape: smooth(0xd8d4c8), gold: smooth(0xe0b850),
    dark: smooth(0x15171b), boot: smooth(0x1d1e22), sole: smooth(0x0b0b0c), leather: smooth(0x2a241e), brown: smooth(0x5a3e28), brownDark: smooth(0x3e2a1a),
    glove: smooth(gloved ? 0x2a2420 : 0x15171b), metal: smooth(0x9aa0a6), glass: mat(0x1e2a32, { rough: 0.15, metal: 0.6, flat: false }),
    screen: glow(0x5fd0ff, 0.6), visor: glow(look.visor ?? 0xffa53a, 0.9),
    cloak: smooth(look.cloak ?? 0x5a4a3a), cloth: smooth(look.cloth ?? 0xb02a22), scarf: smooth(0x6a4a3a),
  };
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
  head: THREE.Group;
  /** Eye and brow groups for blinking and expression (null under a helmet). */
  face: Face;
}

/** Hand on the forearm group: palm, curled fingers and thumb, facing the body. */
function hand(la: THREE.Group, side: number, m: THREE.Material, armored: boolean, P: Palette): void {
  la.add(part(rbox(0.04, 0.075, 0.075, 0.016), m, 0, -0.295, -0.005));
  la.add(part(rbox(0.034, 0.055, 0.07, 0.014), m, -side * 0.006, -0.355, -0.008, 0, 0, side * 0.18));
  la.add(part(ell(0.013, 1, 2, 1, 8, 6), m, -side * 0.016, -0.3, -0.042, 0.5));
  if (armored) la.add(part(rbox(0.046, 0.03, 0.078, 0.01), P.armorDark, side * 0.004, -0.325, -0.006));
}

/** Boot on the shin group: shaft, foot, toe cap and sole, sole bottom at the floor. */
function boot(ll: THREE.Group, bw: number, P: Palette): void {
  ll.add(part(tube(0.058 * bw, 0.056 * bw, 0.17, 12), P.boot, 0, -0.33, 0));
  ll.add(part(rbox(0.105, 0.08, 0.2, 0.03), P.boot, 0, -0.415, -0.05));
  ll.add(part(ell(0.052, 1, 0.75, 1.1, 12, 8), P.boot, 0, -0.42, -0.11));
  ll.add(part(rbox(0.112, 0.026, 0.235, 0.008), P.sole, 0, -0.447, -0.055));
}

/** Build a jointed humanoid about 1.8 m tall facing -Z, feet at y = 0, smooth-shaded with sculpted head and gear. */
export function buildHumanoid(look: HumanoidLook): Humanoid {
  const s = (look.height ?? 1.8) / 1.8;
  const bw = look.build;
  const P = palette(look);
  const armored = !look.uniform;
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  // Height scales the whole body so feet stay on the floor.
  body.scale.setScalar(s);
  const j = {} as Record<JointName, THREE.Group>;
  const joint = (name: JointName, parent: THREE.Object3D, x: number, y: number, z: number) => {
    const g = new THREE.Group();
    g.name = name;
    g.position.set(x, y, z);
    parent.add(g);
    j[name] = g;
    return g;
  };
  // Pelvis at hip height, belt and buckle.
  const pelvis = joint('pelvis', body, 0, 0.95, 0);
  pelvis.add(part(taper(rbox(0.34 * bw, 0.2, 0.22, 0.06), 1.02, 0.94), P.suit, 0, -0.02, 0));
  pelvis.add(part(rbox(0.37 * bw, 0.055, 0.24, 0.02), P.leather, 0, 0.06, 0));
  pelvis.add(part(rbox(0.05, 0.04, 0.012, 0.005), P.metal, 0, 0.06, -0.122));
  const torso = joint('torso', pelvis, 0, 0.08, 0);
  torso.add(part(taper(rbox(0.31 * bw, 0.26, 0.19, 0.07), 0.95, 1.08), P.suit, 0, 0.12, 0));
  const chest = joint('chest', torso, 0, 0.24, 0);
  chest.add(part(taper(rbox(0.42 * bw, 0.32, 0.24, 0.05), 0.84, 1), P.suit, 0, 0.13, 0));
  for (const side of [-1, 1]) chest.add(part(ell(0.068 * bw, 1, 0.9, 1), P.suit, side * 0.23 * bw, 0.25, 0));
  const neck = joint('neck', chest, 0, 0.3, 0);
  chest.add(part(tube(0.046, 0.055, 0.1, 14), P.skin, 0, 0.33, 0));
  const head = joint('head', neck, 0, 0.07, 0);
  const face = buildHead(head, look, P);
  const sleeves = !!look.gear?.includes('sleeves');
  const handM = look.uniform && !look.gear?.includes('gloves') ? P.skin : P.glove;
  const limbs = { shoulder: [] as THREE.Group[], upperArm: [] as THREE.Group[], lowerArm: [] as THREE.Group[], upperLeg: [] as THREE.Group[], lowerLeg: [] as THREE.Group[] };
  // Arms: tapered upper arm with an elbow cap, forearm, hand.
  for (const side of [-1, 1] as const) {
    const L = side < 0 ? 'L' : 'R';
    const sh = joint(('shoulder' + L) as JointName, chest, side * 0.25 * bw, 0.25, 0);
    const ua = joint(('upperArm' + L) as JointName, sh, side * 0.03, -0.02, 0);
    ua.add(part(tube(0.058 * bw, 0.05 * bw, 0.28), P.suit, 0, -0.14, 0));
    ua.add(part(ell(0.05 * bw, 1, 1, 1, 12, 8), P.suit, 0, -0.28, 0));
    const la = joint(('lowerArm' + L) as JointName, ua, 0, -0.28, 0);
    la.add(part(tube(0.05 * bw, 0.042 * bw, 0.25), sleeves ? P.skin : P.suit, 0, -0.125, 0));
    joint(('hand' + L) as JointName, la, 0, -0.26, 0);
    hand(la, side, handM, armored, P);
    limbs.shoulder.push(sh);
    limbs.upperArm.push(ua);
    limbs.lowerArm.push(la);
  }
  // Legs: tapered thigh with a knee cap, shin, boot.
  for (const side of [-1, 1] as const) {
    const L = side < 0 ? 'L' : 'R';
    const ul = joint(('upperLeg' + L) as JointName, pelvis, side * 0.1 * bw, -0.07, 0);
    ul.add(part(tube(0.082 * bw, 0.064 * bw, 0.42), P.suit, 0, -0.21, 0));
    ul.add(part(ell(0.063 * bw, 1, 1, 1, 12, 8), P.suit, 0, -0.42, 0));
    const ll = joint(('lowerLeg' + L) as JointName, ul, 0, -0.42, 0);
    ll.add(part(tube(0.062 * bw, 0.048 * bw, 0.3), P.suit, 0, -0.15, 0));
    joint(('foot' + L) as JointName, ll, 0, -0.42, 0);
    boot(ll, bw, P);
    limbs.upperLeg.push(ul);
    limbs.lowerLeg.push(ll);
  }
  const r = { pelvis, torso, chest, ...limbs } as Rig;
  if (look.uniform) dressUniform(r, look, P);
  if (armored || look.cloth !== undefined) dressArmor(r, look, P);
  addGear(r, look, P);
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
  return { root, body, joints: j, gunMount, backMount, thighMount, head, face };
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
