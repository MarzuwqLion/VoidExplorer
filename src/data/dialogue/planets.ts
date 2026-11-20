import { nodes, END, type DGraph } from './types';

/** Chief Surveyor Nia Boateng, Landfall Station. */
export const BOATENG: DGraph = {
  id: 'boateng',
  entry: [
    { node: 'after', cond: { flag: 'amara_beacon' } },
    { node: 'hub', cond: { flag: 'amara_briefed' } },
    { node: 'b1' },
  ],
  nodes: nodes([
    { id: 'b1', speaker: 'boateng', text: "Corps? About time. I'd salute, but I've been holding this door shut for three weeks.", next: 'b2' },
    { id: 'b2', speaker: 'boateng', text: 'The stalkers took our relay cores. They like the hum. Three cores, three nests, and the big one sleeps on the last.', next: 'bq' },
    {
      id: 'bq', speaker: 'boateng', text: 'Questions, or are you going?',
      choices: [
        { label: 'Where are the nests?', to: 'bNests' },
        { label: 'How is your team?', to: 'bTeam' },
        { label: "I'll get your cores.", to: 'bGo' },
      ],
    },
    { id: 'bNests', speaker: 'boateng', text: 'One in the Grove east of here. One down the Ravine. The last past the Ridge, in a bowl we call the Den.', next: 'bq' },
    { id: 'bTeam', speaker: 'boateng', text: "Fed, scared and bored. Varga is counting plants. Park is fixing things that aren't broken.", next: 'bq' },
    { id: 'bGo', speaker: 'boateng', text: 'Bring them to the tower. Park says he can wire them in an hour. I can do it in ten minutes.', effects: [{ setFlag: 'amara_briefed' }], end: true },
    {
      id: 'hub', speaker: 'boateng', text: 'Commander.',
      choices: [
        { label: 'Any advice?', to: 'hAdvice' },
        { label: 'What did the station find?', to: 'hFind' },
        { label: 'Goodbye', to: END },
      ],
    },
    { id: 'hAdvice', speaker: 'boateng', text: 'Stalkers circle before they jump. Keep moving and keep your back to something solid.', next: 'hub' },
    { id: 'hFind', speaker: 'boateng', text: 'Eleven months of soil cores, two hundred new species and one very bad idea about a fence.', next: 'hFind2' },
    { id: 'hFind2', speaker: 'boateng', text: 'The fence was electric. The stalkers loved it. That should have told us something.', next: 'hub' },
    {
      id: 'after', speaker: 'boateng', text: 'Still here? The beacon is doing its job. You can go do yours.',
      choices: [
        { label: 'What happens now?', to: 'aNext' },
        { label: 'Any word from the Corps?', to: 'aWord' },
        { label: 'Goodbye', to: END },
      ],
    },
    { id: 'aNext', speaker: 'boateng', text: 'We finish the survey we came for. Slower, louder, and with the doors locked.', next: 'after' },
    { id: 'aWord', speaker: 'boateng', text: 'An acknowledgement and a form to fill in. No coffee yet. I am choosing to stay optimistic.', next: 'after' },
  ]),
};

/** Botanist Emil Varga. */
export const VARGA: DGraph = {
  id: 'varga',
  entry: [{ node: 'v1' }],
  nodes: nodes([
    {
      id: 'v1', speaker: 'varga', text: 'Careful where you step. Half of these are new to science and the other half bite.',
      choices: [
        { label: 'Tell me about the spitters', to: 'vSpit' },
        { label: 'Can you help me find samples?', to: 'vBio', cond: { notFlag: 'amara_varga_biomass' } },
        { label: 'What are the stalkers?', to: 'vStalk' },
        { label: 'Goodbye', to: END },
      ],
    },
    { id: 'vCoral', speaker: 'varga', text: 'The coral trees? They sing at dusk. Very quietly. I have nine hours of recordings and no theory.', next: 'vCoral2' },
    { id: 'vCoral2', speaker: 'varga', text: 'Boateng says I should sleep more. I say Amara should be quieter. We have reached a truce.', next: 'v1' },
    { id: 'vSpit', speaker: 'varga', text: 'The spitters aim with that throat sac. Pop it and they lose interest in everything.', next: 'v1' },
    { id: 'vBio', speaker: 'varga', text: "I'll push my survey to your compass. Every biomass bed I've catalogued, marked in green-gold.", effects: [{ setFlag: 'amara_varga_biomass' }, { event: 'vargaBiomass' }], next: 'v1' },
    { id: 'vStalk', speaker: 'varga', text: 'Pack hunters. Six legs, no eyes, very good hearing. They hunt the hum of our machines, which is flattering.', next: 'vStalk2' },
    { id: 'vStalk2', speaker: 'varga', text: 'The big one is new. Nobody had seen her until the cores went missing. She was waiting for a reason.', next: 'vCoral' },
  ]),
};

