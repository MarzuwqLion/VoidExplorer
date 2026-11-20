import type * as THREE from 'three';
import type { Prim } from '../world/level';
import type { TerrainDef } from '../world/terrain';
import type { SkyDef } from '../world/sky';
import type { MissionPlanet } from '../data/names';
import type { AmbientId } from '../core/synth';
import type { SoundId } from '../data/sounds';
import type { XZ } from '../data/layouts';

export interface PlanetLevel {
  id: MissionPlanet;
  terrain: TerrainDef;
  navGround?: (x: number, z: number) => number | null;
  prims: Prim[];
  spawn: { x: number; z: number; yaw: number };
  shuttle: { x: number; z: number; yaw: number };
  sky: SkyDef;
  fog: { color: number; near: number; far: number };
  light: { hemiSky: number; hemiGround: number; hemi: number; sun: number; sunColor: number };
  skyPlanets?: { color: number; ring: number | null; dir: THREE.Vector3; size: number }[];
  ambient: AmbientId;
  footstep: SoundId;
  /** True when a point is inside the mission area. */
  inside: (x: number, z: number) => boolean;
  /** Snow or dust particles. */
  weather?: 'snow' | 'pollen';
  /** Fixed work lights (interiors). */
  lamps?: { x: number; y: number; z: number; color: number; intensity: number; range: number }[];
}

export interface Objective {
  text: string;
  target: XZ | null;
}

/** A planet mission script. The planet scene hosts it. */
export interface Mission {
  readonly title: string;
  complete: boolean;
  objective(): Objective;
  log(): { text: string; done: boolean }[];
  update(dt: number): void;
  beats(): string[];
  jumpTo(beat: string): void;
  /** Force the current beat to finish (debug). */
  completeBeat(): void;
  beatId(): string;
}
