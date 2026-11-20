import * as THREE from 'three';
import type { WalkWorld } from './walkWorld';
import { Emitter } from '../core/events';
import type { Rng } from '../core/rng';
import type { Input } from '../core/input';
import { WeaponSystem } from '../player/weapons';
import { WEAPONS, falloff } from '../data/weapons';
import { FEEL, SURVIVAL, MELEE, HANDLING } from '../data/tuning';
import { rayHitbox, type Damageable, type Hitbox, type HitPart } from '../ai/types';
import type { V3 } from './physics';
import type { SoundId } from '../data/sounds';
import type { WeaponId } from '../data/names';

export interface CombatEvents extends Record<string, unknown> {
  shot: { from: THREE.Vector3; to: THREE.Vector3; color: number; player: boolean };
  impact: { point: THREE.Vector3; normal: THREE.Vector3; kind: 'hard' | 'flesh' | 'metal' | 'shield' };
  hit: { kind: 'hit' | 'kill' | 'head'; target: Damageable };
  playerHit: { amount: number; from: V3; shield: boolean };
  sound: { id: SoundId; pos?: V3 };
  shake: number;
  shieldBreak: undefined;
  death: undefined;
  melee: { hit: boolean };
}
export interface CombatStats {
  shotsFired: number;
  shotsHit: number;
}

const DEG = Math.PI / 180;
const tmpHB: Hitbox[] = [];

/** Commander combat: weapons, firing through the crosshair, melee, shield/health/medkits, death. */
export class Combat {
  readonly events = new Emitter<CombatEvents>();
  readonly weapons: WeaponSystem;
  targets: Damageable[] = [];
  shield: number;
  shieldMax: number;
  health = SURVIVAL.health;
  medkits: number;
  medkitMax: number;
  sinceDamage = 99;
  private healLeft = 0;
  dead = false;
  deathT = 0;
  god = false;
  readonly aimPoint = new THREE.Vector3();
  aimBlocked = false;
  /** Enemy under the crosshair (for gamepad aim slowdown). */
  aimTarget: Damageable | null = null;
  private meleeDone = true;
  hitFlash = 0;
  firedThisStep = false;
  /** Called when the commander dies after the fade. */
  onRespawn: (() => void) | null = null;

  constructor(
    readonly world: WalkWorld,
    readonly rng: Rng,
    opts: { shieldMax: number; medkitMax: number; magMul: number },
    readonly stats: CombatStats = { shotsFired: 0, shotsHit: 0 },
  ) {
    this.shieldMax = this.shield = opts.shieldMax;
    this.medkitMax = this.medkits = opts.medkitMax;
    this.weapons = new WeaponSystem(opts.magMul);
  }

  get lowHealth(): boolean {
    return this.health <= SURVIVAL.lowHealth && !this.dead;
  }

  /** Muzzle position estimated from the commander's pose. */
  muzzle(out = new THREE.Vector3()): THREE.Vector3 {
    const p = this.world.player;
    const f = p.facing;
    const fx = -Math.sin(f), fz = -Math.cos(f), rx = Math.cos(f), rz = -Math.sin(f);
    const lean = p.lean * 0.4;
    return out.set(p.pos.x + rx * (0.22 + lean) + fx * 0.55, p.pos.y + p.height * 0.8, p.pos.z + rz * (0.22 + lean) + fz * 0.55);
  }

  /** Nearest target hitbox along a ray. */
  rayTargets(o: V3, d: V3, maxT: number): { t: number; target: Damageable; part: HitPart; mul: number } | null {
    let best: { t: number; target: Damageable; part: HitPart; mul: number } | null = null;
    for (const tg of this.targets) {
      if (!tg.alive) continue;
      // Cheap reject.
      const lx = tg.pos.x - o.x, lz = tg.pos.z - o.z;
      const along = lx * d.x + lz * d.z;
      if (along < -tg.radius * 2 || along > maxT + tg.radius * 2) continue;
      tmpHB.length = 0;
      tg.hitboxes(tmpHB);
      for (const hb of tmpHB) {
        const t = rayHitbox(o, d, hb, best ? best.t : maxT);
        if (t !== null && (!best || t < best.t || (Math.abs(t - best.t) < 0.05 && hb.part !== 'body'))) best = { t, target: tg, part: hb.part, mul: hb.mul ?? 1 };
      }
    }
    return best;
  }

