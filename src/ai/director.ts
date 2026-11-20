import * as THREE from 'three';
import { Enemy } from './enemy';
import { Emitter } from '../core/events';
import type { Rng } from '../core/rng';
import type { WalkWorld } from '../world/walkWorld';
import type { Combat } from '../world/combat';
import { buildCoverPoints, pickCover, type CoverPoint } from './cover';
import { Projectiles } from './projectiles';
import { AI, ENEMIES, SPITTER, FOREMAN } from '../data/enemies';
import { AMMO_DROP } from '../data/weapons';
import type { EnemyType } from '../data/names';
import type { XZ } from '../data/layouts';
import type { EncounterDef, EncounterStatus, SpawnDef } from './encounter';
import { BRAINS } from './brains';
import type { SoundId } from '../data/sounds';

export interface DirectorEvents extends Record<string, unknown> {
  kill: Enemy;
  started: EncounterDef;
  cleared: EncounterDef;
  sound: { id: SoundId; pos: THREE.Vector3 };
  splash: THREE.Vector3;
  blast: THREE.Vector3;
  pickup: { kind: 'smg' | 'rifle'; amount: number };
  spawned: Enemy;
}
export interface Pickup {
  x: number;
  y: number;
  z: number;
  kind: 'smg' | 'rifle';
  amount: number;
}

/** Runs every enemy: navigation, perception, alerts, tokens, encounters, projectiles, drops. */
export class Director {
  readonly events = new Emitter<DirectorEvents>();
  enemies: Enemy[] = [];
  cover: CoverPoint[];
  readonly proj = new Projectiles();
  pickups: Pickup[] = [];
  encounters: EncounterDef[] = [];
  status = new Map<string, EncounterStatus>();
  private wave = new Map<string, number>();
  private tokens = new Set<number>();
  /** Time since each encounter's commander was visible to anyone, for "player hides" logic. */
  playerHiddenT = 0;
  disabled = false;

  constructor(
    readonly world: WalkWorld,
    readonly combat: Combat,
    readonly rng: Rng,
  ) {
    this.cover = buildCoverPoints(world.level.covers, world.nav);
    combat.events.on('shot', (e) => {
      if (e.player) this.noise(e.from, AI.gunfireAlert);
    });
  }

  get player(): THREE.Vector3 {
    return this.world.player.pos;
  }
  playerChest(out = new THREE.Vector3()): THREE.Vector3 {
    return this.combat.playerAimPoint(out);
  }
  activeCount(): number {
    return this.enemies.filter((e) => e.alive).length;
  }

  spawn(type: EnemyType, x: number, z: number, opts: { yaw?: number; encounter?: string; alerted?: boolean; patrol?: XZ } = {}): Enemy | null {
    if (this.activeCount() >= AI.maxActive) return null;
    const p = this.world.nav.nearestWalkable(x, z, 6) ?? { x, z };
    const e = new Enemy(type, p.x, this.world.nav.heightAt(p.x, p.z), p.z, opts.yaw ?? 0);
    e.encounter = opts.encounter ?? null;
    if (opts.alerted) this.alert(e);
    if (opts.patrol) {
      e.mem.px0 = p.x;
      e.mem.pz0 = p.z;
      e.mem.px1 = p.x + opts.patrol.x;
      e.mem.pz1 = p.z + opts.patrol.z;
    }
    this.enemies.push(e);
    this.combat.targets.push(e);
    this.events.emit('spawned', e);
    return e;
  }
  private spawnDefs(defs: SpawnDef[], enc: EncounterDef, alerted: boolean): void {
    for (const s of defs) this.spawn(s.type, s.x, s.z, { yaw: ((s.yaw ?? 0) * Math.PI) / 180, encounter: enc.id, alerted, patrol: alerted ? undefined : s.patrol });
  }

