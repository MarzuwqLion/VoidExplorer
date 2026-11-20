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
  zoomStart: 75,
  zoomStep: 1.15,
  /** Zoom distance above which all labels show. */
  zoomLabels: 220,
  /** Planets are drawn at least this big on screen (radius / camera distance), up to this many times true size. */
  planetMinAngle: 0.018,
  planetMaxInflate: 4,
  /** Ship starts between the orbits of Amara and Korr. */
  start: { x: 0, z: 109, heading: 0 },
  shipScale: 0.05,
  returnHold: 0.5,
};

/** Engine trail particles: pool size, emission per second at full throttle, lifetime (s), point size and jitter
 * (map units), nozzle offsets in ship model space after scaling, and hot and cooled colours. */
export const TRAIL = {
  count: 600,
  rate: 120,
  life: 1.2,
  size: 1.1,
  jitter: 0.25,
  nozzles: [[-1.3, -0.05, 3.2], [1.3, -0.05, 3.2]] as [number, number, number][],
  hot: 0xbfe6ff,
  cold: 0x2a5aa0,
};
