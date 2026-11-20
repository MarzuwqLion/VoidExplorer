import * as THREE from 'three';
import type { PlanetLevel } from '../../missions/types';
import { KORR } from '../../data/layouts';
import { fbm } from '../../core/rng';
import { SEED, RAMP, MESA, CANYON, BASIN, LOOKOUT_CAP, ALLEY, DOOR_POCKET, ALCOVES, FLATS, segDist, polyDist, canyonHw, korrProps } from './korrProps';

const P = KORR.places;

function rectDist(x: number, z: number, r: [number, number, number, number]): number {
  const dx = Math.max(r[0] - x, 0, x - r[1]), dz = Math.max(r[2] - z, 0, z - r[3]);
  return Math.hypot(dx, dz);
}
/** Terraced canyon-wall profile: ~72 degree faces with narrow frost ledges every ~9 m. */
function cliff(d: number): number {
  const band = 4.2, n = Math.floor(d / band), f = d - n * band;
  return n * 9.3 + (f < 3 ? f * 3 : 9 + (f - 3) * 0.25);
}

interface Dists {
  flat: number;
  rough: number;
  mesa: number;
  /** Position along the LZ ramp and lateral distance beyond its half width. */
  t: number;
  lat: number;
}
const D: Dists = { flat: 0, rough: 0, mesa: 0, t: 0, lat: 0 };
function dists(x: number, z: number): Dists {
  let f = Infinity;
  for (const r of FLATS) f = Math.min(f, rectDist(x, z, r));
  let r = polyDist(x, z, CANYON) - canyonHw(x, z);
  r = Math.min(r, Math.hypot(x - BASIN.x, z - BASIN.z) - BASIN.r);
  r = Math.min(r, segDist(x, z, LOOKOUT_CAP.a, LOOKOUT_CAP.b) - LOOKOUT_CAP.r);
  r = Math.min(r, polyDist(x, z, ALLEY) - 3.4, segDist(x, z, DOOR_POCKET.a, DOOR_POCKET.b) - DOOR_POCKET.r);
  for (const a of ALCOVES) r = Math.min(r, segDist(x, z, a.p, a.end) - a.r);
  const vx = x - RAMP.a.x, vz = z - RAMP.a.z;
  D.flat = f;
  D.rough = r;
  D.mesa = Math.hypot(x - MESA.x, z - MESA.z) - MESA.r;
  D.t = vx * RAMP.u.x + vz * RAMP.u.z;
  D.lat = Math.abs(vx * RAMP.u.z - vz * RAMP.u.x) - RAMP.hw;
  return D;
}
/** Distance outside every walkable region (0 inside). */
function regionDist(x: number, z: number): number {
  const d = dists(x, z);
  const ramp = d.t >= 0 && d.t <= RAMP.len ? d.lat : Infinity;
  return Math.max(0, Math.min(d.flat, d.rough, d.mesa, ramp));
}

