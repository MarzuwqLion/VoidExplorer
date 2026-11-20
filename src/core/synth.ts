import type { RecipeId } from '../data/sounds';

export type Recipe = (ctx: AudioContext, out: AudioNode, p: Record<string, number>) => void;
export interface Voice {
  stop(): void;
  set?(level: number): void;
}
export type AmbientId = 'bridge_hum' | 'space_drone' | 'amara_wind' | 'korr_wind' | 'tension';

const WAVES: OscillatorType[] = ['sine', 'sawtooth', 'triangle', 'square'];
let noiseBuf: AudioBuffer | null = null;
function noise(ctx: AudioContext): AudioBuffer {
  if (noiseBuf && noiseBuf.sampleRate === ctx.sampleRate) return noiseBuf;
  const len = ctx.sampleRate * 2;
  noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  let s = 12345;
  for (let i = 0; i < len; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    d[i] = (s / 0x3fffffff - 1) * 0.9;
  }
  return noiseBuf;
}
function env(ctx: AudioContext, out: AudioNode, attack: number, decay: number, peak = 1): GainNode {
  const g = ctx.createGain();
  const t = ctx.currentTime;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + Math.max(0.002, attack));
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  g.connect(out);
  return g;
}
function noiseSrc(ctx: AudioContext, dur: number): AudioBufferSourceNode {
  const s = ctx.createBufferSource();
  s.buffer = noise(ctx);
  s.loop = true;
  s.start(ctx.currentTime, Math.random() * 1.5);
  s.stop(ctx.currentTime + dur + 0.05);
  return s;
}
function osc(ctx: AudioContext, wave: number, f0: number, f1: number, dur: number): OscillatorNode {
  const o = ctx.createOscillator();
  o.type = WAVES[wave] ?? 'sine';
  const t = ctx.currentTime;
  o.frequency.setValueAtTime(Math.max(1, f0), t);
  o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  o.start(t);
  o.stop(t + dur + 0.05);
  return o;
}
const FILTERS: BiquadFilterType[] = ['lowpass', 'bandpass', 'highpass'];

export const RECIPES: Record<RecipeId, Recipe> = {
  gun(ctx, out, p) {
    const pitch = p.pitch ?? 1;
    const d = p.decay ?? 0.2;
    const n = noiseSrc(ctx, d);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = (p.freq ?? 2000) * pitch;
    n.connect(f).connect(env(ctx, out, 0.002, d, p.crack ?? 0.8));
    const o = osc(ctx, 0, (p.thump ?? 120) * pitch, 35, d * 0.8);
    o.connect(env(ctx, out, 0.002, d * 0.8, 0.9));
  },
  noise(ctx, out, p) {
    const d = p.decay ?? 0.2;
    const n = noiseSrc(ctx, d + (p.attack ?? 0));
    const f = ctx.createBiquadFilter();
    f.type = FILTERS[p.type ?? 0] ?? 'lowpass';
    f.Q.value = p.q ?? 1;
    const fr = (p.freq ?? 1000) * (p.pitch ?? 1);
    f.frequency.setValueAtTime(fr, ctx.currentTime);
    if (p.sweepTo) f.frequency.exponentialRampToValueAtTime(p.sweepTo * (p.pitch ?? 1), ctx.currentTime + d);
    n.connect(f).connect(env(ctx, out, p.attack ?? 0.01, d));
  },
  tone(ctx, out, p) {
    const d = p.decay ?? 0.2;
    const pitch = p.pitch ?? 1;
    osc(ctx, p.wave ?? 0, (p.f0 ?? 440) * pitch, (p.f1 ?? 440) * pitch, (p.attack ?? 0) + d).connect(env(ctx, out, p.attack ?? 0.005, d, 0.6));
  },
  chord(ctx, out, p) {
    const d = p.decay ?? 0.3;
    for (const k of ['n0', 'n1', 'n2']) {
      if (!p[k]) continue;
      osc(ctx, 2, p[k] * (p.pitch ?? 1), p[k] * (p.pitch ?? 1), d).connect(env(ctx, out, 0.005, d, 0.35));
    }
  },
  click(ctx, out, p) {
    const d = p.decay ?? 0.02;
    const n = noiseSrc(ctx, d);
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = p.freq ?? 3000;
    n.connect(f).connect(env(ctx, out, 0.001, d));
  },
  mech(ctx, out, p) {
    const gap = p.gap ?? 0.5;
    const make = (delay: number, freq: number) => {
      const t = ctx.currentTime + delay;
      const n = ctx.createBufferSource();
      n.buffer = noise(ctx);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = freq;
      f.Q.value = 3;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.8, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      n.connect(f).connect(g).connect(out);
      n.start(t, Math.random());
      n.stop(t + 0.08);
    };
    make(0, p.freq ?? 2000);
    make(gap * 0.5, (p.freq ?? 2000) * 0.7);
    make(gap, (p.freq ?? 2000) * 1.2);
  },
  growl(ctx, out, p) {
    const dur = p.dur ?? 0.5;
    const o = osc(ctx, 1, (p.f0 ?? 200) * (p.pitch ?? 1), (p.f1 ?? 150) * (p.pitch ?? 1), dur);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = p.rate ?? 20;
    const lg = ctx.createGain();
    lg.gain.value = 0.5;
    const am = ctx.createGain();
    am.gain.value = 0.5;
    lfo.connect(lg).connect(am.gain);
    lfo.start();
    lfo.stop(ctx.currentTime + dur + 0.05);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = p.cutoff ?? 1200;
    o.connect(f).connect(am).connect(env(ctx, out, 0.03, dur, 0.8));
    const n = noiseSrc(ctx, dur);
    const nf = ctx.createBiquadFilter();
    nf.type = 'bandpass';
    nf.frequency.value = (p.cutoff ?? 1200) * 0.8;
    n.connect(nf).connect(env(ctx, out, 0.03, dur, 0.25));
  },
  heartbeat(ctx, out) {
    for (const [delay, f] of [
      [0, 60],
      [0.18, 50],
    ]) {
      const t = ctx.currentTime + delay;
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(f, t);
      o.frequency.exponentialRampToValueAtTime(30, t + 0.15);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(1, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + 0.2);
    }
  },
  alarm(ctx, out) {
    for (let i = 0; i < 6; i++) {
      const t = ctx.currentTime + i * 0.25;
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = i % 2 ? 620 : 880;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.25, t);
      g.gain.setValueAtTime(0.0001, t + 0.22);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + 0.24);
    }
  },
};

