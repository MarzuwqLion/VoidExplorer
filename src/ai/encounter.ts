import type { EnemyType } from '../data/names';
import type { XZ } from '../data/layouts';

export interface SpawnDef {
  type: EnemyType;
  x: number;
  z: number;
  yaw?: number;
  /** Idle patrol offset (unaware enemies walk between spawn and spawn + patrol). */
  patrol?: XZ;
}
export interface EncounterDef {
  id: string;
  /** Player entering this circle starts the encounter. */
  trigger: { x: number; z: number; r: number };
  /** Extra trigger circles (e.g. a shortcut entrance). */
  alt?: { x: number; z: number; r: number }[];
  waves: SpawnDef[][];
  /** Next wave spawns when this many or fewer of the current wave remain. */
  nextWaveAt?: number;
  checkpoint: { x: number; z: number; yaw: number };
  crate: XZ;
  startAlerted?: boolean;
  /** High-ground positions for marksmen. */
  perches?: XZ[];
  /** Started by the mission instead of a trigger. */
  manual?: boolean;
}
export type EncounterStatus = 'idle' | 'active' | 'cleared';
