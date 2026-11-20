import type { CoverPiece } from '../world/level';
import type { PhysicsWorld } from '../world/physics';
import type { NavGrid } from './navgrid';
import { AI } from '../data/enemies';
import { BODY } from '../data/tuning';

export interface CoverPoint {
  x: number;
  z: number;
  y: number;
  /** Outward normal of the face (points away from the cover). */
  nx: number;
  nz: number;
  low: boolean;
  owner: number;
}

/** Cover points 0.6 m from each face of every cover piece, spaced along long faces. */
export function buildCoverPoints(covers: CoverPiece[], nav: NavGrid): CoverPoint[] {
  const out: CoverPoint[] = [];
  for (const c of covers) {
    const cs = Math.cos(c.rotY), sn = Math.sin(c.rotY);
    const toWorld = (lx: number, lz: number) => ({ x: c.x + lx * cs + lz * sn, z: c.z - lx * sn + lz * cs });
    const faces: [number, number, number, number, number][] = [
      // local normal x, z, half-extent along the face, offset to face
      [1, 0, c.hd, c.hw, 0],
      [-1, 0, c.hd, c.hw, 0],
      [0, 1, c.hw, c.hd, 1],
      [0, -1, c.hw, c.hd, 1],
    ];
    for (const [lnx, lnz, halfLen, off, along] of faces) {
      const n = Math.max(1, Math.floor((halfLen * 2) / AI.coverSpacing));
      for (let i = 0; i < n; i++) {
        const s = -halfLen + ((i + 0.5) / n) * halfLen * 2;
        const lx = along ? s : lnx * (off + AI.coverOffset);
        const lz = along ? lnz * (off + AI.coverOffset) : s;
        const raw = toWorld(lx, lz);
        // Agent inflation can block the exact spot; snap to the nearest walkable cell close by.
        const p = nav.nearestWalkable(raw.x, raw.z, 0.6);
        if (!p || Math.hypot(p.x - raw.x, p.z - raw.z) > 0.6) continue;
        const nWorld = toWorld(lnx, lnz);
        out.push({ x: p.x, z: p.z, y: nav.heightAt(p.x, p.z), nx: nWorld.x - c.x, nz: nWorld.z - c.z, low: c.h <= BODY.lowCoverMax + 0.05, owner: -1 });
      }
    }
  }
  return out;
}

/** True when cover sits between the point and the target at crouch height. */
export function coverBlocks(p: CoverPoint, tx: number, ty: number, tz: number, physics: PhysicsWorld): boolean {
  return !physics.clear({ x: p.x, y: p.y + 0.8, z: p.z }, { x: tx, y: ty, z: tz });
}

/** Nearest free cover point to (x,z) that blocks the line to the target, within maxDist. */
export function pickCover(points: CoverPoint[], x: number, z: number, tx: number, ty: number, tz: number, physics: PhysicsWorld, self: number, opts: { maxDist?: number; minTargetDist?: number; maxTargetDist?: number; prefer?: 'near' | 'closer'; lowOnly?: boolean } = {}): CoverPoint | null {
  const maxD = opts.maxDist ?? 25;
  const cands = points
    .filter((p) => (p.owner === -1 || p.owner === self) && (!opts.lowOnly || p.low))
    .map((p) => ({ p, d: Math.hypot(p.x - x, p.z - z), td: Math.hypot(p.x - tx, p.z - tz) }))
    .filter((c) => c.d <= maxD && c.td >= (opts.minTargetDist ?? 6) && c.td <= (opts.maxTargetDist ?? 60))
    // The face must point toward the target side.
    .filter((c) => (tx - c.p.x) * c.p.nx + (tz - c.p.z) * c.p.nz < 0)
    .sort((a, b) => (opts.prefer === 'closer' ? a.td + a.d * 0.3 - (b.td + b.d * 0.3) : a.d - b.d));
  for (const c of cands.slice(0, 12)) if (coverBlocks(c.p, tx, ty, tz, physics)) return c.p;
  return null;
}
