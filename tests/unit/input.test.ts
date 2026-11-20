import { describe, it, expect } from 'vitest';
import { Input, radialDeadZone, curve, type PadLike } from '../../src/core/input';
import { FEEL } from '../../src/data/tuning';

function pad(buttons: Record<number, number> = {}, axes = [0, 0, 0, 0]): PadLike {
  const b = Array.from({ length: 17 }, (_, i) => ({ pressed: (buttons[i] ?? 0) > 0.5, value: buttons[i] ?? 0 }));
  return { connected: true, buttons: b, axes };
}

describe('Input mapping', () => {
  it('maps keyboard keys to actions with press and release edges', () => {
    const i = new Input();
    i.getPads = () => [];
    i.keyDown('KeyR');
    i.poll(1 / 60);
    expect(i.pressed('reload')).toBe(true);
    expect(i.down('reload')).toBe(true);
    i.poll(1 / 60);
    expect(i.pressed('reload')).toBe(false);
    expect(i.down('reload')).toBe(true);
    i.keyUp('KeyR');
    i.poll(1 / 60);
    expect(i.released('reload')).toBe(true);
    expect(i.down('reload')).toBe(false);
  });
  it('does not lose a tap shorter than one step', () => {
    const i = new Input();
    i.getPads = () => [];
    i.keyDown('Space');
    i.keyUp('Space');
    i.poll(1 / 60);
    expect(i.pressed('roll')).toBe(true);
  });
  it('maps mouse buttons and wheel', () => {
    const i = new Input();
    i.getPads = () => [];
    i.keyDown('Mouse0');
    i.keyDown('Mouse2');
    i.poll(1 / 60);
    expect(i.down('fire')).toBe(true);
    expect(i.down('aim')).toBe(true);
  });
  it('normalizes WASD movement', () => {
    const i = new Input();
    i.getPads = () => [];
    i.keyDown('KeyW');
    i.keyDown('KeyD');
    i.poll(1 / 60);
    expect(Math.hypot(i.move.x, i.move.y)).toBeCloseTo(1, 5);
    expect(i.move.x).toBeGreaterThan(0);
    expect(i.move.y).toBeGreaterThan(0);
  });
  it('never binds Ctrl', async () => {
    const { KEY_BINDINGS } = await import('../../src/data/bindings');
    for (const keys of Object.values(KEY_BINDINGS)) for (const k of keys) expect(k.startsWith('Control')).toBe(false);
  });
  it('maps gamepad buttons, triggers past threshold and sticks with dead zone', () => {
    const i = new Input();
    let p = pad({ 7: 0.2 }, [0.1, 0, 0, 0]);
    i.getPads = () => [p];
    i.poll(1 / 60);
    expect(i.down('fire')).toBe(false);
    expect(i.move.x).toBe(0);
    p = pad({ 7: 0.5, 0: 1 }, [0, -1, 0, 0]);
    i.poll(1 / 60);
    expect(i.down('fire')).toBe(true);
    expect(i.pressed('roll')).toBe(true);
    expect(i.move.y).toBeGreaterThan(0.9);
    expect(i.lastDevice).toBe('pad');
  });
  it('switches the glyphs to the device used last', () => {
    const i = new Input();
    let p: PadLike | null = null;
    i.getPads = () => (p ? [p] : []);
    i.keyDown('KeyE');
    i.poll(1 / 60);
    expect(i.glyph('interact')).toBe('E');
    p = pad({ 2: 1 });
    i.poll(1 / 60);
    expect(i.glyph('interact')).toBe('X');
  });
  it('applies mouse sensitivity, aim multiplier and gamepad look rates', () => {
    const i = new Input();
    i.getPads = () => [];
    i.addMouse(100, 0);
    i.poll(1 / 60);
    expect(i.look(1 / 60, false, false).x).toBeCloseTo(100 * FEEL.mouseDegPerPx, 5);
    i.addMouse(100, 0);
    i.poll(1 / 60);
    expect(i.look(1 / 60, true, false).x).toBeCloseTo(100 * FEEL.mouseDegPerPx * FEEL.mouseAimMul, 5);
    const p = pad({}, [0, 0, 1, 0]);
    i.getPads = () => [p];
    i.poll(1);
    expect(i.look(1, false, false).x).toBeCloseTo(FEEL.padYawSpeed, 3);
    expect(i.look(1, false, true).x).toBeCloseTo(FEEL.padYawSpeed * FEEL.padSlowdown, 3);
  });
  it('radial dead zone and curve', () => {
    expect(radialDeadZone(0.1, 0.1, 0.15)).toEqual({ x: 0, y: 0 });
    const v = radialDeadZone(1, 0, 0.15);
    expect(v.x).toBeCloseTo(1, 5);
    const c = curve({ x: 0.5, y: 0 }, 1.8);
    expect(c.x).toBeCloseTo(Math.pow(0.5, 1.8), 5);
  });
  it('accepts injected virtual input', () => {
    const i = new Input();
    i.getPads = () => [];
    i.virtual.held.add('aim');
    i.virtual.move = { x: 0, y: 1 };
    i.poll(1 / 60);
    expect(i.down('aim')).toBe(true);
    expect(i.move.y).toBe(1);
  });
});
