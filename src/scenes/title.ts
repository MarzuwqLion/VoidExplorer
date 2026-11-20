import * as THREE from 'three';
import { Scene } from './scene';
import { MenuScreen, h } from '../ui/screens';
import { openControls, openSettings } from '../ui/menus';
import { hasSave, loadGame } from '../core/save';
import { makeStarfield, makeStar } from '../world/space';
import { NAMES } from '../data/names';
import { INTRO_CARD } from '../data/dialogue/intro';
import { TRANSITIONS } from '../data/tuning';
import { buildShip } from '../world/models/ship';

/** Title screen with the intro card. */
export class TitleScene extends Scene {
  readonly id = 'title' as const;
  private menu: MenuScreen | null = null;
  private card: HTMLElement | null = null;
  private t = 0;
  private introT = -1;
  private ship = buildShip();

  enter(): void {
    const g = this.game;
    this.three.background = new THREE.Color(0x02040a);
    this.three.add(makeStarfield(2500, 1500));
    const star = makeStar(60);
    star.position.set(-560, 260, -700);
    this.three.add(star);
    this.three.add(new THREE.AmbientLight(0x6070a0, 0.6));
    const sun = new THREE.DirectionalLight(0xffc080, 2.6);
    sun.position.set(-560, 260, -700).normalize();
    this.three.add(sun);
    const fill = new THREE.DirectionalLight(0x8fb0e0, 1.2);
    fill.position.set(1, 0.5, 1);
    this.three.add(fill);
    this.ship.scale.setScalar(0.08);
    this.ship.position.set(7, -3, -26);
    this.ship.rotation.y = 0.5;
    this.three.add(this.ship);
    this.camera.fov = 55;
    this.camera.position.set(0, 0, 0);
    this.camera.lookAt(-6, 1, -40);
    this.game.audio.setAmbient('space_drone');
    const saved = hasSave();
    this.menu = new MenuScreen(
      g.ui.modal,
      NAMES.game.toUpperCase(),
      [
        { label: 'New game', id: 'new', action: () => this.startIntro() },
        { label: 'Continue', id: 'continue', disabled: !saved, action: () => this.continueGame() },
        { label: 'Controls', id: 'controls', action: () => openControls(g) },
        { label: 'Settings', id: 'settings', action: () => openSettings(g) },
      ],
      undefined,
      { big: true, dim: false, sub: NAMES.corps },
    );
    this.menu.el.dataset.screen = 'title';
    this.menu.el.classList.add('title-screen');
    g.ui.push(this.menu);
    this.onExit(() => this.card?.remove());
  }

  private startIntro(): void {
    const g = this.game;
    g.ui.popAll();
    this.menu = null;
    g.state.reset();
    g.audio.play('ui_confirm');
    this.introT = 0;
    const c = h('div', 'card interactive', undefined, g.ui.overlay);
    c.dataset.screen = 'intro';
    INTRO_CARD.forEach((line, i) => {
      const p = h('p', '', line, c);
      p.style.animationDelay = i * 2.2 + 's';
    });
    h('div', 'skip', 'Press ' + g.input.glyph('confirm') + ' or click to skip', c);
    c.addEventListener('click', () => this.finishIntro());
    this.card = c;
  }
  private finishIntro(): void {
    if (this.introT < 0) return;
    this.introT = -1;
    void this.game.goto('bridge', { fresh: true });
  }
  private continueGame(): void {
    const g = this.game;
    if (!loadGame(g.state)) return;
    void g.goto(g.state.data.scene === 'systemMap' ? 'systemMap' : 'bridge');
  }

  update(dt: number): void {
    this.t += dt;
    if (this.introT >= 0) {
      this.introT += dt;
      const inp = this.game.input;
      if (inp.pressed('confirm') || inp.pressed('back') || this.introT > TRANSITIONS.introCard) this.finishIntro();
    }
  }

  render(_a: number, dt: number): void {
    const k = this.introT >= 0 ? Math.min(1, this.introT / TRANSITIONS.introCard) : 0;
    this.ship.position.z = -24 - k * 60 - Math.sin(this.t * 0.3) * 0.3;
    this.ship.position.x = 6 - k * 8;
    this.ship.rotation.z = Math.sin(this.t * 0.4) * 0.03;
    this.camera.rotation.y += Math.sin(this.t * 0.1) * 0.00005 * dt;
  }
}
