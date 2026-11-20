import type { Input } from '../core/input';

/** A modal UI screen that receives input each tick while on top of the stack. */
export interface Screen {
  el: HTMLElement;
  update(input: Input, dt: number): void;
  destroy(): void;
  /** True if the game simulation should keep running underneath. */
  passthrough?: boolean;
}

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  text?: string,
  parent?: HTMLElement,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
}

export interface MenuItem {
  label: string;
  action?: () => void;
  disabled?: boolean;
  /** Slider row: value getter, setter, range. */
  slider?: { get: () => number; set: (v: number) => void; min: number; max: number; step: number; fmt?: (v: number) => string };
  /** Toggle row. */
  toggle?: { get: () => boolean; set: (v: boolean) => void };
  id?: string;
}

/** A vertical list driven by keyboard, mouse and gamepad. */
export class MenuList {
  readonly el: HTMLElement;
  index = 0;
  private rows: HTMLElement[] = [];
  private refreshers: (() => void)[] = [];
  constructor(
    private items: MenuItem[],
    parent: HTMLElement,
    private onBack?: () => void,
  ) {
    this.el = h('div', 'menu interactive', undefined, parent);
    items.forEach((it, i) => {
      const b = h('button', 'item', undefined, this.el);
      if (it.id) b.dataset.id = it.id;
      b.disabled = !!it.disabled;
      if (it.slider) {
        const s = it.slider;
        b.classList.add('row');
        h('span', '', it.label, b);
        const r = h('input', '', undefined, b);
        r.type = 'range';
        r.min = String(s.min);
        r.max = String(s.max);
        r.step = String(s.step);
        const val = h('span', 'val', '', b);
        const refresh = () => {
          r.value = String(s.get());
          val.textContent = s.fmt ? s.fmt(s.get()) : s.get().toFixed(2);
        };
        r.addEventListener('input', () => {
          s.set(parseFloat(r.value));
          refresh();
        });
        refresh();
        this.refreshers.push(refresh);
      } else if (it.toggle) {
        const t = it.toggle;
        b.classList.add('row');
        h('span', '', it.label, b);
        const val = h('span', 'val', '', b);
        const refresh = () => (val.textContent = t.get() ? 'On' : 'Off');
        b.addEventListener('click', () => {
          t.set(!t.get());
          refresh();
        });
        refresh();
        this.refreshers.push(refresh);
      } else {
        b.textContent = it.label;
        b.addEventListener('click', () => !it.disabled && it.action?.());
      }
      b.addEventListener('mouseenter', () => this.select(i));
      this.rows.push(b);
    });
    const first = items.findIndex((i) => !i.disabled);
    this.select(first < 0 ? 0 : first);
  }
  select(i: number): void {
    this.index = i;
    this.rows.forEach((r, j) => r.classList.toggle('sel', j === i));
  }
  private moveSel(d: number): void {
    const n = this.items.length;
    for (let k = 1; k <= n; k++) {
      const j = (this.index + d * k + n * 4) % n;
      if (!this.items[j].disabled) return this.select(j);
    }
  }
  update(input: Input): void {
    if (input.pressed('menuUp')) this.moveSel(-1);
    if (input.pressed('menuDown')) this.moveSel(1);
    const it = this.items[this.index];
    if (it?.slider && (input.pressed('menuLeft') || input.pressed('menuRight'))) {
      const s = it.slider;
      const d = input.pressed('menuRight') ? s.step * 2 : -s.step * 2;
      s.set(Math.min(s.max, Math.max(s.min, s.get() + d)));
      this.refreshers.forEach((f) => f());
    }
    if (input.pressed('confirm') && it && !it.disabled) {
      input.consume('confirm');
      if (it.toggle) {
        it.toggle.set(!it.toggle.get());
        this.refreshers.forEach((f) => f());
      } else it.action?.();
    } else if (input.pressed('back') && this.onBack) {
      input.consume('back');
      this.onBack();
    }
  }
  /** Activate an item by label (used by tests and the bot). */
  choose(label: string): boolean {
    const i = this.items.findIndex((x) => x.label === label && !x.disabled);
    if (i < 0) return false;
    this.select(i);
    this.items[i].action?.();
    return true;
  }
  labels(): string[] {
    return this.items.map((i) => i.label);
  }
}

/** A titled menu screen. */
export class MenuScreen implements Screen {
  el: HTMLElement;
  list: MenuList;
  constructor(parent: HTMLElement, title: string, items: MenuItem[], onBack?: () => void, opts: { sub?: string; dim?: boolean; big?: boolean } = {}) {
    this.el = h('div', 'screen' + (opts.dim === false ? '' : ' dim'), undefined, parent);
    if (opts.big) h('h1', '', title, this.el);
    else h('h2', '', title, this.el);
    if (opts.sub) h('div', 'sub', opts.sub, this.el);
    this.list = new MenuList(items, this.el, onBack);
  }
  update(input: Input): void {
    this.list.update(input);
  }
  destroy(): void {
    this.el.remove();
  }
}
