import * as THREE from 'three';
import { mat, glow, box, cyl } from '../materials';
import type { EnemyVisual, EnemyVisualState } from './enemyModels';

const TAU = Math.PI * 2;
export const damp = (c: number, t: number, rate: number, dt: number): number => c + (t - c) * (1 - Math.exp(-rate * dt));
export const ease = (x: number): number => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

/** Opacity setter for a model; remembers each material's own base opacity (e.g. a translucent sac). */
export function fader(root: THREE.Object3D): (o: number) => void {
  const base = new Map<THREE.Material, [number, boolean]>();
  root.traverse((ob) => {
    const mesh = ob as THREE.Mesh;
    if (!mesh.isMesh) return;
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) if (!base.has(m)) base.set(m, [m.opacity, m.transparent]);
  });
  return (o) => {
    for (const [m, [op, tr]] of base) {
      const want = tr || o < 1;
      if (m.transparent !== want) {
        m.transparent = want;
        m.needsUpdate = true;
      }
      m.opacity = op * o;
    }
  };
}

/** A two-segment leg: swing (fore/aft about X) > hip (splay about Z) > knee. */
export interface Leg {
  swing: THREE.Group;
  hip: THREE.Group;
  knee: THREE.Group;
  side: number;
  splay: number;
  bend: number;
  /** Body drop (m, unscaled) per unit of lift, for keeping feet planted while crouching. */
  drop: number;
}
export const legReach = (len: [number, number], splay: number, bend: number): number =>
  len[0] * Math.cos(splay) + len[1] * Math.cos(splay - bend);

export function buildLeg(parent: THREE.Object3D, x: number, y: number, z: number, side: number, len: [number, number], r: number, splay: number, bend: number, m: THREE.Material): Leg {
  const swing = new THREE.Group();
  swing.position.set(x, y, z);
  parent.add(swing);
  const hip = new THREE.Group();
  swing.add(hip);
  const up = cyl(r, r * 0.8, len[0], m, 6);
  up.position.y = -len[0] / 2;
  hip.add(up);
  const knee = new THREE.Group();
  knee.position.y = -len[0];
  hip.add(knee);
  const lo = cyl(r * 0.8, r * 0.35, len[1], m, 6);
  lo.position.y = -len[1] / 2;
  knee.add(lo);
  const drop = legReach(len, splay, bend) - (len[0] * Math.cos(splay + 0.45) + len[1] * Math.cos(splay + 0.1 - bend));
  const leg = { swing, hip, knee, side, splay, bend, drop };
  poseLeg(leg, 0, 0);
  return leg;
}
export function poseLeg(l: Leg, swing: number, lift: number, splay = 0, knee = 0): void {
  l.swing.rotation.x = swing;
  l.hip.rotation.z = l.side * (l.splay + splay + lift * 0.45);
  l.knee.rotation.z = -l.side * (l.bend + knee + lift * 0.35);
}

