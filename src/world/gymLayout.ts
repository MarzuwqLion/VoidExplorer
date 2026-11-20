import type { Prim } from './level';

/** Test gym: slopes, steps, low cover, tall cover and a wall for camera tests. */
export const GYM = {
  half: 50,
  spawn: { x: 0, z: 10, yaw: 0 },
  dummies: [
    { x: -6, z: -14, kind: 'flesh' as const },
    { x: 0, z: -18, kind: 'shield' as const },
    { x: 6, z: -14, kind: 'armor' as const },
  ],
};

export function gymPrims(): Prim[] {
  const G = 0x4a5560, C = 0x8a6a3a, W = 0x5c6670;
  const p: Prim[] = [
    { kind: 'box', x: 0, y: -1, z: 0, w: 100, h: 1, d: 100, color: 0x39424a, walk: true },
    // Perimeter.
    { kind: 'box', x: 0, y: 0, z: -50.5, w: 102, h: 4, d: 1, color: W },
    { kind: 'box', x: 0, y: 0, z: 50.5, w: 102, h: 4, d: 1, color: W },
    { kind: 'box', x: -50.5, y: 0, z: 0, w: 1, h: 4, d: 102, color: W },
    { kind: 'box', x: 50.5, y: 0, z: 0, w: 1, h: 4, d: 102, color: W },
    // Cover field to the north for enemy tests.
    ...coverField(),
    // Marksman tower with a ramp.
    { kind: 'box', x: 0, y: 0, z: -46, w: 6, h: 6, d: 4, color: G, walk: true },
    { kind: 'ramp', x0: 10, z0: -46, y0: 0, x1: 3, z1: -46, y1: 6, width: 3, color: G },
    // Walkable 30 degree ramp up to a platform, and a 50 degree ramp that cannot be climbed.
    { kind: 'ramp', x0: -20, z0: 8, y0: 0, x1: -20, z1: 1.07, y1: 4, width: 4, color: G },
    { kind: 'box', x: -20, y: 0, z: -2, w: 4, h: 4, d: 6, color: G, walk: true },
    { kind: 'ramp', x0: -14, z0: 6, y0: 0, x1: -14, z1: 2.64, y1: 4, width: 3, color: 0x7a4a4a },
    // Steps: 0.3 m (climbable) and 0.5 m (blocked).
    { kind: 'box', x: 18, y: 0, z: 6, w: 4, h: 0.3, d: 2, color: G, walk: true },
    { kind: 'box', x: 18, y: 0, z: 4.5, w: 4, h: 0.6, d: 1.5, color: G, walk: true },
    { kind: 'box', x: 18, y: 0, z: 3, w: 4, h: 0.9, d: 1.5, color: G, walk: true },
    { kind: 'box', x: 24, y: 0, z: 6, w: 4, h: 0.5, d: 2, color: 0x7a4a4a, walk: true },
    // Low cover (1.0 to 1.4 m) and tall cover.
    { kind: 'box', x: -6, y: 0, z: -4, w: 3, h: 1.2, d: 0.6, color: C, cover: true },
    { kind: 'box', x: 0, y: 0, z: -4, w: 3, h: 1.0, d: 0.6, color: C, cover: true },
    { kind: 'box', x: 6, y: 0, z: -4, w: 3, h: 1.4, d: 0.6, color: C, cover: true },
    { kind: 'box', x: -10, y: 0, z: -8, w: 2, h: 2.6, d: 0.8, color: W, cover: true },
    { kind: 'box', x: 10, y: 0, z: -8, w: 2, h: 2.6, d: 0.8, color: W, cover: true },
    // Camera test wall and corner.
    { kind: 'box', x: 0, y: 0, z: 18, w: 12, h: 3.5, d: 0.6, color: W },
    { kind: 'box', x: 6, y: 0, z: 21, w: 0.6, h: 3.5, d: 6, color: W },
  ];
  return p;
}

function coverField(): Prim[] {
  const out: Prim[] = [];
  const C = 0x8a6a3a, K = 0x4a6a8a;
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 3; j++) {
      const x = -30 + i * 12 + (j % 2) * 6, z = -24 - j * 7;
      out.push(j === 1 ? { kind: 'box', x, y: 0, z, w: 2.4, h: 2.6, d: 6, color: K, cover: true } : { kind: 'box', x, y: 0, z, w: 4, h: 1.2, d: 0.7, color: C, cover: true });
    }
  }
  return out;
}
