import * as THREE from 'three';
import type { PlanetLevel } from '../../missions/types';
import { AMARA, type XZ } from '../../data/layouts';
import { fbm, valueNoise } from '../../core/rng';
import { amaraProps, riverX, gateSpot } from './amaraProps';

/** [x, z, height] waypoint of a carved path. */
type P3 = [number, number, number];
const SEED = 7331;
const A = AMARA, PL = AMARA.places, RV = AMARA.ravine;
const clamp01 = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t);
const ss = (a: number, b: number, x: number): number => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const nz = (x: number, z: number, f: number, s: number): number => valueNoise(x * f, z * f, SEED + s) - 0.5;
const dist = (x: number, z: number, p: XZ): number => Math.hypot(x - p.x, z - p.z);
const p3 = (p: XZ, h: number): P3 => [p.x, p.z, h];

/** Signed distance to an axis-aligned rectangle (negative inside). */
function boxD(x: number, z: number, x0: number, x1: number, z0: number, z1: number): number {
  const dx = Math.max(x0 - x, x - x1), dz = Math.max(z0 - z, z - z1);
  if (dx <= 0 && dz <= 0) return Math.max(dx, dz);
  return Math.hypot(Math.max(dx, 0), Math.max(dz, 0));
}
/** Distance to a polyline and the height interpolated along the nearest segment. */
function along(x: number, z: number, pts: P3[]): { d: number; h: number } {
  let bd = Infinity, bh = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az, ah] = pts[i], [bx, bz, bh2] = pts[i + 1];
    const vx = bx - ax, vz = bz - az;
    const t = clamp01(((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz));
    const d = Math.hypot(x - ax - vx * t, z - az - vz * t);
    if (d < bd) {
      bd = d;
      bh = ah + (bh2 - ah) * t;
    }
  }
  return { d: bd, h: bh };
}

// --- Authored shapes, all anchored on the layout table. ---
const padC = { x: (PL.lz.x + A.shuttle.x) / 2, z: (PL.lz.z + A.shuttle.z) / 2 };
const plateau = { x0: 19, x1: 76, z0: PL.ridge.z - 8, z1: PL.ridge.z + 8 };
const R0 = A.ridgeRamp.from, R1 = A.ridgeRamp.to;
/** Ridge ramp: loops east around the ravine's north wall to stay under 25 degrees, then runs west into the plateau. */
const ridgeRamp = ((): P3[] => {
  const pts: XZ[] = [R0, { x: R0.x + 12, z: R0.z - 4 }, { x: R0.x + 18, z: R0.z - 14 }, { x: R1.x + 22, z: R1.z - 2 }, R1];
  const len: number[] = [0];
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + dist(pts[i].x, pts[i].z, pts[i - 1]));
  const L = len[len.length - 1];
  return pts.map((p, i) => p3(p, lerp(RV.floor, PL.ridge.h, len[i] / L)));
})();
const denIn = { x: PL.den.x + 15, z: (A.den.entry.z + PL.den.z) / 2 };
const descent = ((): P3[] => {
  const a = A.ridgeDescent.from, b = A.ridgeDescent.to;
  const l1 = dist(a.x, a.z, b), l2 = dist(b.x, b.z, denIn), dh = PL.ridge.h - (PL.den.h + 0.35);
  return [p3(a, PL.ridge.h), p3(b, PL.ridge.h - (dh * l1) / (l1 + l2)), p3(denIn, PL.den.h + 0.35)];
})();
const rp = A.returnPath;
const returnPath: P3[] = [[A.den.exit.x, PL.den.z + 14, PL.den.h + 0.3], [A.den.exit.x - 1, A.den.exit.z, -1.8], p3(rp[1], PL.returnPath.h), p3(rp[2], 1), p3(rp[3], PL.station.h)];
const landing = { x: A.den.exit.x + 1, z: A.den.exit.z + 4 };
const nodeB9 = A.nodes.find((n) => n.id === 'a-b9')!;
const nodeI2 = A.nodes.find((n) => n.id === 'a-i2')!;
const nook = { x: nodeI2.x + 2.5, z: nodeI2.z + 2.5 };
const t0 = A.tunnel[0], t1 = A.tunnel[1];
const tunnel: P3[] = [[t0.x - (t1.x - t0.x) * 0.3, t0.z - (t1.z - t0.z) * 0.3, 0], ...A.tunnel.map((p) => p3(p, PL.tunnelGate.h))];
const shelf: P3[] = [[RV.x0 - 4, -9, 0], [RV.x0 - 0.4, -21, RV.floor], [RV.x0 + 1, -23, RV.floor]];
const entryRamp: P3[] = [[RV.entry.x, RV.entry.z - 2, RV.floor], [RV.entry.x, RV.z1 + 13, 0]];
const trail: P3[] = [p3(PL.lz, 0), p3(PL.station, 0), p3(PL.grove, 0), [RV.entry.x - 12, RV.z1 + 12, 0], p3(RV.entry, 0)];

