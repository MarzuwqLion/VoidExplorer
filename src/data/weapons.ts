import { NAMES, type WeaponId } from './names';
import type { SoundId } from './sounds';

export interface WeaponDef {
  id: WeaponId;
  name: string;
  auto: boolean;
  damage: number;
  rpm: number;
  mag: number;
  /** Max reserve, or null for unlimited. */
  reserve: number | null;
  reload: number;
  headshot: number;
  fullRange: number;
  minRange: number;
  minPct: number;
  hipSpread: number;
  aimSpread: number;
  bloomPerShot: number;
  bloomMax: number;
  kick: number;
  armorMul: number;
  shake: number;
  sound: SoundId;
  reloadSound: SoundId;
  tracer: number;
}

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  pistol: { id: 'pistol', name: NAMES.weapons.pistol, auto: false, damage: 22, rpm: 240, mag: 12, reserve: null, reload: 1.4, headshot: 1.5, fullRange: 25, minRange: 45, minPct: 0.5, hipSpread: 1.0, aimSpread: 0.2, bloomPerShot: 0.3, bloomMax: 2.0, kick: 0.8, armorMul: 1.0, shake: 0.22, sound: 'fire_pistol', reloadSound: 'reload_pistol', tracer: 0xffd27a },
  smg: { id: 'smg', name: NAMES.weapons.smg, auto: true, damage: 11, rpm: 800, mag: 36, reserve: 216, reload: 1.8, headshot: 1.25, fullRange: 15, minRange: 30, minPct: 0.4, hipSpread: 3.0, aimSpread: 1.4, bloomPerShot: 0.15, bloomMax: 2.0, kick: 0.25, armorMul: 0.6, shake: 0.075, sound: 'fire_smg', reloadSound: 'reload_smg', tracer: 0xffc060 },
  rifle: { id: 'rifle', name: NAMES.weapons.rifle, auto: false, damage: 38, rpm: 200, mag: 16, reserve: 80, reload: 2.2, headshot: 2.0, fullRange: 60, minRange: 100, minPct: 0.7, hipSpread: 1.8, aimSpread: 0.05, bloomPerShot: 0.5, bloomMax: 2.0, kick: 1.3, armorMul: 1.4, shake: 0.34, sound: 'fire_rifle', reloadSound: 'reload_rifle', tracer: 0xfff0b0 },
};
export const WEAPON_ORDER: WeaponId[] = ['pistol', 'smg', 'rifle'];

/** Ammo pickups dropped by raiders. */
export const AMMO_DROP = { chance: 0.4, smg: 18, rifle: 8, pickupRange: 1.6 };

/** Damage after distance falloff (linear between full and minimum range). */
export function falloff(w: WeaponDef, dist: number): number {
  if (dist <= w.fullRange) return w.damage;
  if (dist >= w.minRange) return w.damage * w.minPct;
  const t = (dist - w.fullRange) / (w.minRange - w.fullRange);
  return w.damage * (1 - t * (1 - w.minPct));
}

/** Body shots needed to kill a target with the given health at close range. */
export function shotsToKill(w: WeaponDef, health: number): number {
  return Math.ceil(health / w.damage);
}
