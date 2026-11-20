import { END, type Cond, type DGraph, type DNode, type Effect, type DChoice } from '../data/dialogue/types';
import type { GameState } from './state';

export function checkCond(c: Cond | undefined, s: GameState): boolean {
  if (!c) return true;
  if (c.flag && !s.flag(c.flag)) return false;
  if (c.notFlag && s.flag(c.notFlag)) return false;
  if (c.flags && !c.flags.every((f) => s.flag(f))) return false;
  if (c.any && !c.any.some((f) => s.flag(f))) return false;
  if (c.choice && s.data.choices[c.choice[0]] !== c.choice[1]) return false;
  if (c.missions !== undefined && s.missionsDone() < c.missions) return false;
  return true;
}

/** Walks a dialogue graph, applying effects to game state. UI-agnostic. */
export class DialogueRunner {
  node: DNode | null = null;
  done = false;
  constructor(
    readonly graph: DGraph,
    private state: GameState,
    private onEffect: (e: Effect) => void = () => undefined,
  ) {
    const entry = graph.entry.find((e) => checkCond(e.cond, state));
    this.goto(entry ? entry.node : END);
  }
  private apply(effects?: Effect[]): void {
    for (const e of effects ?? []) {
      if (e.setFlag) this.state.setFlag(e.setFlag);
      if (e.clearFlag) this.state.setFlag(e.clearFlag, false);
      if (e.give) this.state.give(e.give[0], e.give[1]);
      if (e.choice) this.state.data.choices[e.choice[0]] = e.choice[1];
      this.onEffect(e);
    }
  }
  private goto(id: string): void {
    if (id === END) {
      this.node = null;
      this.done = true;
      return;
    }
    const n = this.graph.nodes[id];
    if (!n) throw new Error('Missing dialogue node ' + id);
    this.node = n;
    this.apply(n.effects);
  }
  /** Choices available at the current node. */
  choices(): DChoice[] {
    return (this.node?.choices ?? []).filter((c) => checkCond(c.cond, this.state));
  }
  visited(c: DChoice): boolean {
    return this.state.data.visitedTopics.includes(this.graph.id + ':' + c.to);
  }
  /** Advance a line without choices. */
  advance(): void {
    if (!this.node || this.choices().length) return;
    if (this.node.end || !this.node.next) this.goto(END);
    else this.goto(this.node.next);
  }
  choose(i: number): void {
    const c = this.choices()[i];
    if (!c) return;
    const key = this.graph.id + ':' + c.to;
    if (!this.state.data.visitedTopics.includes(key)) this.state.data.visitedTopics.push(key);
    this.apply(c.effects);
    this.goto(c.to);
  }
}
