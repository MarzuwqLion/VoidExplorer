import { describe, it, expect, beforeAll } from 'vitest';
import { WEAPONS, falloff, shotsToKill } from '../../src/data/weapons';
import { WeaponSystem } from '../../src/player/weapons';
import { applyDamage, vitals } from '../../src/ai/vitals';
import { initPhysics } from '../../src/world/physics';
import { WalkWorld } from '../../src/world/walkWorld';
import { gymPrims } from '../../src/world/gymLayout';
import { Combat } from '../../src/world/combat';
import { Rng } from '../../src/core/rng';
import { SURVIVAL, HANDLING } from '../../src/data/tuning';

describe('weapon damage', () => {
  it('kills a 100-health target in 5 / 10 / 3 body shots', () => {
    expect(shotsToKill(WEAPONS.pistol, 100)).toBe(5);
    expect(shotsToKill(WEAPONS.smg, 100)).toBe(10);
    expect(shotsToKill(WEAPONS.rifle, 100)).toBe(3);
    // Through the real damage path.
    for (const [id, n] of [['pistol', 5], ['smg', 10], ['rifle', 3]] as const) {
      const v = vitals(100);
      let shots = 0;
      while (v.health > 0) {
        applyDamage(v, { amount: falloff(WEAPONS[id], 10), armorMul: 1, part: 'body', partMul: 1, from: { x: 0, y: 0, z: 0 } });
        shots++;
      }
      expect(shots).toBe(n);
    }
  });
  it('falls off linearly between full and minimum range', () => {
    expect(falloff(WEAPONS.pistol, 25)).toBe(22);
    expect(falloff(WEAPONS.pistol, 45)).toBeCloseTo(11, 5);
    expect(falloff(WEAPONS.pistol, 35)).toBeCloseTo(16.5, 5);
    expect(falloff(WEAPONS.pistol, 200)).toBeCloseTo(11, 5);
    expect(falloff(WEAPONS.smg, 30)).toBeCloseTo(11 * 0.4, 5);
    expect(falloff(WEAPONS.rifle, 60)).toBe(38);
    expect(falloff(WEAPONS.rifle, 100)).toBeCloseTo(38 * 0.7, 5);
  });
  it('applies headshot and armor multipliers', () => {
    const v = vitals(100, 0, 100);
    const r = applyDamage(v, { amount: 38, armorMul: 1.4, part: 'body', partMul: 1, from: { x: 0, y: 0, z: 0 } });
    expect(r.armor).toBe(true);
    expect(v.armor).toBeCloseTo(100 - 38 * 1.4, 5);
    expect(v.health).toBe(100);
    const v2 = vitals(100);
    applyDamage(v2, { amount: 38, armorMul: 1, part: 'head', partMul: WEAPONS.rifle.headshot, from: { x: 0, y: 0, z: 0 } });
    expect(v2.health).toBeCloseTo(100 - 76, 5);
  });
});

describe('weapon handling', () => {
  it('caps fire rate and needs a fresh press for semi-auto', () => {
    const w = new WeaponSystem();
    w.current = 'pistol';
    expect(w.tryFire(true, true)).toBe('fired');
    expect(w.tryFire(true, true)).toBe(null);
    w.update(60 / 240 + 0.001);
    expect(w.tryFire(false, true)).toBe(null);
    expect(w.tryFire(true, true)).toBe('fired');
    w.current = 'smg';
    w.cooldown = 0;
    let n = 0;
    for (let t = 0; t < 1; t += 1 / 600) {
      w.update(1 / 600);
      if (w.tryFire(false, true) === 'fired') n++;
    }
    expect(n).toBeGreaterThanOrEqual(13);
    expect(n).toBeLessThanOrEqual(14);
  });
  it('blooms spread per shot and decays within 0.4 s', () => {
    const w = new WeaponSystem();
    w.current = 'smg';
    const base = w.spread(false);
    for (let i = 0; i < 20; i++) {
      w.cooldown = 0;
      w.tryFire(true, true);
    }
    expect(w.spread(false)).toBeCloseTo(base + 2.0, 5);
    w.update(HANDLING.spreadDecay + 0.01);
    expect(w.spread(false)).toBeCloseTo(base, 5);
    expect(w.spread(true)).toBeCloseTo(WEAPONS.smg.aimSpread, 5);
  });
  it('reloads from reserve, auto-reloads when empty, pistol never runs dry', () => {
    const w = new WeaponSystem();
    w.current = 'rifle';
    w.slot.mag = 0;
    expect(w.tryFire(true, true)).toBe('dry');
    expect(w.reloading).toBe(true);
    w.update(WEAPONS.rifle.reload + 0.01);
    expect(w.slot.mag).toBe(16);
    expect(w.slot.reserve).toBe(80 - 16);
    w.current = 'pistol';
    w.slot.mag = 0;
    w.slot.reserve = 0;
    w.startReload();
    w.update(WEAPONS.pistol.reload + 0.01);
    expect(w.slot.mag).toBe(12);
  });
  it('swap cancels a reload and takes 0.35 s', () => {
    const w = new WeaponSystem();
    w.slot.mag = 3;
    w.startReload();
    w.swap('smg');
    expect(w.reloading).toBe(false);
    w.update(HANDLING.swapTime + 0.01);
    expect(w.current).toBe('smg');
    expect(w.swapping).toBe(false);
  });
  it('extended magazines add 25 percent', () => {
    const w = new WeaponSystem(1.25);
    expect(w.slots.pistol.magSize).toBe(15);
    expect(w.slots.smg.magSize).toBe(45);
    expect(w.slots.rifle.magSize).toBe(20);
  });
});

