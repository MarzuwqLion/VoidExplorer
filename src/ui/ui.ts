import './style.css';
import type { Input } from '../core/input';
import { h, type Screen } from './screens';

/** Root of the HTML overlay. Holds layers, the modal stack, fades, toasts and cards. */
export class UI {
  readonly root: HTMLElement;
  readonly hud: HTMLElement;
  readonly world: HTMLElement;
  readonly overlay: HTMLElement;
  readonly modal: HTMLElement;
  private fadeEl: HTMLElement;
  private toastEl: HTMLElement;
  private stack: Screen[] = [];
  private resumeEl: HTMLElement | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    this.world = h('div', 'layer world', undefined, root);
    this.hud = h('div', 'layer hud', undefined, root);
    this.overlay = h('div', 'layer overlay', undefined, root);
    this.toastEl = h('div', 'toasts', undefined, root);
    this.modal = h('div', 'layer modal', undefined, root);
    this.fadeEl = h('div', 'fade', undefined, root);
  }

  push(s: Screen): void {
    this.stack.push(s);
  }
  pop(): void {
    this.stack.pop()?.destroy();
  }
  popAll(): void {
    while (this.stack.length) this.pop();
  }
  top(): Screen | undefined {
    return this.stack[this.stack.length - 1];
  }
  /** True when a modal screen blocks the simulation. */
  blocking(): boolean {
    const t = this.top();
    return !!t && !t.passthrough;
  }
  update(input: Input, dt: number): void {
    this.top()?.update(input, dt);
  }

  fade(on: boolean, seconds = 0.4): Promise<void> {
    this.fadeEl.style.transitionDuration = seconds + 's';
    this.fadeEl.classList.toggle('on', on);
    return new Promise((r) => setTimeout(r, seconds * 1000));
  }
  isFaded(): boolean {
    return this.fadeEl.classList.contains('on');
  }

  toast(text: string, seconds = 2.5): void {
    const t = h('div', 'toast', text, this.toastEl);
    setTimeout(() => t.remove(), seconds * 1000);
    while (this.toastEl.children.length > 5) this.toastEl.firstElementChild?.remove();
  }
  toasts(): string[] {
    return [...this.toastEl.children].map((c) => c.textContent ?? '');
  }

  showResume(onClick: () => void): void {
    if (this.resumeEl) return;
    this.resumeEl = h('div', 'resume interactive', 'Click to resume', this.modal);
    this.resumeEl.addEventListener('click', () => {
      this.hideResume();
      onClick();
    });
  }
  hideResume(): void {
    this.resumeEl?.remove();
    this.resumeEl = null;
  }
  resumeShowing(): boolean {
    return !!this.resumeEl;
  }
}
