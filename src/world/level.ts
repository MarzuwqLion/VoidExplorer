import { PhysicsWorld, type V3, type TagKind } from './physics';
import type { NavBlocker, WalkSurface } from '../ai/navgrid';

export type MatKind = 'metal' | 'rock' | 'concrete' | 'organic' | 'fabric' | 'glow' | 'glass' | 'ground';
interface Common {
  id?: string;
  color: number;
  /** Base height. Undefined means "on the terrain". */
  y?: number;
  solid?: boolean;
  cover?: boolean;
  mat?: MatKind;
  emissive?: number;
  /** Excluded from nav blocking (e.g. thin decor). */
  noNav?: boolean;
  /** Visual only, no shadow casting. */
  noShadow?: boolean;
}
export interface BoxPrim extends Common {
  kind: 'box';
  x: number;
  z: number;
  w: number;
  h: number;
  d: number;
  rotY?: number;
  /** Top surface is walkable. */
  walk?: boolean;
}
export interface CylPrim extends Common {
  kind: 'cyl';
  x: number;
  z: number;
  r: number;
  h: number;
  rTop?: number;
  seg?: number;
}
export interface RockPrim extends Common {
  kind: 'rock';
  x: number;
  z: number;
  w: number;
  h: number;
  d: number;
  rotY?: number;
  seed: number;
}
export interface RampPrim extends Common {
  kind: 'ramp';
  x0: number;
  z0: number;
  y0: number;
  x1: number;
  z1: number;
  y1: number;
  width: number;
  thickness?: number;
}
export interface TreePrim extends Common {
  kind: 'tree';
  x: number;
  z: number;
  h: number;
  r: number;
  seed: number;
  canopy: number;
  style: 'fan' | 'pole' | 'dead';
}
export type Prim = BoxPrim | CylPrim | RockPrim | RampPrim | TreePrim;

/** A cover piece for AI cover points and pop-up checks. */
export interface CoverPiece {
  x: number;
  z: number;
  y: number;
  hw: number;
  hd: number;
  rotY: number;
  h: number;
  id?: string;
}

export interface LevelData {
  prims: Prim[];
  covers: CoverPiece[];
  blockers: NavBlocker[];
  walkSurfaces: WalkSurface[];
  gates: Map<string, { prim: BoxPrim; collider: import('@dimforge/rapier3d-compat').Collider | null }>;
}

