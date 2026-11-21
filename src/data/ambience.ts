/** Per-planet atmosphere and set dressing. Positions are world metres on the layout tables; heights are floor levels. */

export interface MistSheet { x: number; z: number; y: number; w: number; d: number; alpha: number }
export interface Shaft { x: number; y: number; z: number; length: number; r0: number; r1: number }
export interface Vent { x: number; z: number; rate: number }
export interface MotesDef { count: number; box: number; height: number; colors: number[]; size: [number, number]; alpha: number; rise: number; sway: number; additive: boolean }

export interface AmbienceDef {
  motes?: MotesDef;
  mist: MistSheet[];
  mistColor: number;
  mistSpeed: number;
  /** Sun shafts follow the sky's sun direction; lamp shafts point straight down from each work light. */
  shafts: Shaft[];
  shaftColor: number;
  shaftAlpha: number;
  lampShafts: boolean;
  vents: Vent[];
  steamColor: number;
  flock?: { count: number; x: number; z: number; radius: number; height: number; speed: number; color: number };
  /** Snow gusts: period (s), peak wind multiplier, spindrift puffs per second at peak. */
  gust?: { period: number; peak: number; drift: number };
  /** Work-light flicker: depth of the constant shimmer, and the index of one faulty light that stutters. */
  flicker?: { shimmer: number; faulty: number; stutter: number };
}

export const AMBIENCE: Record<'amara' | 'korr', AmbienceDef> = {
  amara: {
    motes: { count: 320, box: 46, height: 9, colors: [0xffd890, 0xa8f0d8, 0xffc070], size: [0.05, 0.13], alpha: 0.8, rise: 0.12, sway: 0.45, additive: true },
    mist: [
      { x: 70, z: 0, y: -5.3, w: 15, d: 62, alpha: 0.36 },
      { x: 70, z: 0, y: -4.4, w: 13, d: 56, alpha: 0.2 },
      { x: -30, z: -60, y: -3.2, w: 40, d: 40, alpha: 0.45 },
      { x: -30, z: -60, y: -2.2, w: 34, d: 34, alpha: 0.25 },
      { x: 35, z: 50, y: 0.7, w: 44, d: 44, alpha: 0.22 },
    ],
    mistColor: 0xf2dcb8,
    mistSpeed: 0.6,
    shafts: [
      { x: 30, y: 0, z: 46, length: 18, r0: 0.5, r1: 1.6 },
      { x: 40, y: 0, z: 55, length: 18, r0: 0.4, r1: 1.3 },
      { x: 26, y: 0, z: 58, length: 16, r0: 0.4, r1: 1.2 },
      { x: 44, y: 0, z: 42, length: 17, r0: 0.5, r1: 1.5 },
      { x: 36, y: 0, z: 62, length: 15, r0: 0.3, r1: 1.0 },
    ],
    shaftColor: 0xffd49a,
    shaftAlpha: 0.16,
    lampShafts: false,
    vents: [],
    steamColor: 0xd8d0c4,
    flock: { count: 14, x: 10, z: 10, radius: 75, height: 48, speed: 0.06, color: 0x2a2018 },
  },
  korr: {
    mist: [
      { x: -55, z: 45, y: 0.5, w: 22, d: 70, alpha: 0.28 },
      { x: -40, z: 25, y: 1.2, w: 26, d: 30, alpha: 0.18 },
      { x: 20, z: -15, y: 0.4, w: 70, d: 55, alpha: 0.18 },
      { x: 75, z: -80, y: 0.4, w: 36, d: 46, alpha: 0.2 },
    ],
    mistColor: 0xc8d6ea,
    mistSpeed: 1.1,
    shafts: [],
    shaftColor: 0xffc890,
    shaftAlpha: 0.12,
    lampShafts: true,
    vents: [
      { x: 2, z: -30, rate: 6 },
      { x: 32, z: 4, rate: 5 },
      { x: 64, z: -37, rate: 5 },
      { x: 88, z: -21, rate: 4 },
      { x: 90, z: -62, rate: 6 },
      { x: 44, z: -24, rate: 4 },
    ],
    steamColor: 0xe8eef6,
    gust: { period: 11, peak: 3.2, drift: 26 },
    flicker: { shimmer: 0.06, faulty: 3, stutter: 0.8 },
  },
};

/** Ground scatter per planet: counts, sizes (m) and colours. Placement keeps to open, gentle ground. */
export const SCATTER = {
  amara: { grass: 5200, grassHeight: [0.25, 0.6] as [number, number], grassSlope: 0.3, pebbles: 520, pebbleColor: 0x6e7c74, debris: 0, sway: 0.12 },
  korr: { grass: 0, grassHeight: [0, 0] as [number, number], grassSlope: 0, pebbles: 620, pebbleColor: 0x4a403a, debris: 220, sway: 0 },
  /** Area the scatter is spread over (m from origin) and how far from the player it is drawn. */
  extent: 104,
  debrisColors: [0x6a4a34, 0x4a4e54, 0x8a5a2a, 0x2e3034],
};

/** Tree canopy sway amplitude in canopy units (canopies are scaled 2 to 4 m). */
export const TREE_SWAY = 0.035;

/** Snow drifts against walls and ice patches on open ground (Korr). */
export const SNOWDRESS = { driftHeight: 0.45, driftDepth: 1.1, minWall: 2.5, icePatches: 34, iceRadius: [1.2, 3.2] as [number, number], iceColor: 0xb8d4ea, driftColor: 0xe6eef8 };

/** Terrain shading: crease darkening from the height field's curvature and fine colour variation. */
export const TERRAIN_SHADE = { crease: 0.22, ridge: 0.08, variation: 0.1, variationScale: 0.35 };

/** Bridge dressing: dust motes in the light, console animation speed, hull running-light blink period (s). */
export const BRIDGE_FX = { motes: 160, moteColor: 0xcfe2ff, blink: 1.6, screenSpeed: 1 };
