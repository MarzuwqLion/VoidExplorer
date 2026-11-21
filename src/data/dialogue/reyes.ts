import { crewHub, holdingUp } from './crewHub';
import { NAMES } from '../names';

const sp = 'helm';

/** Flight Lt. Reyes, helm: cocky, superstitious about the ship. */
export const REYES = crewHub({
  id: 'reyes',
  speaker: sp,
  greet: {
    none: "Commander. She's holding orbit like she means it.",
    amara: "Commander. Shuttle's back, hull's clean, and I am being extremely humble about it.",
    korr: "Commander. Korr left frost in the intakes. She's sulking, but she's flying.",
    both: "Commander. Two drops, zero scratches. I'm not saying it out loud. I just did, didn't I.",
  },
  again: 'Anything else, Commander?',
  early: [
    { label: 'About you', to: 'tSelf' },
    { label: 'About the ship', to: 'tShip' },
    { label: 'About the system', to: 'tSystem' },
  ],
  personal: holdingUp('How are you holding up?', 'arcA', 'arcK', 'arcB'),
  you: {
    text: 'What else do you want to know?',
    follow: [
      { label: 'Superstitious about the ship?', to: 'yS1', cond: { maxMissions: 0 } },
      { label: 'Is there a lucky charm too?', to: 'yC1', cond: { missions: 1 } },
    ],
  },
  crew: {
    text: 'The crew? Sure. Who?',
    choices: [
      { label: NAMES.crew.xo.short, to: 'cO' },
      { label: NAMES.crew.science.short, to: 'cZ' },
      { label: NAMES.crew.quartermaster.short, to: 'cB' },
    ],
  },
  amara: {
    text: 'Amara. What about it?',
    choices: [
      { label: 'What did you hear about the Den?', to: 'rA1' },
      { label: 'How was the drop?', to: 'rA2' },
      { label: 'Could you see the station?', to: 'rA3' },
    ],
  },
  korr: {
    text: 'Korr. Go on.',
    choices: [
      { label: 'Your read on Korr?', to: 'rK1' },
      { label: 'The ships leaving orbit', to: 'rK2' },
      { label: 'Flying Kwan out', to: 'rK3' },
    ],
  },
  lines: [
    { id: 'tSelf', speaker: sp, text: "Six years flying survey and never scratched a hull. I don't say that near the ship, so forget you heard it.", next: 'tSelf2' },
    { id: 'tSelf2', speaker: sp, text: 'Before the Corps I flew ore haulers. Same ships, less shooting, much worse coffee.', next: 'you' },
    { id: 'tShip', speaker: sp, text: 'She likes a gentle hand and hates being called old. Point her and she goes. Hold boost for the long hauls.', next: 'tShip2' },
    { id: 'tShip2', speaker: sp, text: "Fly close to anything and the scanners log it. Amara and Korr are flagged green. Call the landing and I'll drop you.", next: 'hub' },
    { id: 'tSystem', speaker: sp, text: "Goliath's rings are the prettiest thing out here. Also the fastest way to lose a paint job.", next: 'tSystem2' },
    { id: 'tSystem2', speaker: sp, text: "Pale is the exact colour of hull primer. I find that calming. Nobody else on this ship does.", next: 'hub' },
    { id: 'yS1', speaker: sp, text: "Not superstitious. Respectful. Three taps on the console before every burn. She's never let me down, so I've never stopped.", next: 'yS2' },
    { id: 'yS2', speaker: sp, text: 'Okonkwo timed it once. Point eight seconds. She added it to the burn checklist. I think that was a joke.', next: 'you' },
    { id: 'yC1', speaker: sp, text: "Ignition key from my first hauler. The ship got scrapped. The key didn't. It lives in my left boot.", next: 'yC2' },
    { id: 'yC2', speaker: sp, text: 'Yes, I fly with a key in my boot. No, I will not be taking questions.', next: 'you' },
    { id: 'cO', speaker: sp, text: 'She corrected my approach by two centimetres once. Over comms. From the bridge. She was right, which was worse.', next: 'crew' },
    { id: 'cZ', speaker: sp, text: 'Zhao swabbed my console for microbes. I said no. The results came back anyway. Apparently I should wash my hands.', next: 'crew' },
    { id: 'cB', speaker: sp, text: "Brandt calls me 'the kid'. I'm thirty-one. He calls the ship 'the kid' too, so I'm in good company.", next: 'crew' },
    { id: 'arcA', speaker: sp, text: "Fine. The drop shook more than I liked. I tapped four times on the way down. Don't tell Okonkwo I improvised.", next: 'you' },
    { id: 'arcK', speaker: sp, text: "Fine. Korr's crosswinds are rude. I put you down a hundred metres long and I'm still annoyed about it.", next: 'you' },
    { id: 'arcB', speaker: sp, text: "Better than I expected. Everybody I flew down, I flew back up. That's the only number I keep.", branches: [{ to: 'arcBr', cond: { choice: ['lookout', 'reassure'] } }], next: 'arcBt' },
    { id: 'arcBr', speaker: sp, text: "Plus Kwan. Plus one very grumpy raider. I'm counting them too. She doesn't mind passengers.", next: 'you' },
    { id: 'arcBt', speaker: sp, text: "Plus Kwan. One more than we landed with. I'm counting that as a win, and I'm not taking questions on that either.", next: 'you' },
    { id: 'rA1', speaker: sp, text: "I heard it was the size of a truck. I'll stay up here with the vacuum, thanks.", next: 'subA' },
    { id: 'rA2', speaker: sp, text: "Shuttle came back with teal grass in the skids. I'm not cleaning it out. It might be alive.", next: 'subA' },
    { id: 'rA3', speaker: sp, text: 'Saw the beacon come back on from orbit. One little green blink. I may have cheered. The ship may have cheered.', next: 'subA' },
    { id: 'rK1', speaker: sp, text: 'Cold, ugly, and full of people who shoot first. Amara tried to eat you and I still liked it better.', next: 'subK' },
    { id: 'rK2', speaker: sp, text: 'I logged two burns out of Korr orbit before we arrived. Whoever they were, they had somewhere to be.', next: 'subK' },
    { id: 'rK3', speaker: sp, text: 'Kwan slept the whole way up. Six weeks in a cell and he snored through my best landing. Rude.', next: 'subK' },
  ],
});
