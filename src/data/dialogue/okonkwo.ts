import { nodes, END, type DGraph } from './types';

/** Lt. Cmdr. Okonkwo: briefing, hub topics, after-action talks and the final debrief. */
export const OKONKWO: DGraph = {
  id: 'okonkwo',
  entry: [
    { node: 'debrief1', cond: { missions: 2, notFlag: 'debriefed' } },
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
    { id: 'tSelf', speaker: 'xo', text: "I keep the list of what can go wrong. It's a long list. You're usually near the top.", next: 'hub' },
    { id: 'tCorps', speaker: 'xo', text: "We're not soldiers and we're not scientists. We're what you send before you know which one you need.", next: 'hub' },
    { id: 'tSystem', speaker: 'xo', text: 'Oriel is old and quiet. In my experience the quiet ones are where people stop answering.', next: 'hub' },
    { id: 'debrief1', speaker: 'xo', text: 'Landfall Station is transmitting. Team Cobalt has one survivor and a full report.', effects: [{ setFlag: 'debriefed' }, { event: 'debriefDone' }], end: true },
  ]),
};
