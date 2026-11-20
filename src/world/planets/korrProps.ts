import type { BoxPrim, Prim, RockPrim } from '../level';
import { KORR, type XZ } from '../../data/layouts';
import { Rng, fbm } from '../../core/rng';

/** Shared Korr geometry (terrain carving and props both read it). */
export const SEED = 7331;
const P = KORR.places;
const rd = { x: KORR.lzRamp.to.x - KORR.lzRamp.from.x, z: KORR.lzRamp.to.z - KORR.lzRamp.from.z };
const rl = Math.hypot(rd.x, rd.z);
/** The LZ ramp runs along lzRamp but is extended to 30 m so it stays near 31 degrees. */
export const RAMP = { a: KORR.lzRamp.from, u: { x: rd.x / rl, z: rd.z / rl }, len: 30, hw: 2.6, top: P.lz.h };
export const MESA = { x: (P.lz.x + KORR.shuttle.x) / 2, z: (P.lz.z + KORR.shuttle.z) / 2, r: 10.5 };
export const CANYON: XZ[] = KORR.canyonPath;
export const BASIN = { ...CANYON[0], r: 8.5 };
/** West wall of the yard (offset west of the side door so node k-a6 keeps 1.5 m clear). */
export const WALL_X = KORR.sideDoor.x - 1.8;
export const JOG_Z = KORR.mainGate.z - 6;
const G1 = { x: KORR.mainGate.x - 5, z: KORR.mainGate.z - 1 };
export const LOOKOUT_CAP = { a: CANYON[4], b: G1, r: 8.5 };
export const ALLEY: XZ[] = [G1, { x: -22, z: -9 }, { x: -17.5, z: -17 }, { x: -17.5, z: KORR.sideDoor.z }];
export const DOOR_POCKET = { a: ALLEY[3], b: { x: WALL_X, z: KORR.sideDoor.z }, r: 2.4 };
export const DOCK_N = KORR.dock.z0 - 2;
/** Dock south wall line, pushed 1.6 m south so the mission's dock crate keeps 1.5 m clear. */
export const DOCK_S = KORR.dock.z1 + 1.6;
const Y = KORR.yard, H = KORR.hall, D = KORR.dock, C = KORR.corridor;
/** Flat (height 0) floors as [x0, x1, z0, z1]. */
export const FLATS: [number, number, number, number][] = [
  [WALL_X - 0.2, H.x0, Y.z0 - 1, Y.z1 + 2],
  [KORR.mainGate.x - 0.5, WALL_X, JOG_Z - 0.5, Y.z1 + 2],
  [H.x0 - 0.5, H.x1 + 0.5, H.z0 - 0.5, H.z1 + 0.5],
  [C.x - C.width / 2 - 1, C.x + C.width / 2 + 1, D.z1 - 0.5, C.z0],
  [D.x0 - 0.5, D.x1 + 0.5, DOCK_N - 0.8, DOCK_S + 0.6],
];

export function segDist(x: number, z: number, a: XZ, b: XZ): number {
  const dx = b.x - a.x, dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
}
export function polyDist(x: number, z: number, pts: XZ[]): number {
  let d = Infinity;
  for (let i = 0; i < pts.length - 1; i++) d = Math.min(d, segDist(x, z, pts[i], pts[i + 1]));
  return d;
}
export function nearestOn(p: XZ, pts: XZ[]): XZ {
  let best = pts[0], bd = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz)));
    const q = { x: a.x + dx * t, z: a.z + dz * t }, d = Math.hypot(p.x - q.x, p.z - q.z);
    if (d < bd) [bd, best] = [d, q];
  }
  return best;
}
/** Canyon half-width, 6 to 8 m. */
export const canyonHw = (x: number, z: number): number => 7 + (2 * fbm(x * 0.045, z * 0.045, SEED + 1, 2) - 1);

