import type { Game } from '../core/game';
import type { MissionPlanet } from '../data/names';
import type { XZ } from '../data/layouts';
import type { WalkScene } from '../scenes/walkScene';
import type { SystemMapScene } from '../scenes/systemMap';
import { PLANET_BY_ID } from '../data/planets';

export interface BotScript {
  order: MissionPlanet[];
  /** Take Park's tunnel shortcut on Amara. */
  tunnel?: boolean;
  /** Lookout choice on Korr. */
  lookout?: 'reassure' | 'threaten';
  /** Dialogue labels to pick when offered, in priority order. */
  choices: string[];
  /** Flags the bot should obtain by talking (e.g. tunnel shortcut). */
  talkTo?: string[];
  stopAtEnd?: boolean;
}

/** Loop bot: drives the real action layer through the whole game with god mode on. */
export class Bot {
  active = false;
  script: BotScript = { order: ['amara', 'korr'], choices: [] };
  log: string[] = [];
  private path: XZ[] = [];
  private pathGoal: XZ | null = null;
  private repath = 0;
  private stuck = 0;
  private last: XZ = { x: 0, z: 0 };
  private tickN = 0;

  constructor(private game: Game) {
    game.preTick = (dt) => this.active && this.tick(dt);
  }
  start(script: Partial<BotScript> = {}): void {
    this.script = { ...this.script, ...script };
    const extra = [this.script.lookout === 'threaten' ? 'Threaten him' : 'Reassure him', "I'll get your cores.", "Stay here. I'll clear the dock.", "I'll take the helm."];
    if (this.script.tunnel) extra.unshift('Is there another way into the ravine?');
    this.script.choices = [...this.script.choices, ...extra];
    this.active = true;
    this.game.debug.god = true;
    this.game.debug.infiniteAmmo = true;
    this.log = [];
  }
  stop(): void {
    this.active = false;
    this.clear();
  }
  private clear(): void {
    const v = this.game.input.virtual;
    v.held.clear();
    v.move = { x: 0, y: 0 };
    v.look = { x: 0, y: 0 };
  }
  private note(s: string): void {
    if (this.log[this.log.length - 1] !== s) this.log.push(s);
  }

  private tick(dt: number): void {
    const g = this.game;
    this.tickN++;
    this.clear();
    if (g.transitioning || !g.scene) return;
    const v = g.input.virtual;
    const top = g.ui.top();
    if (top) {
      if ((top.el as HTMLElement).dataset.screen === 'terminal' && this.tickN % 2) v.taps.add('back');
      return;
    }
    const id = g.sceneId;
    if (id === 'title') return;
    if (id === 'end') {
      this.note('end');
      if (this.script.stopAtEnd !== false) this.active = false;
      return;
    }
    if (id === 'systemMap') return this.flyMap(g.scene as SystemMapScene);
    const ws = g.scene as WalkScene;
    if (ws.dialogue) return this.talk(ws);
    this.walkScene(ws, dt);
  }

  private talk(ws: WalkScene): void {
    const d = ws.dialogue!;
    if (d.runner.node) this.note('node ' + d.runner.graph.id + ':' + d.runner.node.id);
    const choices = d.runner.choices().map((c) => c.label);
    if (choices.length && !d.typing) {
      const pick = this.script.choices.find((c) => choices.includes(c)) ?? (choices.includes('Goodbye') ? 'Goodbye' : choices[0]);
      this.note('choose ' + pick);
      d.chooseLabel(pick);
      return;
    }
    if (this.tickN % 2 === 0) this.game.input.virtual.taps.add('confirm');
  }

