import { describe, it, expect, beforeAll } from 'vitest';
import { initPhysics } from '../../src/world/physics';
import { makeSim, aimAt, nearest } from './simHarness';
import { ENEMIES } from '../../src/data/enemies';
import { WEAPONS } from '../../src/data/weapons';
import type { EnemyType } from '../../src/data/names';

beforeAll(async () => {
  await initPhysics();
});

describe('enemy navigation', () => {
  it('every standard type paths to the commander or to cover; riflemen end at cover points', () => {
    for (const type of ['stalker', 'spitter', 'rifleman', 'rusher', 'marksman'] as EnemyType[]) {
      const sim = makeSim({ x: 0, z: 25, seed: 3 });
      sim.combat.god = true;
      const e = sim.dir.spawn(type, 0, -30, { alerted: true })!;
      const d0 = e.pos.distanceTo(sim.world.player.pos);
      sim.step(12);
      const d1 = e.pos.distanceTo(sim.world.player.pos);
      if (type === 'rifleman') {
        expect(['duck', 'peek', 'toCover']).toContain(e.state);
        const c = sim.dir.cover[e.cover];
        expect(c).toBeTruthy();
        sim.step(4);
        expect(Math.hypot(c.x - e.pos.x, c.z - e.pos.z)).toBeLessThan(0.8);
      } else if (type === 'spitter') {
        expect(d1).toBeLessThan(d0);
        expect(d1).toBeLessThan(34);
      } else if (type === 'marksman') {
        expect(e.alive).toBe(true);
        expect(Number.isFinite(e.pos.x)).toBe(true);
      } else expect(d1).toBeLessThan(10);
    }
  });
  it('riflemen pick distinct cover points', () => {
    const sim = makeSim({ x: 0, z: 25, seed: 5 });
    sim.combat.god = true;
    const rs = [-20, -10, 0, 10, 20].map((x) => sim.dir.spawn('rifleman', x, -40, { alerted: true })!);
    sim.step(14);
    const held = rs.map((r) => r.cover).filter((c) => c >= 0);
    expect(new Set(held).size).toBe(held.length);
    expect(held.length).toBeGreaterThanOrEqual(4);
  });
});

describe('combat tuning', () => {
  it('raider aim error hits about 60% stationary and 35% moving at 20 m', async () => {
    const THREE = await import('three');
    const { aimError } = await import('../../src/ai/brains');
    const sim = makeSim({ x: -40, z: 30, seed: 4 });
    sim.combat.god = true;
    const rate = (err: number) => {
      let hits = 0;
      for (let i = 0; i < 1500; i++) if (sim.combat.enemyShot(new THREE.Vector3(-40, 1.45, 10), err, 0)) hits++;
      return hits / 1500;
    };
    const still = rate(aimError(sim.dir));
    sim.world.player.vel.set(4.5, 0, 0);
    const moving = rate(aimError(sim.dir));
    expect(still).toBeGreaterThan(0.52);
    expect(still).toBeLessThan(0.68);
    expect(moving).toBeGreaterThan(0.28);
    expect(moving).toBeLessThan(0.42);
  });
  it('a stationary commander in the open dies to five riflemen in 5 to 15 s', () => {
    const times: number[] = [];
    for (const seed of [1, 2, 3]) {
      const sim = makeSim({ x: 0, z: 2, seed });
      for (const x of [-16, -8, 0, 8, 16]) sim.dir.spawn('rifleman', x, -30, { alerted: true });
      const t = sim.step(40, () => sim.combat.dead);
      times.push(t);
    }
    for (const t of times) {
      expect(t).toBeGreaterThanOrEqual(5);
      expect(t).toBeLessThanOrEqual(15);
    }
  });
  it('a hold-fire stand-in kills one of each type in the expected number of rifle shots', () => {
    for (const type of ['stalker', 'spitter', 'rifleman', 'rusher', 'marksman'] as EnemyType[]) {
      const sim = makeSim({ x: -40, z: 32, seed: 9 });
      sim.combat.god = true;
      sim.combat.weapons.current = 'rifle';
      sim.combat.weapons.infinite = true;
      const e = sim.dir.spawn(type, -40, 12, { alerted: true })!;
      const before = sim.combat.stats.shotsHit;
      const firedBefore = sim.combat.stats.shotsFired;
      let tick = 0;
      sim.step(30, () => {
        tick++;
        sim.input.virtual.held.add('aim');
        const n = nearest(sim);
        if (n) aimAt(sim, n);
        if (tick % 2 === 0) sim.input.virtual.taps.add('fire');
        return !e.alive;
      });
      const hits = sim.combat.stats.shotsHit - before;
      const fired = sim.combat.stats.shotsFired - firedBefore;
      const expected = Math.ceil(ENEMIES[type].health / WEAPONS.rifle.damage);
      expect(e.alive).toBe(false);
      // Body hits needed match the damage table; weak spots and heads can only lower it.
      expect(hits).toBeLessThanOrEqual(expected);
      expect(hits).toBeGreaterThanOrEqual(Math.ceil(expected / 2));
      expect(fired).toBeLessThanOrEqual(expected * 6);
    }
  });
});

describe('long simulation', () => {
  it('five minutes of mixed combat produce no NaN positions and nothing outside the level', () => {
    const sim = makeSim({ x: 0, z: 20, seed: 11 });
    sim.combat.god = true;
    sim.combat.weapons.infinite = true;
    const types: EnemyType[] = ['stalker', 'spitter', 'rifleman', 'rusher', 'marksman'];
    let tick = 0, bad = 0, spawned = 0, kills = 0;
    sim.dir.events.on('kill', () => kills++);
    sim.step(300, () => {
      tick++;
      if (tick % 90 === 0 && sim.dir.activeCount() < 8) {
        const t = types[spawned++ % types.length];
        sim.dir.spawn(t, -40 + (spawned * 17) % 80, -40, { alerted: true });
      }
      sim.input.virtual.held.add('aim');
      const n = nearest(sim);
      if (n && tick % 3 === 0) {
        aimAt(sim, n);
        sim.input.virtual.taps.add('fire');
      }
      if (tick % 60 === 0) {
        for (const e of sim.dir.enemies) {
          const p = e.pos;
          if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)) bad++;
          if (Math.abs(p.x) > 50 || Math.abs(p.z) > 50 || p.y < -1 || p.y > 10) bad++;
        }
        const pp = sim.world.player.pos;
        if (!Number.isFinite(pp.x) || Math.abs(pp.x) > 50 || Math.abs(pp.z) > 50) bad++;
      }
    });
    expect(bad).toBe(0);
    expect(spawned).toBeGreaterThan(10);
    expect(kills).toBeGreaterThan(2);
  });
});
