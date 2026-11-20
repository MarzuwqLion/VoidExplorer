import type { Mission, Objective } from './types';
import type { XZ } from '../data/layouts';

/** Walking-skeleton mission: walk to a marker, then extract. */
export class FieldMission implements Mission {
  complete = false;
  private reached = false;
  constructor(
    readonly title: string,
    private marker: XZ,
    private markerName: string,
    private pos: () => XZ,
  ) {}
  objective(): Objective {
    return this.complete ? { text: 'Return to the shuttle and extract', target: null } : { text: 'Reach ' + this.markerName, target: this.marker };
  }
  log() {
    return [
      { text: 'Reach ' + this.markerName, done: this.reached },
      { text: 'Extract at the shuttle', done: false },
    ];
  }
  update(): void {
    if (this.complete) return;
    const p = this.pos();
    if (Math.hypot(p.x - this.marker.x, p.z - this.marker.z) < 4) this.completeBeat();
  }
  beats(): string[] {
    return ['start', 'extract'];
  }
  beatId(): string {
    return this.complete ? 'extract' : 'start';
  }
  jumpTo(b: string): void {
    if (b === 'extract') this.completeBeat();
  }
  completeBeat(): void {
    this.reached = true;
    this.complete = true;
  }
}