/** Six-legged pack hunter: the stalker, or (alpha) a 3.5 m pack leader with crown, shoulders and weak flank patches. */
export function buildCreature(alpha: boolean): EnemyVisual {
  const S = alpha ? 3.5 / 1.2 : 1;
  const hide = mat(alpha ? 0x173f40 : 0x1d4a4a, { rough: 0.85 });
  const dark = mat(0x0e2424, { rough: 0.7 });
  const stripeBase = alpha ? 0.9 : 0.35;
  const stripe = mat(0xff7a50, { rough: 0.6, emissive: 0xff7a50, emissiveIntensity: stripeBase });
  const root = new THREE.Group();
  const rig = new THREE.Group();
  rig.scale.setScalar(S);
  root.add(rig);
  const LEN: [number, number] = [0.3, 0.42];
  const H = legReach(LEN, 1.0, 1.15) + 0.01;
  const body = new THREE.Group();
  body.position.y = H;
  rig.add(body);
  body.add(box(0.3, 0.24, 0.5, hide, 0, 0.04, -0.15));
  body.add(box(0.26, 0.2, 0.45, hide, 0, 0.05, 0.3));
  const tail = box(0.07, 0.07, 0.3, hide, 0, 0.06, 0.64);
  tail.rotation.x = 0.35;
  body.add(tail);
  for (const z of [-0.32, -0.08, 0.18, 0.4]) {
    const f = z < 0;
    body.add(box(f ? 0.31 : 0.27, f ? 0.25 : 0.21, 0.05, stripe, 0, f ? 0.04 : 0.05, z));
  }
  const neck = new THREE.Group();
  neck.position.set(0, 0.08, -0.4);
  body.add(neck);
  neck.add(box(0.13, 0.12, 0.16, hide, 0, 0, -0.06));
  const head = new THREE.Group();
  head.position.set(0, 0, -0.14);
  neck.add(head);
  head.add(box(0.15, 0.12, 0.12, hide, 0, 0.02, 0));
  const upper = new THREE.Group();
  upper.position.set(0, 0.02, -0.04);
  head.add(upper);
  upper.add(box(0.13, 0.06, 0.3, hide, 0, 0, -0.15));
  upper.add(box(0.135, 0.015, 0.26, stripe, 0, 0.03, -0.13));
  const lower = new THREE.Group();
  lower.position.set(0, -0.03, -0.04);
  head.add(lower);
  lower.add(box(0.11, 0.04, 0.28, dark, 0, -0.01, -0.14));
  const tip = new THREE.Object3D();
  tip.position.set(0, -0.01, -0.34);
  head.add(tip);
  const flankM = mat(0xff6a7a, { rough: 0.5, emissive: 0xff5a70, emissiveIntensity: 0.4 });
  if (alpha) {
    const bone = mat(0xe8e0cc, { rough: 0.6 });
    body.add(box(0.42, 0.2, 0.34, hide, 0, 0.14, -0.26));
    for (let i = -2; i <= 2; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.17 - Math.abs(i) * 0.03, 4), bone);
      spike.position.set(i * 0.035, 0.1, 0.02 + Math.abs(i) * 0.02);
      spike.rotation.set(0.7, 0, -i * 0.3);
      spike.castShadow = true;
      head.add(spike);
    }
    for (const side of [-1, 1]) {
      const patch = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), flankM);
      patch.name = 'flank';
      patch.scale.set(0.35, 0.9, 1.4);
      patch.position.set(side * 0.155, 0.02, -0.07);
      body.add(patch);
    }
  }
  const legs: Leg[] = [];
  const tri: number[] = [];
  const baseSwing = [0.3, 0, -0.3];
  for (let i = 0; i < 3; i++)
    for (const side of [-1, 1]) {
      legs.push(buildLeg(body, side * 0.13, -0.01, -0.3 + i * 0.3, side, LEN, alpha ? 0.032 : 0.026, 1.0, 1.15, hide));
      tri.push((i + (side > 0 ? 1 : 0)) % 2);
    }
  const c = { y: 0, pitch: 0, roll: 0, z: 0, head: 0, jaw: 0, back: 0 };
  type K = keyof typeof c;
  let t = 0;
  function update(dt: number, s: EnemyVisualState): void {
    t += dt;
    let ph = (s.dist / (0.9 * S)) * TAU;
    let amp = Math.min(1, s.speed / (2.5 * S)) * 0.42;
    const g = { y: Math.sin(t * 2) * 0.006, pitch: 0, roll: 0, z: 0, head: Math.sin(t * 1.3) * 0.06, jaw: 0.05, back: 0 };
    let paw = 0;
    let yaw = 0;
    switch (s.state) {
      case 'telegraph':
        if (alpha) Object.assign(g, { pitch: 0.28, head: 0.55, jaw: 1, y: 0.03 });
        else Object.assign(g, { y: -0.18, pitch: -0.08, head: 0.18, jaw: 0.85 });
        if (alpha) paw = Math.max(0, Math.sin(s.stateT * 9));
        break;
      case 'attack':
        if (alpha) {
          amp = 0.62;
          if (s.speed < 1) ph += s.stateT * 14;
          Object.assign(g, { pitch: -0.12, head: -0.05, jaw: 0.6, y: -0.04 });
        } else Object.assign(g, { z: -0.22, pitch: 0.06, back: 0.6, jaw: 1, head: 0.15, y: 0.03 });
        break;
      case 'recover':
        Object.assign(g, { head: -0.45, y: -0.06, jaw: 0.2 });
        amp *= 0.6;
        break;
      case 'stagger':
        Object.assign(g, { roll: 0.35 + Math.sin(t * 9) * 0.08, head: -0.2, y: -0.05 });
        break;
      case 'stunned':
        Object.assign(g, { head: -0.6 + Math.sin(t * 1.7) * 0.08, roll: Math.sin(t * 2.2) * 0.16, y: -0.08, jaw: 0.3 });
        yaw = Math.sin(t * 1.4) * 0.3;
        break;
      default:
        break;
    }
    for (const k of Object.keys(c) as K[]) c[k] = damp(c[k], g[k], 10, dt);
    const d = s.state === 'dead' ? ease(s.deadT / 0.5) : 0;
    const fl = s.flinch;
    const bob = Math.abs(Math.sin(ph * 2)) * 0.012 * (amp / 0.42);
    const y = c.y * (1 - d);
    body.position.set(0, H + y + bob + (0.2 - H) * d, c.z + fl * 0.08);
    body.rotation.set(c.pitch * (1 - d) + fl * 0.18, Math.sin(t * 37) * fl * 0.1, c.roll * (1 - d) + d * 1.5);
    neck.rotation.set(c.head * (1 - d) - fl * 0.3 - d * 0.2, yaw, 0);
    const jaw = c.jaw * (1 - d) + d * 0.3;
    upper.rotation.x = jaw * 0.35;
    lower.rotation.x = -jaw * 0.6;
    const crouchLift = -y / legs[0].drop;
    legs.forEach((l, i) => {
      const off = tri[i] * Math.PI;
      let sw = baseSwing[Math.floor(i / 2)] + Math.sin(ph + off) * amp - c.back;
      let lift = Math.max(0, Math.cos(ph + off)) * amp * 2.2 + crouchLift - c.back * 0.8;
      if (i === 0 && paw > 0) {
        sw += 0.5 * paw;
        lift += 1.6 * paw;
      }
      sw *= 1 - d;
      poseLeg(l, sw, lift * (1 - d), -0.8 * d, 0.6 * d);
    });
    stripe.emissiveIntensity = (stripeBase + s.glow * 2.5) * (1 - d * 0.7);
    flankM.emissiveIntensity = 0.4 + s.weakOpen * 2.2 + (s.state === 'stunned' ? 1.2 + 0.5 * Math.sin(t * 6) : 0);
  }
  return { root, update, setOpacity: fader(root), muzzle: (out) => tip.getWorldPosition(out) };
}

