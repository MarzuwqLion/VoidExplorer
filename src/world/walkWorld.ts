import * as THREE from 'three';
import { PhysicsWorld } from './physics';
import { buildLevel, type LevelData, type Prim } from './level';
import { NavGrid } from '../ai/navgrid';
import { PlayerController, type MoveMode, type PlayerCmd } from '../player/controller';
import { CameraRig } from '../player/camera';
import type { Input } from '../core/input';
import { INPUT, SIM, BODY } from '../data/tuning';

export interface Interactable {
  id: string;
  x: number;
  y: number;
  z: number;
  label: string;
  /** Seconds to hold interact (harvesting). 0 = press. */
  hold?: number;
  range?: number;
  enabled?: () => boolean;
  onUse: () => void;
}

export interface WalkWorldOpts {
  prims: Prim[];
  ground: (x: number, z: number) => number;
  /** Ground for nav; null where not walkable. Defaults to ground. */
  navGround?: (x: number, z: number) => number | null;
  bounds: { minX: number; minZ: number; maxX: number; maxZ: number };
  spawn: { x: number; z: number; yaw: number; y?: number };
  mode: MoveMode;
  /** Extra colliders (terrain trimesh etc.). */
  addColliders?: (physics: PhysicsWorld) => void;
}

/** Physics, level, nav grid, commander and camera for any walkable scene. No rendering. */
export class WalkWorld {
  readonly physics = new PhysicsWorld();
  readonly level: LevelData;
  readonly nav: NavGrid;
  readonly player: PlayerController;
  readonly cam = new CameraRig();
  readonly interactables: Interactable[] = [];
  focus: Interactable | null = null;
  holdT = 0;
  readonly ground: (x: number, z: number) => number;
  readonly bounds: WalkWorldOpts['bounds'];
  /** Locks movement (dialogue, transitions). */
  locked = false;

  constructor(o: WalkWorldOpts) {
    this.ground = o.ground;
    this.bounds = o.bounds;
    o.addColliders?.(this.physics);
    this.level = buildLevel(o.prims, this.physics, o.ground);
    this.nav = NavGrid.bake({
      ...o.bounds,
      cell: 0.5,
      agentRadius: 0.4,
      maxSlopeDeg: SIM.maxSlopeDeg,
      stepHeight: SIM.stepHeight,
      ground: o.navGround ?? o.ground,
      blockers: this.level.blockers,
      walkSurfaces: this.level.walkSurfaces,
    });
    const sy = o.spawn.y ?? o.ground(o.spawn.x, o.spawn.z) + 0.05;
    this.player = new PlayerController(this.physics, o.spawn.x, sy, o.spawn.z, o.spawn.yaw, o.mode);
    this.cam.yaw = o.spawn.yaw;
    this.physics.step();
  }

  /** Build the per-step player command from the input layer. */
  cmdFromInput(input: Input, extra: Partial<PlayerCmd> = {}): PlayerCmd {
    const pad = input.lastDevice === 'pad';
    const sprintTap = input.pressed('sprint');
    const c: PlayerCmd = {
      move: input.move,
      camYaw: this.cam.yaw,
      sprintHeld: input.down('sprint'),
      sprintTap,
      padSprint: pad,
      aim: input.down('aim'),
      crouch: input.pressed('crouch'),
      roll: input.pressed('roll'),
      firing: false,
      locked: this.locked,
      ...extra,
    };
    return c;
  }

  /** Apply look input to the camera. */
  applyLook(input: Input, dt: number, slowdown = false): void {
    if (this.locked) return;
    const l = input.look(dt, this.player.aiming, slowdown);
    this.cam.look(l.x, l.y);
  }

  stepPlayer(dt: number, cmd: PlayerCmd): void {
    this.player.step(dt, cmd);
    this.physics.step();
    this.cam.update(dt, this.player, this.physics, { aiming: this.player.aiming, running: this.player.sprinting });
  }

  /** Nearest usable interactable within range and within the camera's view cone. */
  findFocus(): Interactable | null {
    const p = this.player.pos;
    const f = this.cam.forward();
    const fl = Math.hypot(f.x, f.z) || 1;
    let best: Interactable | null = null, bd = Infinity;
    // Score favours what the camera points at, then distance relative to range.
    for (const it of this.interactables) {
      if (it.enabled && !it.enabled()) continue;
      const dx = it.x - p.x, dz = it.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d > (it.range ?? INPUT.interactRange)) continue;
      if (Math.abs(it.y - p.y) > 3) continue;
      const cos = d < 0.3 ? 1 : (dx * f.x + dz * f.z) / (d * fl);
      if (cos < Math.cos((INPUT.interactAngle * Math.PI) / 180)) continue;
      const score = d / (it.range ?? INPUT.interactRange) - cos * 0.6;
      if (score < bd) {
        bd = score;
        best = it;
      }
    }
    return best;
  }

  /** Handle focus and interact presses/holds. Returns true when interact was consumed. */
  updateInteract(input: Input, dt: number): boolean {
    const prev = this.focus;
    this.focus = this.locked ? null : this.findFocus();
    if (this.focus !== prev) this.holdT = 0;
    const f = this.focus;
    if (!f) return false;
    if (f.hold && f.hold > 0) {
      if (input.down('interact')) {
        this.holdT += dt;
        if (this.holdT >= f.hold) {
          this.holdT = 0;
          f.onUse();
        }
        return true;
      }
      this.holdT = 0;
      return false;
    }
    if (input.pressed('interact')) {
      input.consume('interact');
      f.onUse();
      return true;
    }
    return false;
  }

  /** Head position of the commander. */
  head(out = new THREE.Vector3()): THREE.Vector3 {
    return out.set(this.player.pos.x, this.player.pos.y + this.player.height * 0.9, this.player.pos.z);
  }
  chest(out = new THREE.Vector3()): THREE.Vector3 {
    return out.set(this.player.pos.x, this.player.pos.y + Math.min(this.player.height * 0.7, BODY.height * 0.7), this.player.pos.z);
  }

  dispose(): void {
    this.physics.dispose();
  }
}