  addEncounters(list: EncounterDef[]): void {
    for (const e of list) {
      this.encounters.push(e);
      this.status.set(e.id, 'idle');
    }
  }
  startEncounter(id: string, alerted?: boolean): void {
    const enc = this.encounters.find((e) => e.id === id);
    if (!enc || this.status.get(id) !== 'idle') return;
    this.status.set(id, 'active');
    this.wave.set(id, 0);
    this.spawnDefs(enc.waves[0] ?? [], enc, alerted ?? !!enc.startAlerted);
    this.events.emit('started', enc);
  }
  /** Add an extra wave to an encounter before it starts (or while active). */
  addWave(id: string, wave: SpawnDef[]): void {
    const enc = this.encounters.find((e) => e.id === id);
    if (enc) enc.waves.push(wave);
  }
  markCleared(id: string): void {
    this.status.set(id, 'cleared');
  }
  /** Commander died: despawn the active encounter's enemies; it restarts when re-triggered. */
  resetActive(): void {
    for (const enc of this.encounters) {
      if (this.status.get(enc.id) !== 'active') continue;
      for (const e of this.enemies) if (e.encounter === enc.id) this.remove(e);
      this.status.set(enc.id, 'idle');
    }
    for (const e of this.enemies) if (!e.encounter && e.alive) this.remove(e);
    this.tokens.clear();
    this.proj.clear();
  }
  remove(e: Enemy): void {
    e.removed = true;
    e.alive = false;
    this.combat.targets = this.combat.targets.filter((t) => t !== e);
    this.releaseToken(e);
    if (e.cover >= 0 && this.cover[e.cover]) this.cover[e.cover].owner = -1;
  }
  killAll(): void {
    for (const e of this.enemies) if (e.alive) {
      e.damage({ amount: 1e6, armorMul: 1, part: 'body', partMul: 1, from: this.player });
      this.onKill(e);
    }
  }

  noise(at: THREE.Vector3, radius: number): void {
    for (const e of this.enemies) if (e.alive && !e.alerted && e.pos.distanceTo(at) <= radius) this.alert(e);
  }
  alert(e: Enemy): void {
    if (e.alerted) return;
    e.alerted = true;
    e.lastKnown.copy(this.player);
    for (const o of this.enemies) {
      if (o === e || !o.alive || o.alerted || o.alertPending >= 0) continue;
      if ((o.encounter && o.encounter === e.encounter) || o.pos.distanceTo(e.pos) <= AI.groupAlert) o.alertPending = AI.groupAlertDelay;
    }
  }

  canSee(e: Enemy): boolean {
    if (this.combat.dead) return false;
    const eye = e.eye();
    const tgt = this.playerChest();
    const d = eye.distanceTo(tgt);
    if (d > AI.visionRange) return false;
    if (!e.alerted) {
      const f = e.forward();
      const to = tgt.clone().sub(eye).setY(0).normalize();
      if (f.dot(to) < Math.cos(((AI.visionDeg / 2) * Math.PI) / 180)) return false;
    }
    const head = new THREE.Vector3(this.player.x, this.player.y + this.world.player.height - 0.15, this.player.z);
    return this.world.physics.clear(eye, tgt) || this.world.physics.clear(eye, head);
  }

  requestToken(e: Enemy): boolean {
    if (e.token) return true;
    if (this.tokens.size >= AI.attackTokens) return false;
    this.tokens.add(e.uid);
    e.token = true;
    return true;
  }
  releaseToken(e: Enemy): void {
    this.tokens.delete(e.uid);
    e.token = false;
  }

