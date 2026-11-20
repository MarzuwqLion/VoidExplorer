import * as THREE from 'three';
import { WalkScene } from './walkScene';
import type { WalkWorld } from '../world/walkWorld';
import { Combat } from '../world/combat';
import { Fx } from '../world/fx';
import { rng } from '../core/rng';
import { WEAPONS, WEAPON_ORDER } from '../data/weapons';
import { FEEL } from '../data/tuning';
import type { PlayerCmd } from '../player/controller';
import type { Damageable } from '../ai/types';
import type { SoundId } from '../data/sounds';
import { Director } from '../ai/director';
import { EnemyViews } from '../ai/enemyViews';
import { DebugOverlay } from '../debug/overlay';
import type { EnemyType } from '../data/names';
import { WEAPONS as WDEFS } from '../data/weapons';

/** A walk scene with combat: gym and planets. */
export abstract class FieldScene extends WalkScene {
  combat!: Combat;
  fx!: Fx;
  director!: Director;
  enemyViews!: EnemyViews;
  overlay!: DebugOverlay;
  protected recoil = 0;
  protected hitReact = 0;
  harvestPose = 0;
  checkpoint = new THREE.Vector3();
  checkpointYaw = 0;
  private heartT = 0;

  protected setupField(world: WalkWorld): void {
    this.setupWalk(world);
    const g = this.game;
    this.combat = new Combat(world, rng, { shieldMax: g.state.shieldMax, medkitMax: g.state.medkitMax, magMul: g.state.magMultiplier }, g.state.data.stats);
    this.fx = new Fx();
    this.three.add(this.fx.group);
    this.checkpoint.copy(world.player.pos);
    this.checkpointYaw = world.cam.yaw;
    const c = this.combat;
    c.events.on('shot', (e) => {
      if (e.player) {
        g.rumble(0.15, 0.3, 50);
        const m = this.commander.muzzleWorld();
        this.fx.tracer(m, e.to, e.color);
        this.fx.muzzle(m);
        this.recoil = 1;
      } else {
        this.fx.tracer(e.from, e.to, e.color, 0.09);
        this.fx.muzzle(e.from, 0xff9050);
      }
    });
    c.events.on('impact', (e) => {
      this.fx.impact(e.point, e.normal, e.kind);
      const id: SoundId = e.kind === 'flesh' ? 'impact_flesh' : e.kind === 'metal' ? 'impact_metal' : e.kind === 'shield' ? 'shield_hit' : 'impact_hard';
      this.playAt(id, e.point);
    });
    c.events.on('hit', (e) => {
      this.hud.hitMarker(e.kind);
      g.audio.play(e.kind === 'kill' ? 'killmarker' : e.kind === 'head' ? 'headshot' : 'hitmarker');
    });
    c.events.on('playerHit', (e) => {
      const p = world.player.pos;
      const ang = (Math.atan2(e.from.x - p.x, -(e.from.z - p.z)) * 180) / Math.PI;
      const heading = -world.cam.yaw;
      this.hud.damageFrom(ang - heading);
      this.hud.flashColor(e.shield ? 'rgba(92,200,255,0.5)' : 'rgba(255,40,30,0.55)');
      this.hitReact = 1;
      if (g.settings.shake) world.cam.addShake(0.25);
      const chest = world.chest();
      this.fx.burst(chest, 8, e.shield ? 0x5cc8ff : 0xff4030, 2.5, 0.3, 0, 0.5);
      g.rumble(e.shield ? 0.2 : 0.6, 0.4, 120);
    });
    c.events.on('sound', (e) => (e.pos ? this.playAt(e.id, e.pos) : g.audio.play(e.id)));
    c.events.on('shake', (v) => g.settings.shake && world.cam.addShake(v));
    c.events.on('death', () => this.hud.setDeath(true));
    c.onRespawn = () => this.respawn();
    this.combat.god = g.debug.god;
    const d = (this.director = new Director(world, c, rng));
    this.enemyViews = new EnemyViews(d, g.ui.world);
    this.three.add(this.enemyViews.group);
    this.overlay = new DebugOverlay(world, () => d.cover);
    this.three.add(this.overlay.group);
    this.onExit(() => this.enemyViews.dispose());
    d.events.on('sound', (e) => this.playAt(e.id, e.pos));
    d.events.on('splash', (p) => this.fx.burst(p, 24, 0x9aff40, 5, 0.6, -8, 1));
    d.events.on('blast', (p) => {
      this.fx.burst(p, 40, 0xffa040, 9, 0.7, -10, 1.2);
      if (g.settings.shake) world.cam.addShake(0.4);
    });
    d.events.on('pickup', (k) => {
      g.ui.toast('+' + k.amount + ' ' + WDEFS[k.kind].name + ' rounds');
      g.audio.play('pickup');
    });
    d.events.on('kill', (e) => {
      g.state.data.stats.kills++;
      this.onKill(e);
    });
    this.api.killAll = () => d.killAll();
    this.api.spawn = (type, n) => {
      const p = world.player.pos;
      const f = world.cam.forward();
      for (let i = 0; i < n; i++) {
        const a = Math.atan2(f.z, f.x) + (i - (n - 1) / 2) * 0.35;
        d.spawn(type as EnemyType, p.x + Math.cos(a) * 18, p.z + Math.sin(a) * 18, { alerted: true });
      }
    };
  }

