import type { ResourceId } from '../names';

/** Condition on game state; all listed keys must hold. */
export interface Cond {
  flag?: string;
  notFlag?: string;
  flags?: string[];
  any?: string[];
  choice?: [string, string];
  missions?: number;
}
export interface Effect {
  setFlag?: string;
  clearFlag?: string;
  give?: [ResourceId, number];
  choice?: [string, string];
  /** Named event the scene reacts to (e.g. "openTerminal", "debriefDone"). */
  event?: string;
}
export interface DChoice {
  label: string;
  to: string;
  cond?: Cond;
  effects?: Effect[];
}
export interface DNode {
  id: string;
  speaker: string;
  text: string;
  next?: string;
  choices?: DChoice[];
  effects?: Effect[];
  end?: boolean;
}
export interface DGraph {
  id: string;
  /** Entry points tried in order; the first whose condition holds starts the conversation. */
  entry: { node: string; cond?: Cond }[];
  nodes: Record<string, DNode>;
}
export const END = 'END';

/** Build a node map from a list. */
export function nodes(list: DNode[]): Record<string, DNode> {
  return Object.fromEntries(list.map((n) => [n.id, n]));
}
