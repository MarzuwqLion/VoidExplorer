import { crewHub, holdingUp } from './crewHub';
import { NAMES } from '../names';

const sp = 'science';
const named = { setFlag: 'zhao_named' };

/** Dr. Lin Zhao, science officer: curious, blunt. Names the Amara biomass with the commander. */
export const ZHAO = crewHub({
  id: 'zhao',
  speaker: sp,
  greet: {
    none: "Commander. Bring me something I haven't seen.",
    amara: 'Commander. The samples are still alive. Two of them are trying to leave.',
    korr: "Commander. I've been reading the raiders' ledgers. Bad handwriting, worse ethics, excellent assay data.",
    both: 'Commander. I have enough data for six papers and time to write none of them.',
  },
  again: 'What else?',
  early: [
    { label: 'About you', to: 'tSelf' },
    { label: 'About resources', to: 'tRes' },
    { label: 'About the system', to: 'tSystem' },
  ],
  personal: holdingUp('How are you holding up?', 'arcA', 'arcK', 'arcB'),
  you: {
    text: 'Something else?',
    follow: [
      { label: 'Why leave the station lab?', to: 'yL1', cond: { maxMissions: 0 } },
      { label: 'What happens to the samples?', to: 'ySm', cond: { missions: 1 } },
    ],
  },
  crew: {
    text: 'Professional opinions only. Mostly.',
    choices: [
      { label: NAMES.crew.xo.short, to: 'cO' },
      { label: NAMES.crew.helm.short, to: 'cR' },
      { label: NAMES.crew.quartermaster.short, to: 'cB' },
    ],
  },
  amara: {
    text: 'Amara. What about it?',
    choices: [
      { label: 'The stalkers and the cores', to: 'zA1' },
      { label: 'What did I bring back?', to: 'zA2' },
      { label: "Boateng's team", to: 'zA3' },
    ],
  },
  korr: {
    text: 'Korr. Go on.',
    choices: [
      { label: 'The isotopes', to: 'zK1' },
      { label: 'About the lookout', to: 'zK2r', cond: { choice: ['lookout', 'reassure'] } },
      { label: 'About the lookout', to: 'zK2t', cond: { choice: ['lookout', 'threaten'] } },
      { label: 'How is Kwan?', to: 'zK3' },
    ],
  },
  lines: [
    { id: 'tSelf', speaker: sp, text: 'Nine years running a station lab. Every sample came to me pre-labelled. I wanted the ones nobody had named yet.', next: 'tSelf2' },
    { id: 'tSelf2', speaker: sp, text: 'The Corps gave me a ship and a bodyguard. Brandt insists he is not my bodyguard. He is.', next: 'you' },
    { id: 'tRes', speaker: sp, text: 'Alloy, biomass, isotopes. Bring samples and Brandt and I can make your kit slightly less likely to fail.', next: 'hub' },
    { id: 'tSystem', speaker: sp, text: "Two living worlds around one star. That isn't luck. That's a system worth fighting over, and somebody will.", next: 'tSystem2' },
    { id: 'tSystem2', speaker: sp, text: 'Amara has air, water and ground that holds still. Korr has two of those and a rebreather. Assume the wildlife has opinions.', next: 'hub' },
    { id: 'yL1', speaker: sp, text: "Everything on the station had a label. I spent nine years reading other people's labels. I wanted to write some.", next: 'yL2' },
    { id: 'yL2', speaker: sp, text: 'Also my lab partner microwaved fish. Every day. For nine years. The Corps was the cleaner option.', next: 'you' },
    { id: 'ySm', speaker: sp, text: "Quarantine, sequencing, then a long argument with Command about who owns them. I'm looking forward to the argument.", next: 'you' },
    { id: 'cO', speaker: sp, text: 'She reads my reports all the way through, footnotes included. Nobody does that. I find it moving and slightly alarming.', next: 'crew' },
    { id: 'cR', speaker: sp, text: 'Reyes talks to the ship. The ship does not answer. I checked the logs, in case.', next: 'crew' },
    { id: 'cB', speaker: sp, text: "Brandt says he isn't interested in my work. He asked three questions about stalker jaws. Good questions.", next: 'crew' },
    // Personal thread: naming the Amara biomass.
    { id: 'arcA', speaker: sp, text: "Awake. I've been cataloguing since you landed. The biomass turns toward the shuttle lights. It might be listening.", branches: [{ to: 'arcA2', cond: { flag: 'zhao_named' } }], next: 'name1' },
    { id: 'arcA2', speaker: sp, text: "It's growing toward the heat vents now. Nobody tell Brandt the vents run under his armoury.", next: 'you' },
    {
      id: 'name1', speaker: sp, text: 'It needs a name before Command gives it a number. Suggestions?',
      choices: [
        { label: 'Name it after Boateng', to: 'nB', effects: [named, { choice: ['zhaoName', 'boateng'] }] },
        { label: 'Name it after the ship', to: 'nS', effects: [named, { choice: ['zhaoName', 'ship'] }] },
        { label: "That's your call", to: 'nZ', effects: [named, { choice: ['zhaoName', 'zhao'] }] },
      ],
    },
    { id: 'nB', speaker: sp, text: "Boateng's moss. She held a door shut for three weeks. She can have a moss.", next: 'you' },
    { id: 'nS', speaker: sp, text: 'Sojourner moss. Sentimental. Reyes will be unbearable about it. Fine.', next: 'you' },
    { id: 'nZ', speaker: sp, text: "Then it's Zhao's lichen. Technically it isn't a lichen. I've wanted to say that since I was nine.", next: 'you' },
    { id: 'arcK', speaker: sp, text: 'Fine. Korr is mostly rock and greed. The rock is interesting.', branches: [{ to: 'arcKr', cond: { choice: ['lookout', 'reassure'] } }], next: 'arcKt' },
    { id: 'arcKr', speaker: sp, text: 'Your lookout keeps asking me what each needle is for. I keep telling him. He keeps asking.', next: 'you' },
    { id: 'arcKt', speaker: sp, text: "I keep thinking about the lookout. Fear makes people choose badly. I'd rather study that less personally.", next: 'you' },
    {
      id: 'arcB', speaker: sp, text: 'Tired. Good tired. Two worlds in one system, and we only saw the parts trying to kill us.',
      branches: [
        { to: 'name1', cond: { notFlag: 'zhao_named' } },
        { to: 'nfB', cond: { choice: ['zhaoName', 'boateng'] } },
        { to: 'nfS', cond: { choice: ['zhaoName', 'ship'] } },
      ],
      next: 'nfZ',
    },
    { id: 'nfB', speaker: sp, text: "I filed the moss under Boateng's name. She sent back one word. 'Finally.'", next: 'you' },
    { id: 'nfS', speaker: sp, text: 'Sojourner moss is officially filed. Reyes has told everyone. Twice. He told the moss.', next: 'you' },
    { id: 'nfZ', speaker: sp, text: "Zhao's lichen is officially filed. My mother has already told the whole station. I'll never hear the end of it.", next: 'you' },
    { id: 'zA1', speaker: sp, text: 'They stole the cores for the hum. An animal that collects machines. I want a year down there.', next: 'subA' },
    { id: 'zA2', speaker: sp, text: 'Biomass that photosynthesises on two spectra. Brandt wants armour padding out of it. I want to name it first.', next: 'subA' },
    { id: 'zA3', speaker: sp, text: "Their soil cores are a decade of work done in eleven months. I asked for copies. Politely. Brandt says that's new.", next: 'subA' },
    { id: 'zK1', speaker: sp, text: "Those isotopes were already refined. The claim jumpers weren't prospecting. They were shipping.", next: 'subK' },
    { id: 'zK2r', speaker: sp, text: "Your lookout is in the medbay. Two bullet wounds, frostbite and a lot of opinions. He'll live.", next: 'subK' },
    { id: 'zK2t', speaker: sp, text: "I read the yard logs. The alarm came from the lookout post. I'm not judging. I'm noting it.", next: 'subK' },
    { id: 'zK3', speaker: sp, text: "Underfed, dehydrated and demanding his field notes. I gave him the notes. Food is still a negotiation.", next: 'subK' },
  ],
});
