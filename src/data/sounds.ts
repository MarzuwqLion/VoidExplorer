/** Sound table: every id the game plays, mapped to a synth recipe and bus. Swap a recipe for a sample later. */
export type Bus = 'effects' | 'ambient' | 'music' | 'ui';
export type RecipeId = 'gun' | 'noise' | 'tone' | 'chord' | 'click' | 'mech' | 'growl' | 'heartbeat' | 'alarm';
export interface SoundDef {
  recipe: RecipeId;
  bus: Bus;
  volume?: number;
  pitch?: number;
  minGap?: number;
  params?: Record<string, number>;
}
const fx = (recipe: RecipeId, params: Record<string, number> = {}, volume = 1, minGap = 0): SoundDef => ({ recipe, bus: 'effects', params, volume, minGap });
const ui = (recipe: RecipeId, params: Record<string, number> = {}, volume = 0.5): SoundDef => ({ recipe, bus: 'ui', params, volume, minGap: 0.03 });

export const SOUNDS = {
  ui_tick: ui('tone', { f0: 1400, f1: 1200, decay: 0.04, wave: 1 }, 0.25),
  ui_open: ui('tone', { f0: 500, f1: 900, decay: 0.12, wave: 1 }, 0.3),
  ui_confirm: ui('chord', { n0: 660, n1: 990, decay: 0.18 }, 0.3),
  ui_back: ui('tone', { f0: 700, f1: 400, decay: 0.1, wave: 1 }, 0.3),
  type_tick: ui('click', { freq: 3000, decay: 0.012 }, 0.08),
  scan_chime: ui('chord', { n0: 880, n1: 1320, n2: 1760, decay: 0.9 }, 0.45),
  scan_sweep: ui('noise', { freq: 800, sweepTo: 4000, q: 6, attack: 0.05, decay: 0.7, type: 1 }, 0.35),
  toast: ui('tone', { f0: 1100, f1: 1100, decay: 0.08, wave: 0 }, 0.2),
  fire_pistol: fx('gun', { freq: 2200, thump: 140, decay: 0.16, crack: 0.8 }, 0.7),
  fire_smg: fx('gun', { freq: 3200, thump: 180, decay: 0.08, crack: 0.5 }, 0.5),
  fire_rifle: fx('gun', { freq: 1400, thump: 95, decay: 0.32, crack: 1.0 }, 0.9),
  reload_pistol: fx('mech', { gap: 0.55, freq: 2600 }, 0.5),
  reload_smg: fx('mech', { gap: 0.8, freq: 2200 }, 0.5),
  reload_rifle: fx('mech', { gap: 1.1, freq: 1800 }, 0.55),
  dry_fire: fx('click', { freq: 5000, decay: 0.02 }, 0.5, 0.1),
  swap: fx('mech', { gap: 0.12, freq: 3000 }, 0.35),
  melee_swing: fx('noise', { freq: 600, sweepTo: 1800, q: 1, attack: 0.02, decay: 0.18, type: 1 }, 0.4),
  melee_hit: fx('gun', { freq: 500, thump: 80, decay: 0.12, crack: 0.2 }, 0.7),
  impact_hard: fx('click', { freq: 2500, decay: 0.05 }, 0.25, 0.02),
  impact_flesh: fx('noise', { freq: 400, q: 1, attack: 0.002, decay: 0.08, type: 0 }, 0.4, 0.02),
  impact_metal: fx('tone', { f0: 2400, f1: 1900, decay: 0.12, wave: 2 }, 0.2, 0.02),
  hitmarker: ui('click', { freq: 4200, decay: 0.02 }, 0.25),
  killmarker: ui('chord', { n0: 520, n1: 780, decay: 0.2 }, 0.35),
  headshot: ui('tone', { f0: 1800, f1: 2600, decay: 0.08, wave: 2 }, 0.3),
  roll: fx('noise', { freq: 300, q: 0.8, attack: 0.05, decay: 0.35, type: 0 }, 0.5),
  footstep_grass: fx('noise', { freq: 900, q: 0.7, attack: 0.005, decay: 0.07, type: 1 }, 0.12, 0.12),
  footstep_rock: fx('noise', { freq: 1500, q: 1.5, attack: 0.002, decay: 0.05, type: 1 }, 0.14, 0.12),
  footstep_metal: fx('tone', { f0: 300, f1: 180, decay: 0.07, wave: 2 }, 0.1, 0.12),
  footstep_snow: fx('noise', { freq: 2200, q: 0.5, attack: 0.01, decay: 0.09, type: 1 }, 0.1, 0.12),
  shield_hit: fx('tone', { f0: 1200, f1: 500, decay: 0.12, wave: 3 }, 0.35, 0.05),
  health_hit: fx('noise', { freq: 250, q: 1, attack: 0.003, decay: 0.15, type: 0 }, 0.55, 0.05),
  shield_break: fx('noise', { freq: 3000, sweepTo: 300, q: 2, attack: 0.002, decay: 0.45, type: 1 }, 0.6),
  shield_recharge: fx('tone', { f0: 300, f1: 1200, decay: 0.6, wave: 0, attack: 0.3 }, 0.25),
  medkit: fx('chord', { n0: 440, n1: 660, n2: 880, decay: 0.5 }, 0.35),
  heartbeat: { recipe: 'heartbeat', bus: 'effects', volume: 0.7, minGap: 0.7 } as SoundDef,
  death: fx('tone', { f0: 220, f1: 40, decay: 1.4, wave: 1 }, 0.5),
  knockdown: fx('gun', { freq: 300, thump: 60, decay: 0.3, crack: 0.1 }, 0.8),
  stalker_screech: fx('growl', { f0: 900, f1: 1600, dur: 0.4, rate: 40, cutoff: 3000 }, 0.4, 0.15),
  stalker_lunge: fx('growl', { f0: 500, f1: 300, dur: 0.25, rate: 25, cutoff: 2000 }, 0.35, 0.1),
  spitter_gurgle: fx('growl', { f0: 120, f1: 220, dur: 1.1, rate: 14, cutoff: 700 }, 0.55, 0.3),
  spitter_spit: fx('noise', { freq: 700, sweepTo: 200, q: 2, attack: 0.01, decay: 0.3, type: 1 }, 0.5),
  acid_splash: fx('noise', { freq: 1800, q: 0.7, attack: 0.01, decay: 0.5, type: 1 }, 0.4, 0.1),
  alpha_roar: fx('growl', { f0: 90, f1: 60, dur: 0.9, rate: 22, cutoff: 900 }, 0.9, 0.3),
  alpha_howl: fx('growl', { f0: 200, f1: 520, dur: 1.6, rate: 6, cutoff: 1800 }, 0.8, 0.5),
  alpha_swipe: fx('growl', { f0: 140, f1: 100, dur: 0.5, rate: 30, cutoff: 1100 }, 0.7, 0.2),
  raider_bark: fx('growl', { f0: 180, f1: 140, dur: 0.35, rate: 9, cutoff: 1400 }, 0.45, 0.4),
  rusher_shout: fx('growl', { f0: 240, f1: 320, dur: 0.6, rate: 11, cutoff: 1800 }, 0.55, 0.4),
  raider_fire: fx('gun', { freq: 1800, thump: 120, decay: 0.12, crack: 0.5 }, 0.4, 0.03),
  scatter_fire: fx('gun', { freq: 900, thump: 70, decay: 0.3, crack: 0.9 }, 0.6),
  marksman_charge: fx('tone', { f0: 300, f1: 1400, decay: 1.5, wave: 0, attack: 1.4 }, 0.35, 0.5),
  marksman_fire: fx('gun', { freq: 1100, thump: 70, decay: 0.5, crack: 1.2 }, 0.75),
  foreman_spinup: fx('tone', { f0: 60, f1: 420, decay: 1.0, wave: 1, attack: 0.9 }, 0.6, 0.5),
  foreman_cannon: fx('gun', { freq: 1600, thump: 90, decay: 0.07, crack: 0.4 }, 0.35, 0.06),
  foreman_stomp_windup: fx('tone', { f0: 120, f1: 60, decay: 0.6, wave: 1, attack: 0.5 }, 0.6),
  foreman_stomp: fx('gun', { freq: 200, thump: 45, decay: 0.6, crack: 0.2 }, 1.0),
  mortar_warn: fx('tone', { f0: 900, f1: 900, decay: 0.25, wave: 3 }, 0.35, 0.2),
  mortar_hit: fx('gun', { freq: 400, thump: 50, decay: 0.8, crack: 0.6 }, 0.9),
  heatsink_open: fx('noise', { freq: 1200, sweepTo: 400, q: 1, attack: 0.05, decay: 0.8, type: 1 }, 0.6),
  enemy_death_creature: fx('growl', { f0: 400, f1: 120, dur: 0.6, rate: 18, cutoff: 1400 }, 0.45, 0.1),
  enemy_death_raider: fx('growl', { f0: 200, f1: 90, dur: 0.5, rate: 8, cutoff: 1000 }, 0.4, 0.1),
  harvest_beam: fx('tone', { f0: 600, f1: 1200, decay: 1.0, wave: 3, attack: 0.1 }, 0.25, 0.5),
  pickup: fx('chord', { n0: 990, n1: 1480, decay: 0.15 }, 0.3),
  beacon_fire: fx('tone', { f0: 80, f1: 900, decay: 2.5, wave: 1, attack: 0.4 }, 0.7),
  door_open: fx('noise', { freq: 500, sweepTo: 200, q: 1, attack: 0.1, decay: 0.6, type: 0 }, 0.45),
  shuttle_thrust: fx('noise', { freq: 300, q: 0.6, attack: 0.6, decay: 2.4, type: 0 }, 0.6),
  alarm: { recipe: 'alarm', bus: 'effects', volume: 0.5 } as SoundDef,
  checkpoint: ui('chord', { n0: 523, n1: 784, decay: 0.4 }, 0.3),
  objective: ui('chord', { n0: 587, n1: 880, n2: 1175, decay: 0.45 }, 0.22),
  ship_boost: fx('noise', { freq: 200, sweepTo: 900, q: 1, attack: 0.1, decay: 0.8, type: 0 }, 0.4, 0.6),
  warning: ui('tone', { f0: 700, f1: 700, decay: 0.3, wave: 3 }, 0.35),
} satisfies Record<string, SoundDef>;

export type SoundId = keyof typeof SOUNDS;
