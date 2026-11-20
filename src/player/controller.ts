import * as THREE from 'three';
import { RAPIER, type PhysicsWorld, G_PLAYER, Q_STATIC } from '../world/physics';
import { BODY, FEEL, SIM, SURVIVAL, MELEE } from '../data/tuning';

export type PlayerState = 'move' | 'roll' | 'melee' | 'knockdown' | 'getup' | 'dead';
export type MoveMode = 'bridge' | 'field';

/** Per-step command built from the input layer. */
export interface PlayerCmd {
  move: { x: number; y: number };
  /** Camera yaw in degrees (0 looks toward -Z). */
  camYaw: number;
  sprintHeld: boolean;
  sprintTap: boolean;
  padSprint: boolean;
  aim: boolean;
  crouch: boolean;
  roll: boolean;
  firing: boolean;
  locked: boolean;
}
export const EMPTY_CMD: PlayerCmd = { move: { x: 0, y: 0 }, camYaw: 0, sprintHeld: false, sprintTap: false, padSprint: false, aim: false, crouch: false, roll: false, firing: false, locked: false };

const DEG = Math.PI / 180;
function angDiff(a: number, b: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Third-person commander on a Rapier kinematic character controller. Position is at the feet. */
export class PlayerController {
  readonly pos = new THREE.Vector3();
  readonly prev = new THREE.Vector3();
  readonly vel = new THREE.Vector3();
  vy = 0;
  grounded = true;
  /** Model yaw in radians; 0 faces -Z. */
  facing = 0;
  prevFacing = 0;
  state: PlayerState = 'move';
  stateT = 0;
  crouched = false;
  aiming = false;
  sprinting = false;
  /** 0 = crouched, 1 = standing up over low cover while aiming. */
  popUp = 0;
  /** -1 left .. 1 right, lean at tall cover edges. */
  lean = 0;
  coverAhead: 'low' | 'tall' | null = null;
  rollCd = 0;
  readonly rollDir = new THREE.Vector3();
  private sprintLatched = false;
  private sprintHeading = 0;
  private stopFrom = 0;
  private body: RAPIER.RigidBody;
  private collider: RAPIER.Collider;
  private cc: RAPIER.KinematicCharacterController;
  private curHalf: number;
  /** Total distance travelled, for footstep timing. */
  odometer = 0;

  constructor(
    private physics: PhysicsWorld,
    x: number,
    y: number,
    z: number,
    yawDeg: number,
    public mode: MoveMode,
  ) {
    const w = physics.world;
    this.body = w.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, y, z));
    this.curHalf = (BODY.height - BODY.radius * 2) / 2;
    this.collider = w.createCollider(
      RAPIER.ColliderDesc.capsule(this.curHalf, BODY.radius).setTranslation(0, this.curHalf + BODY.radius, 0).setCollisionGroups(G_PLAYER),
      this.body,
    );
    physics.tags.set(this.collider.handle, { kind: 'player' });
    this.cc = w.createCharacterController(0.02);
    this.cc.setUp({ x: 0, y: 1, z: 0 });
    this.cc.setMaxSlopeClimbAngle(SIM.maxSlopeDeg * DEG);
    this.cc.setMinSlopeSlideAngle((SIM.maxSlopeDeg + 5) * DEG);
    this.cc.enableSnapToGround(0.4);
    this.cc.setSlideEnabled(true);
    this.pos.set(x, y, z);
    this.prev.copy(this.pos);
    this.facing = this.prevFacing = yawDeg * DEG;
  }

  setPosition(x: number, y: number, z: number, yawDeg?: number): void {
    this.pos.set(x, y, z);
    this.prev.copy(this.pos);
    this.vel.set(0, 0, 0);
    this.vy = 0;
    this.body.setTranslation({ x, y, z }, true);
    this.physics.world.propagateModifiedBodyPositionsToColliders();
    if (yawDeg !== undefined) this.facing = this.prevFacing = yawDeg * DEG;
  }

  /** Current hitbox height in metres. */
  get height(): number {
    if (this.state === 'knockdown' || this.state === 'dead') return 0.5;
    if (this.state === 'roll') return 1.0;
    if (!this.crouched) return BODY.height;
    return BODY.crouchHeight + (BODY.height - BODY.crouchHeight) * this.popUp;
  }
  get invulnerable(): boolean {
    return (this.state === 'roll' && this.stateT < FEEL.rollInvuln) || this.state === 'getup';
  }
  get speed(): number {
    return Math.hypot(this.vel.x, this.vel.z);
  }
  get busy(): boolean {
    return this.state !== 'move';
  }
  canFire(): boolean {
    return this.state === 'move' && !this.sprinting;
  }

  knockdown(): void {
    if (this.state === 'dead') return;
    this.setState('knockdown');
    this.crouched = false;
    this.sprinting = false;
  }
  die(): void {
    this.setState('dead');
    this.vel.set(0, 0, 0);
  }
  revive(): void {
    this.setState('move');
    this.crouched = false;
    this.applyCrouchCollider(false);
  }
  startMelee(): boolean {
    if (this.state !== 'move') return false;
    this.setState('melee');
    this.sprinting = false;
    return true;
  }
  private setState(s: PlayerState): void {
    this.state = s;
    this.stateT = 0;
  }

  private applyCrouchCollider(crouch: boolean): boolean {
    const hh = ((crouch ? BODY.crouchHeight : BODY.height) - BODY.radius * 2) / 2;
    if (!crouch) {
      // Need headroom to stand.
      const t = this.body.translation();
      const hit = this.physics.ray({ x: t.x, y: t.y + BODY.crouchHeight - 0.1, z: t.z }, { x: 0, y: 1, z: 0 }, BODY.height - BODY.crouchHeight + 0.15);
      if (hit) return false;
    }
    this.curHalf = hh;
    this.collider.setHalfHeight(hh);
    this.collider.setTranslationWrtParent({ x: 0, y: hh + BODY.radius, z: 0 });
    return true;
  }

  /** Classify cover directly ahead along a yaw (radians). */
  probeCover(yaw: number): 'low' | 'tall' | null {
    const f = { x: -Math.sin(yaw), y: 0, z: -Math.cos(yaw) };
    const o = (h: number) => ({ x: this.pos.x, y: this.pos.y + h, z: this.pos.z });
    const reach = BODY.radius + 0.9;
    const low = this.physics.ray(o(0.8), f, reach);
    if (!low) return null;
    const high = this.physics.ray(o(BODY.lowCoverMax + 0.15), f, reach);
    if (!high) {
      const mid = this.physics.ray(o(BODY.lowCoverMin - 0.05), f, reach);
      return mid ? 'low' : null;
    }
    return 'tall';
  }
  /** Which side of tall cover is open: 1 right, -1 left, 0 none. */
  probeLean(yaw: number): number {
    const f = { x: -Math.sin(yaw), y: 0, z: -Math.cos(yaw) };
    const r = { x: Math.cos(yaw), z: -Math.sin(yaw) };
    const reach = BODY.radius + 1.2;
    for (const side of [1, -1]) {
      const o = { x: this.pos.x + r.x * side * 0.75, y: this.pos.y + 1.5, z: this.pos.z + r.z * side * 0.75 };
      const sideClear = !this.physics.ray({ x: this.pos.x, y: o.y, z: this.pos.z }, { x: r.x * side, y: 0, z: r.z * side }, 0.8);
      if (sideClear && !this.physics.ray(o, f, reach)) return side;
    }
    return 0;
  }

  step(dt: number, cmd: PlayerCmd): void {
    this.prev.copy(this.pos);
    this.prevFacing = this.facing;
    this.stateT += dt;
    this.rollCd = Math.max(0, this.rollCd - dt);
    const camYaw = cmd.camYaw * DEG;
    const fwd = new THREE.Vector3(-Math.sin(camYaw), 0, -Math.cos(camYaw));
    const right = new THREE.Vector3(Math.cos(camYaw), 0, -Math.sin(camYaw));
    const m = cmd.locked || this.state === 'dead' ? { x: 0, y: 0 } : cmd.move;
    const mag = Math.min(1, Math.hypot(m.x, m.y));
    const wish = new THREE.Vector3().addScaledVector(right, m.x).addScaledVector(fwd, m.y);
    if (wish.lengthSq() > 1e-6) wish.normalize();

    const field = this.mode === 'field';
    this.aiming = field && cmd.aim && !cmd.locked && (this.state === 'move' || this.state === 'melee');

    // State transitions.
    if (this.state === 'roll' && this.stateT >= FEEL.rollTime) {
      this.setState('move');
      this.rollCd = FEEL.rollCooldown;
    } else if (this.state === 'melee' && this.stateT >= MELEE.time) this.setState('move');
    else if (this.state === 'knockdown' && this.stateT >= SURVIVAL.knockdownTime) this.setState('getup');
    else if (this.state === 'getup' && this.stateT >= SURVIVAL.getupTime) this.setState('move');

    if (field && !cmd.locked && this.state === 'move') {
      if (cmd.crouch) {
        if (this.crouched) {
          if (this.applyCrouchCollider(false)) this.crouched = false;
        } else {
          this.crouched = this.applyCrouchCollider(true);
          this.sprinting = false;
          this.sprintLatched = false;
        }
      }
      if (cmd.roll && this.rollCd <= 0 && this.grounded) {
        this.setState('roll');
        this.rollDir.copy(wish.lengthSq() > 0 ? wish : new THREE.Vector3(-Math.sin(this.facing), 0, -Math.cos(this.facing)));
        if (this.crouched) {
          this.applyCrouchCollider(false);
          this.crouched = false;
        }
        this.sprinting = false;
        this.sprintLatched = false;
        this.facing = Math.atan2(-this.rollDir.x, -this.rollDir.z);
      }
    }

    // Sprint (roadie run).
    if (field && this.state === 'move') {
      if (cmd.sprintTap && cmd.padSprint) this.sprintLatched = true;
      if (this.aiming || mag < 0.2) this.sprintLatched = false;
      const want = (cmd.sprintHeld && !cmd.padSprint) || this.sprintLatched;
      const canRun = want && mag > 0.2 && !this.aiming && !cmd.firing;
      if (canRun && !this.sprinting) {
        this.sprintHeading = Math.atan2(-wish.x, -wish.z);
        if (this.crouched && this.applyCrouchCollider(false)) this.crouched = false;
      }
      this.sprinting = canRun && !this.crouched;
    } else if (this.state !== 'move') this.sprinting = false;
    else this.sprinting = false;

    // Target velocity.
    const target = new THREE.Vector3();
    let targetSpeed = 0;
    if (this.state === 'roll') {
      target.copy(this.rollDir).multiplyScalar(FEEL.rollDistance / FEEL.rollTime);
      this.vel.copy(target);
    } else if (this.state === 'move' || this.state === 'melee') {
      if (mag > 0.01) {
        if (!field) targetSpeed = cmd.sprintHeld && mag > BODY.lightTilt ? FEEL.jogSpeed : FEEL.walkSpeed;
        else if (this.sprinting) targetSpeed = FEEL.runSpeed;
        else if (this.crouched) targetSpeed = FEEL.crouchSpeed;
        else if (this.aiming) targetSpeed = FEEL.aimWalkSpeed;
        else targetSpeed = mag < BODY.lightTilt ? FEEL.walkSpeed : FEEL.jogSpeed;
        if (this.state === 'melee') targetSpeed = Math.min(targetSpeed, FEEL.walkSpeed * 0.5);
        if (this.sprinting) {
          const want = Math.atan2(-wish.x, -wish.z);
          const d = angDiff(this.sprintHeading, want);
          const maxTurn = FEEL.runTurnRate * DEG * dt;
          this.sprintHeading += Math.max(-maxTurn, Math.min(maxTurn, d));
          target.set(-Math.sin(this.sprintHeading), 0, -Math.cos(this.sprintHeading)).multiplyScalar(targetSpeed);
        } else target.copy(wish).multiplyScalar(targetSpeed);
      }
      const cur = this.speed;
      if (targetSpeed > 0) this.stopFrom = Math.max(cur, targetSpeed);
      const rate = targetSpeed > 0 ? targetSpeed / FEEL.accelTime : Math.max(this.stopFrom, 0.1) / FEEL.stopTime;
      const dv = target.clone().sub(this.vel);
      const maxDv = rate * dt;
      if (dv.length() > maxDv) dv.setLength(maxDv);
      this.vel.add(dv);
    } else {
      // Knocked down, getting up or dead: friction.
      this.vel.multiplyScalar(Math.max(0, 1 - dt * 6));
    }

    // Facing.
    if (this.state === 'move' || this.state === 'melee') {
      if (this.aiming || cmd.firing || this.state === 'melee') {
        this.facing = camYaw;
      } else if (this.speed > 0.3) {
        const want = Math.atan2(-this.vel.x, -this.vel.z);
        const maxTurn = FEEL.turnRate * DEG * dt;
        this.facing += Math.max(-maxTurn, Math.min(maxTurn, angDiff(this.facing, want)));
      }
    }

    // Cover pop-up and lean.
    this.coverAhead = field && (this.aiming || this.crouched) ? this.probeCover(this.aiming ? camYaw : this.facing) : null;
    const popTarget = this.crouched && this.aiming && this.coverAhead === 'low' ? 1 : 0;
    const popRate = dt / BODY.coverPopTime;
    this.popUp += Math.max(-popRate, Math.min(popRate, popTarget - this.popUp));
    const leanTarget = this.aiming && this.coverAhead === 'tall' ? this.probeLean(camYaw) : 0;
    const leanRate = dt / BODY.coverPopTime;
    this.lean += Math.max(-leanRate, Math.min(leanRate, leanTarget - this.lean));

    // Gravity and collision.
    if (this.grounded && this.vy < 0) this.vy = -2;
    this.vy += SIM.gravity * dt;
    const desired = { x: this.vel.x * dt, y: this.vy * dt, z: this.vel.z * dt };
    this.cc.computeColliderMovement(this.collider, desired, undefined, Q_STATIC);
    const mv = this.cc.computedMovement();
    this.grounded = this.cc.computedGrounded();
    if (this.grounded && this.vy < 0) this.vy = 0;
    const t = this.body.translation();
    let nx = t.x + mv.x, ny = t.y + mv.y, nz = t.z + mv.z;
    // Manual step-up: blocked while grounded, with a walkable ledge no higher than the step height ahead.
    const want = Math.hypot(desired.x, desired.z), got = Math.hypot(mv.x, mv.z);
    if (this.grounded && want > 1e-4 && got < want * 0.6) {
      const dx = desired.x / want, dz = desired.z / want;
      const reach = BODY.radius + 0.12;
      const top = this.physics.ray({ x: t.x + dx * reach, y: t.y + SIM.stepHeight + 0.05, z: t.z + dz * reach }, { x: 0, y: -1, z: 0 }, SIM.stepHeight + 0.1);
      if (top && top.normal.y > 0.75) {
        const h = top.point.y - t.y;
        const clearAbove = !this.physics.ray({ x: t.x, y: top.point.y + 0.3, z: t.z }, { x: dx, y: 0, z: dz }, reach + 0.1);
        if (h > 0.03 && h <= SIM.stepHeight + 0.01 && clearAbove) {
          nx = t.x + dx * want;
          nz = t.z + dz * want;
          ny = top.point.y + 0.01;
          this.vy = 0;
        }
      }
    }
    this.body.setNextKinematicTranslation({ x: nx, y: ny, z: nz });
    this.odometer += Math.hypot(mv.x, mv.z);
    this.pos.set(nx, ny, nz);
    // Remove velocity into walls (collider normals that are mostly horizontal).
    if (this.state !== 'roll') {
      const n = this.cc.numComputedCollisions();
      for (let i = 0; i < n; i++) {
        const c = this.cc.computedCollision(i);
        if (!c) continue;
        const nx = c.normal1.x, ny = c.normal1.y, nz = c.normal1.z;
        if (Math.abs(ny) > 0.7) continue;
        const hl = Math.hypot(nx, nz) || 1;
        const ux = nx / hl, uz = nz / hl;
        const into = this.vel.x * ux + this.vel.z * uz;
        if (into < 0) {
          this.vel.x -= ux * into;
          this.vel.z -= uz * into;
        }
      }
    }
  }
}
