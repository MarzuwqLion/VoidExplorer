import { describe, it, expect, beforeAll } from 'vitest';
import { initPhysics } from '../../src/world/physics';
import { WalkWorld } from '../../src/world/walkWorld';
import { terrainArrays } from '../../src/world/terrain';
import { gateBlocker, type Prim } from '../../src/world/level';
import { EMPTY_CMD } from '../../src/player/controller';
import type { NavGrid } from '../../src/ai/navgrid';
import { amaraLevel } from '../../src/world/planets/amara';
import { AMARA, type XZ } from '../../src/data/layouts';
import { AMARA_ENCOUNTERS } from '../../src/missions/amara';
import type { PlanetLevel } from '../../src/missions/types';

let level: PlanetLevel;
let world: WalkWorld;
const spawn = AMARA.spawn;

/** 4-connected flood fill over open nav cells, honouring the step limit. */
function flood(nav: NavGrid, from: XZ, allow: (p: XZ) => boolean = () => true): Uint8Array {
  const seen = new Uint8Array(nav.w * nav.h);
  const s = nav.cellOf(from.x, from.z);
  const q = [s];
  seen[s] = 1;
  while (q.length) {
    const k = q.pop()!;
    const i = k % nav.w, j = Math.floor(k / nav.w);
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ii = i + di, jj = j + dj;
      if (ii < 0 || jj < 0 || ii >= nav.w || jj >= nav.h) continue;
      const nk = jj * nav.w + ii;
      if (seen[nk] || !nav.walk[nk] || nav.closed[nk] || Math.abs(nav.height[nk] - nav.height[k]) > nav.maxStep) continue;
      if (!allow(nav.center(nk))) continue;
      seen[nk] = 1;
      q.push(nk);
    }
  }
  return seen;
}
const reaches = (nav: NavGrid, seen: Uint8Array, p: XZ): boolean => {
  const w = nav.nearestWalkable(p.x, p.z, 3);
  return !!w && seen[nav.cellOf(w.x, w.z)] === 1;
};
/** Horizontal distance from a point to a prim's solid footprint. */
function footDist(p: Prim, x: number, z: number): number {
  if (p.kind === 'ramp') return Infinity;
  if (p.kind === 'cyl') return Math.hypot(x - p.x, z - p.z) - Math.max(p.r, p.rTop ?? 0);
  if (p.kind === 'tree') return Math.hypot(x - p.x, z - p.z) - p.r;
  const k = p.kind === 'rock' ? 0.45 : 0.5, rot = p.rotY ?? 0, c = Math.cos(rot), s = Math.sin(rot);
  const dx = x - p.x, dz = z - p.z, lx = dx * c - dz * s, lz = dx * s + dz * c;
  return Math.hypot(Math.max(0, Math.abs(lx) - p.w * k), Math.max(0, Math.abs(lz) - p.d * k));
}

/** Jog the commander through waypoints on the physics world. True when the last one is reached in time. */
function walk(pts: XZ[], from: XZ | null, seconds: number): boolean {
  const pl = world.player;
  if (from) pl.setPosition(from.x, level.terrain.height(from.x, from.z) + 0.1, from.z);
  const dt = 1 / 60;
  let i = 0;
  for (let t = 0; t < seconds && i < pts.length; t += dt) {
    const p = pts[i], dx = p.x - pl.pos.x, dz = p.z - pl.pos.z;
    if (Math.hypot(dx, dz) < (i === pts.length - 1 ? 0.8 : 1.2)) {
      i++;
      continue;
    }
    world.stepPlayer(dt, { ...EMPTY_CMD, move: { x: 0, y: 1 }, camYaw: (Math.atan2(-dx, -dz) * 180) / Math.PI });
  }
  return i >= pts.length;
}

beforeAll(async () => {
  await initPhysics();
  level = amaraLevel();
  const arrays = terrainArrays(level.terrain);
  world = new WalkWorld({
    prims: level.prims,
    ground: level.terrain.height,
    navGround: level.navGround,
    bounds: { minX: -110, minZ: -110, maxX: 110, maxZ: 110 },
    spawn: level.spawn,
    mode: 'field',
    addColliders: (ph) => ph.addTrimesh(arrays.verts, arrays.idx, { kind: 'terrain' }),
  });
});

