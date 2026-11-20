import type { Prim, BoxPrim } from '../level';
import { Rng } from '../../core/rng';
import { AMARA, type XZ } from '../../data/layouts';

const A = AMARA, PL = AMARA.places, RV = AMARA.ravine;
const C = {
  white: 0xe6ebe8, teal: 0x2c8c88, amber: 0xe0a040, dark: 0x34444a, metal: 0x8a9096, crate: 0xa8824c, crateT: 0x3a8a84,
  rock: 0x8c7466, rock2: 0x6f6a62, trunk: 0x6e5244, bark: 0x8a6658, coral: 0xff8a70, gold: 0xe0b050, soil: 0x5a4434,
  glowC: 0x5cf2d0, glowA: 0xffc060, orange: 0xd8742a, gray: 0x6a7078, water: 0x3a8ab8, pad: 0x55646a, plant: 0xa8b048, bone: 0xe8e0d0,
};
/** Mission points that must stay clear: triggers, spawns, checkpoints, crates and beat starts from missions/amara.ts. */
const MISSION_POINTS: [number, number][] = [
  [22, 50], [54, 36], [56, 38], [50, 52], [48, 61], [52, 44], [46, 38], [52, 58], [50, 40], [47, 66], [15, 50], [58, 36],
  [70, 28], [58, 6], [82, -5], [82, 12], [70, -20], [68, -24], [72, -18], [66, -16], [70, -24], [73.5, -24], [70, -26],
  [62, -50], [40, -58], [30, -52], [48, -61], [35, -55], [28, -60], [44, -51], [20, -56], [16, -54], [22, -60], [12, -56], [10, -53],
  [-14, -58], [-38, -60], [-30, -37], [-27, -37], [-30, -36], [0, -57], [-23, 49], [-24, 50], [-26, 52],
];
const KEEP: XZ[] = [
  ...A.nodes, ...Object.values(A.npcs), ...A.cores, { x: A.beacon.x + 1.5, z: A.beacon.z }, PL.tunnelGate, PL.tunnelExit,
  ...MISSION_POINTS.map(([x, z]) => ({ x, z })),
];
/** True when a prim of footprint radius r at (x, z) keeps 1.5 m from every mission point and 7 m from the shuttle. */
function free(x: number, z: number, r: number): boolean {
  if (Math.hypot(x - A.shuttle.x, z - A.shuttle.z) < r + 7.5) return false;
  return KEEP.every((p) => Math.hypot(x - p.x, z - p.z) >= r + 1.6);
}

/** West river bank edge (x) at z; water lies west of it. */
export function riverX(z: number): number {
  return -99 + 2.5 * Math.sin(z * 0.045) + 1.5 * Math.sin(z * 0.11 + 1);
}
export interface GateSpot {
  x: number;
  z: number;
  rotY: number;
}
/** A point d metres from a toward b, with the yaw that spans a box across that direction. */
export function gateSpot(a: XZ, b: XZ, d: number): GateSpot {
  const l = Math.hypot(b.x - a.x, b.z - a.z), dx = (b.x - a.x) / l, dz = (b.z - a.z) / l;
  return { x: a.x + dx * d, z: a.z + dz * d, rotY: Math.atan2(-dx, -dz) };
}

export interface AmaraPropOpts {
  ground: (x: number, z: number) => number;
  gateTunnel: GateSpot;
  gateDen: GateSpot;
}

