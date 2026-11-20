import './hud.css';
import { h } from './screens';

export interface CompassMarker {
  bearing: number;
  kind: 'obj' | 'alloy' | 'biomass' | 'isotopes';
  dist?: number;
}
const INF = '∞';
const DOWN = '▼';
const DIAMOND = '◆';

/** HTML HUD for walking scenes. On the bridge only the objective and prompts show. */
export class Hud {
  readonly el: HTMLElement;
  private obj: HTMLElement;
  private comms: HTMLElement;
  private prompt: HTMLElement;
  private promptBar: HTMLElement;
  private sh: HTMLElement;
  private hp: HTMLElement;
  private hpBar: HTMLElement;
  private meta: HTMLElement;
  private wName: HTMLElement;
  private wAmmo: HTMLElement;
  private slots: HTMLElement[] = [];
  private compass: HTMLElement;
  private boss: HTMLElement;
  private bossHp: HTMLElement;
  private bossArmor: HTMLElement;
  private bossArmorBar: HTMLElement;
  private bossName: HTMLElement;
  private xh: HTMLElement;
  private xhLines: HTMLElement[] = [];
  private blocked: HTMLElement;
  private hit: HTMLElement;
  private hint: HTMLElement;
  private vig: HTMLElement;
  private dmg: HTMLElement;
  private flash: HTMLElement;
  private death: HTMLElement;
  private banner: HTMLElement;
  private log: HTMLElement;
  private warn: HTMLElement;
  private commsT = 0;
  private hitT = 0;
  private bannerT = 0;
  objectiveText = '';
  commsText = '';
  promptText = '';

  constructor(parent: HTMLElement, mode: 'bridge' | 'planet') {
    this.el = h('div', 'layer hud ' + mode, undefined, parent);
    this.el.dataset.ui = 'hud';
    this.obj = h('div', 'hud-obj', undefined, this.el);
    this.comms = h('div', 'hud-comms planet-only', undefined, this.el);
    this.prompt = h('div', 'hud-prompt', undefined, this.el);
    this.promptBar = h('div', 'bar');
    const bars = h('div', 'hud-bars planet-only', undefined, this.el);
    this.sh = h('div', 'fill', undefined, h('div', 'bar sh', undefined, bars));
    this.hpBar = h('div', 'bar hp', undefined, bars);
    this.hp = h('div', 'fill', undefined, this.hpBar);
    this.meta = h('div', 'meta', '', bars);
    const w = h('div', 'hud-wpn planet-only', undefined, this.el);
    this.wName = h('div', 'name', '', w);
    this.wAmmo = h('div', 'ammo', '', w);
    const sl = h('div', 'slots', undefined, w);
    for (let i = 0; i < 3; i++) this.slots.push(h('div', 'slot', String(i + 1), sl));
    this.compass = h('div', 'hud-compass planet-only', undefined, this.el);
    this.boss = h('div', 'hud-boss planet-only', undefined, this.el);
    this.bossName = h('div', 'nm', '', this.boss);
    this.bossArmorBar = h('div', 'bar armor', undefined, this.boss);
    this.bossArmor = h('div', 'fill', undefined, this.bossArmorBar);
    this.bossHp = h('div', 'fill', undefined, h('div', 'bar', undefined, this.boss));
    this.xh = h('div', 'hud-xh planet-only', undefined, this.el);
    h('i', 'dot', undefined, this.xh);
    for (let i = 0; i < 4; i++) this.xhLines.push(h('i', '', undefined, this.xh));
    this.blocked = h('div', 'blocked', undefined, this.xh);
    this.hit = h('div', 'hud-hit planet-only', undefined, this.el);
    for (let i = 0; i < 4; i++) {
      const l = h('i', '', undefined, this.hit);
      l.style.transform = 'translate(-50%,-50%) rotate(' + (45 + i * 90) + 'deg) translateX(0.55rem)';
    }
    this.hint = h('div', 'hud-hint planet-only', '', this.el);
    this.vig = h('div', 'hud-vig planet-only', undefined, this.el);
    this.dmg = h('div', 'hud-dmg planet-only', undefined, this.el);
    this.flash = h('div', 'hud-flash', undefined, this.el);
    this.death = h('div', 'hud-death', '', this.el);
    this.banner = h('div', 'hud-banner', '', this.el);
    this.log = h('div', 'hud-log', undefined, this.el);
    this.warn = h('div', 'hud-warn', '', this.el);
  }