  /** Move along the nav grid toward a goal. Returns remaining straight-line distance. */
  moveTo(e: Enemy, goal: XZ, speed: number, dt: number, face = true): number {
    const nav = this.world.nav;
    e.repathT -= dt;
    const gd = Math.hypot(goal.x - e.pos.x, goal.z - e.pos.z);
    if (gd < 0.3) {
      e.speedNow = 0;
      return gd;
    }
    const goalMoved = !e.pathGoal || Math.hypot(goal.x - e.pathGoal.x, goal.z - e.pathGoal.z) > 1.2;
    if ((goalMoved && e.repathT <= AI.repath * 0.6) || e.repathT <= 0) {
      e.path = nav.lineWalkable(e.pos, goal) ? [goal] : nav.findPath(e.pos, goal, 20000) ?? [];
      e.pathGoal = { ...goal };
      e.repathT = AI.repath + this.rng.next() * 0.5;
    }
    while (e.path.length > 1 && Math.hypot(e.path[0].x - e.pos.x, e.path[0].z - e.pos.z) < 0.6) e.path.shift();
    const wp = e.path[0];
    if (!wp) {
      e.speedNow = 0;
      return gd;
    }
    let dx = wp.x - e.pos.x, dz = wp.z - e.pos.z;
    const wl = Math.hypot(dx, dz) || 1;
    dx /= wl;
    dz /= wl;
    // Separation from other agents.
    let sx = 0, sz = 0;
    for (const o of this.enemies) {
      if (o === e || !o.alive) continue;
      const ox = e.pos.x - o.pos.x, oz = e.pos.z - o.pos.z;
      const d = Math.hypot(ox, oz);
      const min = e.radius + o.radius + 0.3;
      if (d > 0.01 && d < min) {
        sx += (ox / d) * (min - d);
        sz += (oz / d) * (min - d);
      }
    }
    const step = Math.min(speed * dt, wl);
    let nx = e.pos.x + dx * step + sx * dt * 3, nz = e.pos.z + dz * step + sz * dt * 3;
    if (!nav.isWalkable(nx, nz)) {
      if (nav.isWalkable(nx, e.pos.z)) nz = e.pos.z;
      else if (nav.isWalkable(e.pos.x, nz)) nx = e.pos.x;
      else {
        nx = e.pos.x;
        nz = e.pos.z;
        e.repathT = Math.min(e.repathT, 0.3);
      }
    }
    const moved = Math.hypot(nx - e.pos.x, nz - e.pos.z);
    e.pos.x = nx;
    e.pos.z = nz;
    e.pos.y = nav.heightAt(nx, nz);
    e.speedNow = moved / dt;
    e.dist += moved;
    if (face && moved > 0.001) this.face(e, e.pos.x + dx, e.pos.z + dz, dt, 8);
    return Math.hypot(goal.x - e.pos.x, goal.z - e.pos.z);
  }
  face(e: Enemy, x: number, z: number, dt: number, rate = 6): void {
    const want = Math.atan2(-(x - e.pos.x), -(z - e.pos.z));
    let d = want - e.yaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    e.yaw += d * Math.min(1, dt * rate);
  }
  findCover(e: Enemy, opts: Parameters<typeof pickCover>[8] = {}): CoverPoint | null {
    const t = this.playerChest();
    const c = pickCover(this.cover, e.pos.x, e.pos.z, t.x, t.y, t.z, this.world.physics, e.uid, opts);
    if (e.cover >= 0 && this.cover[e.cover]) this.cover[e.cover].owner = -1;
    e.cover = c ? this.cover.indexOf(c) : -1;
    if (c) c.owner = e.uid;
    return c;
  }
  sound(id: SoundId, pos: THREE.Vector3): void {
    this.events.emit('sound', { id, pos: pos.clone() });
  }

  private onKill(e: Enemy): void {
    this.releaseToken(e);
    if (e.cover >= 0 && this.cover[e.cover]) this.cover[e.cover].owner = -1;
    this.sound(e.def.raider ? 'enemy_death_raider' : 'enemy_death_creature', e.pos);
    if (e.def.raider && !e.def.boss && this.rng.chance(AMMO_DROP.chance)) {
      const smg = this.rng.chance(0.5);
      this.pickups.push({ x: e.pos.x, y: e.pos.y, z: e.pos.z, kind: smg ? 'smg' : 'rifle', amount: smg ? AMMO_DROP.smg : AMMO_DROP.rifle });
    }
    this.events.emit('kill', e);
  }