describe('Amara level', () => {
  it('puts every named place at its listed height', () => {
    for (const p of Object.values(AMARA.places)) expect(Math.abs(level.terrain.height(p.x, p.z) - p.h), p.id).toBeLessThan(0.6);
  });

  it('keeps the gates shut until opened: tunnel only through gate-tunnel, Den exit only through gate-den', () => {
    const nav = world.nav;
    const g = AMARA.places.tunnelGate;
    const mouth = { x: g.x - 0.5, z: g.z + 1.5 };
    const tunnelSide = (p: XZ): boolean => p.z < g.z + 2;
    const denSide = (p: XZ): boolean => p.z < -20;
    const tunnelGate = gateBlocker(world.level.gates.get('gate-tunnel')!.prim), denGate = gateBlocker(world.level.gates.get('gate-den')!.prim);
    expect(reaches(nav, flood(nav, mouth, tunnelSide), AMARA.places.tunnelExit)).toBe(false);
    expect(reaches(nav, flood(nav, AMARA.den.exit, denSide), AMARA.places.den)).toBe(false);
    nav.setClosed(tunnelGate, false);
    nav.setClosed(denGate, false);
    expect(reaches(nav, flood(nav, mouth, tunnelSide), AMARA.places.tunnelExit)).toBe(true);
    expect(reaches(nav, flood(nav, AMARA.den.exit, denSide), AMARA.places.den)).toBe(true);
    nav.setClosed(tunnelGate, true);
    nav.setClosed(denGate, true);
    // The physical gates stop the commander too.
    expect(walk([AMARA.tunnel[1]], mouth, 8)).toBe(false);
    expect(walk([AMARA.den.exit], AMARA.places.den, 10)).toBe(false);
  });

  it('reaches every place, node, NPC and mission point from the spawn with the gates open', () => {
    world.openGate('gate-tunnel');
    world.openGate('gate-den');
    const nav = world.nav;
    const pts: [string, XZ][] = [
      ...Object.values(AMARA.places).map((p): [string, XZ] => [p.id, p]),
      ...AMARA.nodes.map((n): [string, XZ] => [n.id, n]),
      ...Object.entries(AMARA.npcs),
      ...AMARA.cores.map((c, i): [string, XZ] => ['core' + i, c]),
    ];
    for (const [id, p] of pts) {
      const t = nav.nearestWalkable(p.x, p.z, 6);
      expect(t, id).not.toBeNull();
      expect(nav.findPath(spawn, t!, 400000), id).not.toBeNull();
    }
    // Encounter triggers, spawns, checkpoints and crates (flood fill: cheaper than one A* each).
    const seen = flood(nav, spawn);
    for (const e of AMARA_ENCOUNTERS) {
      const all = [e.trigger, ...(e.alt ?? []), e.checkpoint, e.crate, ...e.waves.flat()];
      for (const p of all) expect(reaches(nav, seen, p), e.id + ' ' + p.x + ',' + p.z).toBe(true);
    }
    // The walkable region stays inside the play area and off the highland tops.
    let maxH = -Infinity;
    for (let k = 0; k < seen.length; k++) {
      if (!seen[k]) continue;
      const c = nav.center(k);
      expect(Math.abs(c.x) < 106 && Math.abs(c.z) < 106 && level.inside(c.x, c.z)).toBe(true);
      maxH = Math.max(maxH, nav.height[k]);
    }
    expect(maxH).toBeLessThan(AMARA.places.ridge.h + 2);
  });

  it('walks the whole mission route on the physics terrain, and the survey tunnel', () => {
    const nav = world.nav;
    const P = AMARA.places;
    const legs: [string, XZ][] = [['station', P.station], ['grove', P.grove], ['entry', AMARA.ravine.entry], ['core2', AMARA.cores[1]], ['ridge', P.ridge], ['den', P.den], ['core3', AMARA.cores[2]], ['exit', AMARA.den.exit], ['return', P.returnPath], ['beacon', { x: AMARA.beacon.x + 1.5, z: AMARA.beacon.z }], ['tunnelGate', P.tunnelGate], ['tunnelExit', P.tunnelExit], ['ravine', P.ravine]];
    const pl = world.player;
    pl.setPosition(spawn.x, level.terrain.height(spawn.x, spawn.z) + 0.1, spawn.z);
    for (const [id, p] of legs) {
      const t = nav.nearestWalkable(p.x, p.z, 6)!;
      const path = nav.findPath({ x: pl.pos.x, z: pl.pos.z }, t, 400000);
      expect(path, id).not.toBeNull();
      const ok = walk(path!, null, 120);
      expect(ok, id + ' stuck at ' + pl.pos.x.toFixed(1) + ',' + pl.pos.z.toFixed(1)).toBe(true);
    }
  });

  it('has at least 20 low cover pieces and some tall cover', () => {
    const covers = world.level.covers;
    expect(covers.filter((c) => c.h >= 1 && c.h <= 1.4).length).toBeGreaterThanOrEqual(20);
    expect(covers.filter((c) => c.h >= 2 && c.h <= 3).length).toBeGreaterThanOrEqual(6);
  });

  it('keeps the shuttle area and mission points clear of solid props', () => {
    const s = AMARA.shuttle;
    for (const b of world.level.blockers) {
      const d = b.kind === 'circle' ? Math.hypot(b.x - s.x, b.z - s.z) - b.r : Math.hypot(b.x - s.x, b.z - s.z) - Math.hypot(b.hw, b.hd);
      expect(d).toBeGreaterThan(6);
    }
    const keep: XZ[] = [
      ...AMARA.nodes, ...Object.values(AMARA.npcs), ...AMARA.cores,
      ...AMARA_ENCOUNTERS.flatMap((e) => [e.trigger, e.checkpoint, e.crate, ...e.waves.flat()]),
    ];
    const solid = level.prims.filter((p) => p.solid !== false && p.id !== 'beacon');
    for (const p of keep) for (const q of solid) expect(footDist(q, p.x, p.z), q.kind + ' near ' + p.x + ',' + p.z).toBeGreaterThanOrEqual(1.5);
  });

  it('opens gates as named boxes and stays within the draw-call budget', () => {
    expect(world.level.gates.has('gate-tunnel') && world.level.gates.has('gate-den')).toBe(true);
    for (const id of ['beacon', 'beacon-light', 'pillar1', 'pillar6']) expect(level.prims.some((p) => p.id === id), id).toBe(true);
    const keys = new Set<string>();
    for (const p of level.prims) {
      if (p.id || p.kind === 'cyl' || p.kind === 'ramp') keys.add('id:' + keys.size);
      else if (p.kind === 'box') keys.add('box:' + p.color + ':' + (p.emissive ?? 0) + ':' + (p.mat ?? '') + (p.noShadow ? 'ns' : ''));
      else if (p.kind === 'rock') keys.add('rock:' + p.color + ':' + (p.seed % 4));
      else keys.add('tree:' + p.style + p.color + ':' + p.canopy + ':a').add('tree:' + p.style + p.color + ':' + p.canopy + ':b');
    }
    expect(keys.size).toBeLessThan(80);
  });
});

