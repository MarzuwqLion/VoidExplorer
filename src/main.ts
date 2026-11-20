import { Game } from './core/game';
import { TitleScene } from './scenes/title';
import { installDebugApi } from './debug/api';
import { DebugPanel } from './debug/panel';
import { registerScenes } from './scenes/registry';
import { NAMES } from './data/names';

document.title = NAMES.game;
const boot = document.getElementById('boot');
const bootName = boot?.querySelector('.name');
if (bootName) bootName.textContent = NAMES.game;

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
void game.start().then(() => {
  if (!boot) return;
  if (!game.webgl) {
    // Keep the boot card up with a plain explanation instead of an empty screen.
    boot.innerHTML = '';
    const msg = document.createElement('div');
    msg.className = 'msg';
    msg.textContent = NAMES.game + ' needs WebGL, which this browser has turned off or does not support. Enable hardware acceleration or try a current desktop browser.';
    boot.appendChild(msg);
    return;
  }
  boot.classList.add('done');
  setTimeout(() => boot.remove(), 700);
});
