import type { Game } from '../core/game';
import { FEEL, FEEL_RANGES, type FeelKey } from '../data/tuning';
import { h } from '../ui/screens';
import type { SceneId } from '../core/state';
import type { ResourceId } from '../data/names';

const CSS = `
.dbg { position: absolute; top: 0.6rem; left: 0.6rem; width: 22rem; max-height: calc(100vh - 1.2rem); overflow: auto; background: rgba(6,10,16,0.92); border: 1px solid rgba(242,165,65,0.4); font-size: 0.8rem; pointer-events: auto; z-index: 50; padding: 0.5rem; }
.dbg .tabs { display: flex; gap: 0.3rem; margin-bottom: 0.4rem; }
.dbg button { font: inherit; background: #1b2633; color: #e6edf3; border: 1px solid #33475c; padding: 0.2rem 0.5rem; cursor: pointer; margin: 0.1rem; }
.dbg button.on { background: #6b4a16; border-color: #f2a541; }
.dbg .sec { color: #f2a541; margin: 0.5rem 0 0.2rem; text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.7rem; }
.dbg .row { display: grid; grid-template-columns: 8.5rem 1fr 3.2rem; gap: 0.3rem; align-items: center; }
.dbg input[type=range] { width: 100%; accent-color: #f2a541; }
.dbg .stats { font-family: ui-monospace, monospace; color: #9fb3c8; white-space: pre; }
`;

/** Debug panel with a Debug tab and a live Tuning tab. Opened with backquote or ?debug=1. */
export class DebugPanel {
  el: HTMLElement;
  private body: HTMLElement;
  private stats: HTMLElement | null = null;
  private tab: 'debug' | 'tuning' = 'debug';
  open = false;

  constructor(private game: Game) {
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    this.el = h('div', 'dbg', undefined, game.ui.root);
    this.el.dataset.panel = 'debug';
    this.el.style.display = 'none';
    const tabs = h('div', 'tabs', undefined, this.el);
    const tb1 = h('button', 'on', 'Debug', tabs);
    const tb2 = h('button', '', 'Tuning', tabs);
    tb1.onclick = () => ((this.tab = 'debug'), tb1.classList.add('on'), tb2.classList.remove('on'), this.build());
    tb2.onclick = () => ((this.tab = 'tuning'), tb2.classList.add('on'), tb1.classList.remove('on'), this.build());
    h('button', '', 'Close', tabs).onclick = () => this.toggle(false);
    this.body = h('div', '', undefined, this.el);
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Backquote' && !e.repeat) this.toggle();
    });
    game.onFrame = () => this.refresh();
    game.events.on('scene', () => this.open && this.build());
  }

  toggle(on = !this.open): void {
    this.open = on;
    this.el.style.display = on ? 'block' : 'none';
    if (on) {
      this.game.exitLock();
      this.build();
    }
  }

  private button(parent: HTMLElement, label: string, fn: () => void, on?: () => boolean): HTMLButtonElement {
    const b = h('button', on?.() ? 'on' : '', label, parent);
    b.onclick = () => {
      fn();
      if (on) b.classList.toggle('on', on());
    };
    return b;
  }

  build(): void {
    this.body.innerHTML = '';
    if (this.tab === 'tuning') return this.buildTuning();
    const g = this.game;
    h('div', 'sec', 'Cheats', this.body);
    const c = h('div', '', undefined, this.body);
    for (const k of ['god', 'infiniteAmmo', 'showColliders', 'showNav', 'aiLabels'] as const) {
      this.button(c, k, () => (g.debug[k] = !g.debug[k]), () => g.debug[k]);
    }
    this.button(c, 'Give 10 each', () => (['alloy', 'biomass', 'isotopes'] as ResourceId[]).forEach((r) => g.state.give(r, 10)));
    this.button(c, 'Kill all', () => g.scene?.api.killAll?.());
    h('div', 'sec', 'Scenes', this.body);
    const s = h('div', '', undefined, this.body);
    const jumps: [string, SceneId, Record<string, unknown>][] = [
      ['Title', 'title', {}],
      ['Bridge', 'bridge', {}],
      ['System map', 'systemMap', {}],
      ['Amara', 'planet', { planet: 'amara' }],
      ['Korr', 'planet', { planet: 'korr' }],
      ['Test gym', 'gym', {}],
      ['End screen', 'end', {}],
    ];
    for (const [label, id, opts] of jumps) this.button(s, label, () => void g.goto(id, opts));
    const beats = g.scene?.api.beats?.() ?? [];
    if (beats.length) {
      h('div', 'sec', 'Beats and checkpoints', this.body);
      const b = h('div', '', undefined, this.body);
      for (const name of beats) this.button(b, name, () => g.scene?.api.jumpTo?.(name));
    }
    h('div', 'sec', 'Time scale', this.body);
    const tr = h('div', 'row', undefined, this.body);
    h('span', '', 'Time scale', tr);
    const r = h('input', '', undefined, tr);
    r.type = 'range';
    r.min = '0.1';
    r.max = '4';
    r.step = '0.1';
    r.value = String(g.loop.timeScale);
    const tv = h('span', '', g.loop.timeScale.toFixed(1), tr);
    r.oninput = () => {
      g.loop.timeScale = parseFloat(r.value);
      tv.textContent = g.loop.timeScale.toFixed(1);
    };
    h('div', 'sec', 'Stats', this.body);
    this.stats = h('div', 'stats', '', this.body);
  }

  private buildTuning(): void {
    h('div', 'sec', 'Feel values (live)', this.body);
    for (const k of Object.keys(FEEL) as FeelKey[]) {
      const v = FEEL[k];
      const [min, max, step] = FEEL_RANGES[k] ?? [0, Math.max(1, v * 3), v >= 10 ? 1 : 0.01];
      const row = h('div', 'row', undefined, this.body);
      h('span', '', k, row);
      const r = h('input', '', undefined, row);
      r.type = 'range';
      r.min = String(min);
      r.max = String(max);
      r.step = String(step);
      r.value = String(v);
      r.dataset.key = k;
      const out = h('span', '', String(v), row);
      r.oninput = () => {
        FEEL[k] = parseFloat(r.value);
        out.textContent = String(FEEL[k]);
      };
    }
    const b = h('button', '', 'Copy as JSON', this.body);
    b.dataset.action = 'copy-json';
    b.onclick = () => {
      const json = JSON.stringify(FEEL, null, 2);
      (window as unknown as { __tuningJson: string }).__tuningJson = json;
      void navigator.clipboard?.writeText(json).catch(() => undefined);
      b.textContent = 'Copied';
      setTimeout(() => (b.textContent = 'Copy as JSON'), 1200);
    };
  }

  private refresh(): void {
    if (!this.open || !this.stats) return;
    const g = this.game;
    const info = g.scene?.api.info?.() ?? {};
    this.stats.textContent =
      'fps ' + g.fps.toFixed(0) + '  draw calls ' + g.drawCalls + '\nscene ' + g.sceneId + '\n' +
      Object.entries(info)
        .filter(([, v]) => typeof v !== 'object')
        .map(([k, v]) => k + ' ' + (typeof v === 'number' ? Math.round(v * 100) / 100 : v))
        .join('\n');
  }
}
