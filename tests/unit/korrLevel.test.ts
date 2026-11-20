import { describe, it, expect, beforeAll } from 'vitest';
import { initPhysics } from '../../src/world/physics';
import { WalkWorld } from '../../src/world/walkWorld';
import { terrainArrays } from '../../src/world/terrain';
import { korrLevel } from '../../src/world/planets/korr';
import { KORR, type XZ } from '../../src/data/layouts';
import { KORR_ENCOUNTERS, KORR_EXTRA_WAVE } from '../../src/missions/korr';
import type { Prim } from '../../src/world/level';
import type { NavBlocker } from '../../src/ai/navgrid';
import type { PlanetLevel } from '../../src/missions/types';

let level: PlanetLevel;
let world: WalkWorld;
const gateRect = (p: { x: number; z: number; w: number; d: number; rotY?: number }): NavBlocker => ({ kind: 'rect', x: p.x, z: p.z, hw: p.w / 2, hd: p.d / 2, rotY: p.rotY ?? 0 });
const setGates = (closed: boolean) => {
  for (const g of world.level.gates.values()) world.nav.setClosed(gateRect(g.prim), closed);
};

beforeAll(async () => {
  await initPhysics();
  level = korrLevel();
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
  // The nav grid treats gates as open; the mission closes them.
  setGates(false);
});

/** Horizontal distance from a point to a prim's footprint. */
function footDist(p: Prim, x: number, z: number): number {
  if (p.kind === 'ramp') {
    const dx = p.x1 - p.x0, dz = p.z1 - p.z0;
    const t = Math.max(0, Math.min(1, ((x - p.x0) * dx + (z - p.z0) * dz) / (dx * dx + dz * dz)));
    return Math.max(0, Math.hypot(x - p.x0 - dx * t, z - p.z0 - dz * t) - p.width / 2);
  }
  if (p.kind === 'cyl' || p.kind === 'tree') return Math.max(0, Math.hypot(x - p.x, z - p.z) - Math.max(p.r, p.kind === 'cyl' ? p.rTop ?? 0 : 0));
  const k = p.kind === 'rock' ? 0.45 : 0.5;
  const r = p.rotY ?? 0, c = Math.cos(r), s = Math.sin(r);
  const lx = (x - p.x) * c - (z - p.z) * s, lz = (x - p.x) * s + (z - p.z) * c;
  return Math.hypot(Math.max(0, Math.abs(lx) - p.w * k), Math.max(0, Math.abs(lz) - p.d * k));
}

describe('Korr level', () => {
  it('puts every named place at its listed height', () => {
    for (const p of Object.values(KORR.places)) expect(Math.abs(level.terrain.height(p.x, p.z) - p.h), p.id).toBeLessThan(0.6);
  });

  it('reaches every place, node and NPC from the spawn on the nav grid', () => {
    const nav = world.nav;
    const targets: { id: string; x: number; z: number; y?: number }[] = [
      ...Object.values(KORR.places),
      ...KORR.nodes,
      { id: 'lookoutNpc', ...KORR.lookoutNpc },
      { id: 'kwan', ...KORR.office },
      { id: 'kwanAtDock', ...KORR.kwanAtDock },
      { id: 'foreman', ...KORR.dock.foreman },
      { id: 'marksman', ...KORR.marksman, y: KORR.gantry.h },
      ...KORR.canyonPath.map((p, i) => ({ id: 'canyon' + i, ...p })),
    ];
    const failed: string[] = [];
    for (const t of targets) {
      const g = nav.nearestWalkable(t.x, t.z, 6);
      const path = g && nav.findPath(level.spawn, g, 400000);
      const end = path?.[path.length - 1];
      if (!g || !end || Math.hypot(end.x - g.x, end.z - g.z) > 0.6) failed.push(t.id);
      else if (t.y !== undefined && Math.abs(nav.heightAt(g.x, g.z) - t.y) > 0.5) failed.push(t.id + ' height');
    }
    expect(failed).toEqual([]);
  });

  it('keeps the yard sealed except through its gates', () => {
    setGates(true);
    const lookout = world.nav.findPath(level.spawn, world.nav.nearestWalkable(KORR.places.lookout.x, KORR.places.lookout.z)!, 400000);
    const yard = world.nav.findPath(level.spawn, world.nav.nearestWalkable(KORR.places.yard.x, KORR.places.yard.z)!, 400000);
    setGates(false);
    expect(lookout).not.toBeNull();
    expect(yard).toBeNull();
  });

  it('has at least 20 low cover pieces between 1.0 and 1.4 m', () => {
    expect(world.level.covers.filter((c) => c.h >= 1 && c.h <= 1.4).length).toBeGreaterThanOrEqual(20);
    expect(world.level.covers.filter((c) => c.h >= 2 && c.h <= 3).length).toBeGreaterThanOrEqual(6);
  });

  it('leaves the shuttle area clear', () => {
    const s = level.shuttle;
    for (const p of level.prims) expect(footDist(p, s.x, s.z), JSON.stringify(p)).toBeGreaterThan(6);
    for (const b of world.level.blockers) {
      const r = b.kind === 'circle' ? b.r : Math.hypot(b.hw, b.hd);
      expect(Math.hypot(b.x - s.x, b.z - s.z) - r).toBeGreaterThan(6);
    }
  });

  it('keeps solid props 1.5 m away from nodes, NPCs, triggers, checkpoints, crates and spawns', () => {
    const pts: (XZ & { id: string; y?: number })[] = [
      ...KORR.nodes,
      { id: 'lookoutNpc', ...KORR.lookoutNpc },
      { id: 'office', ...KORR.office },
      { id: 'officeDoor', ...KORR.office.door },
      { id: 'kwanAtDock', ...KORR.kwanAtDock },
      { id: 'vaultUse', x: KORR.vault.x, z: KORR.vault.z + 1.4 },
      { id: 'spawn', ...KORR.spawn },
      ...KORR_EXTRA_WAVE.map((s, i) => ({ id: 'extra' + i, ...s })),
    ];
    for (const e of KORR_ENCOUNTERS) {
      pts.push({ id: e.id + ' trigger', ...e.trigger }, { id: e.id + ' checkpoint', ...e.checkpoint }, { id: e.id + ' crate', ...e.crate });
      for (const a of e.alt ?? []) pts.push({ id: e.id + ' alt', ...a });
      for (const p of e.perches ?? []) pts.push({ id: e.id + ' perch', ...p, y: KORR.gantry.h });
      e.waves.flat().forEach((s, i) => pts.push({ id: e.id + ' spawn' + i, ...s, y: s.type === 'marksman' ? KORR.gantry.h : undefined }));
    }
    const bad: string[] = [];
    for (const p of level.prims) {
      if (p.solid === false || p.kind === 'ramp' || (p.kind === 'box' && (p.walk || p.id))) continue;
      const y0 = p.y ?? 0, y1 = y0 + p.h;
      for (const q of pts) {
        const qy = q.y ?? level.terrain.height(q.x, q.z);
        if (y1 < qy - 0.2 || y0 > qy + 2) continue;
        if (footDist(p, q.x, q.z) < 1.5) bad.push(q.id + ' <- ' + p.kind + '@' + p.x.toFixed(1) + ',' + p.z.toFixed(1));
      }
    }
    expect(bad).toEqual([]);
  });
});
