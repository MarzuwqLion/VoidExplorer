import type { MissionPlanet } from '../data/names';
import type { Mission, PlanetLevel } from './types';
import type { PlanetScene } from '../scenes/planet';
import { amaraLevel } from '../world/planets/amara';
import { korrLevel } from '../world/planets/korr';
import { amaraMission } from './amara';
import { korrMission } from './korr';

/** Build the level and a mission factory for a planet. */
export function createPlanet(id: MissionPlanet): { level: PlanetLevel; mission: (s: PlanetScene) => Mission } {
  return id === 'amara' ? { level: amaraLevel(), mission: amaraMission } : { level: korrLevel(), mission: korrMission };
}
