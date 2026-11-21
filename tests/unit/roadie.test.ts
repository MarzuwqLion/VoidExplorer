import { describe, it, expect } from 'vitest';
import { commanderPose, type CommanderAnim } from '../../src/player/anim';
import { CameraRig } from '../../src/player/camera';
import { ROADIE, SHAKE } from '../../src/data/tuning';

const base: CommanderAnim = { t: 1, dist: 3, speed: 4.5, armed: true, crouch: 0, aim: 0, aimPitch: 0, sprint: 0, roll: 0, reload: 0, swap: 0, melee: 0, hit: 0, knock: 0, dead: 0, harvest: 0, recoil: 0, heavy: false };

describe('roadie run', () => {
  it('hunches hard forward, drops low and keeps the head up', () => {
    const jog = commanderPose(base);
    const run = commanderPose({ ...base, speed: 7, sprint: 1 });
    // Negative x hunches forward (the rig faces -z).
    const lean = (p: typeof run) => -(p.torso![0] + p.chest![0]);
    expect(lean(run)).toBeGreaterThan(0.7);
    expect(lean(run) - lean(jog)).toBeGreaterThan(0.6);
    // Lower on average across a stride, bounce included.
    const avgLift = (a: Partial<CommanderAnim>) => {
      let s = 0;
      for (let i = 0; i < 24; i++) s += commanderPose({ ...base, ...a, dist: (i / 24) * 2.4 }).lift!;
      return s / 24;
    };
    expect(avgLift({ speed: 7, sprint: 1 })).toBeLessThan(avgLift({}) - ROADIE.drop * 0.5);
    // Neck counters most of the hunch so the commander looks where they run.
    expect(lean(run) - run.neck![0]).toBeLessThan(0.3);
  });
  it('leans into turns, capped', () => {
    const left = commanderPose({ ...base, speed: 7, sprint: 1, turn: 3 });
    const right = commanderPose({ ...base, speed: 7, sprint: 1, turn: -3 });
    const hard = commanderPose({ ...base, speed: 7, sprint: 1, turn: 50 });
    expect(left.roll!).toBeGreaterThan(0);
    expect(right.roll!).toBeLessThan(0);
    expect(hard.roll!).toBeLessThanOrEqual(ROADIE.maxLean);
    expect(commanderPose({ ...base, turn: 3 }).roll ?? 0).toBe(0);
  });
});

describe('screen shake', () => {
  it('trauma accumulates from kicks and saturates at 1', () => {
    const cam = new CameraRig();
    cam.addShake(SHAKE.hitHealth);
    expect(cam.trauma).toBeCloseTo(SHAKE.hitHealth);
    for (let i = 0; i < 10; i++) cam.addShake(0.5);
    expect(cam.trauma).toBe(1);
  });
});