  private walkScene(ws: WalkScene, dt: number): void {
    const v = this.game.input.virtual;
    const o = ws.objective();
    const p = ws.world.player.pos;
    let goal: XZ | null = o.target ? { x: o.target.x, z: o.target.z } : null;
    const info = ws.api.info?.() ?? {};
    let wantFocus: string | null = null;
    if (this.game.sceneId === 'bridge') {
      const obj = String(info.objective ?? '');
      if (obj.startsWith('Speak') || obj.startsWith('Report')) wantFocus = 'talk-xo';
      else if (obj.startsWith('Use the star map')) wantFocus = 'starmap';
      else {
        this.active = false;
        return;
      }
    } else if (this.game.sceneId === 'planet') {
      const sh = info.shuttle as XZ;
      if (this.fight(ws, dt)) return;
      const hunt = this.straggler(ws);
      if (hunt) goal = hunt;
      if (info.complete) {
        goal = sh;
        wantFocus = 'shuttle';
      } else wantFocus = (info.wantFocus as string) ?? null;
      // Ask Park for the tunnel before heading out, if scripted.
      if (this.script.tunnel && info.planet === 'amara' && !this.game.state.flag('amara_tunnel') && this.game.state.flag('amara_briefed')) wantFocus = 'talk-park';
    }
    const f = ws.world.focus;
    if (f && wantFocus && f.id === wantFocus) {
      v.taps.add('interact');
      this.note('interact ' + f.id);
      return;
    }
    const wantIt = wantFocus ? ws.world.interactables.find((i) => i.id === wantFocus) : null;
    if (wantIt && Math.hypot(wantIt.x - p.x, wantIt.z - p.z) < (wantIt.range ?? 2.2) - 0.3) {
      // In range: turn toward it so it takes focus.
      const desired = (Math.atan2(-(wantIt.x - p.x), -(wantIt.z - p.z)) * 180) / Math.PI;
      let diff = desired - ws.world.cam.yaw;
      while (diff > 180) diff -= 360;
      while (diff < -180) diff += 360;
      v.look = { x: -Math.max(-12, Math.min(12, diff)), y: 0 };
      return;
    }
    if (wantIt) goal = { x: wantIt.x, z: wantIt.z };
    if (!goal) return;
    // Path following.
    this.repath -= dt;
    if (!this.pathGoal || Math.hypot(goal.x - this.pathGoal.x, goal.z - this.pathGoal.z) > 1 || this.repath <= 0 || !this.path.length) {
      this.path = ws.world.nav.findPath({ x: p.x, z: p.z }, goal) ?? [goal];
      this.pathGoal = goal;
      this.repath = 3;
    }
    while (this.path.length > 1 && Math.hypot(this.path[0].x - p.x, this.path[0].z - p.z) < 0.9) this.path.shift();
    const wp = this.path[0];
    const dx = wp.x - p.x, dz = wp.z - p.z;
    const dist = Math.hypot(dx, dz);
    const desired = (Math.atan2(-dx, -dz) * 180) / Math.PI;
    let diff = desired - ws.world.cam.yaw;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    v.look = { x: -Math.max(-12, Math.min(12, diff)), y: (-8 - ws.world.cam.pitch) * 0.2 };
    const close = this.path.length === 1 && dist < 1.2;
    v.move = close ? { x: 0, y: 0 } : { x: 0, y: Math.abs(diff) < 35 ? 1 : 0.25 };
    if (this.game.sceneId === 'planet' && dist > 8 && Math.abs(diff) < 15) v.held.add('sprint');
    // Unstick: if not moving, repath soon.
    const moved = Math.hypot(p.x - this.last.x, p.z - this.last.z);
    this.stuck = moved < 0.01 && !close ? this.stuck + dt : 0;
    if (this.stuck > 1.5) {
      this.repath = 0;
      this.stuck = 0;
      v.taps.add('roll');
    }
    this.last = { x: p.x, z: p.z };
  }