/** Resolve base heights and add colliders for every solid primitive. */
export function buildLevel(prims: Prim[], physics: PhysicsWorld, groundAt: (x: number, z: number) => number): LevelData {
  const covers: CoverPiece[] = [];
  const blockers: NavBlocker[] = [];
  const walkSurfaces: WalkSurface[] = [];
  const gates: LevelData['gates'] = new Map();
  for (const p of prims) {
    if (p.kind === 'ramp') {
      const dx = p.x1 - p.x0, dz = p.z1 - p.z0, dy = p.y1 - p.y0;
      const len = Math.hypot(dx, dz);
      const slopeLen = Math.hypot(len, dy);
      const th = p.thickness ?? 0.4;
      const yaw = Math.atan2(-dx, -dz);
      const pitch = Math.atan2(dy, len);
      const c: V3 = { x: (p.x0 + p.x1) / 2, y: (p.y0 + p.y1) / 2 - th / 2, z: (p.z0 + p.z1) / 2 };
      const q = quatYawPitch(yaw, pitch);
      physics.addBoxQ(c, { x: p.width / 2, y: th / 2, z: slopeLen / 2 }, q, { kind: 'static', id: p.id });
      const ux = dx / len, uz = dz / len;
      walkSurfaces.push({
        contains: (x, z) => {
          const t = ((x - p.x0) * ux + (z - p.z0) * uz) / len;
          const s = Math.abs((x - p.x0) * -uz + (z - p.z0) * ux);
          return t >= 0 && t <= 1 && s <= p.width / 2;
        },
        heightAt: (x, z) => p.y0 + dy * Math.min(1, Math.max(0, ((x - p.x0) * ux + (z - p.z0) * uz) / len)),
      });
      continue;
    }
    if (p.y === undefined) p.y = groundAt(p.x, p.z);
    const y = p.y;
    const solid = p.solid !== false;
    const tagKind: TagKind = p.cover ? 'cover' : 'static';
    if (p.kind === 'box') {
      const rot = p.rotY ?? 0;
      let col = null;
      if (solid) col = physics.addBox({ x: p.x, y: y + p.h / 2, z: p.z }, { x: p.w / 2, y: p.h / 2, z: p.d / 2 }, rot, { kind: tagKind, id: p.id, height: p.h });
      if (p.id?.startsWith('gate') || p.id?.startsWith('vault')) gates.set(p.id, { prim: p, collider: col });
      if (p.walk) {
        const c = Math.cos(rot), s = Math.sin(rot);
        walkSurfaces.push({
          contains: (x, z) => {
            const lx = (x - p.x) * c - (z - p.z) * s, lz = (x - p.x) * s + (z - p.z) * c;
            return Math.abs(lx) <= p.w / 2 && Math.abs(lz) <= p.d / 2;
          },
          heightAt: () => y + p.h,
        });
      } else if (solid && !p.noNav && p.h > 0.35 && !p.id?.startsWith('gate') && !p.id?.startsWith('vault')) {
        blockers.push({ kind: 'rect', x: p.x, z: p.z, hw: p.w / 2, hd: p.d / 2, rotY: rot, id: p.id });
      }
      if (p.cover) covers.push({ x: p.x, z: p.z, y, hw: p.w / 2, hd: p.d / 2, rotY: rot, h: p.h, id: p.id });
    } else if (p.kind === 'cyl') {
      if (solid) physics.addCylinder({ x: p.x, y: y + p.h / 2, z: p.z }, p.h / 2, Math.max(p.r, p.rTop ?? 0), { kind: tagKind, id: p.id, height: p.h });
      if (solid && !p.noNav && p.h > 0.35) blockers.push({ kind: 'circle', x: p.x, z: p.z, r: Math.max(p.r, p.rTop ?? 0) });
      if (p.cover) covers.push({ x: p.x, z: p.z, y, hw: p.r * 0.8, hd: p.r * 0.8, rotY: 0, h: p.h, id: p.id });
    } else if (p.kind === 'rock') {
      const rot = p.rotY ?? 0;
      if (solid) physics.addBox({ x: p.x, y: y + p.h / 2, z: p.z }, { x: p.w * 0.45, y: p.h / 2, z: p.d * 0.45 }, rot, { kind: tagKind, id: p.id, height: p.h });
      if (solid && !p.noNav && p.h > 0.35) blockers.push({ kind: 'rect', x: p.x, z: p.z, hw: p.w * 0.45, hd: p.d * 0.45, rotY: rot });
      if (p.cover) covers.push({ x: p.x, z: p.z, y, hw: p.w * 0.45, hd: p.d * 0.45, rotY: rot, h: p.h, id: p.id });
    } else if (p.kind === 'tree') {
      if (solid) physics.addCylinder({ x: p.x, y: y + p.h / 2, z: p.z }, p.h / 2, p.r, { kind: 'static', height: p.h });
      if (solid) blockers.push({ kind: 'circle', x: p.x, z: p.z, r: p.r });
    }
  }
  return { prims, covers, blockers, walkSurfaces, gates };
}

export function quatYawPitch(yaw: number, pitch: number): { x: number; y: number; z: number; w: number } {
  // q = qYaw * qPitch (pitch about local X).
  const cy = Math.cos(yaw / 2), sy = Math.sin(yaw / 2);
  const cp = Math.cos(pitch / 2), sp = Math.sin(pitch / 2);
  return { x: cy * sp, y: sy * cp, z: -sy * sp, w: cy * cp };
}

/** Open a gate: remove its collider and reopen its nav cells. */
export function openGate(level: LevelData, physics: PhysicsWorld, id: string, nav?: import('../ai/navgrid').NavGrid): boolean {
  const g = level.gates.get(id);
  if (!g || !g.collider) return false;
  physics.remove(g.collider);
  g.collider = null;
  nav?.setClosed(gateBlocker(g.prim), false);
  return true;
}
export function gateBlocker(p: BoxPrim): import('../ai/navgrid').NavBlocker {
  return { kind: 'rect', x: p.x, z: p.z, hw: p.w / 2, hd: p.d / 2, rotY: p.rotY ?? 0 };
}
