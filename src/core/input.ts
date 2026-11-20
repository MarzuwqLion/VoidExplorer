import { ACTIONS, KEY_BINDINGS, PAD, PAD_BINDINGS, KEY_GLYPHS, PAD_GLYPHS, type Action } from '../data/bindings';
import { FEEL } from '../data/tuning';

export type Device = 'kbm' | 'pad';
interface ActionState {
  down: boolean;
  pressed: boolean;
  released: boolean;
  held: number;
}
export interface Vec2 {
  x: number;
  y: number;
}
export interface PadLike {
  connected: boolean;
  buttons: ReadonlyArray<{ pressed: boolean; value: number }>;
  axes: ReadonlyArray<number>;
}

/** Apply a radial dead zone, rescaling the remaining range to 0..1. */
export function radialDeadZone(x: number, y: number, dz: number): Vec2 {
  const m = Math.hypot(x, y);
  if (m < dz) return { x: 0, y: 0 };
  const s = Math.min(1, (m - dz) / (1 - dz)) / m;
  return { x: x * s, y: y * s };
}
/** Response curve on stick magnitude. */
export function curve(v: Vec2, exp: number): Vec2 {
  const m = Math.hypot(v.x, v.y);
  if (m === 0) return v;
  const k = Math.pow(m, exp) / m;
  return { x: v.x * k, y: v.y * k };
}

/** One input layer: keyboard, mouse, gamepad and injected (virtual) input mapped to named actions. */
export class Input {
  private keys = new Set<string>();
  private taps = new Set<string>();
  private mouseDX = 0;
  private mouseDY = 0;
  private states = new Map<Action, ActionState>();
  lastDevice: Device = 'kbm';
  /** Movement vector, x right, y forward, magnitude 0..1. */
  move: Vec2 = { x: 0, y: 0 };
  /** Right stick after dead zone and curve. */
  padLook: Vec2 = { x: 0, y: 0 };
  /** Raw mouse delta in pixels consumed this tick. */
  mouse: Vec2 = { x: 0, y: 0 };
  settings = { mouseSens: 1, padSens: 1, invertY: false };
  /** Injected input for bots and tests. look is in degrees for this tick. */
  virtual = { move: { x: 0, y: 0 }, look: { x: 0, y: 0 }, held: new Set<Action>(), taps: new Set<Action>() };
  getPads: () => ReadonlyArray<PadLike | null> = () =>
    typeof navigator !== 'undefined' && navigator.getGamepads ? (navigator.getGamepads() as unknown as PadLike[]) : [];
  private padPrevMenuY = 0;
  private detach: (() => void) | null = null;
  pointerLocked = false;
  private lookVirtual: Vec2 = { x: 0, y: 0 };

  constructor() {
    for (const a of ACTIONS) this.states.set(a, { down: false, pressed: false, released: false, held: 0 });
  }