  /** Update the aim point and blocked marker from the camera (no spread). */
  updateAim(): void {
    const cam = this.world.cam;
    const dir = cam.forward();
    const o = cam.pos;
    const start = Math.max(0, new THREE.Vector3().subVectors(cam.pivot, o).dot(dir));
    const so = { x: o.x + dir.x * start, y: o.y + dir.y * start, z: o.z + dir.z * start };
    const max = 250;
    const sh = this.world.physics.ray(so, dir, max);
    const tg = this.rayTargets(so, dir, sh ? sh.toi : max);
    const t = tg ? tg.t : sh ? sh.toi : max;
    this.aimTarget = tg && tg.target.isEnemy ? tg.target : null;
    this.aimPoint.set(so.x + dir.x * t, so.y + dir.y * t, so.z + dir.z * t);
    const m = this.muzzle();
    const to = new THREE.Vector3().subVectors(this.aimPoint, m);
    const len = to.length();
    to.normalize();
    const block = this.world.physics.ray(m, to, len);
    this.aimBlocked = !!block && block.toi < len - 0.5 && block.toi < 3;
  }

  /** Fire one shot with spread. */
  private fireShot(aiming: boolean): void {
    const w = this.weapons.def;
    const cam = this.world.cam;
    const base = cam.forward();
    const spread = this.weapons.spread(aiming, FEEL.spreadScale) * DEG;
    // Random direction inside the spread cone (seeded).
    const a = this.rng.next() * Math.PI * 2, r = Math.sqrt(this.rng.next()) * Math.tan(spread / 2);
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(base, up).normalize();
    const up2 = new THREE.Vector3().crossVectors(right, base).normalize();
    const dir = base.clone().addScaledVector(right, Math.cos(a) * r).addScaledVector(up2, Math.sin(a) * r).normalize();
    const o = cam.pos;
    const start = Math.max(0, new THREE.Vector3().subVectors(cam.pivot, o).dot(dir));
    const so = { x: o.x + dir.x * start, y: o.y + dir.y * start, z: o.z + dir.z * start };
    const max = 250;
    const sh = this.world.physics.ray(so, dir, max);
    const tg = this.rayTargets(so, dir, sh ? sh.toi : max);
    const tAim = tg ? tg.t : sh ? sh.toi : max;
    const aim = new THREE.Vector3(so.x + dir.x * tAim, so.y + dir.y * tAim, so.z + dir.z * tAim);
    // From the muzzle to the aim point.
    const m = this.muzzle();
    const shotDir = new THREE.Vector3().subVectors(aim, m);
    const len = shotDir.length();
    shotDir.normalize();
    const block = this.world.physics.ray(m, shotDir, len + 0.05);
    const hitT = this.rayTargets(m, shotDir, block ? block.toi : len + 0.6);
    this.stats.shotsFired++;
    let end: THREE.Vector3;
    if (hitT) {
      end = m.clone().addScaledVector(shotDir, hitT.t);
      const dist = hitT.t;
      const part = hitT.part;
      const partMul = (part === 'head' ? w.headshot : 1) * hitT.mul;
      const res = hitT.target.damage({ amount: falloff(w, dist), armorMul: w.armorMul, part, partMul, from: m });
      this.stats.shotsHit++;
      const kind = res.killed ? 'kill' : part === 'head' ? 'head' : 'hit';
      this.events.emit('hit', { kind, target: hitT.target });
      this.events.emit('impact', { point: end, normal: shotDir.clone().negate(), kind: res.shield ? 'shield' : res.armor || hitT.target.material === 'metal' ? 'metal' : 'flesh' });
    } else if (block) {
      end = new THREE.Vector3(block.point.x, block.point.y, block.point.z);
      this.events.emit('impact', { point: end, normal: new THREE.Vector3(block.normal.x, block.normal.y, block.normal.z), kind: 'hard' });
    } else end = aim;
    this.events.emit('shot', { from: m, to: end, color: w.tracer, player: true });
    this.events.emit('sound', { id: w.sound });
    this.events.emit('shake', w.shake);
    cam.addKick(w.kick, (this.rng.next() - 0.5) * w.kick * 0.4);
  }

