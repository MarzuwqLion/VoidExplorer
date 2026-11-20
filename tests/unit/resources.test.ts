import { describe, it, expect } from 'vitest';
import { AMARA, KORR, type NodeDef } from '../../src/data/layouts';
import { PLANET_RESOURCES, UPGRADES, UPGRADE_ORDER } from '../../src/data/upgrades';
import { GameState } from '../../src/core/state';
import type { ResourceId } from '../../src/data/names';

function count(nodes: NodeDef[]): Record<ResourceId, number> {
  const c = { alloy: 0, biomass: 0, isotopes: 0 };
  for (const n of nodes) c[n.type]++;
  return c;
}

describe('resources and upgrades', () => {
  it('node counts match section 10', () => {
    expect(count(AMARA.nodes)).toEqual({ alloy: 3, biomass: 9, isotopes: 2 });
    expect(count(KORR.nodes)).toEqual({ alloy: 9, biomass: 3, isotopes: 2 });
    // Plus 1 isotope from the Alpha and 2 from the sample vault.
    expect(PLANET_RESOURCES.amara).toEqual({ alloy: 3, biomass: 9, isotopes: 3 });
    expect(PLANET_RESOURCES.korr).toEqual({ alloy: 9, biomass: 3, isotopes: 4 });
    expect(new Set([...AMARA.nodes, ...KORR.nodes].map((n) => n.id)).size).toBe(28);
  });
  it('either planet alone pays for at least one upgrade', () => {
    for (const p of ['amara', 'korr'] as const) {
      const s = new GameState();
      for (const r of Object.keys(PLANET_RESOURCES[p]) as ResourceId[]) s.give(r, PLANET_RESOURCES[p][r]);
      expect(UPGRADE_ORDER.some((u) => s.canAfford(u)), p).toBe(true);
    }
  });
  it('both planets together pay for all three upgrades', () => {
    const s = new GameState();
    for (const p of ['amara', 'korr'] as const) for (const r of Object.keys(PLANET_RESOURCES[p]) as ResourceId[]) s.give(r, PLANET_RESOURCES[p][r]);
    for (const u of UPGRADE_ORDER) expect(s.buy(u), u).toBe(true);
    expect(s.data.upgrades).toHaveLength(3);
  });
  it('upgrades apply their effects', () => {
    const s = new GameState();
    expect(s.shieldMax).toBe(100);
    expect(s.magMultiplier).toBe(1);
    expect(s.medkitMax).toBe(2);
    s.give('alloy', 20);
    s.give('biomass', 20);
    s.give('isotopes', 20);
    for (const u of UPGRADE_ORDER) s.buy(u);
    expect(s.shieldMax).toBe(130);
    expect(s.magMultiplier).toBe(1.25);
    expect(s.medkitMax).toBe(3);
    expect(s.buy('shield')).toBe(false);
    expect(UPGRADES.shield.cost).toEqual({ alloy: 6, isotopes: 2 });
  });
  it('save and load round trip', () => {
    const s = new GameState();
    s.give('alloy', 4);
    s.setFlag('briefed');
    s.data.missions.amara = true;
    s.data.choices.lookout = 'threaten';
    s.survey('cinder');
    const t = new GameState();
    expect(t.load(s.toJSON())).toBe(true);
    expect(t.data).toEqual(s.data);
    expect(t.load('{bad json')).toBe(false);
  });
});
