/** Authoritative coordinates from spec sections 8 and 10. Scenes and the top-down map build from this file. */

export interface XZ {
  x: number;
  z: number;
}

/** Bridge: origin at floor center, +x starboard, -z forward. */
export const BRIDGE = {
  halfX: 6,
  halfZ: 9,
  height: 4,
  viewport: { z: -9, x0: -5, x1: 5 },
  helm: { x: 0, z: -6.5 },
  mapTable: { x: 0, z: -1, r: 1.5 },
  xo: { x: 1.8, z: -1.5 },
  science: { x: -5, z: -2 },
  armory: { x: 4.5, z: 5.5 },
  terminal: { x: 5.5, z: 6.5 },
  door: { x: 0, z: 8 },
  spawn: { x: 0, z: 8, yaw: 0 },
};
