import type { Game } from '../core/game';
import type { MissionPlanet } from '../data/names';
import type { XZ } from '../data/layouts';
import type { WalkScene } from '../scenes/walkScene';
import type { SystemMapScene } from '../scenes/systemMap';
import { PLANET_BY_ID } from '../data/planets';

export interface BotScript {
  order: MissionPlanet[];
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
    this.active = true;
    this.game.debug.god = true;
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
      if (info.complete) {
        goal = sh;
        wantFocus = 'shuttle';
      } else wantFocus = (info.wantFocus as string) ?? null;
    }
    const f = ws.world.focus;
    if (f && wantFocus && f.id === wantFocus) {
      v.taps.add('interact');
      this.note('interact ' + f.id);
      return;
    }
    if (f && f.id.startsWith('talk-') && wantFocus === null && this.game.sceneId === 'planet') {
      v.taps.add('interact');
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