  /** Stereo pan and distance attenuation from the camera. */
  playAt(id: SoundId, pos: { x: number; y: number; z: number }): void {
    const cam = this.world.cam;
    const dx = pos.x - cam.pos.x, dz = pos.z - cam.pos.z;
    const d = Math.hypot(dx, dz);
    const yaw = (cam.yaw * Math.PI) / 180;
    const rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const pan = d > 0.5 ? (dx * rx + dz * rz) / d : 0;
    this.game.audio.play(id, { pan: pan * 0.8, volume: Math.max(0.15, Math.min(1, 12 / Math.max(1, d))) });
  }

  protected onKill(_t: Damageable): void {}

  protected onRollStart(): void {
    super.onRollStart();
    const p = this.world.player.pos;
    this.fx.burst(new THREE.Vector3(p.x, p.y + 0.1, p.z), 14, 0xb8a888, 2, 0.6, -1, 0.4);
  }
  protected footstep(): SoundId {
    return 'footstep_rock';
  }

  /** Teleport to the checkpoint with everything restored. */
  respawn(): void {
    const w = this.world;
    this.combat.restore();
    w.player.setPosition(this.checkpoint.x, this.checkpoint.y + 0.1, this.checkpoint.z, this.checkpointYaw);
    w.cam.yaw = this.checkpointYaw;
    w.physics.step();
    this.hud.setDeath(false);
    this.director.resetActive();
    this.onRespawned();
  }
  protected onRespawned(): void {}

  setCheckpoint(x: number, y: number, z: number, yaw = this.world.cam.yaw): void {
    this.checkpoint.set(x, y, z);
    this.checkpointYaw = yaw;
  }

  protected preStep(dt: number): Partial<PlayerCmd> {
    const input = this.game.input;
    this.combat.god = this.game.debug.god;
    this.combat.infiniteAmmo = this.game.debug.infiniteAmmo;
    // On gamepad X is both reload and interact: a showing prompt wins.
    if (this.world.focus && input.lastDevice === 'pad') input.consume('reload');
    const r = this.combat.preStep(dt, input, this.world.locked || !!this.dialogue);
    return { firing: r.firing };
  }

  protected postStep(dt: number): void {
    const c = this.combat;
    c.postStep(dt);
    this.director.update(dt);
    const alerted = this.director.enemies.some((e) => e.alive && e.alerted);
    this.game.audio.setTension(alerted ? Math.min(1, 0.4 + this.director.activeCount() * 0.1) : 0);
    this.recoil = Math.max(0, this.recoil - dt * 10);
    this.hitReact = Math.max(0, this.hitReact - dt * 4);
    const ws = c.weapons;
    this.weaponPose = {
      current: ws.current,
      reload: ws.reloadProgress,
      swap: ws.swapProgress,
      recoil: this.recoil,
      harvest: this.harvestPose,
      hit: this.hitReact,
      aimPitch: this.world.cam.pitch,
    };
    const hud = this.hud;
    hud.setBars(c.shield, c.shieldMax, c.health, 100, c.medkits, c.medkitMax);
    const s = ws.slot;
    hud.setWeapon(WEAPONS[ws.current].name, s.mag, ws.unlimited(ws.current) ? null : s.reserve, WEAPON_ORDER.indexOf(ws.current), WEAPON_ORDER.map((w) => WEAPONS[w].name), s.magSize);
    const fov = this.world.cam.fov;
    const gap = (Math.tan(((c.crosshairSpread() / 2) * Math.PI) / 180) / Math.tan(((fov / 2) * Math.PI) / 180)) * (window.innerHeight / 2) + 4;
    const p = this.world.player;
    hud.setCrosshair(gap, !this.dialogue && !c.dead && p.state !== 'roll', c.aimBlocked);
    hud.setHint(c.dead || this.dialogue ? '' : c.reloadHint());
    const low = c.lowHealth;
    hud.setLowHealth(low);
    if (low) {
      this.heartT -= dt;
      if (this.heartT <= 0) {
        this.game.audio.play('heartbeat');
        this.heartT = 0.85;
      }
    }
  }

  protected lookSlowdown(): boolean {
    if (this.game.input.lastDevice !== 'pad') return false;
    const f = this.world.cam.forward();
    const o = this.world.cam.pos;
    const lim = Math.cos((FEEL.padSlowdownDeg * Math.PI) / 180);
    for (const t of this.combat.targets) {
      if (!t.alive || !t.isEnemy) continue;
      const d = new THREE.Vector3(t.pos.x - o.x, t.pos.y + 1 - o.y, t.pos.z - o.z).normalize();
      if (d.dot(f) > lim) return true;
    }
    return false;
  }

  render(alpha: number, frameDt: number): void {
    super.render(alpha, frameDt);
    this.fx.update(frameDt);
    this.enemyViews.update(frameDt, alpha, this.game.debug.aiLabels, this.camera);
    this.overlay.update(this.game.debug.showNav, this.game.debug.showColliders);
  }
}