/** Seeded canyon terrain: a high rim carved down to the mesa, the canyon floor and the flat mine floors. */
function height(x: number, z: number): number {
  const d = dists(x, z);
  const j = Math.min(d.flat, d.rough, d.mesa) > 0 ? 1.4 * fbm(x * 0.2, z * 0.2, SEED + 3, 2) : 0;
  const rough = 0.32 * (fbm(x * 0.06, z * 0.06, SEED, 3) - 0.5);
  let h = Math.min(cliff(Math.max(0, d.flat - j)), rough + cliff(Math.max(0, d.rough - j)), P.lz.h + cliff(Math.max(0, d.mesa - j)));
  if (h > 26) h = Math.min(h, 27 + 12 * fbm(x * 0.012, z * 0.012, SEED + 2, 3));
  // LZ ramp: a causeway (cut where the ground is higher) falling from the mesa edge to the canyon floor.
  if (d.t > -3 && d.t < RAMP.len + 1) {
    const top = RAMP.top * (1 - Math.min(1, Math.max(0, d.t / RAMP.len)));
    const c = cliff(Math.max(0, d.lat));
    h = Math.min(Math.max(h, top - c), top + c);
  }
  // Ledge ramps: a steep-sided wedge just under each ramp prim.
  for (const a of ALCOVES) {
    const vx = x - a.foot.x, vz = z - a.foot.z, t = vx * a.u.x + vz * a.u.z;
    if (t < -1 || t > a.len + 3.5) continue;
    const lat = Math.abs(vx * a.u.z - vz * a.u.x) - 1.1;
    h = Math.max(h, a.y * Math.min(1, Math.max(0, t / a.len)) - 0.08 - cliff(Math.max(0, lat)));
  }
  // Lookout platform: an 8 m square raised to +1 with a straight 12 degree apron.
  const L = P.lookout;
  const qx = Math.max(Math.abs(x - L.x) - 4, 0), qz = Math.max(Math.abs(z - L.z) - 4, 0), q = Math.hypot(qx, qz);
  if (q < 4.5) h = Math.max(h, L.h * (1 - q / 4.5));
  return h;
}

const C = {
  ground: new THREE.Color(0x1c1f24), ground2: new THREE.Color(0x2e2b2b), rust: new THREE.Color(0x8a3a22), rustDark: new THREE.Color(0x6a2a18),
  black: new THREE.Color(0x1a1414), frost: new THREE.Color(0xdde8f2), ice: new THREE.Color(0x9fb8d0),
};
function color(x: number, z: number, h: number, slope: number): THREE.Color {
  const n = fbm(x * 0.08, z * 0.08, SEED + 7, 3);
  if (slope > 0.2) {
    const band = 0.5 + 0.5 * Math.sin(h * 0.9 + n * 5);
    const c = C.rustDark.clone().lerp(C.rust, band);
    if (n > 0.62) c.lerp(C.black, 0.45);
    return slope < 0.32 ? c.lerp(C.frost, 0.45) : c;
  }
  if (h > 2.5) return C.frost.clone().lerp(C.ice, n * 0.7);
  const c = C.ground.clone().lerp(C.ground2, n);
  const snow = fbm(x * 0.05 + 3, z * 0.05, SEED + 9, 3);
  return snow > 0.6 ? c.lerp(C.ice, Math.min(0.7, (snow - 0.6) * 4)) : c;
}

/** Korr, mission "Cold Seam": a frozen canyon from the mesa LZ (south-west) to the mine's loading dock (north-east). */
export function korrLevel(): PlanetLevel {
  const sunDir = new THREE.Vector3(0.75, 0.12, -0.45);
  return {
    id: 'korr',
    terrain: { min: -110, max: 110, step: 1, height, color, skirt: 300 },
    navGround: (x, z) => (regionDist(x, z) < 1.5 ? height(x, z) : null),
    prims: korrProps(height),
    spawn: { ...KORR.spawn },
    shuttle: { ...KORR.shuttle },
    sky: { top: 0x0a1430, horizon: 0x9fb2cc, sunDir, sunColor: 0xffb48a, sunSize: 0.006 },
    fog: { color: 0x6a7d99, near: 45, far: 330 },
    light: { hemiSky: 0xb4cdf0, hemiGround: 0x5a4438, hemi: 2.1, sun: 2.0, sunColor: 0xffc8a8 },
    skyPlanets: [
      { color: 0xc9d6ea, ring: null, dir: new THREE.Vector3(-0.45, 0.42, -0.75), size: 46 },
      { color: 0x8a5a4a, ring: 0x9fb2cc, dir: new THREE.Vector3(0.3, 0.22, 0.9), size: 26 },
    ],
    ambient: 'korr_wind',
    footstep: 'footstep_snow',
    inside: (x, z) => Math.abs(x) < 108 && Math.abs(z) < 108 && regionDist(x, z) < 3,
    weather: 'snow',
  };
}
