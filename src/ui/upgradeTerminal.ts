import type { Game } from '../core/game';
import { h, type Screen } from './screens';
import type { Input } from '../core/input';
import { UPGRADES, UPGRADE_ORDER } from '../data/upgrades';
import { NAMES, type ResourceId } from '../data/names';

const CSS = `
.term { background: var(--panel); border: 1px solid var(--panel-edge); padding: 1.4rem 2rem; min-width: 38rem; pointer-events: auto; }
.term .res { display: flex; gap: 1.6rem; margin: 0.4rem 0 1rem; color: var(--ink-dim); }
.term .res b { color: var(--ink); font-weight: 600; }
.term .row { display: grid; grid-template-columns: 1fr auto auto; gap: 1.2rem; align-items: center; padding: 0.55rem 0.7rem; border: 1px solid transparent; }
.term .row.sel { border-color: var(--panel-edge); background: rgba(242,165,65,0.1); }
.term .row .eff { color: var(--ink-dim); font-size: 0.9rem; }
.term .row .cost { font-size: 0.9rem; color: var(--ink-dim); }
.term .row button { font: inherit; background: #2a3646; color: var(--ink); border: 1px solid #4a5a6e; padding: 0.3rem 0.9rem; cursor: pointer; }
.term .row button:disabled { opacity: 0.4; cursor: default; }
.term .owned { color: var(--good); }
.term .close { margin-top: 1rem; }
`;
let styled = false;

/** Upgrade terminal panel: three one-time upgrades, costs and resources on hand. */
export class UpgradeTerminal implements Screen {
  el: HTMLElement;
  private sel = 0;
  private rows: HTMLElement[] = [];
  constructor(private game: Game) {
    if (!styled) {
      const s = document.createElement('style');
      s.textContent = CSS;
      document.head.appendChild(s);
      styled = true;
    }
    this.el = h('div', 'screen dim', undefined, game.ui.modal);
    this.el.dataset.screen = 'terminal';
    this.render();
  }
  private render(): void {
    const s = this.game.state;
    this.el.innerHTML = '';
    const t = h('div', 'term', undefined, this.el);
    h('h2', '', 'Upgrade terminal', t);
    const q = h('div', 'eff', '"Bring me materials and I\'ll bolt on improvements. No materials, no miracles." ' + String.fromCharCode(8212) + ' ' + NAMES.crew.quartermaster.short, t);
    q.style.marginBottom = '0.6rem';
    q.style.fontStyle = 'italic';
    const res = h('div', 'res', undefined, t);
    for (const r of ['alloy', 'biomass', 'isotopes'] as ResourceId[]) {
      const sp = h('span', '', NAMES.resources[r] + ' ', res);
      h('b', '', String(s.data.resources[r]), sp);
    }
    this.rows = [];
    UPGRADE_ORDER.forEach((id, i) => {
      const u = UPGRADES[id];
      const row = h('div', 'row' + (i === this.sel ? ' sel' : ''), undefined, t);
      row.dataset.upgrade = id;
      const info = h('div', '', undefined, row);
      h('div', '', NAMES.upgrades[id], info);
      h('div', 'eff', u.effect, info);
      h('div', 'cost', (Object.keys(u.cost) as ResourceId[]).map((r) => u.cost[r] + ' ' + NAMES.resources[r]).join(', '), row);
      if (s.hasUpgrade(id)) h('div', 'owned', 'Installed', row);
      else {
        const b = h('button', '', 'Buy', row);
        b.disabled = !s.canAfford(id);
        b.addEventListener('click', () => this.buy(i));
      }
      row.addEventListener('mouseenter', () => this.select(i));
      this.rows.push(row);
    });
    const close = h('div', 'menu close', undefined, t);
    const cb = h('button', 'item', 'Close', close);
    cb.addEventListener('click', () => this.close());
  }
  private select(i: number): void {
    this.sel = i;
    this.rows.forEach((r, j) => r.classList.toggle('sel', j === i));
  }
  buy(i: number): boolean {
    const id = UPGRADE_ORDER[i];
    if (this.game.state.buy(id)) {
      this.game.audio.play('ui_confirm');
      this.game.ui.toast(NAMES.upgrades[id] + ' installed');
      this.render();
      return true;
    }
    this.game.audio.play('ui_back');
    return false;
  }
  private close(): void {
    this.game.audio.play('ui_back');
    this.game.ui.pop();
  }
  update(input: Input): void {
    if (input.pressed('menuUp')) this.select((this.sel + 2) % 3);
    if (input.pressed('menuDown')) this.select((this.sel + 1) % 3);
    if (input.pressed('confirm')) {
      input.consume('confirm');
      this.buy(this.sel);
    }
    if (input.pressed('back')) {
      input.consume('back');
      this.close();
    }
  }
  destroy(): void {
    this.el.remove();
  }
}

export function openUpgradeTerminal(game: Game): void {
  if (game.ui.top()) return;
  game.audio.play('ui_open');
  game.ui.push(new UpgradeTerminal(game));
}
