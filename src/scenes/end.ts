import * as THREE from 'three';
import { GRADES } from '../data/atmosphere';
import { Scene } from './scene';
import { MenuScreen, h } from '../ui/screens';
import { makeStarfield, makeStar } from '../world/space';
import { NAMES } from '../data/names';
import { UPGRADE_ORDER } from '../data/upgrades';
import { PLANET_BY_ID } from '../data/planets';
import { buildShip } from '../world/models/ship';

function fmtTime(s: number): string {
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return m + ' min ' + String(sec).padStart(2, '0') + ' s';
}

/** End screen with stats and choices made. */
export class EndScene extends Scene {
  readonly id = 'end' as const;
  grade = GRADES.title;
  private t = 0;
  /** The Sojourner leaving for the next system, behind the stats. */
  private ship = buildShip();
  enter(): void {
    const g = this.game;
    this.three.background = new THREE.Color(0x02040a);
    this.three.add(makeStarfield(2500, 1500, 9));
    const star = makeStar(50, undefined, { spriteCore: true });
    star.position.set(560, 170, -700);
    this.three.add(star);
    this.three.add(new THREE.AmbientLight(0x6070a0, 0.6));
    const key = new THREE.DirectionalLight(0xffc080, 2.4);
    key.position.copy(star.position).normalize();
    this.three.add(key);
    const fill = new THREE.DirectionalLight(0x8fb0e0, 1.0);
    fill.position.set(-1, 0.5, 1);
    this.three.add(fill);
    this.ship.scale.setScalar(0.08);
    this.ship.rotation.y = Math.atan2(-star.position.x, -star.position.z);
    this.three.add(this.ship);
    this.camera.position.set(0, 0, 0);
    this.camera.lookAt(0, 0, -1);
    g.audio.setAmbient('space_drone');
    g.audio.setTension(0);
    const d = g.state.data;
    const acc = d.stats.shotsFired ? Math.round((d.stats.shotsHit / d.stats.shotsFired) * 100) + '%' : 'n/a';
    const gathered = d.gathered.alloy + d.gathered.biomass + d.gathered.isotopes;
    const surveyed = d.surveyed.filter((s) => PLANET_BY_ID[s]).length;
    const choice = d.choices.lookout === 'reassure' ? 'Reassured the lookout' : d.choices.lookout === 'threaten' ? 'Threatened the lookout' : 'No choice recorded';
    const rows: [string, string][] = [
      ['Play time', fmtTime(d.stats.playTime)],
      ['Enemies defeated', String(d.stats.kills)],
      ['Accuracy', acc],
      ['Resources gathered', gathered + ' (' + d.gathered.alloy + ' ' + NAMES.resources.alloy + ', ' + d.gathered.biomass + ' ' + NAMES.resources.biomass + ', ' + d.gathered.isotopes + ' ' + NAMES.resources.isotopes + ')'],
      ['Planets surveyed', surveyed + ' / 15'],
      ['Upgrades bought', d.upgrades.length ? UPGRADE_ORDER.filter((u) => d.upgrades.includes(u)).map((u) => NAMES.upgrades[u]).join(', ') : 'None'],
      ['Choices', choice],
    ];
    const menu = new MenuScreen(
      g.ui.modal,
      'Survey complete',
      [
        { label: 'Keep exploring', action: () => void g.goto('bridge', { freeRoam: true }) },
        { label: 'Main menu', action: () => void g.goto('title') },
      ],
      undefined,
      { sub: NAMES.ship + '  ·  ' + NAMES.system + ' system', dim: false },
    );
    menu.el.dataset.screen = 'end';
    const table = h('div', 'controls-grid end-stats', undefined, menu.el);
    table.style.gridTemplateColumns = 'auto auto';
    table.style.marginBottom = '1.5rem';
    rows.forEach(([k, v], i) => {
      // Rows read in one after another.
      for (const el of [h('div', 'a', k, table), h('div', 'k', v, table)]) {
        el.classList.add('end-row');
        el.style.animationDelay = 0.3 + i * 0.18 + 's';
      }
    });
    menu.el.insertBefore(table, menu.list.el);
    g.ui.push(menu);
    this.api.info = () => ({ stats: Object.fromEntries(rows) });
  }
  update(): void {}
  render(_alpha: number, dt: number): void {
    // Menus pause the simulation here, so the backdrop runs on frame time.
    this.t += dt;
    this.camera.rotation.y = Math.sin(this.t * 0.05) * 0.05;
    // Drift from lower left toward the star, shrinking into the distance.
    const k = Math.min(1, this.t / 40);
    this.ship.position.set(-20 + k * 70, -8 + k * 22, -30 - k * 90);
    this.ship.rotation.z = Math.sin(this.t * 0.4) * 0.03;
  }
}
