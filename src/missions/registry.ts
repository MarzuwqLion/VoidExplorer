import type { MissionPlanet } from '../data/names';
import type { Mission, PlanetLevel } from './types';
import type { PlanetScene } from '../scenes/planet';
import { flatLevel } from '../world/planets/flat';
import { FieldMission } from './field';
import { NAMES } from '../data/names';

/** Build the level and a mission factory for a planet. */
export function createPlanet(id: MissionPlanet, _scene: PlanetScene): { level: PlanetLevel; mission: (s: PlanetScene) => Mission } {
  const level = flatLevel(id);
  const marker = id === 'amara' ? { x: -20, z: 45 } : { x: -30, z: 10 };
  const name = id === 'amara' ? NAMES.places.landfall : NAMES.places.lookout;
  return {
    level,
    mission: (s) => new FieldMission(NAMES.missions[id], marker, name, () => s.world.player.pos),
  };
}
