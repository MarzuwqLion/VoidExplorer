import { nodes, END, type DGraph } from './types';
import type { CrewId } from '../names';
import { OKONKWO } from './okonkwo';
import { REYES_POST, ZHAO_POST, BRANDT_POST } from './crewPost';

/** Flight Lt. Reyes, helm. */
export const REYES: DGraph = {
  id: 'reyes',
  entry: [{ node: 'greet' }],
  nodes: nodes([
    {
      id: 'greet', speaker: 'helm', text: "Commander. She's holding orbit like she means it.",
      choices: [
        { label: 'About you', to: 'tSelf' },
        { label: 'About the ship', to: 'tShip' },
        { label: 'About the system', to: 'tSystem' },
        { label: 'How do I fly the map?', to: 'tFly' },
        ...REYES_POST.choices,
        { label: 'Goodbye', to: END },
      ],
    },
    { id: 'tSelf', speaker: 'helm', text: "Six years flying survey and never scratched a hull. I don't say that near the ship, so forget you heard it.", next: 'greet' },
    { id: 'tShip', speaker: 'helm', text: "She likes a gentle hand and hates being called old. I knock twice on the console before every burn. Don't laugh. It works.", next: 'greet' },
    { id: 'tSystem', speaker: 'helm', text: "Goliath's rings are the prettiest thing out here. Also the fastest way to lose a paint job.", next: 'greet' },
    { id: 'tFly', speaker: 'helm', text: 'Point her and she goes. Hold boost for the long hauls. Get close to anything and the scanners log it for us.', next: 'tFly2' },
    { id: 'tFly2', speaker: 'helm', text: "Amara and Korr are flagged green. Pull up close, call the landing, and I'll drop you in the shuttle.", next: 'greet' },
    ...REYES_POST.nodes,
  ]),
};

/** Dr. Lin Zhao, science officer. */
export const ZHAO: DGraph = {
  id: 'zhao',
  entry: [{ node: 'greet' }],
  nodes: nodes([
    {
      id: 'greet', speaker: 'science', text: "Commander. Bring me something I haven't seen.",
      choices: [
        { label: 'About you', to: 'tSelf' },
        { label: 'About resources', to: 'tRes' },
        { label: 'About the system', to: 'tSystem' },
        { label: 'What makes a planet habitable?', to: 'tHab' },
        ...ZHAO_POST.choices,
        { label: 'Goodbye', to: END },
      ],
    },
    { id: 'tSelf', speaker: 'science', text: 'Nine years running a lab on a station. Every sample came to me pre-labelled. I wanted the ones nobody had named yet.', next: 'greet' },
    { id: 'tRes', speaker: 'science', text: 'Alloy, biomass, isotopes. Bring samples and Brandt and I can make your kit slightly less likely to fail.', next: 'greet' },
    { id: 'tSystem', speaker: 'science', text: "Two living worlds around one star. That isn't luck. That's a system worth fighting over, and somebody will.", next: 'greet' },
    { id: 'tHab', speaker: 'science', text: 'Air you can breathe, water that stays liquid, ground that holds still. Amara has all three. Korr has two and a rebreather.', next: 'tHab2' },
    { id: 'tHab2', speaker: 'science', text: 'Anything that lives somewhere easy will defend it. Assume the wildlife has opinions.', next: 'greet' },
    ...ZHAO_POST.nodes,
  ]),
};

/** Chief Brandt, quartermaster. */
export const BRANDT: DGraph = {
  id: 'brandt',
  entry: [{ node: 'greet' }],
  nodes: nodes([
    {
      id: 'greet', speaker: 'quartermaster', text: "Commander. Rack's loaded.",
      choices: [
        { label: 'About you', to: 'tSelf' },
        { label: 'Why does the Corps land armed?', to: 'tCorps' },
        { label: 'Tell me about the weapons', to: 'tWeapons' },
        { label: 'About the system', to: 'tSystem' },
        { label: 'Upgrades', to: 'tUpgrade' },
        ...BRANDT_POST.choices,
        { label: 'Goodbye', to: END },
      ],
    },
    { id: 'tSelf', speaker: 'quartermaster', text: 'Twenty years in the Corps. Fourteen of them fixing what other people dropped. Beats being the one who dropped it.', next: 'greet' },
    { id: 'tCorps', speaker: 'quartermaster', text: 'The first survey team we ever lost went down holding clipboards. Since then everybody lands armed. Cooks included.', next: 'greet' },
    { id: 'tWeapons', speaker: 'quartermaster', text: 'Keeper never runs dry. Wasp is for anything close and fast. Longwatch is for anything far away or wearing plate.', next: 'greet' },
    { id: 'tSystem', speaker: 'quartermaster', text: "Two teams gone quiet in one system. I packed extra rounds. Call it a feeling.", next: 'greet' },
    { id: 'tUpgrade', speaker: 'quartermaster', text: "Bring me materials and I'll bolt on improvements. No materials, no miracles.", effects: [{ event: 'openTerminal' }], end: true },
    ...BRANDT_POST.nodes,
  ]),
};

export const CREW_GRAPHS: Record<CrewId, DGraph> = { xo: OKONKWO, helm: REYES, science: ZHAO, quartermaster: BRANDT };
