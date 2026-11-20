import type { Prim } from './level';
import { BRIDGE } from '../data/layouts';

const WALL = 0x6a7a8c, PANEL = 0x7a8a9c, DARK = 0x2e3844, AMBER = 0xf2a541, FLOOR = 0x4a5664, CONSOLE = 0x4a5868;
/** Ceiling light panels: bright enough to read as lights, dim enough not to bloom out. */
const LIGHT = 0x7d8ca4;
/** Recessed wall panels. */
const INSET = 0x4e5a68;
/** Small console status lights. */
const LED_A = 0x2a7ab8, LED_B = 0x2a9a7a;

/** Bridge geometry from the layout table. */
export function bridgePrims(): Prim[] {
  const B = BRIDGE;
  const H = B.height;
  const p: Prim[] = [
    { kind: 'box', x: 0, y: -0.2, z: 0, w: B.halfX * 2 + 1, h: 0.2, d: B.halfZ * 2 + 1, color: FLOOR, walk: true, mat: 'metal' },
    { kind: 'box', x: 0, y: H, z: 0, w: B.halfX * 2 + 1, h: 0.3, d: B.halfZ * 2 + 1, color: 0x27303a, noShadow: true },
    // Side walls.
    { kind: 'box', x: -B.halfX - 0.25, y: 0, z: 0, w: 0.5, h: H, d: B.halfZ * 2, color: WALL, mat: 'metal' },
    { kind: 'box', x: B.halfX + 0.25, y: 0, z: 0, w: 0.5, h: H, d: B.halfZ * 2, color: WALL, mat: 'metal' },
    // Aft wall with door frame.
    { kind: 'box', x: -3.6, y: 0, z: B.halfZ + 0.25, w: 5.2, h: H, d: 0.5, color: WALL, mat: 'metal' },
    { kind: 'box', x: 3.6, y: 0, z: B.halfZ + 0.25, w: 5.2, h: H, d: 0.5, color: WALL, mat: 'metal' },
    { kind: 'box', x: 0, y: 2.6, z: B.halfZ + 0.25, w: 2.0, h: H - 2.6, d: 0.5, color: WALL, mat: 'metal' },
    { kind: 'box', id: 'door', x: 0, y: 0, z: B.halfZ + 0.35, w: 2.0, h: 2.6, d: 0.2, color: 0x56636f, mat: 'metal' },
    { kind: 'box', x: 0, y: 2.6, z: B.halfZ + 0.0, w: 2.2, h: 0.08, d: 0.1, color: AMBER, emissive: AMBER, noShadow: true },
    // Forward wall: viewport between x = -5 and 5, struts at the ends.
    { kind: 'box', x: -5.6, y: 0, z: B.viewport.z - 0.25, w: 1.2, h: H, d: 0.5, color: WALL, mat: 'metal' },
    { kind: 'box', x: 5.6, y: 0, z: B.viewport.z - 0.25, w: 1.2, h: H, d: 0.5, color: WALL, mat: 'metal' },
    { kind: 'box', x: 0, y: 0, z: B.viewport.z - 0.25, w: 10, h: 0.25, d: 0.5, color: DARK, mat: 'metal' },
    { kind: 'box', id: 'glass', x: 0, y: 0.25, z: B.viewport.z - 0.3, w: 10, h: H - 0.25, d: 0.1, color: 0x9fc4e8, mat: 'glass', noShadow: true },
    { kind: 'box', x: -2.5, y: 0.25, z: B.viewport.z - 0.3, w: 0.12, h: H - 0.25, d: 0.2, color: DARK, mat: 'metal', noNav: true },
    { kind: 'box', x: 2.5, y: 0.25, z: B.viewport.z - 0.3, w: 0.12, h: H - 0.25, d: 0.2, color: DARK, mat: 'metal', noNav: true },
    // Ceiling ribs and amber accent strips.
    { kind: 'box', x: -B.halfX + 0.05, y: 1.1, z: 0, w: 0.06, h: 0.06, d: B.halfZ * 2 - 1, color: AMBER, emissive: AMBER, noShadow: true, solid: false },
    { kind: 'box', x: B.halfX - 0.05, y: 1.1, z: 0, w: 0.06, h: 0.06, d: B.halfZ * 2 - 1, color: AMBER, emissive: AMBER, noShadow: true, solid: false },
    { kind: 'box', x: 0, y: 0.01, z: 0, w: 0.15, h: 0.02, d: 12, color: AMBER, emissive: 0x6a4010, noShadow: true, solid: false },
    // Ceiling light panels.
    { kind: 'box', x: 0, y: H - 0.05, z: -5, w: 3, h: 0.05, d: 0.6, color: 0xdfeaff, emissive: LIGHT, noShadow: true, solid: false },
    { kind: 'box', x: 0, y: H - 0.05, z: 1, w: 3, h: 0.05, d: 0.6, color: 0xdfeaff, emissive: LIGHT, noShadow: true, solid: false },
    { kind: 'box', x: 0, y: H - 0.05, z: 6, w: 3, h: 0.05, d: 0.6, color: 0xdfeaff, emissive: LIGHT, noShadow: true, solid: false },
    // Helm station.
    { kind: 'box', x: B.helm.x, y: 0, z: B.helm.z - 1.0, w: 3.2, h: 0.95, d: 0.9, color: CONSOLE, mat: 'metal' },
    { kind: 'box', x: B.helm.x, y: 0, z: B.helm.z + 0.05, w: 0.7, h: 0.5, d: 0.7, color: DARK },
    { kind: 'box', x: B.helm.x, y: 0.5, z: B.helm.z + 0.4, w: 0.7, h: 0.8, d: 0.15, color: DARK },
    // Map table.
    { kind: 'cyl', x: B.mapTable.x, y: 0, z: B.mapTable.z, r: B.mapTable.r, rTop: B.mapTable.r, h: 0.95, color: CONSOLE, seg: 24, mat: 'metal' },
    { kind: 'cyl', x: B.mapTable.x, y: 0.95, z: B.mapTable.z, r: B.mapTable.r - 0.1, h: 0.04, color: 0x2a5070, emissive: 0x153550, seg: 24, solid: false },
    // Science station against the port wall.
    { kind: 'box', x: B.science.x - 0.55, y: 0, z: B.science.z, w: 0.9, h: 1.0, d: 2.6, color: CONSOLE, mat: 'metal' },
    { kind: 'box', x: B.science.x - 0.85, y: 1.0, z: B.science.z, w: 0.2, h: 1.3, d: 2.4, color: DARK, mat: 'metal' },
    // Armory alcove: partition, weapon rack on the starboard wall, terminal.
    { kind: 'box', x: 4.4, y: 0, z: 3.9, w: 3.2, h: H, d: 0.4, color: WALL, mat: 'metal' },
    { kind: 'box', x: B.halfX - 0.2, y: 0.9, z: B.armory.z - 0.5, w: 0.3, h: 1.6, d: 2.2, color: DARK, mat: 'metal' },
    { kind: 'box', x: B.terminal.x, y: 0, z: B.terminal.z, w: 0.6, h: 1.1, d: 0.8, color: CONSOLE, mat: 'metal' },
    { kind: 'box', x: B.terminal.x + 0.15, y: 1.1, z: B.terminal.z, w: 0.12, h: 0.6, d: 0.8, color: DARK },
    // Port aft lockers and starboard forward console bank.
    { kind: 'box', x: -5.4, y: 0, z: 6, w: 1.0, h: 2.2, d: 3.5, color: PANEL, mat: 'metal' },
    { kind: 'box', x: 5.4, y: 0, z: -4.5, w: 1.0, h: 1.0, d: 3.0, color: CONSOLE, mat: 'metal' },
  ];
  return [...p, ...dressing()];
}

