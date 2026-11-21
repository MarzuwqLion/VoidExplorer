import { nodes, END, type Cond, type DChoice, type DGraph, type DNode, type Effect } from './types';
import { NAMES } from '../names';

/** A one-shot line that plays before the greeting when its condition holds (it should set a flag so it plays once). */
export interface Opener {
  id: string;
  text: string;
  cond: Cond;
  effects: Effect[];
}
export interface CrewHubSpec {
  id: string;
  speaker: string;
  /** Greeting by mission progress. */
  greet: { none: string; amara: string; korr: string; both: string };
  /** Hub line when returning from a topic. */
  again: string;
  /** Three topics before any mission; after a mission they move under "Earlier topics". */
  early: DChoice[];
  /** Post-mission personal topics, gated so at most one shows. */
  personal: DChoice[];
  /** The personal follow-up menu: at most one gated follow-up shows per state. */
  you: { text: string; follow: DChoice[] };
  /** Opinions of the other crew. */
  crew: { text: string; choices: DChoice[] };
  amara: { text: string; choices: DChoice[] };
  korr: { text: string; choices: DChoice[] };
  openers?: Opener[];
  lines: DNode[];
}

const GREETS = [
  { node: 'greetB', cond: { missions: 2 } },
  { node: 'greetA', cond: { flag: 'amaraDone' } },
  { node: 'greetK', cond: { flag: 'korrDone' } },
];

/**
 * Crew conversation hub. Every menu shows 2 to 4 choices: before any mission, three topics and Goodbye;
 * after, one topic menu per planet, a personal topic and Goodbye. "Earlier topics" and the crew opinions
 * sit under the personal menu.
 */
export function crewHub(s: CrewHubSpec): DGraph {
  const sp = s.speaker;
  const top: DChoice[] = [
    ...s.early.map((c) => ({ ...c, cond: { ...c.cond, maxMissions: 0 } })),
    { label: 'About ' + NAMES.planets.amara, to: 'subA', cond: { flag: 'amaraDone' } },
    { label: 'About ' + NAMES.planets.korr, to: 'subK', cond: { flag: 'korrDone' } },
    ...s.personal,
    { label: 'Goodbye', to: END },
  ];
  const menu = (id: string, text: string): DNode => ({ id, speaker: sp, text, choices: top });
  const openers: DNode[] = (s.openers ?? []).map((o) => ({
    id: o.id, speaker: sp, text: o.text, effects: o.effects, branches: GREETS.map((g) => ({ to: g.node, cond: g.cond })), next: 'greet0',
  }));
  return {
    id: s.id,
    entry: [...(s.openers ?? []).map((o) => ({ node: o.id, cond: o.cond })), ...GREETS, { node: 'greet0' }],
    nodes: nodes([
      menu('greet0', s.greet.none),
      menu('greetA', s.greet.amara),
      menu('greetK', s.greet.korr),
      menu('greetB', s.greet.both),
      menu('hub', s.again),
      {
        id: 'you', speaker: sp, text: s.you.text,
        choices: [
          ...s.you.follow,
          { label: 'The rest of the crew', to: 'crew' },
          { label: 'Earlier topics', to: 'subE', cond: { missions: 1 } },
          { label: 'Back', to: 'hub' },
        ],
      },
      { id: 'crew', speaker: sp, text: s.crew.text, choices: [...s.crew.choices, { label: 'Back', to: 'you' }] },
      { id: 'subA', speaker: sp, text: s.amara.text, choices: [...s.amara.choices, { label: 'Back', to: 'hub' }] },
      { id: 'subK', speaker: sp, text: s.korr.text, choices: [...s.korr.choices, { label: 'Back', to: 'hub' }] },
      { id: 'subE', speaker: sp, text: 'Ask away.', choices: [...s.early, { label: 'Back', to: 'you' }] },
      ...openers,
      ...s.lines,
    ]),
  };
}

/** Personal-topic choices for the three post-mission states. */
export function holdingUp(label: string, amara: string, korr: string, both: string): DChoice[] {
  return [
    { label, to: amara, cond: { missions: 1, maxMissions: 1, flag: 'amaraDone' } },
    { label, to: korr, cond: { missions: 1, maxMissions: 1, flag: 'korrDone' } },
    { label, to: both, cond: { missions: 2 } },
  ];
}
