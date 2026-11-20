import { Game } from './core/game';
import { TitleScene } from './scenes/title';
import { installDebugApi } from './debug/api';
import { DebugPanel } from './debug/panel';
import { registerScenes } from './scenes/registry';

const canvas = document.getElementById('view') as HTMLCanvasElement;
const ui = document.getElementById('ui') as HTMLElement;
const game = new Game(canvas, ui);
game.register('title', (g) => new TitleScene(g));
registerScenes(game);

const params = new URLSearchParams(location.search);
const debugOn = import.meta.env.DEV || params.get('debug') === '1';
if (debugOn) {
  installDebugApi(game);
  const panel = new DebugPanel(game);
  if (params.get('debug') === '1') panel.toggle(true);
}
void game.start();