  setObjective(text: string, dist?: number): void {
    const full = text + (dist !== undefined && dist > 3 ? '  ' + Math.round(dist) + ' m' : '');
    if (full === this.objectiveText) return;
    this.objectiveText = full;
    this.obj.innerHTML = '';
    if (text) {
      h('span', 'lbl', 'Objective', this.obj);
      h('span', '', full, this.obj);
    }
  }
  setPrompt(text: string | null, key = 'E', hold = 0): void {
    this.promptText = text ?? '';
    if (!text) {
      this.prompt.style.display = 'none';
      return;
    }
    this.prompt.style.display = 'block';
    const sig = key + '|' + text;
    if (this.prompt.dataset.sig !== sig) {
      this.prompt.dataset.sig = sig;
      this.prompt.innerHTML = '';
      h('span', 'key', key, this.prompt);
      h('span', '', text, this.prompt);
      this.prompt.appendChild(this.promptBar);
    }
    this.promptBar.style.width = Math.round(hold * 100) + '%';
  }
  showComms(who: string, text: string, seconds = 6): void {
    this.commsText = who + ': ' + text;
    this.comms.innerHTML = '';
    h('div', 'who', who, this.comms);
    h('div', '', text, this.comms);
    this.comms.classList.add('on');
    this.commsT = seconds;
  }
  setBars(shield: number, shieldMax: number, health: number, healthMax: number, medkits: number, medkitMax: number): void {
    this.sh.style.transform = 'scaleX(' + Math.max(0, shield / shieldMax) + ')';
    this.hp.style.transform = 'scaleX(' + Math.max(0, health / healthMax) + ')';
    this.hpBar.classList.toggle('low', health <= 25);
    this.meta.textContent = 'Shield ' + Math.ceil(shield) + '   Health ' + Math.ceil(health) + '   Medkits ' + medkits + '/' + medkitMax;
  }
  setWeapon(name: string, mag: number, reserve: number | null, active: number, labels: string[]): void {
    this.wName.textContent = name;
    this.wAmmo.innerHTML = String(mag) + ' <small>/ ' + (reserve === null ? INF : reserve) + '</small>';
    this.slots.forEach((s, i) => {
      s.textContent = labels[i] ?? '';
      s.classList.toggle('on', i === active);
    });
  }
  /** Crosshair gap in pixels. */
  setCrosshair(gapPx: number, visible: boolean, blocked: boolean): void {
    this.xh.style.display = visible ? 'block' : 'none';
    const g = Math.max(3, gapPx);
    const L = 9;
    const set = (el: HTMLElement, x: number, y: number, w: number, hh: number) => {
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.style.width = w + 'px';
      el.style.height = hh + 'px';
    };
    set(this.xhLines[0], -1, -g - L, 2, L);
    set(this.xhLines[1], -1, g, 2, L);
    set(this.xhLines[2], -g - L, -1, L, 2);
    set(this.xhLines[3], g, -1, L, 2);
    this.blocked.style.display = blocked ? 'block' : 'none';
  }
  hitMarker(kind: 'hit' | 'kill' | 'head'): void {
    this.hit.className = 'hud-hit planet-only ' + kind;
    this.hit.dataset.kind = kind;
    this.hit.style.opacity = '1';
    this.hitT = kind === 'hit' ? 0.12 : 0.3;
  }
  lastHitKind(): string {
    return this.hit.dataset.kind ?? '';
  }
  setHint(text: string): void {
    if (this.hint.textContent !== text) this.hint.textContent = text;
  }
  setCompass(yawDeg: number, markers: CompassMarker[]): void {
    const fov = 120;
    const w = this.compass.clientWidth || 500;
    const parts: string[] = ['<div class="center"></div>'];
    const dirs: [number, string][] = [[0, 'N'], [45, 'NE'], [90, 'E'], [135, 'SE'], [180, 'S'], [225, 'SW'], [270, 'W'], [315, 'NW']];
    // Heading: 0 = north (-Z). yaw 0 looks -Z, positive yaw turns left (west).
    const heading = ((-yawDeg % 360) + 360) % 360;
    const place = (bearing: number) => {
      let d = bearing - heading;
      while (d > 180) d -= 360;
      while (d < -180) d += 360;
      return Math.abs(d) > fov / 2 ? null : (0.5 + d / fov) * w;
    };
    for (const [b, n] of dirs) {
      const x = place(b);
      if (x !== null) parts.push('<div class="tick" style="left:' + x + 'px">' + n + '</div>');
    }
    for (const m of markers) {
      const x = place(m.bearing);
      if (x === null) continue;
      const txt = m.kind === 'obj' ? DOWN + ' ' + (m.dist !== undefined ? Math.round(m.dist) + 'm' : '') : DIAMOND;
      parts.push('<div class="mk ' + m.kind + '" style="left:' + x + 'px">' + txt + '</div>');
    }
    this.compass.innerHTML = parts.join('');
  }
  setBoss(name: string | null, hp = 1, armor: number | null = null): void {
    this.boss.style.display = name ? 'block' : 'none';
    if (!name) return;
    this.bossName.textContent = name;
    this.bossHp.style.transform = 'scaleX(' + Math.max(0, hp) + ')';
    this.bossArmorBar.style.display = armor === null ? 'none' : 'block';
    if (armor !== null) this.bossArmor.style.transform = 'scaleX(' + Math.max(0, armor) + ')';
  }
  /** Angle in degrees relative to view direction, 0 = in front, positive = right. */
  damageFrom(angle: number): void {
    const i = h('i', '', undefined, this.dmg);
    i.style.transform = 'rotate(' + angle + 'deg)';
    i.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 900, fill: 'forwards' });
    setTimeout(() => i.remove(), 950);
  }
  setLowHealth(on: boolean): void {
    this.vig.classList.toggle('on', on);
  }
  flashColor(color: string): void {
    this.flash.style.transition = 'none';
    this.flash.style.background = 'radial-gradient(ellipse at center, transparent 50%, ' + color + ')';
    this.flash.style.opacity = '0.8';
    requestAnimationFrame(() => {
      this.flash.style.transition = 'opacity 0.35s';
      this.flash.style.opacity = '0';
    });
  }
  setDeath(on: boolean, text = ''): void {
    this.death.textContent = text;
    this.death.style.opacity = on ? '1' : '0';
  }
  showBanner(title: string, sub = '', seconds = 3.5): void {
    this.banner.innerHTML = '';
    this.banner.append(title);
    if (sub) h('small', '', sub, this.banner);
    this.banner.style.opacity = '1';
    this.bannerT = seconds;
  }
  setLog(open: boolean, title: string, items: { text: string; done: boolean }[]): void {
    this.log.style.display = open ? 'block' : 'none';
    if (!open) return;
    this.log.innerHTML = '';
    h('h3', '', title, this.log);
    const ul = h('ul', '', undefined, this.log);
    for (const it of items) h('li', it.done ? 'done' : '', it.text, ul);
  }
  setWarning(text: string | null): void {
    this.warn.style.display = text ? 'block' : 'none';
    if (text) this.warn.textContent = text;
  }
  update(dt: number): void {
    if (this.commsT > 0 && (this.commsT -= dt) <= 0) this.comms.classList.remove('on');
    if (this.hitT > 0 && (this.hitT -= dt) <= 0) this.hit.style.opacity = '0';
    if (this.bannerT > 0 && (this.bannerT -= dt) <= 0) this.banner.style.opacity = '0';
  }
  destroy(): void {
    this.el.remove();
  }
}
