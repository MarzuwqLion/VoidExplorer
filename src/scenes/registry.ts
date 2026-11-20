import type { Game } from '../core/game';
import { BridgeScene } from './bridge';
import { SystemMapScene } from './systemMap';
import { PlanetScene } from './planet';
import { EndScene } from './end';

/** Registers every gameplay scene. */
export function registerScenes(game: Game): void {
  game.register('bridge', (g) => new BridgeScene(g));
  game.register('systemMap', (g) => new SystemMapScene(g));
  game.register('planet', (g) => new PlanetScene(g));
  game.register('end', (g) => new EndScene(g));
}
