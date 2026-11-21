/**
 * Tuning values. The block at the top holds every value that needs hands-on feel tuning;
 * the debug panel's Tuning tab edits this object live. Paste "Copy as JSON" output back here.
 */
export const FEEL = {
  /** Default camera distance behind the commander (m). */
  camBehind: 2.6,
  /** Default camera offset to the right (m). */
  camRight: 0.55,
  /** Default camera pivot height (m). */
  camHeight: 1.6,
  /** Default field of view (deg). */
  camFov: 70,
  /** Aiming camera distance behind (m). */
  aimBehind: 1.4,
  /** Aiming camera offset to the right (m). */
  aimRight: 0.6,
  /** Aiming camera height (m). */
  aimHeight: 1.6,
  /** Aiming field of view (deg). */
  aimFov: 50,
  /** Time to blend into aim framing (s). */
  aimBlend: 0.15,
  /** Roadie run camera distance behind (m). */
  runBehind: 2.2,
  /** Roadie run camera height (m). */
  runHeight: 1.35,
  /** Roadie run field of view (deg). */
  runFov: 78,
  /** Roadie run camera bob amplitude (m). */
  runBob: 0.04,
  /** Dialogue camera field of view (deg). */
  dialogueFov: 45,
  /** Dialogue camera blend time (s). */
  dialogueBlend: 0.4,
  /** Mouse look, degrees per pixel at sensitivity 1.0. */
  mouseDegPerPx: 0.1,
  /** Mouse look multiplier while aiming. */
  mouseAimMul: 0.6,
  /** Gamepad horizontal look at full tilt (deg/s). */
  padYawSpeed: 200,
  /** Gamepad vertical look at full tilt (deg/s). */
  padPitchSpeed: 120,
  /** Gamepad look response curve exponent. */
  padCurve: 1.8,
  /** Gamepad look multiplier while aiming. */
  padAimMul: 0.55,
  /** Gamepad aim slowdown multiplier near enemies. */
  padSlowdown: 0.6,
  /** Aim slowdown angle around an enemy (deg). */
  padSlowdownDeg: 1.5,
  /** Stick radial dead zone. */
  deadZone: 0.15,
  /** Trigger press threshold. */
  triggerThreshold: 0.3,
  /** Walk speed (m/s). */
  walkSpeed: 2.0,
  /** Jog speed (m/s). */
  jogSpeed: 4.5,
  /** Roadie run speed (m/s). */
  runSpeed: 7.0,
  /** Roadie run turn rate (deg/s). */
  runTurnRate: 180,
  /** Aim walk speed (m/s). */
  aimWalkSpeed: 2.2,
  /** Crouch walk speed (m/s). */
  crouchSpeed: 2.2,
  /** Time to reach full speed (s). */
  accelTime: 0.15,
  /** Time to stop from full speed (s). */
  stopTime: 0.12,
  /** Dodge roll distance (m). */
  rollDistance: 5,
  /** Dodge roll duration (s). */
  rollTime: 0.55,
  /** Dodge roll invulnerable window (s). */
  rollInvuln: 0.3,
  /** Dodge roll cooldown (s). */
  rollCooldown: 0.8,
  /** Turn speed toward movement direction when not aiming (deg/s). */
  turnRate: 720,
  /** Recoil (camera kick) multiplier applied to every weapon. */
  recoilScale: 1.0,
  /** Spread multiplier applied to every weapon. */
  spreadScale: 1.0,
  /** Camera kick recovery speed (fraction per second). */
  kickRecovery: 8,
  /** Screen shake multiplier. */
  shakeScale: 1.0,
};
export type FeelKey = keyof typeof FEEL;
export const FEEL_DEFAULTS: Readonly<typeof FEEL> = { ...FEEL };

/** Slider ranges for the tuning panel: [min, max, step]. */
export const FEEL_RANGES: Partial<Record<FeelKey, [number, number, number]>> = {
  camFov: [40, 100, 1],
  aimFov: [30, 80, 1],
  runFov: [50, 100, 1],
  dialogueFov: [25, 70, 1],
  mouseDegPerPx: [0.02, 0.3, 0.005],
  padYawSpeed: [60, 400, 5],
  padPitchSpeed: [40, 300, 5],
  padCurve: [1, 3, 0.05],
  turnRate: [180, 1440, 10],
  runTurnRate: [60, 540, 5],
  kickRecovery: [1, 20, 0.5],
};