/** Mechanic Jun Park. */
export const PARK: DGraph = {
  id: 'park',
  entry: [{ node: 'p1' }],
  nodes: nodes([
    {
      id: 'p1', speaker: 'park', text: "If it's broken, I fixed it. If it isn't, give me a minute.",
      choices: [
        { label: 'Is there another way into the ravine?', to: 'pTunnel', cond: { notFlag: 'amara_tunnel' } },
        { label: 'What happened to the beacon?', to: 'pBeacon' },
        { label: 'Goodbye', to: END },
      ],
    },
    { id: 'pTunnel', speaker: 'park', text: "There's an old survey tunnel into the ravine. It comes out on the high ledge. I never said it was safe. I said it was high.", next: 'pTunnel2' },
    { id: 'pTunnel2', speaker: 'park', text: "The gate's south of the Grove. I'll unlock it from here.", effects: [{ setFlag: 'amara_tunnel' }, { event: 'tunnelOpen' }], next: 'pTunnel3' },
    { id: 'pTunnel3', speaker: 'park', text: 'If the roof comes down, it was like that when I found it.', next: 'p1' },
    { id: 'pBeacon', speaker: 'park', text: 'Stalkers chewed through the relay housing and walked off with the cores. Like they knew which part mattered.', next: 'pBeacon2' },
    { id: 'pBeacon2', speaker: 'park', text: 'I rebuilt the housing twice. Stronger bolts. They took the bolts too. I respect that, honestly.', next: 'p1' },
  ]),
};

/** The wounded raider lookout on Korr. */
export const LOOKOUT: DGraph = {
  id: 'lookout',
  entry: [
    { node: 'done', cond: { flag: 'korr_lookout' } },
    { node: 'l1' },
  ],
  nodes: nodes([
    { id: 'l1', speaker: 'lookout', text: "Don't. Please. I just watch the road. I'm not paid enough to get shot twice.", next: 'lq' },
    {
      id: 'lq', speaker: 'lookout', text: 'What do you want?',
      choices: [
        { label: "Who's in the mine?", to: 'lWho' },
        { label: 'Reassure him', to: 'lr' },
        { label: 'Threaten him', to: 'lt' },
      ],
    },
    { id: 'lWho', speaker: 'lookout', text: "The crew. Thirty, maybe more. And the Foreman in that loader rig. Don't go near the rig.", next: 'lWho2' },
    { id: 'lWho2', speaker: 'lookout', text: 'Your survey people are in there too. One of them, anyway. The Foreman keeps him for the rock.', next: 'lq' },
    { id: 'lr', speaker: 'player', text: 'Nobody shoots you again. Give me the gate code and my ship takes you out of here.', next: 'lr2' },
    { id: 'lr2', speaker: 'lookout', text: "Four, four, one, nine. Side door's unlocked too. They never fixed it.", effects: [{ choice: ['lookout', 'reassure'] }, { setFlag: 'korr_lookout' }, { event: 'lookoutReassure' }], end: true },
    { id: 'lt', speaker: 'player', text: 'The code. Now. Or I leave you out here for the cold.', next: 'lt2' },
    { id: 'lt2', speaker: 'lookout', text: '"Fine. Fine!" He slaps the alarm. "They\'d have killed me anyway."', effects: [{ choice: ['lookout', 'threaten'] }, { setFlag: 'korr_lookout' }, { event: 'lookoutThreaten' }], end: true },
    { id: 'done', speaker: 'lookout', text: 'I told you what I know. Leave me alone.', branches: [{ to: 'doneR', cond: { choice: ['lookout', 'reassure'] } }], end: true },
    { id: 'doneR', speaker: 'lookout', text: 'Your ship. It is really coming? Okay. Okay. I will be right here, not moving.', end: true },
  ]),
};

/** Surveyor Idris Kwan, Team Cobalt. */
export const KWAN: DGraph = {
  id: 'kwan',
  entry: [
    { node: 'dock', cond: { flag: 'korr_foreman' } },
    { node: 'hub', cond: { flag: 'korr_kwan' } },
    { node: 'k1' },
  ],
  nodes: nodes([
    { id: 'k1', speaker: 'kwan', text: 'Commander. They made us show them the seams. When we ran out of seams, they ran out of patience.', effects: [{ setFlag: 'korr_kwan' }, { setFlag: 'korr_vault' }, { event: 'vaultOpen' }], next: 'hub' },
    {
      id: 'hub', speaker: 'kwan', text: 'Ask. Then get me out of here.',
      choices: [
        { label: 'Where is the rest of Team Cobalt?', to: 'kTeam' },
        { label: 'What were they mining?', to: 'kMine' },
        { label: 'How do I stop the Foreman?', to: 'kForeman' },
        { label: "Stay here. I'll clear the dock.", to: 'kStay' },
      ],
    },
    { id: 'kTeam', speaker: 'kwan', text: 'Four dead. I knew the rock best, so I got a locked room instead of a ditch.', next: 'kTeam2' },
    { id: 'kTeam2', speaker: 'kwan', text: 'Mara, Teo, Ines and Sol. Write their names down somewhere that is not a raider ledger.', next: 'hub' },
    { id: 'kMine', speaker: 'kwan', text: 'Isotopes, already refined, shipped off-world every few days. The vault next door has samples. Take them.', next: 'hub' },
    { id: 'kForeman', speaker: 'kwan', text: "The Foreman's rig runs hot. Wait for the shoulders to open, then give it everything.", effects: [{ setFlag: 'korr_kwan_warned' }], next: 'hub' },
    { id: 'kStay', speaker: 'kwan', text: "I've stayed here six weeks. A few more minutes won't kill me.", next: 'kStay2' },
    { id: 'kStay2', speaker: 'kwan', text: 'The dock is past the north door. Listen for the engine. It sounds like a sick animal.', end: true },
    { id: 'dock', speaker: 'kwan', text: "Shuttle's coming down on the pad. I'd like to never see this rock again.", next: 'dock2' },
    { id: 'dock2', speaker: 'kwan', text: 'Thank you, Commander. I did not think anyone was coming.', end: true },
  ]),
};

export const PLANET_GRAPHS: Record<string, DGraph> = { boateng: BOATENG, varga: VARGA, park: PARK, lookout: LOOKOUT, kwan: KWAN };
