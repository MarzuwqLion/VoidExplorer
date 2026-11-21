import type { DGraph } from './types';
import type { CrewId } from '../names';
import { OKONKWO } from './okonkwo';
import { REYES } from './reyes';
import { ZHAO } from './zhao';
import { BRANDT } from './brandt';

export const CREW_GRAPHS: Record<CrewId, DGraph> = { xo: OKONKWO, helm: REYES, science: ZHAO, quartermaster: BRANDT };