/** Impassable highland the walkable areas are carved from; boundary cliffs rise toward the north, east and south. */
function mass(x: number, z: number): number {
  let m = 10 + 7 * fbm(x * 0.025 + 3, z * 0.025 - 5, SEED, 3) + 3 * nz(x, z, 0.16, 5);
  m += 16 * ss(-15, 10, x) * ss(-25, -42, z);
  return m + 1.3 * Math.max(0, x - 90) + 1.3 * Math.max(0, -z - 84) + 1.1 * Math.max(0, z - 97);
}
/** A flat pad blended into the surrounding height. */
function pad(t: number, x: number, z: number, c: XZ, r: number, e: number, h: number): number {
  const w = 1 - ss(r, r + e, dist(x, z, c));
  return w > 0 ? lerp(t, h + 0.4 * nz(x, z, 0.2, 3), w) : t;
}
/** Rolling meadow from the landing zone to the Grove. */
function meadowT(x: number, z: number): number {
  const trend = x < -60 ? 3 : x < 0 ? lerp(3, 1.5, (x + 60) / 60) : lerp(1.5, 0, clamp01(x / 30));
  let t = trend + 2.6 * (1 - ss(40, 60, x)) * (fbm(x * 0.022, z * 0.022, SEED + 11, 3) - 0.5) + 0.2 * nz(x, z, 0.3, 4);
  t += 0.5 * Math.max(0, z - 86);
  t = pad(t, x, z, padC, 12, 16, PL.lz.h);
  t = pad(t, x, z, PL.station, 18, 10, PL.station.h);
  return pad(t, x, z, PL.grove, 22, 8, PL.grove.h);
}
const bump = (x: number, a: number, b: number): number => ss(a - 4, a, x) * (1 - ss(b, b + 4, x));

function height(x: number, z: number): number {
  let h = mass(x, z);
  const zone = (d: number, e: number, t: () => number): void => {
    if (d >= e) return;
    h = lerp(h, t(), 1 - ss(0, e, d));
  };
  const path = (pts: P3[], r: number, e: number, noise = 0.25): void => {
    const q = along(x, z, pts);
    zone(q.d - r, e, () => q.h + noise * nz(x, z, 0.25, 9));
  };
  // Meadow: landing zone, station and Grove. The north edge bulges south at the tunnel mouth so the gate sits between rock walls.
  const zN = 26 - 2 * bump(x, -42, 2) + 4 * bump(x, 38, 54);
  const md = Math.min(boxD(x, z, -100, 58, zN, 94), boxD(x, z, 55, 88, RV.z1 + 6, 56)) + 3 * nz(x, z, 0.09, 7);
  zone(md, 6, () => meadowT(x, z));
  // Ravine ledges at 0, floor at -6 behind short cliffs, a nook at the north-east end.
  const ledge = (): number => 0.4 * nz(x, z, 0.2, 12);
  zone(boxD(x, z, RV.x0 - 6.5, RV.x0 + 3, -12, 10), 2, ledge);
  zone(boxD(x, z, RV.x1 - 3, RV.x1 + 12, -21, RV.z1 + 10), 3, ledge);
  const floor = (): number => RV.floor + 0.5 * nz(x, z, 0.15, 13);
  zone(boxD(x, z, RV.x0, RV.x1, RV.z0, RV.z1), 1.5, floor);
  zone(dist(x, z, nook) - 3.2, 1.5, floor);
  path(entryRamp, 4.5, 1.5, 0.08);
  path(shelf, 2.2, 1.2, 0.08);
  // Ridge plateau, its ramp from the ravine and the descent to the Den.
  zone(boxD(x, z, plateau.x0, plateau.x1, plateau.z0, plateau.z1), 3, () => PL.ridge.h + 0.6 * nz(x, z, 0.12, 14));
  path(ridgeRamp, 3, 1.5, 0.08);
  // The Den bowl, the descent into it from the Ridge, its south exit cut, the return path and the landing beyond the gate.
  zone(dist(x, z, PL.den) - 16, 4, () => PL.den.h + 0.4 * (dist(x, z, PL.den) / 16) ** 2 + 0.3 * nz(x, z, 0.2, 15));
  path(descent, 4.5, 1.8, 0.08);
  path(returnPath, 2.6, 1.2, 0.15);
  zone(dist(x, z, nodeB9) - 3, 1.5, () => along(x, z, returnPath).h);
  zone(dist(x, z, landing) - 3.8, 1.5, () => along(x, z, returnPath).h);
  // The survey tunnel: a 3.2 m slot through the rock from the Grove to the west ledge.
  path(tunnel, 1.6, 1.0, 0.05);
  // River along the west edge.
  zone(x - riverX(z), 4.5, () => -4.5 + 0.6 * nz(x, z, 0.1, 16));
  return h;
}

