import RAPIER from '@dimforge/rapier3d-compat';
import { SIM } from '../data/tuning';

let ready: Promise<void> | null = null;
/** Load the Rapier WASM module once. */
export function initPhysics(): Promise<void> {
  return (ready ??= RAPIER.init());
}
export { RAPIER };

export interface V3 {
  x: number;
  y: number;
  z: number;
}
export type TagKind = 'terrain' | 'static' | 'cover' | 'gate' | 'player' | 'prop';
export interface ColliderTag {
  kind: TagKind;
  id?: string;
  /** Top height of the piece above its base, for cover classification. */
  height?: number;
}
export interface RayHit {
  toi: number;
  point: V3;
  normal: V3;
  tag: ColliderTag | undefined;
}

const groups = (member: number, filter: number) => ((member & 0xffff) << 16) | (filter & 0xffff);
export const G_STATIC = groups(0x0001, 0xffff);
export const G_PLAYER = groups(0x0002, 0x0001);
/** Query filter: only static world geometry. */
export const Q_STATIC = groups(0xffff, 0x0001);

/** Rapier world wrapper holding static geometry and the player capsule. */
export class PhysicsWorld {
  readonly world: RAPIER.World;
  readonly tags = new Map<number, ColliderTag>();
  private freed = false;
  constructor() {
    this.world = new RAPIER.World({ x: 0, y: SIM.gravity, z: 0 });
    this.world.timestep = 1 / SIM.hz;
  }
  private finish(desc: RAPIER.ColliderDesc, tag: ColliderTag): RAPIER.Collider {
    desc.setCollisionGroups(G_STATIC).setSolverGroups(G_STATIC);
    const c = this.world.createCollider(desc);
    this.tags.set(c.handle, tag);
    return c;
  }
  addBox(c: V3, half: V3, rotY: number, tag: ColliderTag): RAPIER.Collider {
    const d = RAPIER.ColliderDesc.cuboid(half.x, half.y, half.z).setTranslation(c.x, c.y, c.z);
    if (rotY) d.setRotation({ x: 0, y: Math.sin(rotY / 2), z: 0, w: Math.cos(rotY / 2) });
    return this.finish(d, tag);
  }
  addBoxQ(c: V3, half: V3, q: { x: number; y: number; z: number; w: number }, tag: ColliderTag): RAPIER.Collider {
    return this.finish(RAPIER.ColliderDesc.cuboid(half.x, half.y, half.z).setTranslation(c.x, c.y, c.z).setRotation(q), tag);
  }
  addCylinder(c: V3, halfH: number, r: number, tag: ColliderTag): RAPIER.Collider {
    return this.finish(RAPIER.ColliderDesc.cylinder(halfH, r).setTranslation(c.x, c.y, c.z), tag);
  }
  addBall(c: V3, r: number, tag: ColliderTag): RAPIER.Collider {
    return this.finish(RAPIER.ColliderDesc.ball(r).setTranslation(c.x, c.y, c.z), tag);
  }
  addTrimesh(verts: Float32Array, idx: Uint32Array, tag: ColliderTag): RAPIER.Collider {
    return this.finish(RAPIER.ColliderDesc.trimesh(verts, idx), tag);
  }
  remove(c: RAPIER.Collider): void {
    this.tags.delete(c.handle);
    this.world.removeCollider(c, false);
  }
  /** Raycast against static geometry. dir must be normalized. */
  ray(o: V3, dir: V3, max: number): RayHit | null {
    const r = new RAPIER.Ray(o, dir);
    const hit = this.world.castRayAndGetNormal(r, max, true, undefined, Q_STATIC);
    if (!hit) return null;
    const t = hit.timeOfImpact;
    return {
      toi: t,
      point: { x: o.x + dir.x * t, y: o.y + dir.y * t, z: o.z + dir.z * t },
      normal: { x: hit.normal.x, y: hit.normal.y, z: hit.normal.z },
      tag: this.tags.get(hit.collider.handle),
    };
  }
  /** True if the segment a to b is clear of static geometry. */
  clear(a: V3, b: V3): boolean {
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    const len = Math.hypot(dx, dy, dz);
    if (len < 1e-4) return true;
    return !this.ray(a, { x: dx / len, y: dy / len, z: dz / len }, len);
  }
  /** Sphere cast; returns distance travelled before contact, or null. */
  sphereCast(o: V3, dir: V3, radius: number, max: number): number | null {
    const hit = this.world.castShape(o, { x: 0, y: 0, z: 0, w: 1 }, dir, new RAPIER.Ball(radius), 0, max, true, undefined, Q_STATIC);
    return hit ? hit.time_of_impact : null;
  }
  /** Ground height below a point (cast from above). */
  groundAt(x: number, z: number, fromY = 200): number | null {
    const h = this.ray({ x, y: fromY, z }, { x: 0, y: -1, z: 0 }, fromY + 200);
    return h ? h.point.y : null;
  }
  step(): void {
    this.world.step();
  }
  dispose(): void {
    if (this.freed) return;
    this.freed = true;
    this.world.free();
  }
}