/** Visual-only detail: wall ribs, ceiling beams, floor seams, trim bands and console lights. No colliders. */
function dressing(): Prim[] {
  const B = BRIDGE;
  const H = B.height;
  const d: Prim[] = [];
  const deco = (x: number, y: number, z: number, w: number, h: number, dd: number, color: number, emissive?: number): void => {
    d.push({ kind: 'box', x, y, z, w, h, d: dd, color, emissive, solid: false, noNav: true, noShadow: true });
  };
  // Structural ribs on both side walls, skipping the stations against them.
  for (let z = -7; z <= 7; z += 2) {
    for (const side of [-1, 1]) {
      const x = side * (B.halfX - 0.06);
      // Clear of the lockers, the armory, the science station and the starboard console bank.
      if (z >= 4 || (side < 0 && z >= -4 && z <= 0) || (side > 0 && z >= -6.5 && z <= -2.5)) continue;
      deco(x, 0, z, 0.14, H, 0.22, DARK);
    }
  }
  // Ceiling beams across the room.
  for (let z = -7.5; z <= 7.5; z += 3) deco(0, H - 0.32, z, B.halfX * 2, 0.32, 0.26, DARK);
  // Floor seams and a walkway border.
  for (let z = -8; z <= 8; z += 2) deco(0, 0, z, B.halfX * 2 - 0.2, 0.012, 0.04, DARK);
  for (const x of [-1.6, 1.6]) deco(x, 0, 3.5, 0.04, 0.012, 10, DARK);
  // Kick plates and an upper panel band along the side walls.
  for (const side of [-1, 1]) {
    deco(side * (B.halfX - 0.04), 0, 0, 0.08, 0.28, B.halfZ * 2 - 0.4, DARK);
    deco(side * (B.halfX - 0.04), 2.75, 0, 0.08, 0.35, B.halfZ * 2 - 0.4, PANEL);
  }
  // Aft wall panels either side of the door, with amber door-frame posts.
  for (const x of [-4.4, -2.4, 2.4, 4.4]) deco(x, 0.3, B.halfZ - 0.04, 1.4, 2.6, 0.08, INSET);
  for (const x of [-1.15, 1.15]) deco(x, 0, B.halfZ - 0.06, 0.08, 2.6, 0.08, AMBER, 0x6a4010);
  // Status lights on the consoles.
  for (let i = 0; i < 6; i++) deco(B.helm.x - 1.2 + i * 0.48, 0.96, B.helm.z - 0.62, 0.12, 0.02, 0.06, LED_A, LED_A);
  for (let i = 0; i < 5; i++) deco(B.science.x - 0.15, 1.01, B.science.z - 1.0 + i * 0.5, 0.06, 0.02, 0.12, LED_B, LED_B);
  for (let i = 0; i < 4; i++) deco(5.0, 1.01, -5.6 + i * 0.7, 0.12, 0.02, 0.06, LED_A, LED_A);
  // Light rim around the map table base.
  d.push({ kind: 'cyl', x: B.mapTable.x, y: 0, z: B.mapTable.z, r: B.mapTable.r + 0.12, rTop: B.mapTable.r + 0.12, h: 0.06, color: AMBER, emissive: 0x6a4010, seg: 24, solid: false, noShadow: true });
  return d;
}
