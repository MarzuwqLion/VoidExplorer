import * as THREE from 'three';
import type { WalkWorld } from '../world/walkWorld';
import type { CoverPoint } from '../ai/cover';

/** Debug overlays: nav grid and cover points, collider wireframes. */
export class DebugOverlay {
  readonly group = new THREE.Group();
  private nav: THREE.Points | null = null;
  private cols: THREE.Group | null = null;
  constructor(
    private world: WalkWorld,
    private cover: () => CoverPoint[],
  ) {}
  update(showNav: boolean, showColliders: boolean): void {
    if (showNav && !this.nav) this.nav = this.buildNav();
    if (this.nav) this.nav.visible = showNav;
    if (showColliders && !this.cols) this.cols = this.buildColliders();
    if (this.cols) this.cols.visible = showColliders;
  }
  private buildNav(): THREE.Points {
    const n = this.world.nav;
    const pos: number[] = [], col: number[] = [];
    const p = this.world.player.pos;
    for (let j = 0; j < n.h; j++)
      for (let i = 0; i < n.w; i++) {
        const k = j * n.w + i;
        const c = n.center(k);
        if (Math.hypot(c.x - p.x, c.z - p.z) > 60) continue;
        if (!n.walk[k]) continue;
        pos.push(c.x, n.height[k] + 0.05, c.z);
        col.push(0.2, 0.8, 0.4);
      }
    for (const cp of this.cover()) {
      pos.push(cp.x, cp.y + 0.3, cp.z);
      col.push(cp.low ? 1 : 0.4, 0.7, cp.low ? 0.2 : 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.12, vertexColors: true, depthWrite: false }));
    this.group.add(pts);
    return pts;
  }
  private buildColliders(): THREE.Group {
    const g = new THREE.Group();
    const m = new THREE.LineBasicMaterial({ color: 0xff40ff });
    const box = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0));
    for (const p of this.world.level.prims) {
      if (p.kind === 'ramp' || p.solid === false) continue;
      const l = new THREE.LineSegments(box, m);
      if (p.kind === 'box' || p.kind === 'rock') {
        l.position.set(p.x, p.y ?? 0, p.z);
        l.rotation.y = p.rotY ?? 0;
        l.scale.set(p.kind === 'rock' ? p.w * 0.9 : p.w, p.h, p.kind === 'rock' ? p.d * 0.9 : p.d);
      } else {
        l.position.set(p.x, p.y ?? 0, p.z);
        l.scale.set(p.r * 2, p.h, p.r * 2);
      }
      g.add(l);
    }
    this.group.add(g);
    return g;
  }
}
