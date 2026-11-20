import { WalkWorld } from '../../src/world/walkWorld';
import { gymPrims } from '../../src/world/gymLayout';
import { Combat } from '../../src/world/combat';
import { Director } from '../../src/ai/director';
import { Rng } from '../../src/core/rng';
import { Input } from '../../src/core/input';
import type { Enemy } from '../../src/ai/enemy';
import type { Prim } from '../../src/world/level';

export const DT = 1 / 60;
export interface Sim {
  world: WalkWorld;
  combat: Combat;
  dir: Director;
  input: Input;
  t: number;
  step(seconds: number, each?: () => boolean | void): number;
}

/** Headless field: physics, nav, commander, combat and AI, stepped at 60 Hz. */
export function makeSim(opts: { x?: number; z?: number; yaw?: number; seed?: number; prims?: Prim[]; half?: number } = {}): Sim {
  const half = opts.half ?? 50;
  const world = new WalkWorld({ prims: opts.prims ?? gymPrims(), ground: () => 0, bounds: { minX: -half, minZ: -half, maxX: half, maxZ: half }, spawn: { x: opts.x ?? 0, z: opts.z ?? 20, yaw: opts.yaw ?? 0, y: 0.02 }, mode: 'field' });
  const rng = new Rng(opts.seed ?? 1);
  const combat = new Combat(world, rng, { shieldMax: 100, medkitMax: 2, magMul: 1 });
  const dir = new Director(world, combat, rng);
  const input = new Input();
  input.getPads = () => [];
  const sim: Sim = {
    world,
    combat,
    dir,
    input,
    t: 0,
    step(seconds, each) {
      const n = Math.round(seconds / DT);
      for (let i = 0; i < n; i++) {
        input.poll(DT);
        const r = combat.preStep(DT, input, false);
        world.stepPlayer(DT, world.cmdFromInput(input, { firing: r.firing }));
        combat.postStep(DT);
        dir.update(DT);
        sim.t += DT;
        if (each && each() === true) return sim.t;
      }
      return sim.t;
    },
  };
  return sim;
}

/** Point the camera at an enemy's body center (scripted stand-in aim). */
export function aimAt(sim: Sim, e: Enemy): void {
  const hb: import('../../src/ai/types').Hitbox[] = [];
  e.hitboxes(hb);
  const b = hb.find((h) => h.part === 'body')!;
  const ty = b.kind === 'capsule' ? b.y + (b.h ?? 1) / 2 : b.y;
  const cam = sim.world.cam;
  for (let k = 0; k < 3; k++) {
    const dx = b.x - cam.pos.x, dy = ty - cam.pos.y, dz = b.z - cam.pos.z;
    cam.yaw = (Math.atan2(-dx, -dz) * 180) / Math.PI;
    cam.pitch = (Math.atan2(dy, Math.hypot(dx, dz)) * 180) / Math.PI;
    cam.kickPitch = cam.kickYaw = 0;
    cam.update(DT, sim.world.player, sim.world.physics, { aiming: true, running: false });
  }
}
export function nearest(sim: Sim): Enemy | null {
  let best: Enemy | null = null, bd = Infinity;
  for (const e of sim.dir.enemies) {
    if (!e.alive) continue;
    const d = e.pos.distanceTo(sim.world.player.pos);
    if (d < bd) {
      bd = d;
      best = e;
    }
  }
  return best;
}