  update(dt: number): void {
    if (this.disabled) return;
    const anyVisible = { v: false };
    for (const e of this.enemies) {
      e.prevPos.copy(e.pos);
      e.prevYaw = e.yaw;
      if (e.removed) continue;
      if (!e.alive) {
        if (e.deadT === 0) this.onKill(e);
        e.deadT += dt;
        if (e.deadT > AI.fadeAfter + 1) this.remove(e);
        continue;
      }
      e.stateT += dt;
      e.flinch = Math.max(0, e.flinch - dt / AI.flinchTime);
      if (e.alertPending >= 0) {
        e.alertPending -= dt;
        if (e.alertPending < 0) {
          e.alertPending = -1;
          this.alert(e);
        }
      }
      e.seesPlayer = this.canSee(e);
      if (e.seesPlayer) {
        e.sinceSeen = 0;
        e.lastKnown.copy(this.player);
        anyVisible.v = true;
        if (!e.alerted) this.alert(e);
      } else e.sinceSeen += dt;
      if (e.staggerT > 0) {
        e.staggerT -= dt;
        e.anim = 'stagger';
        e.speedNow = 0;
        this.releaseToken(e);
        continue;
      }
      BRAINS[e.type](e, this, dt);
    }
    this.playerHiddenT = anyVisible.v ? 0 : this.playerHiddenT + dt;
    // Projectiles.
    this.proj.update(dt, {
      splash: (p) => {
        this.events.emit('splash', p);
        this.sound('acid_splash', p);
        const c = this.playerChest();
        if (Math.hypot(c.x - p.x, c.z - p.z) <= SPITTER.radius && Math.abs(this.player.y - p.y) < 2.5) this.combat.damagePlayer(SPITTER.damage, p);
      },
      poolTick: (pool) => {
        const pp = this.player;
        if (Math.hypot(pp.x - pool.x, pp.z - pool.z) <= pool.r * 0.8 && Math.abs(pp.y - pool.y) < 1) {
          this.poolAcc += SPITTER.poolDps * dt;
          if (this.poolAcc >= 1) {
            const n = Math.floor(this.poolAcc);
            this.poolAcc -= n;
            this.combat.damagePlayer(n, { x: pool.x, y: pool.y, z: pool.z });
          }
        }
      },
      blast: (m) => {
        const v = new THREE.Vector3(m.x, m.y, m.z);
        this.events.emit('blast', v);
        this.sound('mortar_hit', v);
        const pp = this.player;
        if (Math.hypot(pp.x - m.x, pp.z - m.z) <= FOREMAN.mortarRadius) this.combat.damagePlayer(FOREMAN.mortarDamage, v);
      },
    });
    // Pickups.
    const pp = this.player;
    this.pickups = this.pickups.filter((k) => {
      if (Math.hypot(pp.x - k.x, pp.z - k.z) > AMMO_DROP.pickupRange || Math.abs(pp.y - k.y) > 2) return true;
      this.combat.weapons.addReserve(k.kind, k.amount);
      this.events.emit('pickup', { kind: k.kind, amount: k.amount });
      return false;
    });
    // Encounters.
    for (const enc of this.encounters) {
      const st = this.status.get(enc.id);
      if (st === 'idle' && !enc.manual && !this.combat.dead && Math.hypot(pp.x - enc.trigger.x, pp.z - enc.trigger.z) <= enc.trigger.r) this.startEncounter(enc.id);
      if (st !== 'active') continue;
      const mine = this.enemies.filter((e) => e.encounter === enc.id && !e.removed);
      const alive = mine.filter((e) => e.alive).length;
      const w = this.wave.get(enc.id) ?? 0;
      if (w < enc.waves.length - 1 && alive <= (enc.nextWaveAt ?? 0)) {
        this.wave.set(enc.id, w + 1);
        this.spawnDefs(enc.waves[w + 1], enc, true);
      } else if (w >= enc.waves.length - 1 && alive === 0) {
        this.status.set(enc.id, 'cleared');
        this.events.emit('cleared', enc);
      }
    }
    this.enemies = this.enemies.filter((e) => !e.removed || e.deadT < AI.fadeAfter + 1);
  }
  private poolAcc = 0;
  isActive(id: string): boolean {
    return this.status.get(id) === 'active';
  }
  defOf(type: EnemyType) {
    return ENEMIES[type];
  }
}
