import type { Game } from '../core/game';
import { MenuScreen, h, type Screen } from './screens';
import type { Input } from '../core/input';
import { INPUT } from '../data/tuning';
import { CONTROLS_TABLE } from '../data/controls';

/** Controls screen: both layouts side by side. */
export class ControlsScreen implements Screen {
  el: HTMLElement;
  constructor(
    parent: HTMLElement,
    private onBack: () => void,
  ) {
    this.el = h('div', 'screen dim', undefined, parent);
    h('h2', '', 'Controls', this.el);
    const g = h('div', 'controls-grid interactive', undefined, this.el);
    h('div', 'h', 'Action', g);
    h('div', 'h', 'Keyboard and mouse', g);
    h('div', 'h', 'Gamepad', g);
    for (const [a, k, p] of CONTROLS_TABLE) {
      h('div', 'a', a, g);
      h('div', 'k', k, g);
      h('div', 'k', p, g);
    }
    const b = h('div', 'menu interactive', undefined, this.el);
    const back = h('button', 'item sel', 'Back', b);
    back.style.marginTop = '1rem';
    back.addEventListener('click', () => this.onBack());
  }
  update(input: Input): void {
    if (input.pressed('back') || input.pressed('confirm')) {
      input.consume('back');
      input.consume('confirm');
      this.onBack();
    }
  }
  destroy(): void {
    this.el.remove();
  }
}

export function openControls(game: Game): void {
  game.ui.push(new ControlsScreen(game.ui.modal, () => game.ui.pop()));
}

export function openSettings(game: Game): void {
  const s = game.settings;
  const apply = () => game.applySettings();
  const pct = (v: number) => Math.round(v * 100) + '%';
  game.ui.push(
    new MenuScreen(
      game.ui.modal,
      'Settings',
      [
        { label: 'Mouse sensitivity', slider: { get: () => s.mouseSens, set: (v) => ((s.mouseSens = v), apply()), min: INPUT.sensMin, max: INPUT.sensMax, step: 0.05 } },
        { label: 'Gamepad sensitivity', slider: { get: () => s.padSens, set: (v) => ((s.padSens = v), apply()), min: INPUT.sensMin, max: INPUT.sensMax, step: 0.05 } },
        { label: 'Invert Y', toggle: { get: () => s.invertY, set: (v) => ((s.invertY = v), apply()) } },
        { label: 'Master volume', slider: { get: () => s.master, set: (v) => ((s.master = v), apply()), min: 0, max: 1, step: 0.05, fmt: pct } },
        { label: 'Effects volume', slider: { get: () => s.effects, set: (v) => ((s.effects = v), apply()), min: 0, max: 1, step: 0.05, fmt: pct } },
        { label: 'Ambient volume', slider: { get: () => s.ambient, set: (v) => ((s.ambient = v), apply()), min: 0, max: 1, step: 0.05, fmt: pct } },
        { label: 'Music volume', slider: { get: () => s.music, set: (v) => ((s.music = v), apply()), min: 0, max: 1, step: 0.05, fmt: pct } },
        { label: 'Screen shake', toggle: { get: () => s.shake, set: (v) => ((s.shake = v), apply()) } },
        { label: 'Bloom', toggle: { get: () => s.bloom, set: (v) => ((s.bloom = v), apply()) } },
        { label: 'Back', action: () => game.ui.pop() },
      ],
      () => game.ui.pop(),
    ),
  );
}

export function openPause(game: Game, lockLost = false): void {
  if (game.ui.top()) return;
  game.audio.play('ui_open');
  const screen = new MenuScreen(
      game.ui.modal,
      'Paused',
      [
        { label: 'Resume', action: () => game.resume() },
        { label: 'Controls', action: () => openControls(game) },
        { label: 'Settings', action: () => openSettings(game) },
        { label: 'Quit to title', action: () => (game.ui.popAll(), void game.goto('title')) },
      ],
      () => game.resume(),
      { sub: lockLost ? 'Click to resume' : undefined },
    );
  screen.el.dataset.screen = 'pause';
  screen.el.addEventListener('click', (e) => {
    if (e.target === screen.el) game.resume();
  });
  game.ui.push(screen);
}