/** Simulation. */
export const SIM = {
  hz: 60,
  maxStepsPerFrame: 5,
  gravity: -20,
  maxSlopeDeg: 40,
  stepHeight: 0.35,
};

/** Commander body. */
export const BODY = {
  height: 1.8,
  radius: 0.35,
  crouchHeight: 1.1,
  coverPopTime: 0.2,
  lowCoverMin: 1.0,
  lowCoverMax: 1.4,
  leanDistance: 0.4,
  cameraFadeDist: 0.6,
  pitchMin: -60,
  pitchMax: 70,
  lightTilt: 0.5,
};

/** Input settings ranges. */
export const INPUT = {
  sensMin: 0.2,
  sensMax: 3.0,
  interactRange: 2.2,
  interactAngle: 60,
  returnHold: 0.5,
};

/** Melee. */
export const MELEE = { damage: 50, reach: 1.8, arcDeg: 60, time: 0.6, hitAt: 0.25 };

/** Survivability. */
export const SURVIVAL = {
  shield: 100,
  shieldRegenRate: 30,
  shieldRegenDelay: 4,
  health: 100,
  medkits: 2,
  medkitHeal: 60,
  medkitTime: 1.5,
  lowHealth: 25,
  deathFade: 1.5,
  knockdownTime: 1.0,
  getupTime: 0.4,
};

/** Weapon handling. */
export const HANDLING = { swapTime: 0.35, spreadDecay: 0.4, muzzleBlockDist: 0.6 };

/** Harvesting. */
export const HARVEST = { holdTime: 1.0, compassRange: 25 };

/** Transitions (s). */
export const TRANSITIONS = { landing: 4, takeoff: 3, fade: 0.4, introCard: 9 };

/** Rendering budget. */
export const RENDER = { maxPixelRatio: 1.5, shadowMapSize: 2048, maxDrawCalls: 300, maxActiveEnemies: 12 };

/** Bloom post-processing. */
export const BLOOM = { strength: 0.45, radius: 0.35, threshold: 0.82 };

/** Over-the-shoulder dialogue shot: distance behind the commander's head and to the side (m), lift (m), where the
 * speaker sits right of centre (deg), how far left of centre the commander may sit (deg), collision probe radius (m). */
export const DIALOGUE_CAM = { back: 1.0, side: 0.95, rise: 0.02, speakerDeg: 7, commanderMaxDeg: 26, probe: 0.2, minBack: 0.55 };

/** Snowfall around the commander: flake count, box size and height (m), fall and drift speed (m/s), point size,
 * how far below the commander the box starts, and the lift above the floor for the roof probe (m). */
/** Visual-only slabs at least this high (m) and this large (m2) count as roofs that keep snow out. */
export const SNOW_ROOF = { minHeight: 2.5, minArea: 4 };
export const SNOW = { count: 1500, box: 60, height: 25, fall: 2.2, drift: 1.2, size: 0.035, below: 5, probeLift: 0.3 };

/** Text typing speed for dialogue (chars per second). */
export const DIALOGUE = { charsPerSecond: 60 };

/** Faces: blink interval (s) plus per-character jitter, blink length (s), closed eye scale, brow lift while talking (m),
 * and how far a speaker's head turns (rad) toward the commander beyond the body. */
export const FACE = { blinkEvery: 3.4, blinkJitter: 2.2, blinkTime: 0.14, closedScale: 0.12, browLift: 0.004, headYaw: 0.7, headPitch: 0.35 };

/** Conversation lighting: a warm key in front of the speaker, off to the side away from the commander, and a cool rim
 * behind the speaker. Intensities, range (m), placement offsets from the speaker's head (m) and fade rate (1/s). */
export const DIALOGUE_LIGHT = { key: 1.8, rim: 2.2, range: 2.5, keyColor: 0xfff1e0, rimColor: 0xa8ccff, keyDist: 0.9, keySide: 0.6, keyUp: 0.35, rimBack: 0.5, rimUp: 0.45, fade: 3 };

/** Area boundary. */
export const BOUNDARY = { warnTime: 5 };
