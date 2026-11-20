import { NAMES, type PlanetId, type MissionPlanet } from './names';

export interface PlanetDef {
  id: PlanetId;
  name: string;
  index: number;
  className: string;
  orbit: number;
  size: number;
  /** Orbit period in minutes. */
  period: number;
  /** Starting angle on the orbit (radians). */
  phase: number;
  look: string;
  colors: [number, number, number];
  landing: { viable: boolean; reason?: string; mission?: MissionPlanet; missionName?: string };
  radiusKm: string;
  gravity: string;
  day: string;
  atmosphere: string;
  temperature: string;
  note: string;
  rings?: { inner: number; outer: number; color: number; tilt: number };
  /** Orbit inclination in radians (Drift is visibly tilted). */
  inclination?: number;
  /** Axial tilt for the planet mesh. */
  tilt?: number;
  /** Visual detail: cracks, storm, basin, bands, clouds. */
  feature?: 'cracks' | 'craters' | 'clouds' | 'garden' | 'canyons' | 'dust' | 'bands' | 'ice' | 'storm' | 'glossy' | 'basin';
}

const P = NAMES.planets;
export const PLANETS: PlanetDef[] = [
  { id: 'cinder', name: P.cinder, index: 1, className: 'Molten world', orbit: 34, size: 1.6, period: 6, phase: 0.4, look: 'Black crust, glowing orange cracks', colors: [0x1a1412, 0xff6a1a, 0x3a2a22], feature: 'cracks',
    landing: { viable: false, reason: 'molten surface' }, radiusKm: '3,100 km', gravity: '0.41 g', day: 'Tidally locked', atmosphere: 'Trace sodium vapor', temperature: '1,150 C on the day side',
    note: 'One face always to the star. The day side is a magma sea and the night side is glass. Nothing down there would survive being recovered.' },
  { id: 'anvil', name: P.anvil, index: 2, className: 'Iron-rich barren', orbit: 52, size: 2.0, period: 8, phase: 2.1, look: 'Gunmetal gray, cratered', colors: [0x5d6268, 0x3c4045, 0x80868c], feature: 'craters',
    landing: { viable: false, reason: 'no atmosphere, extreme heat' }, radiusKm: '4,200 km', gravity: '0.78 g', day: '59 days', atmosphere: 'None', temperature: '430 C by day, -170 C by night',
    note: 'Mostly iron under a skin of dust. Good ore, terrible commute. Mining it would cost more in coolant than it pays.' },
  { id: 'shroud', name: P.shroud, index: 3, className: 'Toxic greenhouse', orbit: 72, size: 2.8, period: 11, phase: 4.0, look: 'Pale yellow cloud deck', colors: [0xe8d79a, 0xcbb46a, 0xf3e7bd], feature: 'clouds',
    landing: { viable: false, reason: 'crushing pressure, acid clouds' }, radiusKm: '6,000 km', gravity: '0.93 g', day: '116 days, retrograde', atmosphere: 'Carbon dioxide and sulfur dioxide at 88 bar', temperature: '455 C',
    note: 'Pretty from orbit. Underneath, the air is heavy enough to crush a hull and acidic enough to dissolve what is left. Probes last about forty minutes.' },
  { id: 'amara', name: P.amara, index: 4, className: 'Temperate garden', orbit: 96, size: 3.0, period: 14, phase: 5.6, look: 'Teal seas, green-gold land, white cloud', colors: [0x1f8f8a, 0x9fb64a, 0xffffff], feature: 'garden',
    landing: { viable: true, mission: 'amara', missionName: NAMES.missions.amara }, radiusKm: '6,500 km', gravity: '1.04 g', day: '26 hours', atmosphere: 'Nitrogen and oxygen, breathable', temperature: '17 C',
    note: 'Breathable air, liquid water, a biosphere that bites. Landfall Station was established here eleven months ago. Its beacon is dark.' },
  { id: 'korr', name: P.korr, index: 5, className: 'Cold arid', orbit: 122, size: 2.6, period: 17, phase: 1.0, look: 'Rust-red canyons, white polar frost', colors: [0x9a4a2a, 0x6a2e1c, 0xf0f4f8], feature: 'canyons',
    landing: { viable: true, mission: 'korr', missionName: NAMES.missions.korr }, radiusKm: '5,300 km', gravity: '0.82 g', day: '31 hours', atmosphere: 'Thin nitrogen and oxygen, breathable with a rebreather', temperature: '-22 C',
    note: 'Cold, dry and full of exposed seams. Team Cobalt was cataloguing an abandoned strip mine. Unregistered ships have been logged leaving orbit.' },
  { id: 'ochre', name: P.ochre, index: 6, className: 'Frozen desert', orbit: 148, size: 2.2, period: 20, phase: 3.3, look: 'Tan, with moving dust storms', colors: [0xc8a46e, 0xa07c4a, 0xe2c99a], feature: 'dust',
    landing: { viable: false, reason: 'planet-wide storm season' }, radiusKm: '4,600 km', gravity: '0.62 g', day: '22 hours', atmosphere: 'Thin carbon dioxide at 0.04 bar', temperature: '-68 C',
    note: 'The storms cover the whole planet this time of year. Visibility at ground level is about an arm. Check again in a decade.' },
  { id: 'goliath', name: P.goliath, index: 7, className: 'Ringed gas giant', orbit: 215, size: 9.0, period: 26, phase: 0.2, look: 'Cream and amber bands, broad rings', colors: [0xe9dcc0, 0xd49a4a, 0xf5ecd8], feature: 'bands',
    rings: { inner: 12, outer: 21, color: 0xd8c49a, tilt: 0.45 }, tilt: 0.2,
    landing: { viable: false, reason: 'no surface' }, radiusKm: '71,000 km', gravity: '2.4 g at the cloud tops', day: '10 hours', atmosphere: 'Hydrogen and helium', temperature: '-145 C at the cloud tops',
    note: 'Banded giant with rings wider than the planet itself. Its pull keeps the Shoal thin. Helm requests we not fly through the rings.' },
  { id: 'pale', name: P.pale, index: 8, className: 'Ice-shell ocean world', orbit: 245, size: 2.4, period: 29, phase: 2.6, look: 'Blue-white, cracked ice', colors: [0xdbe9f5, 0x8fb7d9, 0xffffff], feature: 'ice',
    landing: { viable: false, reason: 'unstable ice crust' }, radiusKm: '4,900 km', gravity: '0.55 g', day: '3.5 days', atmosphere: 'Trace oxygen', temperature: '-160 C',
    note: 'An ocean under twenty kilometers of ice. The shell flexes and splits every few hours. Zhao has asked twice whether we could drill, and twice the answer was no.' },
  { id: 'tempest', name: P.tempest, index: 9, className: 'Gas giant', orbit: 275, size: 7.5, period: 32, phase: 4.7, look: 'Slate blue with one huge white storm', colors: [0x5a7290, 0x3e5470, 0xf2f5f8], feature: 'storm', tilt: 0.1,
    landing: { viable: false, reason: 'no surface' }, radiusKm: '58,000 km', gravity: '1.1 g at the cloud tops', day: '11 hours', atmosphere: 'Hydrogen and helium', temperature: '-175 C',
    note: 'One storm, three times wider than Amara, older than our records. It does not appear to be weakening.' },
  { id: 'azure', name: P.azure, index: 10, className: 'Ice giant', orbit: 305, size: 5.5, period: 35, phase: 1.5, look: 'Deep methane blue', colors: [0x1f4fb0, 0x16398a, 0x4f7fd8], feature: 'bands',
    landing: { viable: false, reason: 'no surface' }, radiusKm: '25,500 km', gravity: '0.9 g', day: '17 hours', atmosphere: 'Hydrogen, helium and methane', temperature: '-200 C',
    note: 'Methane gives it the color. Winds near the equator run past two thousand kilometers an hour. Very photogenic, very unwelcoming.' },
  { id: 'vesper', name: P.vesper, index: 11, className: 'Tilted ice giant', orbit: 332, size: 5.0, period: 37, phase: 5.0, look: 'Pale teal, thin near-vertical rings', colors: [0x8fd6cc, 0x6cbab0, 0xc8efe9], feature: 'bands',
    rings: { inner: 7, outer: 9.5, color: 0xa8d8d0, tilt: 1.45 }, tilt: 1.45,
    landing: { viable: false, reason: 'no surface' }, radiusKm: '24,000 km', gravity: '1.1 g', day: '16 hours, tipped on its side', atmosphere: 'Hydrogen, helium and methane', temperature: '-210 C',
    note: 'Knocked onto its side long ago, rings and all. Each pole gets decades of daylight, then decades of dark.' },
  { id: 'flint', name: P.flint, index: 12, className: 'Carbon dwarf', orbit: 356, size: 1.4, period: 38, phase: 3.0, look: 'Near-black and glossy', colors: [0x16181c, 0x2c3038, 0x555a66], feature: 'glossy',
    landing: { viable: false, reason: 'airless, far too cold' }, radiusKm: '1,400 km', gravity: '0.09 g', day: '6 days', atmosphere: 'None', temperature: '-215 C',
    note: 'Graphite crust with a sheen like wet slate. Reflects almost nothing. Easy to miss, easier to hit.' },
  { id: 'hollow', name: P.hollow, index: 13, className: 'Cratered ice dwarf', orbit: 376, size: 1.3, period: 39, phase: 0.9, look: 'Gray-white with one giant impact basin', colors: [0xb8bcc2, 0x8a8f96, 0xdfe2e6], feature: 'basin',
    landing: { viable: false, reason: 'airless, far too cold' }, radiusKm: '1,200 km', gravity: '0.06 g', day: '9 hours', atmosphere: 'None', temperature: '-225 C',
    note: 'Something hit it hard enough to leave a basin a third of its width. It held together. Barely.' },
  { id: 'drift', name: P.drift, index: 14, className: 'Captured rogue dwarf', orbit: 394, size: 1.2, period: 40, phase: 4.3, look: 'Dark red, on a visibly tilted orbit', colors: [0x6a1e1a, 0x4a1412, 0x8c3a30], feature: 'craters', inclination: 0.28,
    landing: { viable: false, reason: 'unstable orbit, no air' }, radiusKm: '1,100 km', gravity: '0.05 g', day: '40 hours', atmosphere: 'None', temperature: '-232 C',
    note: 'Not from here. Its orbit is tilted and still settling. Give it a few million years before anyone builds on it.' },
  { id: 'terminus', name: P.terminus, index: 15, className: 'Frozen dwarf', orbit: 410, size: 1.1, period: 40, phase: 2.2, look: 'Dim blue-white nitrogen ice', colors: [0xc6d4ea, 0x9aaecb, 0xe8eef8], feature: 'ice',
    landing: { viable: false, reason: 'coldest body in the system' }, radiusKm: '1,000 km', gravity: '0.04 g', day: '6.4 days', atmosphere: 'Thin nitrogen haze', temperature: '-238 C',
    note: 'The last stop. Nitrogen frost over everything and a haze you can almost see through. The star is just a bright point from here.' },
];

export const PLANET_BY_ID: Record<string, PlanetDef> = Object.fromEntries(PLANETS.map((p) => [p.id, p]));

export const STAR = {
  id: 'oriel',
  name: NAMES.star,
  radius: 14,
  color: 0xffa040,
  className: 'Class K1 orange dwarf',
  stats: [
    ['Surface', '5,000 K'],
    ['Mass', '0.8 solar masses'],
    ['Age', '6.1 billion years'],
  ] as [string, string][],
  note: 'Stable and long-lived. A good star to raise a colony under.',
};
export const BELT = {
  id: 'shoal',
  name: NAMES.belt,
  inner: 170,
  outer: 185,
  rocks: 600,
  className: 'Asteroid belt',
  stats: [
    ['Orbit', '170 to 185 units'],
    ['Composition', 'Silicate and nickel-iron'],
    ['Density', 'Sparse'],
  ] as [string, string][],
  note: 'Thin, rocky and mostly harmless. Goliath keeps sweeping it clean. Reyes calls it the gravel road.',
};
