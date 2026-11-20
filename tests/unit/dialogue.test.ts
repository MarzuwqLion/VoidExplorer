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
        const targets = [...(n.next ? [n.next] : []), ...(n.choices ?? []).map((c) => c.to)];
        expect(targets.length > 0 || n.end, g.id + ':' + n.id + ' is a dead end').toBeTruthy();
        for (const t of targets) expect(t === END || ids.has(t), g.id + ':' + n.id + ' -> ' + t).toBe(true);
        if (n.choices) {
          expect(n.choices.length).toBeGreaterThanOrEqual(2);
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
