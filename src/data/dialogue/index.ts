import type { DGraph } from './types';
import { CREW_GRAPHS } from './crew';
import { PLANET_GRAPHS } from './planets';

/** Every dialogue graph in the game, for tests and the line count. */
export const ALL_GRAPHS: DGraph[] = [...Object.values(CREW_GRAPHS), ...Object.values(PLANET_GRAPHS)];