/** Ledge alcoves for the two canyon biomass nodes: u points from the canyon to the node. */
export const ALCOVES = KORR.nodes.filter((n) => n.id === 'k-b1' || n.id === 'k-b2').map((n) => {
  const p = nearestOn(n, CANYON), l = Math.hypot(n.x - p.x, n.z - p.z);
  const u = { x: (n.x - p.x) / l, z: (n.z - p.z) / l };
  // The ledge ramp climbs 5.2 m (30 degrees) along u from foot (ground) to top (ledge edge).
  const at = (k: number) => ({ x: n.x - u.x * k, z: n.z - u.z * k });
  return { n, p, u, end: at(-2), r: 4.2, foot: at(6.8), top: at(1.6), y: n.y ?? 3, len: 5.2 };
});

const COL = {
  conc: 0x3b3e45, concL: 0x6b6e74, dark: 0x1b1d21, metal: 0x2c3036, rail: 0xb4542a, gate: 0x7a3a1e,
  sand: 0x5c5446, wood: 0x3d342d, tarp: 0x3d5266, lamp: 0xfff0d0, strip: 0xbfe4ff, amber: 0xffa040,
  roof: 0x24272c, steel: 0x8a96a3, rover: 0x4c5158, frost: 0xdde8f2, ledge: 0x6a2a18, pole: 0x2a2c30,
};
const CONT = [0x8a3a22, 0x2f5a80, 0x3e5a3c, 0x23252a];
const ROCK = [0x6a2a18, 0x4a2216, 0x9aa7b4];
const R90 = Math.PI / 2;

type Opt = Partial<Omit<BoxPrim, 'kind' | 'x' | 'z' | 'w' | 'h' | 'd' | 'color'>>;
const box = (x: number, z: number, w: number, h: number, d: number, color: number, o: Opt = {}): BoxPrim => ({ kind: 'box', x, z, w, h, d, color, ...o });
const rock = (x: number, z: number, w: number, h: number, d: number, seed: number, cover = false): RockPrim => ({ kind: 'rock', x, z, w, h, d, seed, rotY: seed * 1.7, color: ROCK[seed % 3], cover, mat: 'rock' });
/** Wall along x (constant z) from x0 to x1, or along z (constant x) from z0 to z1. */
const wallZ = (z: number, x0: number, x1: number, h: number, t = 0.6, color = COL.conc): BoxPrim => box((x0 + x1) / 2, z, x1 - x0, h, t, color, { mat: 'concrete', y: 0 });
const wallX = (x: number, z0: number, z1: number, h: number, t = 0.6, color = COL.conc): BoxPrim => box(x, (z0 + z1) / 2, t, h, Math.abs(z1 - z0), color, { mat: 'concrete', y: 0 });

