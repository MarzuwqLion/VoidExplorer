import * as THREE from 'three';
import { Scene } from './scene';
import { MenuScreen, h } from '../ui/screens';
import { makeStarfield, makeStar } from '../world/space';
import { NAMES } from '../data/names';
import { UPGRADE_ORDER } from '../data/upgrades';
import { PLANET_BY_ID } from '../data/planets';

function fmtTime(s: number): string {
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return m + ' min ' + String(sec).padStart(2, '0') + ' s';
}

/** End screen with stats and choices made. */
export class EndScene extends Scene {
  readonly id = 'end' as const;
  private t = 0;
  enter(): void {
    const g = this.game;
    this.three.background = new THREE.Color(0x02040a);
    this.three.add(makeStarfield(2500, 1500, 9));
    const star = makeStar(50);
    star.position.set(120, -20, -700);
    this.three.add(star);
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
      { sub: NAMES.ship + '  ·  ' + NAMES.system + ' system' },
    );
    menu.el.dataset.screen = 'end';
    const table = h('div', 'controls-grid end-stats', undefined, menu.el);
    table.style.gridTemplateColumns = 'auto auto';
    table.style.marginBottom = '1.5rem';
    for (const [k, v] of rows) {
      h('div', 'a', k, table);
      h('div', 'k', v, table);
    }
    menu.el.insertBefore(table, menu.list.el);
    g.ui.push(menu);
    this.api.info = () => ({ stats: Object.fromEntries(rows) });
  }
  update(dt: number): void {
    this.t += dt;
  }
  render(): void {
    this.camera.rotation.y = Math.sin(this.t * 0.05) * 0.05;
  }
}
