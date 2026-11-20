import type { DamageInfo, DamageResult } from './types';

export interface Vitals {
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  armor: number;
  maxArmor: number;
}
export function vitals(health: number, shield = 0, armor = 0): Vitals {
  return { health, maxHealth: health, shield, maxShield: shield, armor, maxArmor: armor };
}

/** Apply damage: shield, then armor (weapon armor multiplier applies), then health. */
export function applyDamage(v: Vitals, d: DamageInfo): DamageResult {
  let amount = d.amount * d.partMul;
  let shieldHit = false, armorHit = false;
  const before = v.health + v.shield + v.armor;
  if (v.shield > 0) {
    shieldHit = true;
    const a = Math.min(v.shield, amount);
    v.shield -= a;
    amount -= a;
  }
  if (amount > 0 && v.armor > 0) {
    armorHit = true;
    const toArmor = amount * d.armorMul;
    if (toArmor >= v.armor) {
      amount = (toArmor - v.armor) / Math.max(0.01, d.armorMul);
      v.armor = 0;
    } else {
      v.armor -= toArmor;
      amount = 0;
    }
  }
  if (amount > 0) v.health = Math.max(0, v.health - amount);
  return { dealt: before - (v.health + v.shield + v.armor), killed: v.health <= 0, shield: shieldHit, armor: armorHit };
}
