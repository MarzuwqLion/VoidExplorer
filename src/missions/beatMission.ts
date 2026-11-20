import type { Mission, Objective } from './types';
import type { XZ } from '../data/layouts';
import type { PlanetScene } from '../scenes/planet';

export interface Beat {
  id: string;
  /** Short label for the objectives log. */
  label: string;
  objective: (m: BeatMission) => string;
  target: (m: BeatMission) => XZ | null;
  /** Where the debug jump puts the commander. */
  start: { x: number; z: number; yaw: number };
  enter?: (m: BeatMission) => void;
  done: (m: BeatMission) => boolean;
  exit?: (m: BeatMission) => void;
  /** Force this beat's outcome when skipped by the debug jump. */
  skip?: (m: BeatMission) => void;
  /** Interactable the loop bot should use during this beat. */
  wantFocus?: (m: BeatMission) => string | null;
}

/** A mission made of ordered beats. */
export class BeatMission implements Mission {
  complete = false;
  i = 0;
  t = 0;
  constructor(
    readonly title: string,
    readonly host: PlanetScene,
    readonly list: Beat[],
  ) {
    this.list[0].enter?.(this);
  }
  get beat(): Beat {
    return this.list[Math.min(this.i, this.list.length - 1)];
  }
  flag(n: string): boolean {
    return this.host.game.state.flag(n);
  }
  setFlag(n: string, v = true): void {
    this.host.game.state.setFlag(n, v);
  }
  objective(): Objective {
    if (this.complete) return { text: 'Return to the shuttle and extract', target: this.host.shuttlePoint() };
    return { text: this.beat.objective(this), target: this.beat.target(this) };
  }
  log() {
    return [...this.list.map((b, k) => ({ text: b.label, done: this.complete || k < this.i })), { text: 'Extract at the shuttle', done: false }];
  }
  update(dt: number): void {
    if (this.complete) return;
    this.t += dt;
    if (this.beat.done(this)) this.advance();
  }
  private advance(): void {
    this.beat.exit?.(this);
    this.i++;
    this.t = 0;
    if (this.i >= this.list.length) {
      this.complete = true;
      return;
    }
    this.beat.enter?.(this);
  }
  beats(): string[] {
    return this.list.map((b) => b.id);
  }
  beatId(): string {
    return this.complete ? 'extract' : this.beat.id;
  }
  wantFocus(): string | null {
    return this.complete ? 'shuttle' : this.beat.wantFocus?.(this) ?? null;
  }
  jumpTo(id: string): void {
    const k = this.list.findIndex((b) => b.id === id);
    if (k < 0 || k < this.i) return;
    while (this.i < k) {
      this.beat.skip?.(this);
      this.advance();
    }
    const s = this.beat.start;
    this.host.teleportTo(s.x, s.z, s.yaw);
  }
  completeBeat(): void {
    if (this.complete) return;
    this.beat.skip?.(this);
    this.advance();
  }
}
