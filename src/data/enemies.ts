import type { EnemyType } from './names';

/** Shared AI rules. */
export const AI = {
  visionDeg: 110,
  visionRange: 45,
  gunfireAlert: 40,
  groupAlert: 25,
  groupAlertDelay: 0.5,
  firstShotDelay: 0.6,
  attackTokens: 3,
  coverOffset: 0.6,
  coverSpacing: 1.6,
  fadeAfter: 8,
  maxActive: 12,
  repath: 1.0,
  separation: 1.1,
  telegraphMin: 0.5,
  /** Raider aim error: degrees at rest plus degrees per m/s of commander speed. */
  aimErrorBase: 1.9,
  aimErrorPerSpeed: 0.22,
  /** Flinch and melee stagger durations (s). */
  flinchTime: 0.18,
  staggerTime: 0.9,
  /** Hit flash on enemy models: peak brightness and how fast it fades (per second). */
  hitFlash: 0.55,
  hitFlashDecay: 9,
  /** Distant baked enemies: speed at full stride (m/s), stride phase per metre, bob height (m) and side rock (rad). */
  lodGaitSpeed: 4,
  lodGaitRate: 2.6,
  lodGaitBob: 0.07,
  lodGaitRoll: 0.06,
};

export interface EnemyDef {
  type: EnemyType;
  health: number;
  armor?: number;
  speed: number;
  radius: number;
  height: number;
  material: 'flesh' | 'metal';
  raider: boolean;
  boss?: boolean;
}

export const ENEMIES: Record<EnemyType, EnemyDef> = {
  stalker: { type: 'stalker', health: 60, speed: 6.5, radius: 0.45, height: 0.8, material: 'flesh', raider: false },
  spitter: { type: 'spitter', health: 90, speed: 2.4, radius: 0.7, height: 1.4, material: 'flesh', raider: false },
  alpha: { type: 'alpha', health: 2400, speed: 4.5, radius: 1.4, height: 2.2, material: 'flesh', raider: false, boss: true },
  rifleman: { type: 'rifleman', health: 100, speed: 4.2, radius: 0.4, height: 1.8, material: 'flesh', raider: true },
  rusher: { type: 'rusher', health: 70, speed: 6.0, radius: 0.4, height: 1.8, material: 'flesh', raider: true },
  marksman: { type: 'marksman', health: 60, speed: 3.8, radius: 0.4, height: 1.8, material: 'flesh', raider: true },
  foreman: { type: 'foreman', health: 1600, armor: 1000, speed: 2.0, radius: 1.3, height: 2.8, material: 'metal', raider: true, boss: true },
};

export const STALKER = { lungeRange: 6, crouch: 0.4, lungeSpeed: 15, lungeTime: 0.45, damage: 18, recover: 1.5, circleRadius: 8, maxLunging: 2, hitRange: 1.3 };
export const SPITTER = { minRange: 15, maxRange: 30, glow: 1.2, damage: 22, radius: 2.5, poolDps: 6, poolTime: 3, cooldown: 3.2, flight: 1.1, sacMul: 2 };
export const RIFLEMAN = { peekMin: 1.5, peekMax: 2.5, duck: 1.1, relocateMin: 2, relocateMax: 3, advanceAfter: 8, burst: 3, damage: 8, burstGap: 0.09, burstEvery: 0.5, rangeMin: 10, rangeMax: 40 };
export const RUSHER = { pellets: 6, pelletDamage: 6, range: 8, rate: 1, shout: 0.6, spreadDeg: 8, flankOffset: 9, chargeRange: 18 };
export const MARKSMAN = { rangeMin: 30, rangeMax: 70, charge: 1.5, damage: 55, shotsBeforeMove: 2, errorDeg: 0.25, cooldown: 1.2 };
export const ALPHA = {
  chargeWindup: 0.9, chargeSpeed: 14, chargeMax: 30, chargeDamage: 40, stun: 2.5, flankMul: 2, swipeDamage: 25, swipeWindup: 0.5, swipeRange: 3.2,
  chargeCooldown: 6, chargeCooldown2: 4, adds: 4, hitRadius: 2.0,
};
export const FOREMAN = {
  spinup: 1.0, sweep: 4, hitsPerSecond: 10, damagePerHit: 5, sinkOpen: 4, sinkMul: 2.5, stompRange: 3, stompDamage: 30, stompWindup: 0.6,
  mortarCircles: 3, mortarRadius: 3, mortarWarn: 1.5, mortarDamage: 45, mortarCooldown: 7, sweepDeg: 50, burstCooldown: 2.0, cannonError: 1.6,
};
