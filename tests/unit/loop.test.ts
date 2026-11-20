import { describe, it, expect } from 'vitest';
import { FixedLoop } from '../../src/core/loop';

describe('FixedLoop', () => {
  it('runs a fixed number of steps for real time, independent of frame rate', () => {
    let a = 0, b = 0;
    const la = new FixedLoop(60, () => a++);
    const lb = new FixedLoop(60, () => b++);
    for (let i = 0; i < 60; i++) la.advance(1 / 60);
    for (let i = 0; i < 144; i++) lb.advance(1 / 144);
    expect(Math.abs(a - 60)).toBeLessThanOrEqual(1);
    expect(Math.abs(b - 60)).toBeLessThanOrEqual(1);
  });
  it('returns an interpolation alpha in [0,1)', () => {
    const l = new FixedLoop(60, () => undefined);
    const alpha = l.advance(1.5 / 60);
    expect(alpha).toBeGreaterThanOrEqual(0);
    expect(alpha).toBeLessThan(1);
    expect(l.steps).toBe(1);
  });
  it('caps steps per frame to avoid a spiral of death', () => {
    let n = 0;
    const l = new FixedLoop(60, () => n++, 5);
    l.advance(0.2);
    expect(n).toBe(5);
  });
  it('steps manually by seconds', () => {
    let n = 0;
    const l = new FixedLoop(60, () => n++);
    l.stepSeconds(2);
    expect(n).toBe(120);
    expect(l.time).toBeCloseTo(2, 5);
  });
  it('applies time scale', () => {
    let n = 0;
    const l = new FixedLoop(60, () => n++);
    l.timeScale = 0.5;
    for (let i = 0; i < 60; i++) l.advance(1 / 60);
    expect(Math.abs(n - 30)).toBeLessThanOrEqual(1);
  });
});
