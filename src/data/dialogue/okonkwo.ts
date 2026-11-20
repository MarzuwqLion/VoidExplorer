import { nodes, END, type DGraph } from './types';

/** Lt. Cmdr. Okonkwo: briefing, hub topics, after-action talks and the final debrief. */
export const OKONKWO: DGraph = {
  id: 'okonkwo',
  entry: [
    { node: 'debrief1', cond: { missions: 2, notFlag: 'debriefed' } },
    { node: 'aarA1', cond: { flag: 'amaraDone', notFlag: 'amara_aar' } },
    { node: 'aarK1', cond: { flag: 'korrDone', notFlag: 'korr_aar' } },
    { node: 'brief1', cond: { notFlag: 'briefed' } },
    { node: 'hub' },
  ],
  nodes: nodes([
    { id: 'brief1', speaker: 'xo', text: 'Commander. Fifteen planets, two worth a landing. Both had our people on them.', next: 'brief2' },
    { id: 'brief2', speaker: 'xo', text: 'Amara, fourth orbit. Landfall Station went dark three weeks ago. No distress call. The beacon just stopped.', next: 'brief3' },
    { id: 'brief3', speaker: 'xo', text: 'Korr, fifth orbit. Team Cobalt was surveying an old mine. Their last transmission was half a sentence.', next: 'briefHub' },
    {
      id: 'briefHub', speaker: 'xo', text: 'Questions before you take the helm?',
      choices: [
        { label: 'Which first?', to: 'bWhich' },
        { label: 'What are we walking into?', to: 'bWhat' },
        { label: "I'll take the helm.", to: 'bHelm' },
      ],
    },
    { id: 'bWhich', speaker: 'xo', text: "Amara. A dead beacon is usually weather or wildlife. Korr worries me more, so I'd like you warmed up.", next: 'briefHub' },
    { id: 'bWhat', speaker: 'xo', text: 'Unknown. Which is why you take all three weapons. Nobody in the Corps lands light.', next: 'briefHub' },
    { id: 'bHelm', speaker: 'xo', text: 'Star map is yours. Fly close to anything and the scanners log it. Command likes a complete survey.', effects: [{ setFlag: 'briefed' }], end: true },
    {
      id: 'hub', speaker: 'xo', text: 'Commander.',
      choices: [
        { label: 'About you', to: 'tSelf' },
        { label: 'About the Corps', to: 'tCorps' },
        { label: 'About the system', to: 'tSystem' },
        { label: 'Goodbye', to: END },
      ],
    },
    { id: 'tSelf', speaker: 'xo', text: "I keep the list of what can go wrong. It's a long list. You're usually near the top.", next: 'tSelf2' },
    { id: 'tSelf2', speaker: 'xo', text: 'Twelve years in the Corps. Three ships. This is the first crew I would follow into a bad idea.', next: 'hub' },
    { id: 'tCorps', speaker: 'xo', text: "We're not soldiers and we're not scientists. We're what you send before you know which one you need.", next: 'hub' },
    { id: 'tSystem', speaker: 'xo', text: 'Oriel is old and quiet. In my experience the quiet ones are where people stop answering.', next: 'tSystem2' },
    { id: 'tSystem2', speaker: 'xo', text: 'Command wants the survey finished regardless. So do I. Unfinished maps get people killed later.', next: 'hub' },
    // After-action talks.
    { id: 'aarA1', speaker: 'xo', text: 'Landfall Station is back on the net. Boateng sends her thanks and a request for coffee. I logged the coffee.', effects: [{ setFlag: 'amara_aar' }], next: 'aarA2' },
    { id: 'aarA2', speaker: 'xo', text: 'Something the size of a truck, and you walked out. Zhao wants every recording you have.', branches: [{ to: 'aarA3', cond: { notFlag: 'korrDone' } }], next: 'hub' },
    { id: 'aarA3', speaker: 'xo', text: 'Korr next. Those were animals. Korr will be people, and people plan.', next: 'hub' },
    { id: 'aarK1', speaker: 'xo', text: 'Kwan is in the medbay and talking. Four of Team Cobalt are not. I will write those letters myself.', effects: [{ setFlag: 'korr_aar' }], branches: [{ to: 'aarKr', cond: { choice: ['lookout', 'reassure'] } }, { to: 'aarKt', cond: { choice: ['lookout', 'threaten'] } }], next: 'hub' },
    { id: 'aarKr', speaker: 'xo', text: "The lookout is aboard, patched up and complaining about the food. You kept your promise.", next: 'hub' },
    { id: 'aarKt', speaker: 'xo', text: 'The alarm on Korr was his doing. How you asked was yours. Both go in the report.', next: 'hub' },
    // Final debrief, in order, with variants.
    { id: 'debrief1', speaker: 'xo', text: 'Landfall Station is transmitting. Team Cobalt has one survivor and a full report.', branches: [{ to: 'dAll', cond: { flag: 'surveyedAll' } }], next: 'dSome' },
    { id: 'dAll', speaker: 'xo', text: "Fifteen planets logged. Command won't know what to complain about.", branches: [{ to: 'dReassure', cond: { choice: ['lookout', 'reassure'] } }, { to: 'dThreaten', cond: { choice: ['lookout', 'threaten'] } }], next: 'd5' },
    { id: 'dSome', speaker: 'xo', text: 'Not every planet got logged. Command will ask about the rest.', branches: [{ to: 'dReassure', cond: { choice: ['lookout', 'reassure'] } }, { to: 'dThreaten', cond: { choice: ['lookout', 'threaten'] } }], next: 'd5' },
    { id: 'dReassure', speaker: 'xo', text: 'The lookout is in our medbay asking for a lawyer. You kept your word. That gets around.', next: 'd5' },
    { id: 'dThreaten', speaker: 'xo', text: "The lookout didn't make it out of the yard. The alarm was his choice. The fear was ours.", next: 'd5' },
    { id: 'd5', speaker: 'xo', text: "One world tried to eat our people. The other tried to sell them. I know which one I'd rather survey.", next: 'd6' },
    { id: 'd6', speaker: 'xo', text: 'Good work, Commander. The next system is a long burn. Get some sleep.', effects: [{ setFlag: 'debriefed' }, { event: 'debriefDone' }], end: true },
  ]),
};
