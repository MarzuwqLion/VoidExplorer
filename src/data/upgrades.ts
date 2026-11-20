import type { ResourceId, UpgradeId } from './names';

export interface UpgradeDef {
  id: UpgradeId;
  effect: string;
  cost: Partial<Record<ResourceId, number>>;
}

export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  shield: { id: 'shield', effect: 'Shield 100 to 130', cost: { alloy: 6, isotopes: 2 } },
  mags: { id: 'mags', effect: 'Magazine size +25% on all weapons', cost: { alloy: 4, biomass: 4 } },
  medic: { id: 'medic', effect: 'Carry 3 medkits instead of 2', cost: { biomass: 6, isotopes: 2 } },
};
export const UPGRADE_ORDER: UpgradeId[] = ['shield', 'mags', 'medic'];

/** Upgrade effect values. */
export const UPGRADE_VALUES = { shieldMax: 130, magMultiplier: 1.25, medkits: 3 };

/** Resource yields per planet, which must pay for upgrades (see unit test). */
export const PLANET_RESOURCES: Record<'amara' | 'korr', Record<ResourceId, number>> = {
  amara: { alloy: 3, biomass: 9, isotopes: 3 },
  korr: { alloy: 9, biomass: 3, isotopes: 4 },
};