const COL = {
  grass: new THREE.Color(0x2f9a86), shade: new THREE.Color(0x22786a), gold: new THREE.Color(0xa8aa4a), ochre: new THREE.Color(0xc8a650),
  rockA: new THREE.Color(0x9a7060), rockB: new THREE.Color(0xc89c70), moss: new THREE.Color(0x3c7c66), sand: new THREE.Color(0xcab48a),
  bed: new THREE.Color(0x4a6a68), dirt: new THREE.Color(0x9c8258), floor: new THREE.Color(0x3e6e5a),
};
function color(x: number, z: number, h: number, slope: number): THREE.Color {
  const c = new THREE.Color();
  const n = fbm(x * 0.05, z * 0.05, SEED + 21, 3);
  if (slope > 0.22) {
    c.copy(COL.rockA).lerp(COL.rockB, (0.5 + 0.5 * Math.sin(h * 0.9 + n * 5)) * 0.75);
    return slope < 0.32 ? c.lerp(COL.moss, 0.4) : c;
  }
  if (x < riverX(z) + 4 && h < 0.5) return c.copy(COL.sand).lerp(COL.bed, ss(-0.5, -3.5, h));
  c.copy(COL.grass).lerp(COL.shade, ss(0.5, 0.75, n));
  const g = fbm(x * 0.03 + 9, z * 0.03 - 4, SEED + 22, 3);
  c.lerp(h > 11 ? COL.ochre : COL.gold, ss(0.52, 0.68, g) * 0.85);
  if (h < -2.5) c.lerp(COL.floor, 0.55);
  if (slope > 0.12) c.lerp(COL.moss, 0.5);
  const tr = Math.min(along(x, z, returnPath).d - 0.6, along(x, z, trail).d - 0.3 - 1.2 * n);
  if (tr < 1.2) c.lerp(COL.dirt, 0.55 * (1 - ss(0, 1.2, tr)));
  return c;
}

/** Amara, mission "Landfall": meadow, Grove, Ravine, Ridge and Den carved from teal-gold highland. */
export function amaraLevel(): PlanetLevel {
  const inside = (x: number, z: number): boolean => x > riverX(z) + 2 && x < 104 && z > -104 && z < 104;
  return {
    id: 'amara',
    terrain: { min: -110, max: 110, step: 1, height, color, skirt: 300 },
    navGround: (x, z) => (inside(x, z) ? height(x, z) : null),
    prims: amaraProps({ ground: height, gateTunnel: gateSpot(A.tunnel[0], A.tunnel[1], 4), gateDen: gateSpot({ x: returnPath[0][0], z: returnPath[0][1] }, { x: returnPath[1][0], z: returnPath[1][1] }, 3.5) }),
    spawn: { ...A.spawn },
    shuttle: { ...A.shuttle },
    sky: { top: 0x2c6c9c, horizon: 0xf4c27a, sunDir: new THREE.Vector3(-0.6, 0.18, -0.5), sunColor: 0xffa24a, sunSize: 0.006 },
    fog: { color: 0xe6b880, near: 70, far: 420 },
    light: { hemiSky: 0xbfe2dc, hemiGround: 0x6a5640, hemi: 1.2, sun: 2.6, sunColor: 0xffc27a },
    skyPlanets: [{ color: 0xeadbb4, ring: 0xd89a58, dir: new THREE.Vector3(0.45, 0.42, -0.75), size: 70 }],
    ambient: 'amara_wind',
    footstep: 'footstep_grass',
    inside,
    weather: 'pollen',
  };
}
