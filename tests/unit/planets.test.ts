import { describe, it, expect } from 'vitest';
import { PLANETS } from '../../src/data/planets';

describe('planet data', () => {
  it('has 15 entries with exactly 2 landable', () => {
    expect(PLANETS).toHaveLength(15);
    expect(PLANETS.filter((p) => p.landing.viable).map((p) => p.id)).toEqual(['amara', 'korr']);
  });
  it('has unique names and ascending orbits', () => {
    expect(new Set(PLANETS.map((p) => p.name)).size).toBe(15);
    for (let i = 1; i < PLANETS.length; i++) expect(PLANETS[i].orbit).toBeGreaterThan(PLANETS[i - 1].orbit);
  });
  it('gives every planet full survey stats and a 2 to 3 sentence note', () => {
    for (const p of PLANETS) {
      for (const k of ['radiusKm', 'gravity', 'day', 'atmosphere', 'temperature', 'className'] as const) expect(p[k].length).toBeGreaterThan(0);
      const sentences = p.note.split(/[.!?](\s|$)/).filter((s) => s.trim().length > 1).length;
      expect(sentences).toBeGreaterThanOrEqual(2);
      expect(sentences).toBeLessThanOrEqual(3);
      if (!p.landing.viable) expect(p.landing.reason).toBeTruthy();
    }
  });
  it('has orbit periods of 6 to 40 minutes, inner planets fastest', () => {
    for (let i = 0; i < PLANETS.length; i++) {
      expect(PLANETS[i].period).toBeGreaterThanOrEqual(6);
      expect(PLANETS[i].period).toBeLessThanOrEqual(40);
      if (i) expect(PLANETS[i].period).toBeGreaterThanOrEqual(PLANETS[i - 1].period);
    }
  });
});
