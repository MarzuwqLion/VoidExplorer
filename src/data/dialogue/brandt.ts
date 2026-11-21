import { crewHub, holdingUp } from './crewHub';
import { NAMES } from '../names';

const sp = 'quartermaster';

/** Chief Brandt, quartermaster: gruff, practical. Comments once on each upgrade bought. */
export const BRANDT = crewHub({
  id: 'brandt',
  speaker: sp,
  greet: {
    none: "Commander. Rack's loaded.",
    amara: "Commander. Kit's clean. Mostly. Some of it spent time inside a stalker.",
    korr: "Commander. Rack's loaded. Thawed out, too. Korr gets into the seals.",
    both: "Commander. Rack's loaded. Quieter in here than it should be. Means we did it right.",
  },
  again: 'What else.',
  openers: [
    { id: 'upShield', cond: { upgrade: 'shield', notFlag: 'brandt_up_shield' }, effects: [{ setFlag: 'brandt_up_shield' }], text: "Capacitor's in. You won't feel it on the first hit. You'll feel it on the fourth, when you're still standing." },
    { id: 'upMags', cond: { upgrade: 'mags', notFlag: 'brandt_up_mags' }, effects: [{ setFlag: 'brandt_up_mags' }], text: "Bigger mags fitted. Heavier weapons. You'll curse them for a day, then forget they were ever lighter." },
    { id: 'upMedic', cond: { upgrade: 'medic', notFlag: 'brandt_up_medic' }, effects: [{ setFlag: 'brandt_up_medic' }], text: "Third medkit's in your pack. Zhao checked the contents. Labelled everything. Twice." },
  ],
  early: [
    { label: 'About you', to: 'tSelf' },
    { label: 'Why does the Corps land armed?', to: 'tCorps' },
    { label: 'About the system', to: 'tSystem' },
  ],
  personal: holdingUp('How are you holding up?', 'arcA', 'arcK', 'arcB'),
  you: {
    text: 'Something else.',
    follow: [
      { label: 'And the other six years?', to: 'yY1', cond: { maxMissions: 0 } },
      { label: 'Why stay in the Corps?', to: 'yW1', cond: { missions: 1 } },
    ],
  },
  crew: {
    text: "Ask. I'll be honest. Usually am.",
    choices: [
      { label: NAMES.crew.xo.short, to: 'cO' },
      { label: NAMES.crew.helm.short, to: 'cR' },
      { label: NAMES.crew.science.short, to: 'cZ' },
    ],
  },
  amara: {
    text: 'Amara. What about it?',
    choices: [
      { label: 'Stalkers up close', to: 'bA1' },
      { label: 'Kit report', to: 'bA2' },
      { label: 'The Alpha', to: 'bA3' },
    ],
  },
  korr: {
    text: 'Korr. Go on.',
    choices: [
      { label: 'The Foreman', to: 'bK1' },
      { label: 'About the lookout', to: 'bK2r', cond: { choice: ['lookout', 'reassure'] } },
      { label: 'About the lookout', to: 'bK2t', cond: { choice: ['lookout', 'threaten'] } },
      { label: 'Raider weapons', to: 'bK3' },
    ],
  },
  lines: [
    { id: 'tSelf', speaker: sp, text: 'Twenty years in the Corps. Fourteen of them fixing what other people dropped. Beats being the one who dropped it.', next: 'you' },
    { id: 'tCorps', speaker: sp, text: 'The first survey team we ever lost went down holding clipboards. Since then everybody lands armed. Cooks included.', next: 'tCorps2' },
    { id: 'tCorps2', speaker: sp, text: 'Keeper never runs dry. Wasp is for anything close and fast. Longwatch is for anything far away or wearing plate.', next: 'hub' },
    { id: 'tSystem', speaker: sp, text: 'Two teams gone quiet in one system. I packed extra rounds. Call it a feeling.', next: 'tSystem2' },
    { id: 'tSystem2', speaker: sp, text: "Bring me materials from down there and I'll bolt on improvements at the terminal. No materials, no miracles.", next: 'hub' },
    { id: 'yY1', speaker: sp, text: "Landed. Six to a shuttle, back when teams were bigger. Then my knee decided I'd fix shuttles instead.", next: 'yY2' },
    { id: 'yY2', speaker: sp, text: 'Knee healed. I stayed anyway. Somebody has to show the young ones which way round the plate goes.', next: 'you' },
    { id: 'yW1', speaker: sp, text: "Somebody always lands first. I'd rather they land with kit I checked.", next: 'you' },
    { id: 'cO', speaker: sp, text: "Only XO I've had who checks my inventory and finds it right. I like her. Don't spread it around.", next: 'crew' },
    { id: 'cR', speaker: sp, text: "The kid flies well. Talks to the ship. Ship's the better listener.", next: 'crew' },
    { id: 'cZ', speaker: sp, text: "Doc keeps bringing alien bits into my armoury. I keep saying no. There's a drawer for them now.", next: 'crew' },
    { id: 'arcA', speaker: sp, text: "Fine. Washing stalker out of a rifle stock, mostly. The teeth get in everywhere.", next: 'you' },
    { id: 'arcK', speaker: sp, text: "Fine. Raider kit was patched with mining tape. People that desperate don't stop. Remember that.", next: 'you' },
    { id: 'arcB', speaker: sp, text: "Fine. Two teams in, a station and a survivor out. Twenty years taught me that's a good day.", next: 'arcB2' },
    { id: 'arcB2', speaker: sp, text: "Most days the Corps doesn't get to count. Today we count. Then we clean the rack.", next: 'you' },
    { id: 'bA1', speaker: sp, text: 'Rifle butt to a six-legged dog. Not in any manual I wrote. Good to know it works.', next: 'subA' },
    { id: 'bA2', speaker: sp, text: "Your armour came back with bite marks. I'm keeping that plate. Morale purposes.", next: 'subA' },
    { id: 'bA3', speaker: sp, text: "Something that big, you don't aim for the head. You aim for whatever's about to hit you. You did.", next: 'subA' },
    { id: 'bK1', speaker: sp, text: "A loader rig with a rotary cannon. Somebody down there had imagination. Glad it's scrap.", next: 'subK' },
    { id: 'bK2r', speaker: sp, text: "You promised a raider a ride and kept it. The manual doesn't cover that. I'd have done the same.", next: 'subK' },
    { id: 'bK2t', speaker: sp, text: "You leaned on him and he folded the wrong way. Happens. Doesn't mean you'll like remembering it.", next: 'subK' },
    { id: 'bK3', speaker: sp, text: "Their rifles were mining charges with a stock bolted on. Ugly. Worked. I've kept one for the wall.", next: 'subK' },
  ],
});