/** Looping beds. Each returns a voice that fades out on stop. */
function bed(ctx: AudioContext, out: AudioNode, build: (g: GainNode) => (() => void) | void, level = 1): Voice & { gain: GainNode } {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(level, ctx.currentTime + 1.5);
  g.connect(out);
  const extra = build(g);
  return {
    gain: g,
    stop() {
      const t = ctx.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
      setTimeout(() => {
        extra?.();
        g.disconnect();
      }, 1000);
    },
  };
}
function loopNoise(ctx: AudioContext, type: BiquadFilterType, freq: number, q: number, dest: AudioNode, gain: number): { src: AudioBufferSourceNode; f: BiquadFilterNode } {
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx);
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(dest);
  src.start();
  return { src, f };
}
function drone(ctx: AudioContext, freq: number, type: OscillatorType, dest: AudioNode, gain: number): OscillatorNode {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.value = gain;
  o.connect(g).connect(dest);
  o.start();
  return o;
}
function lfoOn(ctx: AudioContext, param: AudioParam, rate: number, depth: number): OscillatorNode {
  const l = ctx.createOscillator();
  l.frequency.value = rate;
  const g = ctx.createGain();
  g.gain.value = depth;
  l.connect(g).connect(param);
  l.start();
  return l;
}
function every(ms: number, fn: () => void): () => void {
  const id = setInterval(fn, ms);
  return () => clearInterval(id);
}

export const AMBIENT_RECIPES: Record<AmbientId, (ctx: AudioContext, out: AudioNode) => Voice> = {
  bridge_hum: (ctx, out) =>
    bed(ctx, out, (g) => {
      const a = drone(ctx, 55, 'sine', g, 0.25);
      const b = drone(ctx, 110.5, 'sine', g, 0.08);
      const n = loopNoise(ctx, 'lowpass', 300, 0.5, g, 0.06);
      const beeps = every(3700, () => {
        const o = osc(ctx, 0, 1320 + Math.random() * 400, 1320, 0.06);
        o.connect(env(ctx, g, 0.003, 0.06, 0.04));
      });
      return () => {
        a.stop();
        b.stop();
        n.src.stop();
        beeps();
      };
    }),
  space_drone: (ctx, out) =>
    bed(ctx, out, (g) => {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 400;
      f.connect(g);
      const os = [73.4, 110, 146.8, 110.6].map((fr) => drone(ctx, fr, 'sawtooth', f, 0.05));
      const l = lfoOn(ctx, f.frequency, 0.05, 220);
      return () => {
        os.forEach((o) => o.stop());
        l.stop();
      };
    }),
  amara_wind: (ctx, out) =>
    bed(ctx, out, (g) => {
      const n = loopNoise(ctx, 'bandpass', 500, 0.6, g, 0.35);
      const l = lfoOn(ctx, n.f.frequency, 0.12, 250);
      const chirps = every(1900, () => {
        if (Math.random() < 0.5) return;
        const base = 2000 + Math.random() * 1800;
        for (let i = 0; i < 3; i++) {
          setTimeout(() => {
            const o = osc(ctx, 0, base, base * 1.3, 0.07);
            o.connect(env(ctx, g, 0.005, 0.07, 0.05));
          }, i * 110);
        }
      });
      return () => {
        n.src.stop();
        l.stop();
        chirps();
      };
    }),
  korr_wind: (ctx, out) =>
    bed(ctx, out, (g) => {
      const n = loopNoise(ctx, 'bandpass', 800, 0.8, g, 0.4);
      const l = lfoOn(ctx, n.f.frequency, 0.08, 500);
      const creaks = every(4300, () => {
        if (Math.random() < 0.4) return;
        const o = osc(ctx, 1, 70 + Math.random() * 40, 50, 0.9);
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = 400;
        f.Q.value = 8;
        o.connect(f).connect(env(ctx, g, 0.2, 0.7, 0.12));
      });
      return () => {
        n.src.stop();
        l.stop();
        creaks();
      };
    }),
  tension: (ctx, out) => {
    let level = 0;
    const v = bed(ctx, out, (g) => {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 600;
      f.connect(g);
      const notes = [55, 55, 65.4, 49];
      let i = 0;
      const pulse = every(220, () => {
        if (level <= 0.02) return;
        if (i % 2 === 0 || level > 0.6) {
          const fr = notes[Math.floor(i / 4) % notes.length];
          const o = osc(ctx, 1, fr, fr, 0.18);
          o.connect(env(ctx, f, 0.005, 0.18, 0.12 * level));
        }
        if (level > 0.5 && i % 4 === 2) {
          const o = osc(ctx, 3, 220, 218, 0.08);
          o.connect(env(ctx, f, 0.002, 0.08, 0.04 * level));
        }
        i++;
      });
      return pulse;
    });
    return {
      stop: v.stop,
      set(l: number) {
        level = l;
      },
    };
  },
};
