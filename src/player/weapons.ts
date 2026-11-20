import { WEAPONS, WEAPON_ORDER, type WeaponDef } from '../data/weapons';
import { HANDLING } from '../data/tuning';
import type { WeaponId } from '../data/names';

export interface Slot {
  mag: number;
  reserve: number;
  magSize: number;
}

/** Weapon state machine: ammo, fire rate, spread bloom, reload and swap. No rendering, no raycasts. */
export class WeaponSystem {
  current: WeaponId = 'rifle';
  slots: Record<WeaponId, Slot>;
  cooldown = 0;
  reloadT = 0;
  swapT = 0;
  private swapTo: WeaponId | null = null;
  bloom = 0;
  private bloomDecay = 0;
  sinceShot = 99;
  infinite = false;

  constructor(public magMul = 1) {
    this.slots = {} as Record<WeaponId, Slot>;
    for (const id of WEAPON_ORDER) {
      const d = WEAPONS[id];
      const size = Math.ceil(d.mag * magMul);
      this.slots[id] = { mag: size, reserve: d.reserve ?? 0, magSize: size };
    }
  }
  get def(): WeaponDef {
    return WEAPONS[this.current];
  }
  get slot(): Slot {
    return this.slots[this.current];
  }
  get reloading(): boolean {
    return this.reloadT > 0;
  }
  get swapping(): boolean {
    return this.swapT > 0;
  }
  /** 0..1 progress for animation. */
  get reloadProgress(): number {
    return this.reloadT > 0 ? 1 - this.reloadT / this.def.reload : 0;
  }
  get swapProgress(): number {
    return this.swapT > 0 ? 1 - this.swapT / HANDLING.swapTime : 0;
  }
  refill(): void {
    for (const id of WEAPON_ORDER) {
      const s = this.slots[id];
      s.mag = s.magSize;
      s.reserve = WEAPONS[id].reserve ?? 0;
    }
  }
  addReserve(id: WeaponId, n: number): void {
    const max = WEAPONS[id].reserve;
    if (max === null) return;
    this.slots[id].reserve = Math.min(max, this.slots[id].reserve + n);
  }
  unlimited(id: WeaponId): boolean {
    return WEAPONS[id].reserve === null;
  }

  /** Current spread in degrees. */
  spread(aiming: boolean, spreadScale = 1): number {
    const d = this.def;
    return ((aiming ? d.aimSpread : d.hipSpread) + this.bloom) * spreadScale;
  }

  update(dt: number): void {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.sinceShot += dt;
    if (this.bloom > 0) this.bloom = Math.max(0, this.bloom - this.bloomDecay * dt);
    if (this.reloadT > 0) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) this.finishReload();
    }
    if (this.swapT > 0) {
      this.swapT -= dt;
      if (this.swapT <= HANDLING.swapTime / 2 && this.swapTo) {
        this.current = this.swapTo;
        this.swapTo = null;
      }
      if (this.swapT <= 0) this.swapT = 0;
    }
  }
  private finishReload(): void {
    this.reloadT = 0;
    const s = this.slot;
    const need = s.magSize - s.mag;
    if (this.unlimited(this.current) || this.infinite) s.mag = s.magSize;
    else {
      const take = Math.min(need, s.reserve);
      s.mag += take;
      s.reserve -= take;
    }
  }
  canReload(): boolean {
    const s = this.slot;
    return !this.reloading && !this.swapping && s.mag < s.magSize && (this.unlimited(this.current) || s.reserve > 0 || this.infinite);
  }
  startReload(): boolean {
    if (!this.canReload()) return false;
    this.reloadT = this.def.reload;
    return true;
  }
  cancelReload(): void {
    this.reloadT = 0;
  }
  swap(id: WeaponId): boolean {
    if (id === this.current && !this.swapTo) return false;
    if (this.swapping) return false;
    this.cancelReload();
    this.swapTo = id;
    this.swapT = HANDLING.swapTime;
    return true;
  }
  next(dir = 1): boolean {
    const i = WEAPON_ORDER.indexOf(this.swapTo ?? this.current);
    return this.swap(WEAPON_ORDER[(i + dir + WEAPON_ORDER.length) % WEAPON_ORDER.length]);
  }

  /**
   * Try to fire. Returns 'fired', 'dry' (empty, starts a reload), or null when not possible.
   * triggerEdge: fire pressed this step; triggerHeld: fire held.
   */
  tryFire(triggerEdge: boolean, triggerHeld: boolean): 'fired' | 'dry' | null {
    const d = this.def;
    if (!(d.auto ? triggerHeld : triggerEdge)) return null;
    if (this.cooldown > 0 || this.reloading || this.swapping) return null;
    const s = this.slot;
    if (s.mag <= 0) {
      this.startReload();
      return triggerEdge ? 'dry' : null;
    }
    if (!this.infinite) s.mag--;
    this.cooldown = 60 / d.rpm;
    this.bloom = Math.min(d.bloomMax, this.bloom + d.bloomPerShot);
    this.bloomDecay = this.bloom / HANDLING.spreadDecay;
    this.sinceShot = 0;
    return 'fired';
  }
}