  /** Read weapon and action input before the player moves. Returns command extras. */
  preStep(dt: number, input: Input, locked: boolean): { firing: boolean } {
    const ws = this.weapons;
    const p = this.world.player;
    ws.infinite = this.infiniteAmmo;
    ws.update(dt);
    this.firedThisStep = false;
    if (this.dead || locked) return { firing: false };
    // Cancel reload on roll, melee, swap.
    if (p.state === 'roll' || p.state === 'melee') ws.cancelReload();
    if (input.pressed('weapon1')) this.swapTo('pistol');
    if (input.pressed('weapon2')) this.swapTo('smg');
    if (input.pressed('weapon3')) this.swapTo('rifle');
    if (input.pressed('nextWeapon')) ws.next(1) && this.events.emit('sound', { id: 'swap' });
    if (input.pressed('prevWeapon')) ws.next(-1) && this.events.emit('sound', { id: 'swap' });
    if (input.pressed('reload') && ws.startReload()) this.events.emit('sound', { id: ws.def.reloadSound });
    if (input.pressed('melee') && p.startMelee()) {
      ws.cancelReload();
      this.meleeDone = false;
      this.events.emit('sound', { id: 'melee_swing' });
    }
    if (input.pressed('medkit')) this.useMedkit();
    const wantFire = input.down('fire') || input.pressed('fire');
    let firing = false;
    if (p.canFire() && !p.sprinting) {
      const r = ws.tryFire(input.pressed('fire'), input.down('fire'));
      if (r === 'fired') {
        // Face the camera direction before the shot leaves.
        p.facing = (this.world.cam.yaw * Math.PI) / 180;
        this.fireShot(p.aiming);
        firing = true;
        this.firedThisStep = true;
      } else if (r === 'dry') {
        this.events.emit('sound', { id: 'dry_fire' });
        if (ws.reloading) this.events.emit('sound', { id: ws.def.reloadSound });
      }
    }
    return { firing: firing || (wantFire && p.canFire()) };
  }
  infiniteAmmo = false;

  private swapTo(id: WeaponId): void {
    if (this.weapons.swap(id)) this.events.emit('sound', { id: 'swap' });
  }

  useMedkit(): boolean {
    const p = this.world.player;
    if (this.medkits <= 0 || this.health >= SURVIVAL.health || p.state === 'roll' || this.dead || this.healLeft > 0) return false;
    this.medkits--;
    this.healLeft = SURVIVAL.medkitHeal;
    this.events.emit('sound', { id: 'medkit' });
    return true;
  }

