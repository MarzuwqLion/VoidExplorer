import { describe, it, expect, beforeAll } from 'vitest';
import { initPhysics } from '../../src/world/physics';
import { WalkWorld } from '../../src/world/walkWorld';
import { gymPrims } from '../../src/world/gymLayout';
import { EMPTY_CMD, type PlayerCmd } from '../../src/player/controller';
import { FEEL } from '../../src/data/tuning';

beforeAll(async () => {
  await initPhysics();
});
const DT = 1 / 60;
function gym(x = 0, z = 0, yaw = 0, mode: 'field' | 'bridge' = 'field'): WalkWorld {
  return new WalkWorld({ prims: gymPrims(), ground: () => 0, bounds: { minX: -30, minZ: -30, maxX: 30, maxZ: 30 }, spawn: { x, z, yaw, y: 0.02 }, mode });
}
function run(w: WalkWorld, seconds: number, cmd: Partial<PlayerCmd>): void {
  for (let t = 0; t < seconds; t += DT) w.stepPlayer(DT, { ...EMPTY_CMD, camYaw: w.cam.yaw, ...cmd });
}

describe('commander movement', () => {
  it('jogs at 4.5 m/s, walks at 2.0 on light tilt, sprints at 7.0', () => {
    let w = gym(-25, 25);
    run(w, 0.3, {});
    run(w, 1, { move: { x: 1, y: 0 } });
    expect(w.player.speed).toBeCloseTo(FEEL.jogSpeed, 1);
    w = gym(-25, 25);
    run(w, 0.3, {});
    run(w, 1, { move: { x: 0.4, y: 0 } });
    expect(w.player.speed).toBeCloseTo(FEEL.walkSpeed, 1);
    w = gym(-25, 22);
    run(w, 0.3, {});
    run(w, 1.5, { move: { x: 1, y: 0 }, sprintHeld: true });
    expect(w.player.speed).toBeCloseTo(FEEL.runSpeed, 1);
    expect(w.player.sprinting).toBe(true);
  });
  it('aim walk and crouch walk at 2.2 m/s', () => {
    let w = gym(-25, 25);
    run(w, 0.3, {});
    run(w, 1, { move: { x: 1, y: 0 }, aim: true });
    expect(w.player.speed).toBeCloseTo(FEEL.aimWalkSpeed, 1);
    w = gym(-25, 25);
    run(w, 0.3, {});
    run(w, DT, { crouch: true });
    expect(w.player.crouched).toBe(true);
    run(w, 1, { move: { x: 1, y: 0 } });
    expect(w.player.speed).toBeCloseTo(FEEL.crouchSpeed, 1);
    expect(w.player.height).toBeCloseTo(1.1, 2);
  });
  it('bridge mode walks by default and jogs with sprint held', () => {
    const w = gym(-25, 25, 0, 'bridge');
    run(w, 0.3, {});
    run(w, 1, { move: { x: 1, y: 0 } });
    expect(w.player.speed).toBeCloseTo(FEEL.walkSpeed, 1);
    run(w, 1, { move: { x: 1, y: 0 }, sprintHeld: true });
    expect(w.player.speed).toBeCloseTo(FEEL.jogSpeed, 1);
  });
  it('reaches full speed in 0.15 s and stops in 0.12 s', () => {
    const w = gym(-25, 25);
    run(w, 0.3, {});
    run(w, 0.15 + DT, { move: { x: 1, y: 0 } });
    expect(w.player.speed).toBeGreaterThan(FEEL.jogSpeed * 0.95);
    run(w, 0.5, { move: { x: 1, y: 0 } });
    run(w, 0.12 + DT, {});
    expect(w.player.speed).toBeLessThan(0.2);
  });
  it('dodge roll covers 5 m in 0.55 s with 0.30 s invulnerability and a cooldown', () => {
    const w = gym(-25, 20);
    run(w, 0.3, {});
    const x0 = w.player.pos.x;
    w.stepPlayer(DT, { ...EMPTY_CMD, camYaw: w.cam.yaw, move: { x: 1, y: 0 }, roll: true });
    let t = DT;
    let invulnAt025 = false, invulnAt035 = true;
    while (w.player.state === 'roll') {
      w.stepPlayer(DT, { ...EMPTY_CMD, camYaw: w.cam.yaw });
      t += DT;
      if (Math.abs(t - 0.25) < DT / 2) invulnAt025 = w.player.invulnerable;
      if (Math.abs(t - 0.35) < DT / 2) invulnAt035 = w.player.invulnerable;
    }
    expect(t).toBeCloseTo(FEEL.rollTime, 1);
    expect(w.player.pos.x - x0).toBeGreaterThan(FEEL.rollDistance - 0.25);
    expect(w.player.pos.x - x0).toBeLessThan(FEEL.rollDistance + 0.25);
    expect(invulnAt025).toBe(true);
    expect(invulnAt035).toBe(false);
    w.stepPlayer(DT, { ...EMPTY_CMD, camYaw: w.cam.yaw, roll: true });
    expect(w.player.state).toBe('move');
  });
  it('climbs a 0.3 m step and a 30 degree ramp but not a 0.5 m step or a 50 degree ramp', () => {
    let w = gym(18, 9, 0);
    run(w, 0.3, {});
    run(w, 2, { move: { x: 0, y: 1 } });
    expect(w.player.pos.y).toBeGreaterThan(0.25);
    w = gym(24, 9, 0);
    run(w, 0.3, {});
    run(w, 2, { move: { x: 0, y: 1 } });
    expect(w.player.pos.y).toBeLessThan(0.1);
    w = gym(-20, 10, 0);
    run(w, 0.3, {});
    run(w, 3, { move: { x: 0, y: 1 } });
    expect(w.player.pos.y).toBeGreaterThan(3.5);
    w = gym(-14, 8, 0);
    run(w, 0.3, {});
    run(w, 3, { move: { x: 0, y: 1 } });
    expect(w.player.pos.y).toBeLessThan(1.5);
  });
  it('crouched behind low cover, aiming pops the commander up over it', () => {
    const w = gym(0, -2.9, 0);
    run(w, 0.3, {});
    run(w, DT, { crouch: true });
    run(w, 0.5, { aim: true });
    expect(w.player.coverAhead).toBe('low');
    expect(w.player.popUp).toBeGreaterThan(0.95);
    run(w, 0.5, {});
    expect(w.player.popUp).toBeLessThan(0.05);
  });
});

describe('camera collision', () => {
  it('never passes through walls when backed into them from many angles', () => {
    const w = gym(0, 16, 0);
    run(w, 0.3, {});
    let checks = 0;
    for (let yaw = 0; yaw < 360; yaw += 15) {
      for (const pitch of [-50, -10, 20, 60]) {
        w.cam.yaw = yaw;
        w.cam.pitch = pitch;
        // Walk backwards into the wall and corner.
        run(w, 0.4, { move: { x: 0.3, y: -1 } });
        const head = w.head();
        const cam = w.cam.pos;
        expect(w.physics.clear({ x: w.player.pos.x, y: w.cam.pivot.y, z: w.player.pos.z }, cam)).toBe(true);
        expect(Math.abs(cam.z - 18)).toBeGreaterThan(0.25 - 0.3 + 0.2);
        expect(cam.distanceTo(head)).toBeLessThan(3.5);
        checks++;
      }
    }
    expect(checks).toBeGreaterThan(90);
  });
});
