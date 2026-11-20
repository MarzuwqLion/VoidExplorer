/** Every proper name in the game, defined once. Rename anything here. */
export const NAMES = {
  game: 'Sojourner',
  ship: 'ASV Sojourner',
  shipShort: 'Sojourner',
  corps: 'Armed Survey Corps',
  corpsShort: 'the Corps',
  commander: 'Commander Kade',
  commanderShort: 'Kade',
  system: 'Oriel',
  star: 'Oriel',
  belt: 'The Shoal',
  crew: {
    xo: { full: 'Lt. Cmdr. Dara Okonkwo', short: 'Okonkwo', role: 'Executive Officer' },
    helm: { full: 'Flight Lt. Mateo Reyes', short: 'Reyes', role: 'Helm' },
    science: { full: 'Dr. Lin Zhao', short: 'Zhao', role: 'Science Officer' },
    quartermaster: { full: 'Chief Tomas Brandt', short: 'Brandt', role: 'Quartermaster' },
  },
  npcs: {
    boateng: { full: 'Chief Surveyor Nia Boateng', short: 'Boateng' },
    varga: { full: 'Botanist Emil Varga', short: 'Varga' },
    park: { full: 'Mechanic Jun Park', short: 'Park' },
    lookout: { full: 'Raider Lookout', short: 'Lookout' },
    kwan: { full: 'Surveyor Idris Kwan', short: 'Kwan' },
  },
  teams: { amara: 'Landfall Station', korr: 'Team Cobalt' },
  places: {
    landfall: 'Landfall Station',
    grove: 'The Grove',
    ravine: 'The Ravine',
    ridge: 'The Ridge',
    den: 'The Den',
    canyon: 'Canyon Approach',
    lookout: 'Lookout Post',
    yard: 'Mining Yard',
    hall: 'Processing Hall',
    dock: 'Loading Dock',
  },
  missions: { amara: 'Landfall', korr: 'Cold Seam' },
  weapons: { pistol: 'Keeper', smg: 'Wasp', rifle: 'Longwatch' },
  weaponKinds: { pistol: 'pistol', smg: 'SMG', rifle: 'battle rifle' },
  enemies: {
    stalker: 'Stalker',
    spitter: 'Spitter',
    alpha: 'Alpha',
    rifleman: 'Rifleman',
    rusher: 'Rusher',
    marksman: 'Marksman',
    foreman: 'Foreman',
  },
  planets: {
    cinder: 'Cinder',
    anvil: 'Anvil',
    shroud: 'Shroud',
    amara: 'Amara',
    korr: 'Korr',
    ochre: 'Ochre',
    goliath: 'Goliath',
    pale: 'Pale',
    tempest: 'Tempest',
    azure: 'Azure',
    vesper: 'Vesper',
    flint: 'Flint',
    hollow: 'Hollow',
    drift: 'Drift',
    terminus: 'Terminus',
  },
  resources: { alloy: 'Alloy', biomass: 'Biomass', isotopes: 'Isotopes' },
  upgrades: { shield: 'Shield capacitor', mags: 'Extended magazines', medic: 'Field medic kit' },
} as const;

export type CrewId = keyof typeof NAMES.crew;
export type NpcId = keyof typeof NAMES.npcs;
export type PlanetId = keyof typeof NAMES.planets;
export type WeaponId = keyof typeof NAMES.weapons;
export type EnemyType = keyof typeof NAMES.enemies;
export type ResourceId = keyof typeof NAMES.resources;
export type UpgradeId = keyof typeof NAMES.upgrades;
export type MissionPlanet = 'amara' | 'korr';

/** Display name for any speaker id used in dialogue. */
export function speakerName(id: string): string {
  if (id === 'player') return NAMES.commanderShort;
  if (id in NAMES.crew) return NAMES.crew[id as CrewId].short;
  if (id in NAMES.npcs) return NAMES.npcs[id as NpcId].short;
  return id;
}