  attach(canvas: HTMLElement): void {
    const prevent = new Set(['Tab', 'Space', 'Backquote', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
    const kd = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') && (t as HTMLInputElement).type !== 'range') return;
      if (prevent.has(e.code)) e.preventDefault();
      if (!e.repeat) this.taps.add(e.code);
      this.keys.add(e.code);
      this.lastDevice = 'kbm';
    };
    const ku = (e: KeyboardEvent) => this.keys.delete(e.code);
    const md = (e: MouseEvent) => {
      const code = 'Mouse' + e.button;
      this.keys.add(code);
      this.taps.add(code);
      this.lastDevice = 'kbm';
    };
    const mu = (e: MouseEvent) => this.keys.delete('Mouse' + e.button);
    const mm = (e: MouseEvent) => {
      if (!this.pointerLocked) return;
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
      if (e.movementX || e.movementY) this.lastDevice = 'kbm';
    };
    const wh = (e: WheelEvent) => {
      this.taps.add(e.deltaY > 0 ? 'WheelDown' : 'WheelUp');
      this.lastDevice = 'kbm';
    };
    const blur = () => this.keys.clear();
    const ctx = (e: Event) => e.preventDefault();
    const plc = () => (this.pointerLocked = document.pointerLockElement === canvas);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    canvas.addEventListener('mousedown', md);
    window.addEventListener('mouseup', mu);
    window.addEventListener('mousemove', mm);
    window.addEventListener('wheel', wh, { passive: true });
    window.addEventListener('blur', blur);
    window.addEventListener('contextmenu', ctx);
    document.addEventListener('pointerlockchange', plc);
    this.detach = () => {
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      canvas.removeEventListener('mousedown', md);
      window.removeEventListener('mouseup', mu);
      window.removeEventListener('mousemove', mm);
      window.removeEventListener('wheel', wh);
      window.removeEventListener('blur', blur);
      window.removeEventListener('contextmenu', ctx);
      document.removeEventListener('pointerlockchange', plc);
    };
  }
  dispose(): void {
    this.detach?.();
  }

  /** Simulated key events, used by unit tests. */
  keyDown(code: string): void {
    this.keys.add(code);
    this.taps.add(code);
    this.lastDevice = 'kbm';
  }
  keyUp(code: string): void {
    this.keys.delete(code);
  }
  addMouse(dx: number, dy: number): void {
    this.mouseDX += dx;
    this.mouseDY += dy;
  }

  private pad(): PadLike | null {
    const pads = this.getPads();
    for (const p of pads) if (p && p.connected) return p;
    return null;
  }

  /** Sample all sources once per fixed step. */
  poll(dt: number): void {
    const pad = this.pad();
    const padDown = new Set<number>();
    let padMove: Vec2 = { x: 0, y: 0 };
    this.padLook = { x: 0, y: 0 };
    if (pad) {
      pad.buttons.forEach((b, i) => {
        const trigger = i === PAD.LT || i === PAD.RT;
        if (trigger ? b.value >= FEEL.triggerThreshold : b.pressed) padDown.add(i);
      });
      padMove = radialDeadZone(pad.axes[0] ?? 0, -(pad.axes[1] ?? 0), FEEL.deadZone);
      this.padLook = curve(radialDeadZone(pad.axes[2] ?? 0, -(pad.axes[3] ?? 0), FEEL.deadZone), FEEL.padCurve);
      if (padDown.size || padMove.x || padMove.y || this.padLook.x || this.padLook.y) this.lastDevice = 'pad';
      // Left stick doubles as menu up and down.
      const my = padMove.y > 0.5 ? 1 : padMove.y < -0.5 ? -1 : 0;
      if (my !== this.padPrevMenuY && my !== 0) this.taps.add(my > 0 ? 'PadMenuUp' : 'PadMenuDown');
      this.padPrevMenuY = my;
    }
    for (const a of ACTIONS) {
      const s = this.states.get(a)!;
      let down = false, tapped = false;
      for (const k of KEY_BINDINGS[a]) {
        if (this.keys.has(k)) down = true;
        if (this.taps.has(k)) tapped = true;
      }
      for (const b of PAD_BINDINGS[a]) if (padDown.has(PAD[b])) down = true;
      if (a === 'menuUp' && this.taps.has('PadMenuUp')) tapped = true;
      if (a === 'menuDown' && this.taps.has('PadMenuDown')) tapped = true;
      if (this.virtual.held.has(a)) down = true;
      if (this.virtual.taps.has(a)) tapped = true;
      const now = down || tapped;
      s.pressed = (now && !s.down) || (tapped && s.down);
      s.released = !now && s.down;
      s.down = now;
      s.held = now ? s.held + dt : 0;
    }
    this.taps.clear();
    this.virtual.taps.clear();
    // Movement
    let kx = 0, ky = 0;
    if (this.keys.has('KeyW')) ky += 1;
    if (this.keys.has('KeyS')) ky -= 1;
    if (this.keys.has('KeyD')) kx += 1;
    if (this.keys.has('KeyA')) kx -= 1;
    const km = Math.hypot(kx, ky);
    if (km > 0) {
      kx /= km;
      ky /= km;
    }
    let mx = kx + padMove.x + this.virtual.move.x, my = ky + padMove.y + this.virtual.move.y;
    const mm = Math.hypot(mx, my);
    if (mm > 1) {
      mx /= mm;
      my /= mm;
    }
    this.move = { x: mx, y: my };
    this.mouse = { x: this.mouseDX, y: this.mouseDY };
    // Injected look is one-shot: degrees for this step only.
    this.lookVirtual = this.virtual.look;
    this.virtual.look = { x: 0, y: 0 };
    this.mouseDX = 0;
    this.mouseDY = 0;
  }

  /** Look delta in degrees for this tick: x = yaw right, y = pitch up. */
  look(dt: number, aiming: boolean, slowdown: boolean): Vec2 {
    const inv = this.settings.invertY ? -1 : 1;
    const mk = FEEL.mouseDegPerPx * this.settings.mouseSens * (aiming ? FEEL.mouseAimMul : 1);
    const pk = this.settings.padSens * (aiming ? FEEL.padAimMul : 1) * (slowdown ? FEEL.padSlowdown : 1);
    return {
      x: this.mouse.x * mk + this.padLook.x * FEEL.padYawSpeed * pk * dt + this.lookVirtual.x,
      y: (-this.mouse.y * mk + this.padLook.y * FEEL.padPitchSpeed * pk * dt) * inv + this.lookVirtual.y,
    };
  }

  down(a: Action): boolean {
    return this.states.get(a)!.down;
  }
  pressed(a: Action): boolean {
    return this.states.get(a)!.pressed;
  }
  released(a: Action): boolean {
    return this.states.get(a)!.released;
  }
  held(a: Action): number {
    return this.states.get(a)!.held;
  }
  /** Mark an edge as handled so nothing else reacts to it this tick. */
  consume(a: Action): void {
    this.states.get(a)!.pressed = false;
  }
  /** Clear all held state (scene changes, pause). */
  reset(): void {
    this.keys.clear();
    this.taps.clear();
    for (const s of this.states.values()) Object.assign(s, { down: false, pressed: false, released: false, held: 0 });
    this.virtual.held.clear();
    this.virtual.taps.clear();
    this.virtual.move = { x: 0, y: 0 };
    this.virtual.look = { x: 0, y: 0 };
  }
  glyph(a: Action): string {
    return (this.lastDevice === 'pad' ? PAD_GLYPHS[a] : KEY_GLYPHS[a]) ?? a;
  }
}
