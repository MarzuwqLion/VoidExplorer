import { describe, it, expect } from 'vitest';
import { ALL_GRAPHS } from '../../src/data/dialogue/index';
import { END } from '../../src/data/dialogue/types';
import { DialogueRunner } from '../../src/core/dialogueRunner';
import { GameState } from '../../src/core/state';
import { speakerName } from '../../src/data/names';

describe('dialogue graphs', () => {
  it('exist for every crew member', () => {
    expect(ALL_GRAPHS.length).toBeGreaterThanOrEqual(4);
  });
  for (const g of ALL_GRAPHS) {
    it(g.id + ': every target resolves, no dead ends, no unreachable nodes', () => {
      const ids = new Set(Object.keys(g.nodes));
      for (const e of g.entry) expect(ids.has(e.node), g.id + ' entry ' + e.node).toBe(true);
      for (const n of Object.values(g.nodes)) {
        expect(n.id).toBe(Object.keys(g.nodes).find((k) => g.nodes[k] === n));
        const targets = [...(n.next ? [n.next] : []), ...(n.choices ?? []).map((c) => c.to), ...(n.branches ?? []).map((b) => b.to)];
        expect(targets.length > 0 || n.end, g.id + ':' + n.id + ' is a dead end').toBeTruthy();
        for (const t of targets) expect(t === END || ids.has(t), g.id + ':' + n.id + ' -> ' + t).toBe(true);
        if (n.choices) {
          expect(n.choices.length).toBeGreaterThanOrEqual(2);
          // At most four choices can show at once under any state; the hubs gate topics by mission progress.
        }
      }
      const seen = new Set<string>();
      const stack = g.entry.map((e) => e.node);
      while (stack.length) {
        const id = stack.pop()!;
        if (id === END || seen.has(id)) continue;
        seen.add(id);
        const n = g.nodes[id];
        if (n.next) stack.push(n.next);
        for (const c of n.choices ?? []) stack.push(c.to);
        for (const b of n.branches ?? []) stack.push(b.to);
      }
      for (const id of ids) expect(seen.has(id), g.id + ':' + id + ' unreachable').toBe(true);
    });
    it(g.id + ': lines are under 30 words and speakers resolve', () => {
      for (const n of Object.values(g.nodes)) {
        const words = n.text.split(/\s+/).filter(Boolean).length;
        expect(words, g.id + ':' + n.id).toBeLessThan(30);
        expect(speakerName(n.speaker)).not.toBe(n.speaker === 'player' ? '' : 'undefined');
      }
    });
    it(g.id + ': a conversation that always picks the last choice ends', () => {
      const s = new GameState();
      const r = new DialogueRunner(g, s);
      let steps = 0;
      while (!r.done && steps < 200) {
        const ch = r.choices();
        if (ch.length) r.choose(ch.length - 1);
        else r.advance();
        steps++;
      }
      expect(r.done).toBe(true);
    });
  }
});

describe('dialogue choice lists', () => {
  it('never show more than four choices for any mission state or lookout choice', () => {
    const states: GameState[] = [];
    for (const missions of [[false, false], [true, false], [false, true], [true, true]])
      for (const choice of [undefined, 'reassure', 'threaten']) {
        const s = new GameState();
        s.setFlag('briefed');
        s.data.missions.amara = missions[0];
        s.data.missions.korr = missions[1];
        if (missions[0]) s.setFlag('amaraDone');
        if (missions[1]) s.setFlag('korrDone');
        if (choice) s.data.choices.lookout = choice;
        states.push(s);
      }
    for (const g of ALL_GRAPHS)
      for (const s of states)
        for (const n of Object.values(g.nodes)) {
          if (!n.choices) continue;
          const r = new DialogueRunner({ ...g, entry: [{ node: n.id }] }, s);
          const shown = r.choices().length;
          expect(shown, g.id + ':' + n.id).toBeLessThanOrEqual(4);
        }
  });
  it('the final debrief has a variant for each lookout choice and survey result', () => {
    const okon = ALL_GRAPHS.find((g) => g.id === 'okonkwo')!;
    const run = (choice: string, all: boolean) => {
      const s = new GameState();
      s.setFlag('briefed');
      s.data.missions = { amara: true, korr: true };
      s.data.choices.lookout = choice;
      if (all) s.setFlag('surveyedAll');
      const r = new DialogueRunner(okon, s);
      const lines: string[] = [];
      while (!r.done) {
        lines.push(r.node!.text);
        r.advance();
      }
      return lines;
    };
    const a = run('reassure', true), b = run('threaten', false);
    expect(a[0]).toContain('Landfall Station is transmitting');
    expect(a.join(' ')).toContain('Fifteen planets logged');
    expect(a.join(' ')).toContain('asking for a lawyer');
    expect(b.join(' ')).toContain('Not every planet got logged');
    expect(b.join(' ')).toContain("didn't make it out of the yard");
    expect(a[a.length - 1]).toContain('Get some sleep');
    expect(a).toHaveLength(5);
  });
});

describe('line count', () => {
  it('has 150 to 200 lines across the game, each under 30 words', async () => {
    const { INTRO_CARD } = await import('../../src/data/dialogue/intro');
    const { AMARA_RADIO, KORR_RADIO } = await import('../../src/data/dialogue/missionRadio');
    const { MAP_RADIO } = await import('../../src/data/dialogue/radio');
    const texts = [
      ...ALL_GRAPHS.flatMap((g) => Object.values(g.nodes).map((n) => n.text)),
      ...INTRO_CARD,
      ...[...Object.values(AMARA_RADIO), ...Object.values(KORR_RADIO), ...Object.values(MAP_RADIO)].map((r) => r[1] as string),
    ];
    expect(texts.length).toBeGreaterThanOrEqual(150);
    expect(texts.length).toBeLessThanOrEqual(200);
    for (const t of texts) expect(t.split(/\s+/).length, t).toBeLessThan(30);
  });
});
