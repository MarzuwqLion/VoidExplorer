/** Okonkwo and others on the radio during the planet missions. [speaker, line] */
export const AMARA_RADIO = {
  landing: ['xo', 'Station is seventy meters north-east. The beacon tower should be lit. It isn\'t.'],
  grove: ['xo', "Contacts in the Grove. Six legs, fast. Don't let them circle you. Roll out of a lunge."],
  ravine: ['xo', 'Spitters on the east ledge. Get under something before the sac lights up.'],
  ravineTunnel: ['xo', 'High ground over the spitters. Park earns his pay.'],
  ridge: ['xo', 'Long sight lines up there. Use the rocks and take the spitters first.'],
  den: ['xo', 'That is not on the species list. Use the pillars.'],
  alphaDown: ['xo', "Big one's down. Grab the core and get out of that bowl."],
  cores: ['xo', 'All three cores. Get them to the tower.'],
  beacon: ['boateng', "Beacon's up. First clean signal in three weeks. Tell the Corps we're still here, and tell them to send coffee."],
  beaconTunnel: ['boateng', 'And tell Park his tunnel held. He will be unbearable about it.'],
  extract: ['xo', 'Shuttle is waiting at the landing zone. Good work down there.'],
  groveClear: ['xo', 'Grove is quiet. Core one is in the nest. Crate by the east path if you need it.'],
  ravineClear: ['xo', 'Ravine clear. Core two at the north end, then the ramp up to the Ridge.'],
  ridgeClear: ['xo', 'Ridge is yours. The path down leads into that bowl. Check your ammunition.'],
} as const;

export const KORR_RADIO = {
  landing: ['xo', "Team Cobalt's transponder is inside the old mine. So are a lot of heat signatures that aren't ours."],
  canyon: ['xo', 'Three on patrol in the canyon. Use the rovers for cover.'],
  lookout: ['xo', 'One of theirs is wounded at the post. How you ask him is your call.'],
  yardQuiet: ['xo', 'The yard is quiet. Keep it that way as long as you can. Side door is your friend.'],
  yardAlarm: ['xo', 'Alarm is up. They know you are coming, and more are on the way.'],
  hall: ['xo', 'Close quarters in the hall. Keep the Wasp handy.'],
  kwan: ['xo', 'That is Kwan. One survivor. Get him talking, then finish this.'],
  dock: ['xo', "Big heat signature on the dock. That's not a forklift."],
  foremanDown: ['xo', 'Dock is clear. Shuttle inbound. Bring Kwan home.'],
  canyonClear: ['xo', 'Patrol down. The post up ahead has a radio mast and one heat signature. Weak.'],
  yardClear: ['xo', 'Yard is clear. The hall entrance is on the east side.'],
  hallClear: ['xo', 'Hall is clear. That locked office in the north-east corner is broadcasting a Corps transponder.'],
} as const;