  /** Shoot the nearest visible enemy. Returns true while engaged. */
  private hiddenT = 0;
  /** Nearest alive enemy of an active encounter once nothing has been visible for a few seconds. */
  private straggler(ws: WalkScene): XZ | null {
    const d = (ws as unknown as { director?: import('../ai/director').Director }).director;
    if (!d) return null;
    const alive = d.enemies.filter((e) => e.alive && e.encounter && d.isActive(e.encounter));
    if (!alive.length) {
      this.hiddenT = 0;
      return null;
    }
    this.hiddenT += 1 / 60;
    if (this.hiddenT < 4) return null;
    const p = ws.world.player.pos;
    alive.sort((a, b) => a.pos.distanceTo(p) - b.pos.distanceTo(p));
    const e = alive[0];
    if (e.pos.y - p.y > 3) {
      // Elevated: back off to a spot with a line of sight over the edge.
      const dx = p.x - e.pos.x, dz = p.z - e.pos.z, l = Math.hypot(dx, dz) || 1;
      const q = ws.world.nav.nearestWalkable(e.pos.x + (dx / l) * 18, e.pos.z + (dz / l) * 18, 8);
      if (q) return q;
    }
    return { x: e.pos.x, z: e.pos.z };
  }
  private engageT = 0;
  private lastHp = 0;
  private ignoreT = 0;
  private fight(ws: WalkScene, dt: number): boolean {
    this.ignoreT = Math.max(0, this.ignoreT - dt);
    if (this.ignoreT > 0) return false;
    const sc = ws as unknown as { director?: { enemies: { alive: boolean; pos: { x: number; y: number; z: number }; def: { height: number }; v: { health: number; armor: number } }[] } };
    const enemies = sc.director?.enemies ?? [];
    const cam = ws.world.cam;
    const p = ws.world.player.pos;
    let best: { x: number; y: number; z: number } | null = null, bd = 45, hp = 0;
    for (const e of enemies) {
      if (!e.alive) continue;
      const tgt = { x: e.pos.x, y: e.pos.y + e.def.height * 0.75, z: e.pos.z };
      const d = Math.hypot(tgt.x - p.x, tgt.z - p.z);
      if (d >= bd) continue;
      if (!ws.world.physics.clear({ x: p.x, y: p.y + 1.5, z: p.z }, tgt)) continue;
      bd = d;
      best = tgt;
      hp = e.v.health + e.v.armor;
    }
    const v = this.game.input.virtual;
    if (!best) {
      this.engageT = 0;
      return false;
    }
    this.hiddenT = 0;
    // No damage dealt for a while: close the distance; give up for a moment if that fails too.
    if (Math.abs(hp - this.lastHp) > 0.01) this.engageT = 0;
    this.lastHp = hp;
    this.engageT += dt;
    if (this.engageT > 25) {
      this.engageT = 0;
      this.ignoreT = 6;
      return false;
    }
    if (bd < 7) v.move = { x: 0, y: -1 };
    else if (this.engageT > 3 && bd > 9) v.move = { x: 0, y: 1 };
    const dx = best.x - cam.pos.x, dy = best.y - cam.pos.y, dz = best.z - cam.pos.z;
    const yaw = (Math.atan2(-dx, -dz) * 180) / Math.PI;
    const pitch = (Math.atan2(dy, Math.hypot(dx, dz)) * 180) / Math.PI;
    let dyaw = yaw - cam.yaw;
    while (dyaw > 180) dyaw -= 360;
    while (dyaw < -180) dyaw += 360;
    v.look = { x: -Math.max(-25, Math.min(25, dyaw)), y: Math.max(-15, Math.min(15, pitch - cam.pitch)) };
    v.held.add('aim');
    const cw = (ws as unknown as { combat?: { weapons: { slot: { mag: number; reserve: number }; current: string } } }).combat?.weapons;
    if (cw && cw.current !== 'pistol' && cw.slot.mag === 0 && cw.slot.reserve === 0) v.taps.add('weapon1');
    if (Math.abs(dyaw) < 4 && this.tickN % 3 === 0) v.taps.add('fire');
    if (this.tickN % 600 === 0) v.taps.add('reload');
    return true;
  }

  private flyMap(s: SystemMapScene): void {
    const g = this.game;
    const v = g.input.virtual;
    const info = s.api.info!() as { phase: string; panel: { canLand: boolean } | null; planets: Record<string, { x: number; z: number }> };
    if (info.phase !== 'fly') return;
    const next = this.script.order.find((m) => !g.state.data.missions[m]);
    if (!next) {
      v.held.add('returnBridge');
      return;
    }
    if (info.panel?.canLand && s.sim.near === next) {
      v.taps.add('land');
      this.note('land ' + next);
      return;
    }
    const q = info.planets[next];
    let dx = q.x - s.sim.x, dz = q.z - s.sim.z;
    const d = Math.hypot(dx, dz);
    // Steer around the sun.
    const t = Math.max(0, Math.min(1, -(s.sim.x * dx + s.sim.z * dz) / (d * d)));
    const cx = s.sim.x + dx * t, cz = s.sim.z + dz * t;
    if (Math.hypot(cx, cz) < 50 && d > 60) {
      const r = Math.hypot(s.sim.x, s.sim.z) || 1;
      dx = -s.sim.z / r;
      dz = s.sim.x / r;
    }
    const m = Math.hypot(dx, dz) || 1;
    v.move = { x: dx / m, y: -dz / m };
    if (d > PLANET_BY_ID[next].size * 3 + 30) v.held.add('boost');
  }
}