/** Squat four-legged artillery beast with shingled bone plates and a glowing throat sac. */
export function buildSpitter(): EnemyVisual {
  const hide = mat(0x5a5040, { rough: 0.9 });
  const dark = mat(0x2e2820, { rough: 0.8 });
  const bone = mat(0xe8e0cc, { rough: 0.6 });
  const sacM = mat(0xffb030, { rough: 0.3, transparent: true, opacity: 0.75, emissive: 0xffb030, emissiveIntensity: 0.4 });
  const eyeM = glow(0xffb030, 1.2);
  const root = new THREE.Group();
  const LEN: [number, number] = [0.36, 0.4];
  const H = legReach(LEN, 0.45, 0.75) + 0.05;
  const body = new THREE.Group();
  body.position.y = H;
  root.add(body);
  body.add(box(0.85, 0.55, 1.2, hide, 0, 0.12, 0));
  body.add(box(0.7, 0.18, 1.0, dark, 0, -0.18, 0));
  body.add(box(0.75, 0.3, 0.6, hide, 0, 0.42, -0.2));
  for (let i = 0; i < 5; i++) {
    const p = box(0.98, 0.07, 0.42, bone, 0, 0.42 + i * 0.04, 0.5 - i * 0.24);
    p.rotation.x = -0.32;
    body.add(p);
  }
  const neck = new THREE.Group();
  neck.position.set(0, 0.15, -0.6);
  body.add(neck);
  neck.add(box(0.44, 0.3, 0.42, hide, 0, 0.02, -0.2));
  const brow = box(0.48, 0.06, 0.3, bone, 0, 0.19, -0.18);
  brow.rotation.x = 0.2;
  neck.add(brow);
  neck.add(box(0.06, 0.04, 0.02, eyeM, -0.15, 0.08, -0.415));
  neck.add(box(0.06, 0.04, 0.02, eyeM, 0.15, 0.08, -0.415));
  neck.add(box(0.36, 0.08, 0.3, dark, 0, -0.12, -0.22));
  const sac = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), sacM);
  sac.name = 'sac';
  sac.position.set(0, -0.2, -0.12);
  neck.add(sac);
  const mouth = new THREE.Object3D();
  mouth.position.set(0, -0.04, -0.44);
  neck.add(mouth);
  const legs: Leg[] = [];
  for (const z of [-0.42, 0.42]) for (const side of [-1, 1]) legs.push(buildLeg(body, side * 0.38, -0.05, z, side, LEN, 0.09, 0.45, 0.75, hide));
  const c = { y: 0, pitch: 0, roll: 0, neck: 0, nz: 0, jaw: 0 };
  type K = keyof typeof c;
  let t = 0;
  function update(dt: number, s: EnemyVisualState): void {
    t += dt;
    const ph = (s.dist / 1.1) * TAU;
    const amp = Math.min(1, s.speed / 1.5) * 0.3;
    const w = amp / 0.3;
    const g = { y: Math.sin(t * 1.6) * 0.008, pitch: 0, roll: 0, neck: Math.sin(t * 0.9) * 0.04, nz: 0, jaw: 0 };
    let jerk = 0;
    if (s.state === 'telegraph') Object.assign(g, { neck: 0.12, pitch: 0.05, jaw: 0.2, nz: 0.06 });
    else if (s.state === 'attack') jerk = s.stateT < 0.12 ? s.stateT / 0.12 : Math.max(0, 1 - (s.stateT - 0.12) / 0.5);
    else if (s.state === 'recover') Object.assign(g, { neck: -0.3, y: -0.04 });
    else if (s.state === 'stagger') Object.assign(g, { roll: 0.2 + Math.sin(t * 7) * 0.06, neck: -0.15 });
    else if (s.state === 'stunned') Object.assign(g, { neck: -0.4, roll: Math.sin(t * 2) * 0.12, y: -0.05 });
    for (const k of Object.keys(c) as K[]) c[k] = damp(c[k], g[k], 8, dt);
    const d = s.state === 'dead' ? ease(s.deadT / 0.6) : 0;
    const fl = s.flinch;
    const bob = -Math.abs(Math.sin(ph)) * 0.035 * w;
    body.position.set(0, (H + c.y + bob) * (1 - d) + 0.3 * d, fl * 0.06);
    body.rotation.set(c.pitch + fl * 0.1, 0, (c.roll + Math.sin(ph) * 0.04 * w) * (1 - d) + d * 0.1);
    neck.rotation.x = (c.neck + jerk * 0.55 - fl * 0.25) * (1 - d) - d * 0.35;
    neck.position.z = -0.6 + c.nz - jerk * 0.18;
    sac.scale.setScalar((1 + s.glow * 0.7) * (1 - jerk * 0.2));
    sacM.emissiveIntensity = 0.4 + s.glow * 3;
    const crouchLift = -c.y / legs[0].drop;
    legs.forEach((l, i) => {
      const off = ((i >> 1) + (l.side > 0 ? 1 : 0)) % 2 ? Math.PI : 0;
      const sw = (Math.sin(ph + off) * amp) * (1 - d);
      const lift = (Math.max(0, Math.cos(ph + off)) * amp * 2.5 + crouchLift) * (1 - d);
      poseLeg(l, sw, lift, d * 0.95, -l.bend * d);
    });
  }
  return { root, update, setOpacity: fader(root), muzzle: (out) => mouth.getWorldPosition(out) };
}
