/** System map flight and camera values. */
export const MAP = {
  cruise: 32,
  boost: 85,
  accelTime: 0.6,
  turnRate: 6,
  boundary: 440,
  sunWarn: 30,
  sunPush: 60,
  approachMul: 3,
  approachAdd: 8,
  approachSlow: 0.6,
  labelRange: 60,
  tilt: 55,
  zoomMin: 40,
  zoomMax: 900,
  zoomStart: 120,
  zoomStep: 1.15,
  /** Zoom distance above which all labels show. */
  zoomLabels: 350,
  /** Ship starts between the orbits of Amara and Korr. */
  start: { x: 0, z: 109, heading: 0 },
  shipScale: 0.05,
  returnHold: 0.5,
};
