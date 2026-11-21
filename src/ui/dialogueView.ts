import { h } from './screens';
import type { Input } from '../core/input';
import type { DialogueRunner } from '../core/dialogueRunner';
import { speakerName } from '../data/names';
import { DIALOGUE } from '../data/tuning';

const CSS = `
.dlg { position: absolute; left: 50%; bottom: 3.5vh; transform: translateX(-50%); width: min(62rem, 86vw); background: var(--panel); border: 1px solid var(--panel-edge); border-left: 4px solid var(--amber); padding: 1rem 1.4rem 1.1rem; pointer-events: auto; }
.dlg .who { color: var(--amber); font-size: 0.95rem; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 0.35rem; }
.dlg .line { font-size: 1.3rem; line-height: 1.45; min-height: 2.9em; }
.dlg .choices { display: flex; flex-direction: column; gap: 0.2rem; margin-top: 0.6rem; }
.dlg .choice { font: inherit; font-size: 1.1rem; text-align: left; background: transparent; color: var(--ink); border: 1px solid transparent; padding: 0.3rem 0.7rem; cursor: pointer; }
.dlg .choice.sel { border-color: var(--panel-edge); background: rgba(242,165,65,0.12); }
.dlg .choice.sel::before { content: '\\25B8  '; color: var(--amber); }
.dlg .choice.visited { color: var(--ink-dim); }
.dlg .cont { position: absolute; right: 1rem; bottom: 0.5rem; color: var(--ink-dim); font-size: 0.85rem; }
`;
let styled = false;

/** Bottom dialogue panel: speaker name, typed line, vertical choice list. */
export class DialogueView {
  el: HTMLElement;
  private who: HTMLElement;
  private line: HTMLElement;
  private list: HTMLElement;
  private cont: HTMLElement;
  private shown = 0;
  private nodeId = '';
  private sel = 0;
  private buttons: HTMLButtonElement[] = [];
  onTick: (() => void) | null = null;
  constructor(
    parent: HTMLElement,
    readonly runner: DialogueRunner,
    private glyph: (a: 'confirm') => string,
  ) {
    if (!styled) {
      const s = document.createElement('style');
      s.textContent = CSS;
      document.head.appendChild(s);
      styled = true;
    }
    this.el = h('div', 'dlg', undefined, parent);
    this.el.dataset.ui = 'dialogue';
    this.who = h('div', 'who', '', this.el);
    this.line = h('div', 'line', '', this.el);
    this.list = h('div', 'choices', undefined, this.el);
    this.cont = h('div', 'cont', '', this.el);
    this.el.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).classList.contains('choice')) return;
      this.confirm();
    });
    this.sync();
  }
  get typing(): boolean {
    return !!this.runner.node && this.shown < this.runner.node.text.length;
  }
  private sync(): void {
    const n = this.runner.node;
    if (!n) return;
    if (n.id !== this.nodeId) {
      this.nodeId = n.id;
      this.shown = 0;
      this.who.textContent = speakerName(n.speaker);
      this.sel = 0;
      this.list.innerHTML = '';
      this.buttons = [];
    }
    this.line.textContent = n.text.slice(0, Math.floor(this.shown));
    const choices = this.runner.choices();
    if (!this.typing && choices.length && !this.buttons.length) {
      choices.forEach((c, i) => {
        const b = h('button', 'choice' + (this.runner.visited(c) ? ' visited' : ''), c.label, this.list);
        b.addEventListener('click', () => this.pick(i));
        b.addEventListener('mouseenter', () => this.highlight(i));
        this.buttons.push(b);
      });
      this.highlight(0);
    }
    this.cont.textContent = this.typing || choices.length ? '' : this.glyph('confirm') + ' to continue';
  }
  private highlight(i: number): void {
    this.sel = i;
    this.buttons.forEach((b, j) => b.classList.toggle('sel', j === i));
  }
  private pick(i: number): void {
    this.runner.choose(i);
    this.sync();
  }
  confirm(): void {
    if (this.typing) {
      this.shown = this.runner.node!.text.length;
    } else if (this.runner.choices().length) {
      this.pick(this.sel);
      return;
    } else this.runner.advance();
    this.sync();
  }
  /** Choose by label (bot and tests). */
  chooseLabel(label: string): boolean {
    const i = this.runner.choices().findIndex((c) => c.label === label);
    if (i < 0) return false;
    this.shown = this.runner.node!.text.length;
    this.pick(i);
    return true;
  }
  update(input: Input, dt: number): void {
    const n = this.runner.node;
    if (!n) return;
    if (this.typing) {
      const before = Math.floor(this.shown);
      this.shown = Math.min(n.text.length, this.shown + DIALOGUE.charsPerSecond * dt);
      if (Math.floor(this.shown) !== before && before % 3 === 0) this.onTick?.();
    }
    if (this.buttons.length) {
      if (input.pressed('menuUp')) this.highlight((this.sel + this.buttons.length - 1) % this.buttons.length);
      if (input.pressed('menuDown')) this.highlight((this.sel + 1) % this.buttons.length);
    }
    if (input.pressed('back') && this.buttons.length) {
      input.consume('back');
      const labels = this.runner.choices().map((c) => c.label);
      const i = labels.includes('Goodbye') ? labels.indexOf('Goodbye') : labels.indexOf('Back');
      if (i >= 0) {
        this.pick(i);
        return;
      }
    }
    if (input.pressed('confirm') || input.pressed('interact')) {
      input.consume('confirm');
      input.consume('interact');
      this.confirm();
    }
    this.sync();
  }
  destroy(): void {
    this.el.remove();
  }
}
