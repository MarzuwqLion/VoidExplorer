import { SOUNDS, type SoundId, type Bus } from '../data/sounds';
import { RECIPES, AMBIENT_RECIPES, type AmbientId, type Voice } from './synth';

export interface PlayOpts {
  volume?: number;
  pitch?: number;
  pan?: number;
}

/**
 * The single playback interface. Game code calls play(id) with ids from data/sounds.ts.
 * Each id maps to a synthesized recipe; recorded audio could replace a recipe without touching game code.
 */
export class AudioEngine {
  ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buses = new Map<Bus, GainNode>();
  private ambient: { id: AmbientId; voice: Voice } | null = null;
  private tension: Voice | null = null;
  private tensionLevel = 0;
  private pendingAmbient: AmbientId | null = null;
  volumes = { master: 0.8, effects: 0.9, ambient: 0.7, music: 0.6 };
  /** Count of plays per id, for tests. */
  readonly played = new Map<string, number>();
  private lastPlay = new Map<string, number>();

  /** Create the context on the first user gesture. */
  unlock(): void {
    if (this.ctx || typeof AudioContext === 'undefined') return;
    try {
      this.ctx = new AudioContext();
    } catch {
      this.ctx = null;
      return;
    }
    const c = this.ctx;
    this.master = c.createGain();
    this.master.connect(c.destination);
    for (const b of ['effects', 'ambient', 'music', 'ui'] as Bus[]) {
      const g = c.createGain();
      g.connect(this.master);
      this.buses.set(b, g);
    }
    this.applyVolumes();
    if (this.pendingAmbient) this.setAmbient(this.pendingAmbient);
  }

  setVolumes(v: Partial<typeof this.volumes>): void {
    Object.assign(this.volumes, v);
    this.applyVolumes();
  }
  private applyVolumes(): void {
    if (!this.ctx || !this.master) return;
    this.master.gain.value = this.volumes.master;
    this.buses.get('effects')!.gain.value = this.volumes.effects;
    this.buses.get('ui')!.gain.value = this.volumes.effects;
    this.buses.get('ambient')!.gain.value = this.volumes.ambient;
    this.buses.get('music')!.gain.value = this.volumes.music;
  }

  play(id: SoundId, opts: PlayOpts = {}): void {
    this.played.set(id, (this.played.get(id) ?? 0) + 1);
    const def = SOUNDS[id];
    if (!this.ctx || !def) return;
    const now = this.ctx.currentTime;
    const last = this.lastPlay.get(id) ?? -1;
    if (def.minGap && now - last < def.minGap) return;
    this.lastPlay.set(id, now);
    const bus = this.buses.get(def.bus)!;
    let out: AudioNode = bus;
    if (opts.pan !== undefined && this.ctx.createStereoPanner) {
      const p = this.ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, opts.pan));
      p.connect(bus);
      out = p;
    }
    const g = this.ctx.createGain();
    g.gain.value = (def.volume ?? 1) * (opts.volume ?? 1);
    g.connect(out);
    RECIPES[def.recipe](this.ctx, g, { pitch: (def.pitch ?? 1) * (opts.pitch ?? 1), ...def.params });
  }

  setAmbient(id: AmbientId | null): void {
    this.pendingAmbient = id;
    if (!this.ctx) return;
    if (this.ambient?.id === id) return;
    this.ambient?.voice.stop();
    this.ambient = null;
    if (id) this.ambient = { id, voice: AMBIENT_RECIPES[id](this.ctx, this.buses.get('ambient')!) };
  }

  /** Generative tension layer, 0 = calm, 1 = full combat. */
  setTension(level: number): void {
    this.tensionLevel = Math.max(0, Math.min(1, level));
    if (!this.ctx) return;
    if (!this.tension && this.tensionLevel > 0) this.tension = AMBIENT_RECIPES.tension(this.ctx, this.buses.get('music')!);
    this.tension?.set?.(this.tensionLevel);
  }
  get tensionValue(): number {
    return this.tensionLevel;
  }
  stopAll(): void {
    this.ambient?.voice.stop();
    this.ambient = null;
    this.tension?.stop();
    this.tension = null;
  }
}
