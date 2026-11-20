import { nodes, END, type DGraph, type DChoice, type DNode } from './types';
import type { CrewId } from '../names';
import { OKONKWO } from './okonkwo';

/**
 * Crew hubs keep 2 to 4 choices: before any mission, three topics and Goodbye.
 * After a mission, each planet gets its own submenu of two topics, and the first three move under "Earlier topics".
 */
function hub(id: string, speaker: string, greet: string, early: DChoice[], amara: DChoice[], korr: DChoice[], extra: DNode[]): DGraph {
  const back: DChoice = { label: 'Back', to: 'greet' };
  return {
    id,
    entry: [{ node: 'greet' }],
    nodes: nodes([
      {
        id: 'greet', speaker, text: greet,
        choices: [
          ...early.map((c) => ({ ...c, cond: { maxMissions: 0 } })),
          { label: 'About Amara', to: 'subA', cond: { flag: 'amaraDone' } },
          { label: 'About Korr', to: 'subK', cond: { flag: 'korrDone' } },
          { label: 'Earlier topics', to: 'subE', cond: { missions: 1 } },
          { label: 'Goodbye', to: END },
        ],
      },
      { id: 'subA', speaker, text: 'Amara. What about it?', choices: [...amara, back] },
      { id: 'subK', speaker, text: 'Korr. Go on.', choices: [...korr, back] },
      { id: 'subE', speaker, text: 'Ask away.', choices: [...early, back] },
      ...extra,
    ]),
  };
}

/** Flight Lt. Reyes, helm. */
export const REYES = hub(
  'reyes', 'helm', "Commander. She's holding orbit like she means it.",
  [
    { label: 'About you', to: 'tSelf' },
    { label: 'About the ship', to: 'tShip' },
    { label: 'About the system', to: 'tSystem' },
  ],
  [
    { label: 'What did you hear about the Den?', to: 'rA1' },
    { label: 'How was the drop?', to: 'rA2' },
  ],
  [
    { label: 'Your read on Korr?', to: 'rK1' },
    { label: 'The ships leaving orbit', to: 'rK2' },
  ],
  [
    { id: 'tSelf', speaker: 'helm', text: "Six years flying survey and never scratched a hull. I don't say that near the ship, so forget you heard it.", next: 'tSelf2' },
    { id: 'tSelf2', speaker: 'helm', text: 'Before the Corps I flew ore haulers. Same ships, less shooting, much worse coffee.', next: 'greet' },
    { id: 'tShip', speaker: 'helm', text: 'She likes a gentle hand and hates being called old. Point her and she goes. Hold boost for the long hauls.', next: 'tShip2' },
    { id: 'tShip2', speaker: 'helm', text: "Fly close to anything and the scanners log it. Amara and Korr are flagged green. Call the landing and I'll drop you.", next: 'greet' },
    { id: 'tSystem', speaker: 'helm', text: "Goliath's rings are the prettiest thing out here. Also the fastest way to lose a paint job.", next: 'greet' },
    { id: 'rA1', speaker: 'helm', text: "I heard it was the size of a truck. I'll stay up here with the vacuum, thanks.", next: 'subA' },
    { id: 'rA2', speaker: 'helm', text: "Shuttle came back with teal grass in the skids. I'm not cleaning it out. It might be alive.", next: 'subA' },
    { id: 'rK1', speaker: 'helm', text: 'Cold, ugly, and full of people who shoot first. Amara tried to eat you and I still liked it better.', next: 'subK' },
    { id: 'rK2', speaker: 'helm', text: 'I logged two burns out of Korr orbit before we arrived. Whoever they were, they had somewhere to be.', next: 'subK' },
  ],
);

