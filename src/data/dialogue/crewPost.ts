import type { DChoice, DNode } from './types';

/** Post-mission crew topics, added to each crew hub. Filled in M9. */
export interface PostTopics {
  choices: DChoice[];
  nodes: DNode[];
}
export const REYES_POST: PostTopics = { choices: [], nodes: [] };
export const ZHAO_POST: PostTopics = { choices: [], nodes: [] };
export const BRANDT_POST: PostTopics = { choices: [], nodes: [] };