/** Every hand-placed and scattered prop on Amara. */
export function amaraProps(o: AmaraPropOpts): Prim[] {
  const out: Prim[] = [];
  const g = o.ground;
  const r = new Rng(2207);
  let seed = 1;
  const box = (x: number, z: number, w: number, h: number, d: number, color: number, extra: Partial<BoxPrim> = {}): void => {
    out.push({ kind: 'box', x, z, w, h, d, color, ...extra });
  };
  const deco = { solid: false, noNav: true, noShadow: true } as const;
  const rock = (x: number, z: number, w: number, h: number, d: number, color = C.rock, cover = h >= 1 && h <= 3, solid = true): void => {
    out.push({ kind: 'rock', x, z, w, h, d, rotY: r.range(0, Math.PI), seed: seed++, color, cover, solid });
  };
  const tree = (x: number, z: number, h = r.range(7, 12), style: 'fan' | 'dead' = 'fan'): void => {
    out.push({ kind: 'tree', x, z, h, r: r.range(0.45, 0.7), seed: 11, color: style === 'fan' ? C.bark : C.trunk, canopy: r.chance(0.6) ? C.coral : C.gold, style });
  };
  const glow = (x: number, z: number, n: number, color = r.chance(0.7) ? C.glowC : C.glowA): void => {
    for (let i = 0; i < n; i++) {
      const a = r.range(0, Math.PI * 2), d = r.range(0.2, 1.3);
      box(x + Math.cos(a) * d, z + Math.sin(a) * d, 0.16, r.range(0.25, 0.75), 0.16, color, { ...deco, rotY: a, emissive: color, mat: 'glow' });
    }
  };
  const gate = (id: string, s: GateSpot, w: number, h: number): void => {
    box(s.x, s.z, w, h, 0.55, C.orange, { id, rotY: s.rotY, mat: 'metal' });
    const cx = Math.cos(s.rotY), sz = -Math.sin(s.rotY), y = g(s.x, s.z);
    for (const sgn of [-1, 1]) box(s.x + cx * sgn * (w / 2 + 0.1), s.z + sz * sgn * (w / 2 + 0.1), 0.45, h + 0.5, 0.7, C.gray, { ...deco, noShadow: false, y: y - 0.3, rotY: s.rotY, mat: 'metal' });
    box(s.x, s.z, w + 0.9, 0.45, 0.7, C.gray, { ...deco, noShadow: false, y: y + h, rotY: s.rotY, mat: 'metal' });
  };

  // --- Landing zone pad (visual only; the shuttle keeps a clear 7 m). ---
  const sh = A.shuttle, yaw = (sh.yaw * Math.PI) / 180;
  box(sh.x, sh.z, 13, 0.06, 13, C.pad, { ...deco, y: g(sh.x, sh.z) + 0.01, rotY: yaw });
  for (const [a, b] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
    const lx = a * 6.2, lz = b * 6.2;
    box(sh.x + lx * Math.cos(yaw) + lz * Math.sin(yaw), sh.z - lx * Math.sin(yaw) + lz * Math.cos(yaw), 0.3, 0.2, 0.3, C.glowA, { ...deco, emissive: C.glowA, mat: 'glow' });
  }

  // --- Landfall Station: three habitat modules around the beacon, crates, planter bed and workbench. ---
  const S = A.beacon;
  for (const [ox, oz] of [[-10.5, -1], [-2, 12], [11, -10]]) {
    const x = S.x + ox, z = S.z + oz, rot = Math.atan2(S.x - x, S.z - z), y = g(x, z);
    box(x, z, 6, 3, 4, C.white, { rotY: rot, cover: true, mat: 'concrete' });
    box(x, z, 6.4, 0.35, 4.4, C.teal, { ...deco, noShadow: false, y: y + 3, rotY: rot });
    box(x, z, 6.08, 0.3, 4.08, C.amber, { ...deco, y: y + 1.9, rotY: rot });
    box(x + Math.sin(rot) * 2.03, z + Math.cos(rot) * 2.03, 1.3, 2.2, 0.12, C.dark, { ...deco, y, rotY: rot });
  }
  out.push({ kind: 'cyl', id: 'beacon', x: S.x, z: S.z, r: 0.45, rTop: 0.25, h: 9, color: C.metal, mat: 'metal' });
  out.push({ kind: 'cyl', id: 'beacon-light', x: S.x, z: S.z, y: g(S.x, S.z) + 9, r: 0.45, h: 0.7, color: C.dark, mat: 'metal', solid: false, noShadow: true });
  box(S.x, S.z, 2.4, 0.25, 2.4, C.gray, { ...deco, mat: 'metal' });
  for (const [ox, oz, t] of [[-6.5, -6.5, 0], [-5.2, -7.6, 1], [7, 6.2, 0], [8.3, 7.4, 1], [-10.5, 7.5, 0], [5.5, -6.2, 0], [14, 7, 1]]) {
    if (t) box(S.x + ox, S.z + oz, 1.4, 1.15, 1.0, C.crateT, { rotY: 0.3, cover: true, mat: 'metal' });
    else box(S.x + ox, S.z + oz, 1.2, 1.1, 1.2, C.crate, { rotY: -0.2, cover: true, mat: 'organic' });
  }
  const V = A.npcs.varga, bedX = V.x - 1.5, bedZ = V.z - 2.4;
  box(bedX, bedZ, 3.6, 0.55, 1.4, C.soil, { mat: 'organic' });
  for (let i = 0; i < 6; i++) box(bedX - 1.4 + i * 0.56, bedZ + r.range(-0.3, 0.3), 0.3, r.range(0.4, 0.8), 0.3, C.plant, { ...deco, y: g(bedX, bedZ) + 0.55, mat: 'organic' });
  glow(bedX, bedZ - 1.6, 4, C.glowA);
  const P = A.npcs.park;
  box(P.x + 2.1, P.z, 1.0, 0.95, 2.4, C.metal, { mat: 'metal' });
  box(P.x + 2.1, P.z - 0.5, 0.5, 0.25, 0.6, C.amber, { ...deco, y: g(P.x + 2.1, P.z) + 0.95 });

  // --- Meadow scatter: trees, rocks and glowing plants, kept off the walking line. ---
  const trailPts: XZ[] = [PL.lz, PL.station, PL.grove, RV.entry];
  const offTrail = (x: number, z: number, m: number): boolean => {
    for (let i = 0; i < trailPts.length - 1; i++) {
      const a = trailPts[i], b = trailPts[i + 1], vx = b.x - a.x, vz = b.z - a.z;
      const t = Math.max(0, Math.min(1, ((x - a.x) * vx + (z - a.z) * vz) / (vx * vx + vz * vz)));
      if (Math.hypot(x - a.x - vx * t, z - a.z - vz * t) < m) return false;
    }
    return true;
  };
  const near = (x: number, z: number, p: XZ, d: number): boolean => Math.hypot(x - p.x, z - p.z) < d;
  for (let i = 0, n = 0; i < 200 && n < 34; i++) {
    const x = r.range(-90, 52), z = r.range(30, 86);
    if (!offTrail(x, z, 7) || near(x, z, PL.station, 22) || near(x, z, PL.grove, 26) || near(x, z, sh, 16) || !free(x, z, 2)) continue;
    if (n % 3 === 2) rock(x, z, r.range(1.4, 2.6), r.range(0.7, 1.8), r.range(1.2, 2.2), r.chance(0.5) ? C.rock : C.rock2, false);
    else {
      tree(x, z);
      if (r.chance(0.6)) glow(x + 1.6, z + 0.8, 3);
    }
    n++;
  }
  // Thick coral forest closing the south.
  for (let z = 87; z < 107; z += 4.2)
    for (let x = -92; x < 104; x += 4.6) {
      const tx = x + r.range(-1.5, 1.5), tz = z + r.range(-1.5, 1.5);
      if (!near(tx, tz, sh, 12) && Math.hypot(tx - (PL.lz.x + sh.x) / 2, tz - (PL.lz.z + sh.z) / 2) > 15 && tx > riverX(tz) + 6) tree(tx, tz, r.range(8, 14));
      if (r.chance(0.12)) glow(tx + 1.5, tz - 1, 3);
    }

  // --- The Grove: coral ring with gaps west and east, 8 low boulders, 2 tall rocks, the nest mound with core 1. ---
  const G = PL.grove;
  for (const [ox, oz] of [[-7, -6], [-5, 7.5], [3, -8], [7, -2], [5, 8], [9, 4], [-1, 12.5], [10, -7]]) rock(G.x + ox, G.z + oz, r.range(1.8, 2.3), r.range(1.05, 1.35), r.range(1.4, 1.9));
  rock(G.x - 9, G.z - 10, 2.6, 2.5, 2.2);
  rock(G.x + 4, G.z + 15, 2.4, 2.3, 2.4);
  const core = A.cores[0];
  for (const deg of [-140, -100, -60, -20, 20, 60, 100, 140]) {
    const a = (deg * Math.PI) / 180;
    out.push({ kind: 'rock', x: core.x + Math.cos(a) * 3.3, z: core.z + Math.sin(a) * 3.3, w: 1.7, h: 0.8, d: 1.2, rotY: Math.atan2(-Math.cos(a), -Math.sin(a)), seed: seed++, color: C.rock2 });
    out.push({ kind: 'rock', x: core.x + Math.cos(a + 0.35) * 2.2, z: core.z + Math.sin(a + 0.35) * 2.2, w: 0.8, h: 0.3, d: 0.7, seed: seed++, color: C.rock2, solid: false, noShadow: true });
  }
  for (let i = 0, n = 0; i < 160 && n < 34; i++) {
    const a = r.range(-Math.PI, Math.PI), deg = (a * 180) / Math.PI, d = r.range(17, 25);
    if ((deg > 150 || deg < -145) || (deg > -80 && deg < 30)) continue;
    const x = G.x + Math.cos(a) * d, z = G.z + Math.sin(a) * d;
    if (!free(x, z, 1.2) || out.some((p) => p.kind === 'tree' && Math.hypot(p.x - x, p.z - z) < 3.2)) continue;
    tree(x, z);
    if (n % 2 === 0) glow(x - Math.cos(a) * 1.8, z - Math.sin(a) * 1.8, 4);
    n++;
  }

  // --- Survey tunnel: rock buttresses at the mouth and the orange gate across the slot. ---
  const t0 = A.tunnel[0], t1 = A.tunnel[1], tl = Math.hypot(t1.x - t0.x, t1.z - t0.z), px = -(t1.z - t0.z) / tl, pz = (t1.x - t0.x) / tl;
  for (const sgn of [-1, 1]) rock(t0.x - ((t1.x - t0.x) / tl) * 3 + px * sgn * 3.6, t0.z - ((t1.z - t0.z) / tl) * 3 + pz * sgn * 3.6, 2.6, 3.5, 2.4, C.rock, false);
  gate('gate-tunnel', o.gateTunnel, 3.6, 3);

  // --- The Ravine: 6 boulders, 3 fallen trunks, 2 tall rocks on the floor; ledge rocks; glowing nook. ---
  for (const [x, z] of [[67, 20.5], [74, 11], [65.5, 3], [73, -3], [75.2, -7.5], [75.2, -20.5]]) rock(x, z, r.range(1.8, 2.2), r.range(1.05, 1.35), r.range(1.5, 1.9));
  for (const [x, z, rot] of [[RV.x0 + 5.5, 14, 0.5], [RV.x0 + 7, -1, -0.35], [RV.x0 + 4.5, -11, 1.1]]) box(x, z, 6, 1.1, 1.0, C.trunk, { rotY: rot, cover: true, mat: 'organic' });
  rock(RV.x0 + 1.5, -24, 2.2, 2.4, 2, C.rock2);
  rock(RV.x1 - 1, 4, 2.2, 2.6, 2.2, C.rock2);
  for (const [x, z] of [[86, -8], [86.5, 8], [85, 20], [57.5, -2]]) rock(x, z, 2, 1.2, 1.6);
  const i2 = A.nodes.find((n) => n.id === 'a-i2')!;
  glow(i2.x + 3.5, i2.z + 2.5, 5, C.glowC);
  glow(RV.x0 + 0.8, 8, 4, C.glowC);
  glow(RV.x0 + 0.8, -6, 3, C.glowA);

  // --- The Ridge: 10 rock outcrops, low and tall, with long lanes between them. ---
  for (const [x, z, h] of [[68, -59, 2.6], [58, -57, 1.3], [52, -54, 2.4], [57.5, -61.8, 2.2], [46, -56, 1.3], [38, -61.5, 2.4], [35, -50.5, 1.2], [26, -56, 1.3], [31, -60.8, 2.5], [64, -61, 1.3]])
    rock(x, z, h > 2 ? 2.4 : 2, h, h > 2 ? 2.2 : 1.6, h > 2 ? C.rock2 : C.rock);

  // --- The Den: six pillars on the 11 m ring, the west nest with core 3, dead coral, the south gate. ---
  const D = PL.den;
  for (let i = 0; i < 6; i++) {
    const a = ((30 + i * 60) * Math.PI) / 180;
    out.push({ kind: 'cyl', id: 'pillar' + (i + 1), x: D.x + Math.cos(a) * A.den.pillarRing, z: D.z + Math.sin(a) * A.den.pillarRing, r: A.den.pillarWidth / 2, rTop: 0.8, h: 4.2, color: C.rock2, mat: 'rock', cover: true, seg: 7 });
  }
  const nest = A.den.nest;
  for (const deg of [75, 115, 155, 205, 245, 285]) {
    const a = (deg * Math.PI) / 180;
    out.push({ kind: 'rock', x: nest.x + Math.cos(a) * 2.9, z: nest.z + Math.sin(a) * 2.9, w: 1.6, h: 0.8, d: 1.1, rotY: Math.atan2(-Math.cos(a), -Math.sin(a)), seed: seed++, color: C.rock2 });
  }
  for (let i = 0; i < 5; i++) box(nest.x + r.range(-1.5, 1.5), nest.z + r.range(-1.5, 1.5), 0.12, 0.12, r.range(0.6, 1.1), C.bone, { ...deco, rotY: r.range(0, 3) });
  for (const deg of [120, 250, 300]) tree(D.x + Math.cos((deg * Math.PI) / 180) * 14.5, D.z + Math.sin((deg * Math.PI) / 180) * 14.5, r.range(5, 7), 'dead');
  for (const deg of [60, 135, 200, 235, 320]) glow(D.x + Math.cos((deg * Math.PI) / 180) * 15, D.z + Math.sin((deg * Math.PI) / 180) * 15, 4);
  gate('gate-den', o.gateDen, 6.4, 3.5);

  // --- River: translucent water following the bank, and a line of boulders along the bank top. ---
  for (let z = -110; z < 110; z += 10) {
    const e = Math.max(riverX(z), riverX(z + 5), riverX(z + 10)) + 2.5;
    box((e - 170) / 2, z + 5, e + 170, 0.6, 10.2, C.water, { ...deco, y: -2.6, mat: 'glass' });
  }
  for (const zz of [-400, 400]) box(-120, zz / 2 + Math.sign(zz) * 55, 100, 0.6, 400 - 110, C.water, { ...deco, y: -2.6, mat: 'glass' });
  for (let z = 20; z < 104; z += 2.3) out.push({ kind: 'rock', x: riverX(z) + 4.3, z, w: 2.6, h: r.range(1.5, 2.2), d: 3.0, rotY: r.range(-0.3, 0.3), seed: seed++, color: r.chance(0.5) ? C.rock : C.rock2 });

  // --- Highland tops: trees and rocks on the unreachable rock mass for silhouettes. ---
  for (let i = 0, n = 0; i < 600 && n < 60; i++) {
    const x = r.range(-95, 105), z = r.range(-105, 105), h = g(x, z);
    if (h < 9.5 || (x > 12 && x < 82 && z > -68 && z < -42)) continue;
    if (Math.abs(g(x + 2, z) - h) > 0.9 || Math.abs(g(x, z + 2) - h) > 0.9) continue;
    if (n % 3 === 0) rock(x, z, r.range(2, 4), r.range(1.5, 3.5), r.range(2, 4), C.rock, false);
    else tree(x, z, r.range(8, 13));
    n++;
  }
  return out;
}