describe('shield, health and medkits', () => {
  beforeAll(async () => {
    await initPhysics();
  });
  function make() {
    const w = new WalkWorld({ prims: gymPrims(), ground: () => 0, bounds: { minX: -30, minZ: -30, maxX: 30, maxZ: 30 }, spawn: { x: -20, z: 20, yaw: 0, y: 0.02 }, mode: 'field' });
    return new Combat(w, new Rng(1), { shieldMax: 100, medkitMax: 2, magMul: 1 });
  }
  it('damage hits shield first and overflows into health', () => {
    const c = make();
    c.damagePlayer(130, { x: 0, y: 0, z: 0 });
    expect(c.shield).toBe(0);
    expect(c.health).toBe(70);
  });
  it('shield recharges at 30/s after 4 s without damage; health does not regenerate', () => {
    const c = make();
    c.damagePlayer(150, { x: 0, y: 0, z: 0 });
    for (let t = 0; t < 3.9; t += 1 / 60) c.postStep(1 / 60);
    expect(c.shield).toBe(0);
    for (let t = 0; t < 1.0; t += 1 / 60) c.postStep(1 / 60);
    expect(c.shield).toBeGreaterThan(20);
    expect(c.shield).toBeLessThan(35);
    for (let t = 0; t < 5; t += 1 / 60) c.postStep(1 / 60);
    expect(c.shield).toBe(100);
    expect(c.health).toBe(50);
  });
  it('medkit restores 60 over 1.5 s, carries 2, refills', () => {
    const c = make();
    c.damagePlayer(180, { x: 0, y: 0, z: 0 });
    expect(c.health).toBe(20);
    expect(c.lowHealth).toBe(true);
    expect(c.useMedkit()).toBe(true);
    for (let t = 0; t < 0.75; t += 1 / 60) c.postStep(1 / 60);
    expect(c.health).toBeGreaterThan(40);
    expect(c.health).toBeLessThan(60);
    for (let t = 0; t < 1; t += 1 / 60) c.postStep(1 / 60);
    expect(c.health).toBeCloseTo(80, 0);
    expect(c.medkits).toBe(1);
    c.useMedkit();
    for (let t = 0; t < 2; t += 1 / 60) c.postStep(1 / 60);
    expect(c.health).toBe(SURVIVAL.health);
    expect(c.useMedkit()).toBe(false);
    c.restore();
    expect(c.medkits).toBe(2);
  });
  it('dies at zero health and respawns full', () => {
    const c = make();
    let respawned = false;
    c.onRespawn = () => {
      respawned = true;
      c.restore();
    };
    c.damagePlayer(500, { x: 0, y: 0, z: 0 });
    expect(c.dead).toBe(true);
    for (let t = 0; t < SURVIVAL.deathFade + 0.1; t += 1 / 60) c.postStep(1 / 60);
    expect(respawned).toBe(true);
    expect(c.health).toBe(100);
    expect(c.shield).toBe(100);
  });
});