  /** After the player has moved: regen, healing, melee resolution, death timer. */
  postStep(dt: number): void {
    const p = this.world.player;
    this.updateAim();
    this.sinceDamage += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt * 4);
    if (this.dead) {
      this.deathT += dt;
      if (this.deathT >= SURVIVAL.deathFade) this.onRespawn?.();
      return;
    }
    if (this.healLeft > 0) {
      const amt = Math.min(this.healLeft, (SURVIVAL.medkitHeal / SURVIVAL.medkitTime) * dt);
      this.healLeft -= amt;
      this.health = Math.min(SURVIVAL.health, this.health + amt);
    }
    if (this.sinceDamage >= SURVIVAL.shieldRegenDelay && this.shield < this.shieldMax) {
      if (this.shield <= 0) this.events.emit('sound', { id: 'shield_recharge' });
      this.shield = Math.min(this.shieldMax, this.shield + SURVIVAL.shieldRegenRate * dt);
    }
    if (p.state === 'melee' && !this.meleeDone && p.stateT >= MELEE.hitAt) {
      this.meleeDone = true;
      this.resolveMelee();
    }
  }

  private resolveMelee(): void {
    const p = this.world.player;
    const fx = -Math.sin(p.facing), fz = -Math.cos(p.facing);
    let hitAny = false;
    for (const t of this.targets) {
      if (!t.alive) continue;
      const dx = t.pos.x - p.pos.x, dz = t.pos.z - p.pos.z;
      const d = Math.hypot(dx, dz) - t.radius * 0.6;
      if (d > MELEE.reach) continue;
      const cos = (dx * fx + dz * fz) / (Math.hypot(dx, dz) || 1);
      if (cos < Math.cos((MELEE.arcDeg / 2) * DEG)) continue;
      const res = t.damage({ amount: MELEE.damage, armorMul: 1, part: 'body', partMul: 1, from: p.pos, melee: true, stagger: true });
      this.events.emit('hit', { kind: res.killed ? 'kill' : 'hit', target: t });
      hitAny = true;
    }
    this.events.emit('melee', { hit: hitAny });
    if (hitAny) this.events.emit('sound', { id: 'melee_hit' });
  }

  /** Commander hitbox for enemy fire. */
  playerHitbox(): Hitbox {
    const p = this.world.player;
    const h = p.height;
    return { kind: 'capsule', part: 'body', x: p.pos.x, y: p.pos.y + 0.3, z: p.pos.z, r: 0.35, h: Math.max(0.1, h - 0.6) };
  }
  /** Chest point to aim at. */
  playerAimPoint(out = new THREE.Vector3()): THREE.Vector3 {
    const p = this.world.player;
    return out.set(p.pos.x, p.pos.y + p.height * 0.62, p.pos.z);
  }

  /**
   * Enemy hitscan shot at the commander with an aim error cone.
   * Returns true when it hit. Cover (static geometry) stops it.
   */
  enemyShot(from: THREE.Vector3, errorDeg: number, damage: number, color = 0xff7a40, sound: SoundId = 'raider_fire'): boolean {
    const target = this.playerAimPoint();
    const dir = target.clone().sub(from);
    const dist = dir.length();
    dir.normalize();
    const e = errorDeg * DEG;
    const a = this.rng.next() * Math.PI * 2, r = Math.sqrt(this.rng.next()) * Math.tan(e);
    const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, dir).normalize();
    dir.addScaledVector(right, Math.cos(a) * r).addScaledVector(up, Math.sin(a) * r).normalize();
    const max = dist + 30;
    const block = this.world.physics.ray(from, dir, max);
    const ht = rayHitbox(from, dir, this.playerHitbox(), block ? block.toi : max);
    let end: THREE.Vector3;
    if (ht !== null) {
      end = from.clone().addScaledVector(dir, ht);
      this.damagePlayer(damage, from);
    } else if (block) {
      end = new THREE.Vector3(block.point.x, block.point.y, block.point.z);
      this.events.emit('impact', { point: end, normal: new THREE.Vector3(block.normal.x, block.normal.y, block.normal.z), kind: 'hard' });
    } else end = from.clone().addScaledVector(dir, Math.min(max, 60));
    this.events.emit('shot', { from: from.clone(), to: end, color, player: false });
    this.events.emit('sound', { id: sound, pos: from });
    return ht !== null;
  }

  /** Damage to the commander: shield first, overflow into health. */
  damagePlayer(amount: number, from: V3, opts: { knockdown?: boolean } = {}): void {
    const p = this.world.player;
    if (this.dead || p.invulnerable || amount <= 0) return;
    this.sinceDamage = 0;
    if (this.god) {
      this.events.emit('playerHit', { amount: 0, from, shield: true });
      return;
    }
    const hadShield = this.shield > 0;
    const absorbed = Math.min(this.shield, amount);
    this.shield -= absorbed;
    const rest = amount - absorbed;
    this.health = Math.max(0, this.health - rest);
    this.hitFlash = 1;
    this.events.emit('playerHit', { amount, from, shield: rest <= 0 });
    this.events.emit('sound', { id: rest > 0 ? 'health_hit' : 'shield_hit' });
    if (hadShield && this.shield <= 0) {
      this.events.emit('shieldBreak', undefined);
      this.events.emit('sound', { id: 'shield_break' });
    }
    if (opts.knockdown) {
      p.knockdown();
      this.events.emit('sound', { id: 'knockdown' });
    }
    if (this.health <= 0) this.die();
  }
  private die(): void {
    this.dead = true;
    this.deathT = 0;
    this.world.player.die();
    this.weapons.cancelReload();
    this.events.emit('death', undefined);
    this.events.emit('sound', { id: 'death' });
  }
  /** Full health, shield, medkits and ammo. */
  restore(): void {
    this.dead = false;
    this.deathT = 0;
    this.health = SURVIVAL.health;
    this.shield = this.shieldMax;
    this.medkits = this.medkitMax;
    this.healLeft = 0;
    this.sinceDamage = 99;
    this.weapons.refill();
    this.world.player.revive();
  }
  refillAmmo(): void {
    this.weapons.refill();
    this.medkits = this.medkitMax;
  }
  reloadHint(): string {
    const s = this.weapons.slot;
    if (this.weapons.reloading) return 'Reloading';
    if (s.mag === 0) return 'Reload';
    if (s.mag <= Math.ceil(s.magSize * 0.25)) return 'Low ammo';
    return '';
  }
  /** Spread in degrees for the crosshair. */
  crosshairSpread(): number {
    return this.weapons.spread(this.world.player.aiming, FEEL.spreadScale);
  }
  swapTime(): number {
    return HANDLING.swapTime;
  }
  weaponDef(id: WeaponId) {
    return WEAPONS[id];
  }
}
