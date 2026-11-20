import { describe, it, expect, beforeAll } from 'vitest';
import { initPhysics } from '../../src/world/physics';
import { makeSim, aimAt, DT } from './simHarness';
import type { Prim } from '../../src/world/level';
import type { Enemy } from '../../src/ai/enemy';
import type { Hitbox } from '../../src/ai/types';

beforeAll(async () => {
  await initPhysics();
});

/** A 40 m bowl stand-in with six pillars on an 11 m ring, plus a tall wall for cover tests. */
function arena(): Prim[] {
  const p: Prim[] = [{ kind: 'box', x: 0, y: -1, z: 0, w: 100, h: 1, d: 100, color: 0x555555, walk: true }];
  for (const [x, z] of [[-50.5, 0], [50.5, 0], [0, -50.5], [0, 50.5]]) p.push({ kind: 'box', x, y: 0, z, w: x ? 1 : 102, h: 4, d: x ? 102 : 1, color: 0x666666 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    p.push({ kind: 'cyl', id: 'pillar' + (i + 1), x: Math.cos(a) * 11, y: 0, z: Math.sin(a) * 11, r: 1, h: 4, color: 0x777777, cover: true });
  }
  p.push({ kind: 'box', x: 30, y: 0, z: 30, w: 6, h: 2.6, d: 1, color: 0x888888, cover: true });
  return p;
}

function aimAtPart(sim: ReturnType<typeof makeSim>, e: Enemy, part: string): void {
  const hb: Hitbox[] = [];
  e.hitboxes(hb);
  const b = hb.find((h) => h.part === part) ?? hb[0];
  const cam = sim.world.cam;
  for (let k = 0; k < 3; k++) {
    const dx = b.x - cam.pos.x, dy = b.y - cam.pos.y, dz = b.z - cam.pos.z;
    cam.yaw = (Math.atan2(-dx, -dz) * 180) / Math.PI;
    cam.pitch = (Math.atan2(dy, Math.hypot(dx, dz)) * 180) / Math.PI;
    cam.kickPitch = cam.kickYaw = 0;
    cam.update(DT, sim.world.player, sim.world.physics, { aiming: true, running: false });
  }
}

describe('the Alpha', () => {
  it('charge hits a stationary commander and knocks them down', () => {
    const sim = makeSim({ prims: arena(), x: 0, z: 30, seed: 2 });
    sim.combat.god = false;
    const a = sim.dir.spawn('alpha', 0, 0, { alerted: true })!;
    let knocked = false, took = 0;
    sim.combat.events.on('playerHit', (e) => (took += e.amount));
    sim.step(20, () => {
      if (sim.world.player.state === 'knockdown') knocked = true;
      return knocked;
    });
    expect(knocked).toBe(true);
    expect(took).toBeGreaterThanOrEqual(40);
    expect(a.alive).toBe(true);
  });
  it('a pillar stuns it and exposes the flank', () => {
    // Commander directly behind a pillar from the Alpha's point of view.
    const sim = makeSim({ prims: arena(), x: 20, z: 2.2, seed: 3 });
    sim.combat.god = true;
    const a = sim.dir.spawn('alpha', -12, 0, { alerted: true, yaw: -Math.PI / 2 })!;
    a.mem.cd = 0;
    let stunned = false;
    const states: string[] = [];
    sim.step(25, () => {
      if (states[states.length - 1] !== a.state) states.push(a.state + '@' + a.pos.x.toFixed(1) + ',' + a.pos.z.toFixed(1));
      if (a.state === 'stunned') stunned = true;
      return stunned;
    });
    if (!stunned) throw new Error(states.join(' '));
    expect(stunned).toBe(true);
    const hb: Hitbox[] = [];
    a.hitboxes(hb);
    expect(hb.filter((h) => h.part === 'weak').every((h) => h.mul === 2)).toBe(true);
  });
  it('dies to sustained scripted fire in 15 to 120 s', () => {
    const sim = makeSim({ prims: arena(), x: 0, z: 35, seed: 4 });
    sim.combat.god = true;
    sim.combat.weapons.infinite = true;
    const a = sim.dir.spawn('alpha', 0, -5, { alerted: true })!;
    let tick = 0;
    const t = sim.step(150, () => {
      tick++;
      sim.input.virtual.held.add('aim');
      const n = sim.dir.enemies.find((e) => e.alive && e.type !== 'alpha') ?? a;
      if (n.alive) aimAt(sim, n);
      if (tick % 2 === 0) sim.input.virtual.taps.add('fire');
      return !a.alive;
    });
    expect(a.alive).toBe(false);
    expect(t).toBeGreaterThanOrEqual(15);
    expect(t).toBeLessThanOrEqual(120);
    // Phase 2 called stalkers twice.
    expect(sim.dir.enemies.filter((e) => e.type === 'stalker').length).toBeGreaterThanOrEqual(8);
  });
});

describe('the Foreman', () => {
  it('rotary cannon kills a stationary commander in the open', () => {
    const sim = makeSim({ prims: arena(), x: 0, z: 25, seed: 5 });
    sim.dir.spawn('foreman', 0, 5, { alerted: true });
    const t = sim.step(40, () => sim.combat.dead);
    expect(sim.combat.dead).toBe(true);
    expect(t).toBeLessThan(30);
  });
  it('cover blocks the cannon', () => {
    // Crouched behind the tall wall at (30, 30): the Foreman is north of it.
    const sim = makeSim({ prims: arena(), x: 30, z: 31.2, seed: 6 });
    sim.input.virtual.taps.add('crouch');
    const f = sim.dir.spawn('foreman', 30, 18, { alerted: true })!;
    f.mem.phase = 2; // no adds or mortars during this check
    f.mem.mortar = 999;
    let cannonShots = 0;
    sim.combat.events.on('shot', (e) => {
      if (!e.player) cannonShots++;
    });
    const before = sim.combat.health + sim.combat.shield;
    sim.step(9, () => {
      // Hold position (the Foreman walks toward us but stops at range).
      return false;
    });
    expect(cannonShots).toBeGreaterThan(20);
    expect(sim.combat.health + sim.combat.shield).toBeGreaterThan(before - 40);
    expect(sim.combat.dead).toBe(false);
  });
  it('dies to sustained fire on the heat sinks in 15 to 120 s', () => {
    const sim = makeSim({ prims: arena(), x: 0, z: 30, seed: 7 });
    sim.combat.god = true;
    sim.combat.weapons.infinite = true;
    const f = sim.dir.spawn('foreman', 0, 5, { alerted: true })!;
    let tick = 0;
    const t = sim.step(150, () => {
      tick++;
      sim.input.virtual.held.add('aim');
      const add = sim.dir.enemies.find((e) => e.alive && e.type !== 'foreman' && e.pos.distanceTo(sim.world.player.pos) < 12);
      if (add) aimAt(sim, add);
      else aimAtPart(sim, f, f.weakOpen > 0.5 ? 'sink' : 'body');
      if (tick % 2 === 0) sim.input.virtual.taps.add('fire');
      return !f.alive;
    });
    expect(f.alive).toBe(false);
    expect(t).toBeGreaterThanOrEqual(15);
    expect(t).toBeLessThanOrEqual(120);
  });
});
