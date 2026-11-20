import { h } from './screens';
import type { PlanetDef } from '../data/planets';

const CSS = `
.survey { position: absolute; right: 2vw; top: 50%; width: 25rem; max-width: 34vw; transform: translate(120%, -50%); transition: transform 0.35s ease-out; background: var(--panel); border: 1px solid var(--panel-edge); border-left: 4px solid var(--amber); padding: 1rem 1.3rem; pointer-events: auto; }
.survey.on { transform: translate(0, -50%); }
.survey .nm { font-size: 1.7rem; letter-spacing: 0.15em; text-transform: uppercase; }
.survey .cls { color: var(--amber); font-size: 0.9rem; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 0.6rem; }
.survey canvas { display: block; width: 9rem; height: 9rem; margin: 0 auto 0.4rem; }
.survey table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.survey td { padding: 0.12rem 0; vertical-align: top; }
.survey td:first-child { color: var(--ink-dim); width: 40%; }
.survey .note { margin: 0.6rem 0; font-size: 0.95rem; line-height: 1.45; font-style: italic; color: #cfd8e0; }
.survey .land { font-size: 1rem; padding-top: 0.5rem; border-top: 1px solid rgba(255,255,255,0.12); }
.survey .land.ok { color: var(--good); }
.survey .land.no { color: #ff9a8a; }
.survey .land.done { color: var(--amber); }
.survey .key { display: inline-block; border: 1px solid var(--amber); color: var(--amber); padding: 0 0.4em; border-radius: 3px; margin-right: 0.4em; }
.map-hud { position: absolute; left: 2vw; top: 2.2vh; font-size: 1rem; text-shadow: 0 1px 3px #000; }
.map-hud .count { font-size: 1.3rem; letter-spacing: 0.1em; }
.map-hud .lbl { color: var(--amber); font-size: 0.75rem; letter-spacing: 0.2em; text-transform: uppercase; }
.map-help { position: absolute; left: 2vw; bottom: 3vh; color: var(--ink-dim); font-size: 0.85rem; line-height: 1.6; }
.map-label { position: absolute; transform: translate(-50%, -150%); font-size: 0.8rem; letter-spacing: 0.12em; text-transform: uppercase; color: #dfe8f0; text-shadow: 0 1px 3px #000; white-space: nowrap; }
.map-label.hab { color: var(--good); }
.map-label.hab::before { content: '+ '; }
.map-arrow { position: absolute; width: 0; height: 0; border-left: 0.6rem solid transparent; border-right: 0.6rem solid transparent; border-bottom: 1.2rem solid var(--good); filter: drop-shadow(0 0 4px #000); }
.map-warn { position: absolute; left: 50%; top: 16%; transform: translateX(-50%); background: rgba(80,20,10,0.8); border: 1px solid #ff7a4a; padding: 0.4rem 1.2rem; font-size: 1.1rem; letter-spacing: 0.12em; display: none; }
.map-hold { position: absolute; left: 50%; bottom: 10vh; transform: translateX(-50%); width: 12rem; height: 4px; background: rgba(255,255,255,0.15); display: none; }
.map-hold i { position: absolute; left: 0; top: 0; bottom: 0; background: var(--amber); }
`;
let styled = false;
export function ensureMapCss(): void {
  if (styled) return;
  const s = document.createElement('style');
  s.textContent = CSS;
  document.head.appendChild(s);
  styled = true;
}

export interface PanelData {
  id: string;
  name: string;
  className: string;
  rows: [string, string][];
  note: string;
  landing: { kind: 'ok' | 'no' | 'done' | 'none'; text: string };
}

export function planetPanelData(p: PlanetDef, complete: boolean): PanelData {
  let landing: PanelData['landing'];
  if (complete) landing = { kind: 'done', text: 'Mission complete' };
  else if (p.landing.viable) landing = { kind: 'ok', text: 'Landing: viable. Mission "' + p.landing.missionName + '"' };
  else landing = { kind: 'no', text: 'Landing: not viable. ' + capital(p.landing.reason ?? '') + '.' };
  return {
    id: p.id,
    name: p.name,
    className: p.className,
    rows: [
      ['Radius', p.radiusKm],
      ['Gravity', p.gravity],
      ['Day length', p.day],
      ['Atmosphere', p.atmosphere],
      ['Mean temperature', p.temperature],
    ],
    note: p.note,
    landing,
  };
}
function capital(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Slide-in survey panel with a rotating close-up canvas. */
export class SurveyPanel {
  el: HTMLElement;
  canvas: HTMLCanvasElement;
  current: PanelData | null = null;
  private landKey = 'E';
  constructor(parent: HTMLElement) {
    ensureMapCss();
    this.el = h('div', 'survey', undefined, parent);
    this.el.dataset.ui = 'survey';
    this.canvas = document.createElement('canvas');
    this.canvas.width = 256;
    this.canvas.height = 256;
  }
  show(d: PanelData | null, landKey: string): void {
    if (!d) {
      this.el.classList.remove('on');
      this.current = null;
      return;
    }
    if (this.current?.id === d.id && this.current.landing.text === d.landing.text && this.landKey === landKey) return;
    this.current = d;
    this.landKey = landKey;
    this.el.innerHTML = '';
    h('div', 'nm', d.name, this.el);
    h('div', 'cls', d.className, this.el);
    this.el.appendChild(this.canvas);
    const t = h('table', '', undefined, this.el);
    for (const [k, v] of d.rows) {
      const tr = h('tr', '', undefined, t);
      h('td', '', k, tr);
      h('td', '', v, tr);
    }
    h('div', 'note', d.note, this.el);
    if (d.landing.kind !== 'none') {
      const l = h('div', 'land ' + d.landing.kind, undefined, this.el);
      l.append(d.landing.text);
      if (d.landing.kind === 'ok') {
        const p = h('div', '', undefined, l);
        p.style.marginTop = '0.4rem';
        h('span', 'key', landKey, p);
        p.append('Land');
      }
    }
    this.el.classList.add('on');
  }
  text(): string {
    return this.el.classList.contains('on') ? this.el.innerText : '';
  }
  destroy(): void {
    this.el.remove();
  }
}