/** Every Korr prop, placed by hand; ground(x, z) is the terrain height. */
export function korrProps(ground: (x: number, z: number) => number): Prim[] {
  const out: Prim[] = [];
  const add = (...p: Prim[]) => out.push(...p);
  const container = (x: number, z: number, rot: number, c: number, y?: number) => add(box(x, z, 6, 2.6, 2.5, c, { rotY: rot, cover: true, mat: 'metal', y }));
  const lowWall = (x: number, z: number, rot: number) => add(box(x, z, 4, 1.2, 0.5, COL.concL, { rotY: rot, cover: true, mat: 'concrete' }));
  const flood = (x: number, z: number, h = 9) => {
    const g = ground(x, z);
    add({ kind: 'cyl', x, z, r: 0.13, h, color: COL.pole, mat: 'metal', seg: 6 });
    add(box(x, z, 1.5, 0.45, 0.7, COL.lamp, { y: g + h, emissive: COL.lamp, solid: false, noShadow: true, mat: 'glow' }));
  };
  // Canyon helpers: a point on canyon segment i at fraction t, offset sideways (+ is the east/south side).
  const along = (i: number, t: number, off: number): XZ => {
    const a = CANYON[i], b = CANYON[i + 1], dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz);
    return { x: a.x + dx * t + (-dz / l) * off, z: a.z + dz * t + (dx / l) * off };
  };

  // ----- Landing zone mesa -----
  for (const [a, k] of [[-2.4, 0], [0.9, 1], [-2.0, 2]] as const) {
    const x = MESA.x + Math.cos(a) * 9.2, z = MESA.z + Math.sin(a) * 9.2;
    add(rock(x, z, 2.2, 1.6, 1.8, 10 + k));
  }
  add(box(MESA.x + 6.2, MESA.z + 6.8, 1.2, 1.2, 1.2, CONT[1], { cover: true, mat: 'metal', rotY: 0.4 }));
  add(box(MESA.x - 7.0, MESA.z - 6.0, 1.2, 1.2, 1.2, CONT[1], { cover: true, mat: 'metal', rotY: 0.9 }));

  // ----- Canyon: 9 cover boulders, 2 wrecked rovers, ledges for the biomass nodes -----
  const boulders: [number, number, number, number][] = [
    [0, 0.85, 3.4, 1.2], [1, 0.05, 5.2, 2.4], [1, 0.35, -5.0, 1.3], [2, 0.45, 4.8, 1.1], [2, 0.9, -3.4, 2.5],
    [3, 0.12, -4.2, 1.25], [3, 0.6, -3.6, 2.2], [3, 0.62, 3.4, 1.35], [3, 0.95, -3.8, 1.15],
  ];
  boulders.forEach(([i, t, off, h], k) => {
    const p = along(i, t, off);
    add(rock(p.x, p.z, h > 2 ? 2.6 : 2.0, h, h > 2 ? 2.2 : 1.5, 20 + k, true));
  });
  const rover = (p: XZ, rot: number) => {
    add(box(p.x, p.z, 3.8, 1.3, 2.2, COL.rover, { rotY: rot, cover: true, mat: 'metal' }));
    const g = ground(p.x, p.z), c = Math.cos(rot), s = Math.sin(rot);
    add(box(p.x - c * 0.6, p.z + s * 0.6, 1.5, 0.55, 1.9, COL.rover, { rotY: rot + 0.15, y: g + 1.3, solid: false, mat: 'metal' }));
    for (const [lx, lz] of [[-1.3, 1.2], [1.3, 1.2], [-1.3, -1.2]])
      add(box(p.x + c * lx + s * lz, p.z - s * lx + c * lz, 0.9, 0.9, 0.35, COL.dark, { rotY: rot, solid: false, noNav: true }));
  };
  rover(along(1, 0.3, -4.6), 0.5);
  rover(along(3, 0.5, -4.2), -0.7);
  for (const a of ALCOVES) {
    const g = ground(a.n.x, a.n.z) - 0.1, top = a.n.y ?? 3;
    const rot = Math.atan2(a.u.x, a.u.z);
    add(box(a.n.x, a.n.z, 3.6, top - g, 3.6, COL.ledge, { y: g, walk: true, rotY: rot, mat: 'rock' }));
    add(box(a.n.x, a.n.z, 3.8, 0.1, 3.8, COL.frost, { y: top - 0.06, solid: false, noNav: true, rotY: rot }));
    // The terrain raises a steep-sided wedge just under this ramp, so it can only be climbed from its foot.
    add({ kind: 'ramp', x0: a.foot.x - a.u.x * 0.5, z0: a.foot.z - a.u.z * 0.5, y0: -0.24, x1: a.top.x, z1: a.top.z, y1: top, width: 2.4, thickness: 0.6, color: COL.ledge, mat: 'rock' });
    for (const s of [-1.25, 1.25]) add(box(a.foot.x + a.u.x * 1.4 + a.u.z * s, a.foot.z + a.u.z * 1.4 - a.u.x * s, 0.1, 1.2, 3, COL.rail, { rotY: rot, mat: 'metal' }));
    add(rock(a.end.x + a.u.z * 2.6, a.end.z - a.u.x * 2.6, 2.4, 3.4, 2.2, 40 + Math.round(a.n.x)));
  }
  // Scatter: rocks and dead snags along the canyon walls.
  const rng = new Rng(SEED);
  const rampLat = (x: number, z: number) => {
    const vx = x - RAMP.a.x, vz = z - RAMP.a.z, t = vx * RAMP.u.x + vz * RAMP.u.z;
    return { t, lat: Math.abs(vx * RAMP.u.z - vz * RAMP.u.x) };
  };
  for (let i = 0; i < CANYON.length - 1; i++) {
    for (let t = 0.04; t < 1; t += 0.11 + rng.next() * 0.08) {
      for (const side of [-1, 1]) {
        const c = along(i, t, 0), hw = canyonHw(c.x, c.z);
        const p = along(i, t, side * (hw - 1.2 - rng.next() * 0.6));
        const rr = rampLat(p.x, p.z);
        if (rr.t > -2 && rr.t < RAMP.len + 2 && rr.lat < RAMP.hw + 7) continue;
        if (ALCOVES.some((a) => segDist(p.x, p.z, a.p, a.end) < 6)) continue;
        if (rng.chance(0.3)) add({ kind: 'tree', x: p.x, z: p.z, h: 3 + rng.next() * 2.5, r: 0.22, seed: 7, canopy: 0, style: 'dead', color: 0x1a1716 });
        else add(rock(p.x, p.z, 1.6 + rng.next() * 1.8, 1.4 + rng.next() * 2.4, 1.6 + rng.next() * 1.6, rng.int(50, 200)));
      }
    }
  }

  // ----- Lookout post -----
  // The terrain raises an 8 m square to +1; the plank deck sits almost flush on it.
  const L = P.lookout, deckTop = L.h + 0.05, npc = KORR.lookoutNpc;
  add(box(L.x, L.z, 8, 0.2, 8, COL.wood, { y: deckTop - 0.2, walk: true, mat: 'organic' }));
  add({ kind: 'ramp', x0: L.x + 8.5, z0: L.z + 1, y0: 0.03, x1: L.x + 3.9, z1: L.z + 1, y1: deckTop - 0.02, width: 1.8, thickness: 0.3, color: COL.wood, mat: 'organic' });
  add(box(L.x - 3.3, L.z - 2, 3, 1.1, 0.9, COL.sand, { y: deckTop, rotY: R90, cover: true, mat: 'fabric' }));
  add(box(L.x + 3, L.z + 3.4, 3, 1.1, 0.9, COL.sand, { y: deckTop, cover: true, mat: 'fabric' }));
  add(box(L.x + 3.4, L.z - 2, 3, 1.1, 0.9, COL.sand, { y: deckTop, rotY: R90, cover: true, mat: 'fabric' }));
  for (const [px, pz] of [[-2.5, 0], [1.5, 0], [-2.5, 3.2], [1.5, 2.6]]) add(box(L.x + px, L.z + pz, 0.12, 2.4, 0.12, COL.pole, { y: deckTop, mat: 'metal' }));
  add(box(L.x - 0.5, L.z + 1.5, 4.4, 0.06, 3.6, COL.tarp, { y: deckTop + 2.4, solid: false, mat: 'fabric' }));
  const yaw = (npc.yaw * Math.PI) / 180, mx = npc.x + Math.sin(yaw) * 1.75, mz = npc.z + Math.cos(yaw) * 1.75;
  add({ kind: 'cyl', x: mx, z: mz, r: 0.15, rTop: 0.08, h: 9, y: deckTop, color: COL.pole, mat: 'metal', seg: 6 });
  add(box(mx, mz, 0.9, 0.5, 0.2, COL.steel, { y: deckTop + 7.6, solid: false, mat: 'metal' }));

  // ----- Main gate, west wall, side door -----
  const G = KORR.mainGate, Yd = KORR.yard;
  add(box(G.x, G.z, 0.5, 4, 6, COL.gate, { id: 'gate-main', mat: 'metal', y: 0 }));
  add(wallX(G.x, JOG_Z - 0.3, G.z - 3, 4), wallX(G.x, G.z + 3, Yd.z1 + 8.5, 4));
  add(box(G.x, G.z - 3.45, 0.9, 5, 0.9, COL.gate, { mat: 'metal', y: 0 }), box(G.x, G.z + 3.45, 0.9, 5, 0.9, COL.gate, { mat: 'metal', y: 0 }));
  add(wallZ(JOG_Z, G.x - 0.3, WALL_X + 0.3, 4));
  const S = KORR.sideDoor;
  add(wallX(WALL_X, Yd.z0 - 4.5, S.z - 1.25, 4), wallX(WALL_X, S.z + 1.25, JOG_Z, 4));
  add(box(WALL_X, S.z, 0.4, 2.8, 2.5, COL.gate, { id: 'gate-side', mat: 'metal', y: 0 }));
  add(box(WALL_X, S.z, 0.6, 1.2, 2.5, COL.conc, { y: 2.8, noNav: true, mat: 'concrete' }));

  // ----- Mining yard -----
  const yc: [number, number, number][] = [
    [-3, 6, 0], [9, 3, R90], [18, 3, 0], [36, 0, R90], [38, 10, 0], [52, -5, R90],
    [-4, -8, 0], [20, -8, R90], [30, -20, 0], [4, -27, R90], [25, -33, 0], [42, -26, R90],
  ];
  yc.forEach(([x, z, r], k) => container(x, z, r, CONT[k % 3]));
  const lw: [number, number, number][] = [
    [-17, 8, R90], [2, -1, 0], [14, -1, 0], [28, -6, 0], [44, -2, R90], [13, -19, 0], [-6, -22, R90], [36, -31, 0], [48, -20, R90], [12, -36, 0],
  ];
  for (const [x, z, r] of lw) lowWall(x, z, r);
  const cv = KORR.conveyor;
  for (const [a, b] of [[cv.x0, 6], [9, 24], [27, 37], [40, cv.x1]]) {
    add(box((a + b) / 2, cv.z, b - a, cv.h, 1.4, COL.metal, { cover: true, mat: 'metal' }));
    add(box((a + b) / 2, cv.z, b - a, 0.06, 1.0, COL.dark, { y: cv.h, solid: false, noNav: true }));
  }
  add(box(cv.x0 - 1.2, cv.z, 2, 2.4, 2.2, COL.rail, { cover: true, mat: 'metal' }));
  for (const [x, z] of [[-10, 3], [24, -27]]) add(box(x, z, 1.2, 1.2, 1.2, CONT[3], { cover: true, mat: 'metal' }));
  // Gantry along the north side at +8, stairs at the west end, marksman balcony.
  const gt = KORR.gantry, GZ = gt.z - 0.5, gh = gt.h, mk = KORR.marksman, sx = gt.x0 + 1.4;
  add(box((gt.x0 + gt.x1) / 2, GZ, gt.x1 - gt.x0, 0.3, gt.width, COL.metal, { y: gh - 0.3, walk: true, mat: 'metal' }));
  add(box(mk.x, GZ + 2.8, 4, 0.3, 2.6, COL.metal, { y: gh - 0.3, walk: true, mat: 'metal' }));
  // Solid machinery housing under the walkway and balcony, so the nav grid stays single-layer (nothing walks underneath).
  add(box((gt.x0 + gt.x1) / 2, GZ, gt.x1 - gt.x0, gh - 0.3, gt.width, COL.conc, { y: 0, mat: 'concrete', walk: true }));
  add(box(mk.x, GZ + 2.8, 4, gh - 0.3, 2.6, COL.conc, { y: 0, mat: 'concrete', walk: true }));
  for (const px of [-8, 6, 16, 26, 34, 45, 51.5]) for (const dz of [-1.2, 1.2]) add(box(px, GZ + dz, 0.35, gh - 0.3, 0.35, COL.metal, { y: 0, noNav: true, mat: 'metal' }));
  // Railings are visual only: thin rails should not stop shots or sight lines.
  const rail = (x0: number, x1: number, z: number) => add(box((x0 + x1) / 2, z, x1 - x0, 1, 0.08, COL.rail, { y: gh, noNav: true, solid: false, mat: 'metal' }));
  const railX = (x: number, z0: number, z1: number) => add(box(x, (z0 + z1) / 2, 0.08, 1, z1 - z0, COL.rail, { y: gh, noNav: true, solid: false, mat: 'metal' }));
  rail(gt.x0, gt.x1, GZ - 1.6);
  rail(sx + 1.4, mk.x - 2.2, GZ + 1.6);
  rail(mk.x + 2.2, gt.x1, GZ + 1.6);
  rail(mk.x - 2, mk.x + 2, GZ + 4.15);
  railX(mk.x - 2.05, GZ + 1.5, GZ + 4.1);
  railX(mk.x + 2.05, GZ + 1.5, GZ + 4.1);
  railX(gt.x0 - 0.05, GZ - 1.5, GZ + 1.5);
  railX(gt.x1 + 0.05, GZ - 1.5, GZ + 1.5);
  add({ kind: 'ramp', x0: sx, z0: GZ + 16, y0: -0.25, x1: sx, z1: GZ + 1.3, y1: gh, width: 2.5, thickness: 0.6, color: COL.metal, mat: 'metal' });
  // Side plates on the low end of the stairs: they can only be entered from the front.
  for (const dx of [-1.3, 1.3]) add(box(sx + dx, GZ + 12.5, 0.1, 1.6, 6, COL.rail, { y: 0, mat: 'metal' }));
  for (const [x, z] of [[-11, 12], [14, 12.5], [44, 13], [57, -5], [57, -38], [-11.5, -41], [G.x - 1.5, JOG_Z + 1]]) flood(x, z);
  // Rubble along the yard's cliff edges.
  for (let x = -8; x < 58; x += 6 + rng.next() * 5) add(rock(x, Yd.z1 + 2.6, 2.5 + rng.next() * 2, 2 + rng.next() * 2, 2.2, rng.int(60, 300)));
  for (let z = -16; z < 12; z += 6 + rng.next() * 4) add(rock(H.x0 + 1.4, z, 2.4, 2.5 + rng.next() * 1.5, 2.6, rng.int(60, 300)));

  // ----- Processing hall -----
  const hh = 6, e = H.entry, nd = H.northDoor, cw = C.width / 2 + 0.3;
  add(wallX(H.x0, H.z0 - 0.3, e.z - 2, hh), wallX(H.x0, e.z + 2, H.z1 + 0.3, hh), wallX(H.x1, H.z0 - 0.3, H.z1 + 0.3, hh));
  add(wallZ(H.z1, H.x0 - 0.3, H.x1 + 0.3, hh), wallZ(H.z0, H.x0 - 0.3, nd.x - cw, hh), wallZ(H.z0, nd.x + cw, H.x1 + 0.3, hh));
  for (const [z0, z1] of [[H.z0 - 0.3, -34.5], [-33, -26.5], [-25, H.z1 + 0.3]]) {
    add(box((H.x0 + H.x1) / 2, (z0 + z1) / 2, H.x1 - H.x0 + 0.6, 0.3, z1 - z0, COL.roof, { y: hh, solid: false, mat: 'metal' }));
    add(box((H.x0 + H.x1) / 2, (z0 + z1) / 2, H.x1 - H.x0 - 4, 0.08, 0.3, COL.strip, { y: hh - 0.1, solid: false, noShadow: true, emissive: COL.strip, mat: 'glow' }));
  }
  add(box(66, -34.5, 3, 2.8, 3, COL.metal, { cover: true, mat: 'metal' }), box(67, -22, 3, 2.6, 2.4, COL.rail, { cover: true, mat: 'metal' }));
  add(box(87, -27.5, 2.6, 3, 4, COL.metal, { cover: true, mat: 'metal' }), box(73, -28, 2.4, 2.8, 2.4, COL.rail, { cover: true, mat: 'metal' }));
  for (const [x, z, r] of [[70, -31, R90], [81, -27.5, 0], [76, -24.5, 0], [84, -33, 0], [64, -31, R90], [77, -35, 0]]) lowWall(x, z, r);
  // Kwan's office (north-east corner) and the vault beside it.
  const of = KORR.office, ow = of.door.x - 1.3, vt = KORR.vault;
  // The west wall stops 1 m short of the south wall so the doorway wraps the corner (keeps the door and vault points clear).
  add(wallX(ow, H.z0, of.door.z - 1, 3.2, 0.3, COL.concL), wallZ(of.door.z, of.door.x + 1.6, H.x1, 3.2, 0.3, COL.concL));
  add(box((ow + H.x1) / 2, (H.z0 + of.door.z) / 2, H.x1 - ow, 0.15, of.door.z - H.z0, COL.roof, { y: 3.2, solid: false }));
  add(box(of.x + 2.8, H.z0 + 1.2, 1.6, 0.8, 0.8, COL.wood, { mat: 'organic' }));
  const vx0 = vt.x - 2.35, vx1 = ow - 0.15;
  add(box((vx0 + vx1) / 2, (H.z0 + vt.z) / 2 - 0.15, vx1 - vx0, 3.4, vt.z - H.z0 - 0.3, COL.conc, { mat: 'concrete' }));
  add(box(vt.x, vt.z, 2, 2.6, 0.5, COL.steel, { id: 'vault-door', mat: 'metal', y: 0 }));

  // ----- Corridor and loading dock -----
  add(wallX(C.x - cw, C.z0, DOCK_S, 5), wallX(C.x + cw, C.z0, DOCK_S, 5));
  add(wallX(D.x0 - 0.3, DOCK_N, DOCK_S, 4), wallX(D.x1 + 0.3, DOCK_N, DOCK_S, 4), wallZ(DOCK_N - 0.3, D.x0 - 0.6, D.x1 + 0.6, 4));
  add(wallZ(DOCK_S, D.x0 - 0.6, C.x - cw + 0.3, 4), wallZ(DOCK_S, C.x + cw - 0.3, D.x1 + 0.6, 4));
  for (const [x, z, r] of [[68, -67, 0], [82, -68, 0], [75, -76, 0], [69, -84, 0], [80, -82, 0], [75, -89, 0], [63, -95, R90], [89, -97, R90]])
    add(box(x, z, 4, 1.2, 0.7, COL.concL, { rotY: r, cover: true, mat: 'concrete' }));
  const [s1, s2] = D.stacks;
  for (let k = 0; k < 3; k++) container(s1.x + (k === 2 ? 0.4 : 0), s1.z, 0, CONT[k], 2.6 * k);
  for (let k = 0; k < 2; k++) container(s2.x, s2.z, R90, CONT[(k + 1) % 4], 2.6 * k);
  const ex = KORR.extraction;
  add(box(ex.x, ex.z, 12, 0.06, 12, COL.dark, { y: 0, solid: false, noNav: true, noShadow: true }));
  for (const [dx, dz] of [[-5.8, -5.8], [5.8, -5.8], [-5.8, 5.8], [5.8, 5.8]]) add(box(ex.x + dx, ex.z + dz, 0.4, 0.12, 0.4, COL.amber, { y: 0, solid: false, noNav: true, noShadow: true, emissive: COL.amber, mat: 'glow' }));
  for (const [x, z] of [[D.x0 + 2, D.z1 - 2.5], [D.x1 - 2, D.z1 - 2.5], [D.x0 + 2, DOCK_N + 2], [D.x1 - 2, DOCK_N + 2]]) flood(x, z);
  return out;
}