/** Dr. Lin Zhao, science officer. */
export const ZHAO = hub(
  'zhao', 'science', "Commander. Bring me something I haven't seen.",
  [
    { label: 'About you', to: 'tSelf' },
    { label: 'About resources', to: 'tRes' },
    { label: 'About the system', to: 'tSystem' },
  ],
  [
    { label: 'The stalkers and the cores', to: 'zA1' },
    { label: 'What did I bring back?', to: 'zA2' },
  ],
  [
    { label: 'The isotopes', to: 'zK1' },
    { label: 'About the lookout', to: 'zK2r', cond: { choice: ['lookout', 'reassure'] } },
    { label: 'About the lookout', to: 'zK2t', cond: { choice: ['lookout', 'threaten'] } },
  ],
  [
    { id: 'tSelf', speaker: 'science', text: 'Nine years running a station lab. Every sample came to me pre-labelled. I wanted the ones nobody had named yet.', next: 'tSelf2' },
    { id: 'tSelf2', speaker: 'science', text: 'The Corps gave me a ship and a bodyguard. Brandt insists he is not my bodyguard. He is.', next: 'greet' },
    { id: 'tRes', speaker: 'science', text: 'Alloy, biomass, isotopes. Bring samples and Brandt and I can make your kit slightly less likely to fail.', next: 'greet' },
    { id: 'tSystem', speaker: 'science', text: "Two living worlds around one star. That isn't luck. That's a system worth fighting over, and somebody will.", next: 'tSystem2' },
    { id: 'tSystem2', speaker: 'science', text: 'Amara has air, water and ground that holds still. Korr has two of those and a rebreather. Assume the wildlife has opinions.', next: 'greet' },
    { id: 'zA1', speaker: 'science', text: 'They stole the cores for the hum. An animal that collects machines. I want a year down there.', next: 'subA' },
    { id: 'zA2', speaker: 'science', text: "Biomass that photosynthesises on two spectra. Brandt wants armour padding out of it. I want to name it first.", next: 'subA' },
    { id: 'zK1', speaker: 'science', text: "Those isotopes were already refined. The claim jumpers weren't prospecting. They were shipping.", next: 'subK' },
    { id: 'zK2r', speaker: 'science', text: "Your lookout is in the medbay. Two bullet wounds, frostbite and a lot of opinions. He'll live.", next: 'subK' },
    { id: 'zK2t', speaker: 'science', text: "I read the yard logs. The alarm came from the lookout post. I'm not judging. I'm noting it.", next: 'subK' },
  ],
);

/** Chief Brandt, quartermaster. */
export const BRANDT = hub(
  'brandt', 'quartermaster', "Commander. Rack's loaded.",
  [
    { label: 'About you', to: 'tSelf' },
    { label: 'Why does the Corps land armed?', to: 'tCorps' },
    { label: 'About the system', to: 'tSystem' },
  ],
  [
    { label: 'Stalkers up close', to: 'bA1' },
    { label: 'Kit report', to: 'bA2' },
  ],
  [
    { label: 'The Foreman', to: 'bK1' },
    { label: 'About the lookout', to: 'bK2r', cond: { choice: ['lookout', 'reassure'] } },
    { label: 'About the lookout', to: 'bK2t', cond: { choice: ['lookout', 'threaten'] } },
  ],
  [
    { id: 'tSelf', speaker: 'quartermaster', text: 'Twenty years in the Corps. Fourteen of them fixing what other people dropped. Beats being the one who dropped it.', next: 'greet' },
    { id: 'tCorps', speaker: 'quartermaster', text: 'The first survey team we ever lost went down holding clipboards. Since then everybody lands armed. Cooks included.', next: 'tCorps2' },
    { id: 'tCorps2', speaker: 'quartermaster', text: 'Keeper never runs dry. Wasp is for anything close and fast. Longwatch is for anything far away or wearing plate.', next: 'greet' },
    { id: 'tSystem', speaker: 'quartermaster', text: 'Two teams gone quiet in one system. I packed extra rounds. Call it a feeling.', next: 'tSystem2' },
    { id: 'tSystem2', speaker: 'quartermaster', text: "Bring me materials from down there and I'll bolt on improvements at the terminal. No materials, no miracles.", next: 'greet' },
    { id: 'bA1', speaker: 'quartermaster', text: "Rifle butt to a six-legged dog. Not in any manual I wrote. Good to know it works.", next: 'subA' },
    { id: 'bA2', speaker: 'quartermaster', text: "Your armour came back with bite marks. I'm keeping that plate. Morale purposes.", next: 'subA' },
    { id: 'bK1', speaker: 'quartermaster', text: "A loader rig with a rotary cannon. Somebody down there had imagination. Glad it's scrap.", next: 'subK' },
    { id: 'bK2r', speaker: 'quartermaster', text: "You promised a raider a ride and kept it. The manual doesn't cover that. I'd have done the same.", next: 'subK' },
    { id: 'bK2t', speaker: 'quartermaster', text: "You leaned on him and he folded the wrong way. Happens. Doesn't mean you'll like remembering it.", next: 'subK' },
  ],
);

export const CREW_GRAPHS: Record<CrewId, DGraph> = { xo: OKONKWO, helm: REYES, science: ZHAO, quartermaster: BRANDT };
