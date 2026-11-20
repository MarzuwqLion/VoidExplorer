/** Fixed-step simulation loop decoupled from rendering. */
export class FixedLoop {
  readonly dt: number;
  private acc = 0;
  /** Simulated seconds since start. */
  time = 0;
  steps = 0;
  timeScale = 1;
  constructor(
    hz: number,
    private readonly onStep: (dt: number) => void,
    private readonly maxSteps = 5,
  ) {
    this.dt = 1 / hz;
  }

  /** Advance by real elapsed seconds. Returns the interpolation alpha in [0, 1). */
  advance(realDt: number): number {
    this.acc += Math.min(Math.max(realDt, 0), 0.25) * this.timeScale;
    let n = 0;
    while (this.acc >= this.dt && n < this.maxSteps) {
      this.tick();
      this.acc -= this.dt;
      n++;
    }
    if (n >= this.maxSteps && this.acc >= this.dt) this.acc = this.acc % this.dt;
    return this.acc / this.dt;
  }

  /** Run exactly one fixed step. */
  tick(): void {
    this.onStep(this.dt);
    this.time += this.dt;
    this.steps++;
  }

  /** Advance the simulation by a number of seconds without rendering. */
  stepSeconds(seconds: number): number {
    const n = Math.max(0, Math.round(seconds / this.dt));
    for (let i = 0; i < n; i++) this.tick();
    return n;
  }
}
