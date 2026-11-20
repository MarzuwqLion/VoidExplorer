import type { XZ } from '../data/layouts';

export type NavBlocker =
  | { kind: 'rect'; x: number; z: number; hw: number; hd: number; rotY: number; id?: string }
  | { kind: 'circle'; x: number; z: number; r: number };
export interface WalkSurface {
  contains(x: number, z: number): boolean;
  heightAt(x: number, z: number): number;
}
export interface NavBakeOpts {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
  cell: number;
  agentRadius: number;
  maxSlopeDeg: number;
  stepHeight: number;
  /** Ground height or null where not walkable (water, void). */
  ground: (x: number, z: number) => number | null;
  blockers: NavBlocker[];
  walkSurfaces: WalkSurface[];
}

/** Binary min-heap keyed by float priority. */
class Heap {
  private items: number[] = [];
  private pri: number[] = [];
  get size(): number {
    return this.items.length;
  }
  push(item: number, p: number): void {
    const a = this.items, q = this.pri;
    a.push(item);
    q.push(p);
    let i = a.length - 1;
    while (i > 0) {
      const par = (i - 1) >> 1;
      if (q[par] <= q[i]) break;
      [a[par], a[i]] = [a[i], a[par]];
      [q[par], q[i]] = [q[i], q[par]];
      i = par;
    }
  }
  pop(): number {
    const a = this.items, q = this.pri;
    const top = a[0];
    const lastI = a.pop()!, lastP = q.pop()!;
    if (a.length) {
      a[0] = lastI;
      q[0] = lastP;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < a.length && q[l] < q[m]) m = l;
        if (r < a.length && q[r] < q[m]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        [q[m], q[i]] = [q[i], q[m]];
        i = m;
      }
    }
    return top;
  }
}

/** Grid A* navigation with 0.5 m cells, baked from ground height, slope and static blockers. */
export class NavGrid {
  readonly w: number;
  readonly h: number;
  readonly walk: Uint8Array;
  readonly height: Float32Array;
  /** Dynamic blocking (closed gates). */
  readonly closed: Uint8Array;
  private g: Float32Array;
  private parent: Int32Array;
  private stamp: Uint32Array;
  private gen = 0;
  constructor(
    readonly minX: number,
    readonly minZ: number,
    w: number,
    h: number,
    readonly cell: number,
    readonly maxStep: number,
  ) {
    this.w = w;
    this.h = h;
    const n = w * h;
    this.walk = new Uint8Array(n);
    this.height = new Float32Array(n);
    this.closed = new Uint8Array(n);
    this.g = new Float32Array(n);
    this.parent = new Int32Array(n);
    this.stamp = new Uint32Array(n);
  }

  static bake(o: NavBakeOpts): NavGrid {
    const w = Math.ceil((o.maxX - o.minX) / o.cell), h = Math.ceil((o.maxZ - o.minZ) / o.cell);
    const maxStep = Math.max(o.stepHeight, o.cell * Math.tan((o.maxSlopeDeg * Math.PI) / 180)) + 0.02;
    const nav = new NavGrid(o.minX, o.minZ, w, h, o.cell, maxStep);
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const x = o.minX + (i + 0.5) * o.cell, z = o.minZ + (j + 0.5) * o.cell;
        let gh = o.ground(x, z);
        let onSurface = false;
        for (const s of o.walkSurfaces) {
          if (s.contains(x, z)) {
            const sh = s.heightAt(x, z);
            if (gh === null || sh > gh - 0.05) {
              gh = sh;
              onSurface = true;
            }
          }
        }
        const k = j * w + i;
        if (gh === null) continue;
        nav.height[k] = gh;
        nav.walk[k] = 1;
        if (!onSurface) {
          // Slope check from the ground function itself.
          const d = o.cell;
          const gx = o.ground(x + d, z), gz = o.ground(x, z + d);
          if (gx !== null && gz !== null) {
            const slope = Math.hypot(gx - gh, gz - gh) / d;
            if (slope > Math.tan((o.maxSlopeDeg * Math.PI) / 180)) nav.walk[k] = 0;
          }
        }
      }
    }
    // Erode by the agent radius away from cells that are unwalkable terrain (cliffs, water).
    const rCells = Math.ceil(o.agentRadius / o.cell);
    const src = nav.walk.slice();
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const k = j * w + i;
        if (!src[k]) continue;
        let ok = true;
        for (let dj = -rCells; dj <= rCells && ok; dj++) {
          for (let di = -rCells; di <= rCells; di++) {
            const ii = i + di, jj = j + dj;
            if (ii < 0 || jj < 0 || ii >= w || jj >= h) continue;
            if (!src[jj * w + ii] && di * di + dj * dj <= rCells * rCells) {
              ok = false;
              break;
            }
          }
        }
        if (!ok) nav.walk[k] = 0;
      }
    }
    for (const b of o.blockers) nav.forCells(b, o.agentRadius, (k) => (nav.walk[k] = 0));
    return nav;
  }

  forCells(b: NavBlocker, inflate: number, fn: (k: number) => void): void {
    const ext = b.kind === 'circle' ? b.r + inflate : Math.hypot(b.hw, b.hd) + inflate;
    const i0 = Math.max(0, Math.floor((b.x - ext - this.minX) / this.cell));
    const i1 = Math.min(this.w - 1, Math.floor((b.x + ext - this.minX) / this.cell));
    const j0 = Math.max(0, Math.floor((b.z - ext - this.minZ) / this.cell));
    const j1 = Math.min(this.h - 1, Math.floor((b.z + ext - this.minZ) / this.cell));
    const c = b.kind === 'rect' ? Math.cos(b.rotY) : 1, s = b.kind === 'rect' ? Math.sin(b.rotY) : 0;
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const x = this.minX + (i + 0.5) * this.cell - b.x, z = this.minZ + (j + 0.5) * this.cell - b.z;
        let inside: boolean;
        if (b.kind === 'circle') inside = x * x + z * z <= ext * ext;
        else {
          // Three.js rotation.y = rotY maps local to world by R(rotY); invert for local coords.
          const lx = x * c - z * s, lz = x * s + z * c;
          inside = Math.abs(lx) <= b.hw + inflate && Math.abs(lz) <= b.hd + inflate;
        }
        if (inside) fn(j * this.w + i);
      }
    }
  }
  /** Close or open cells under a blocker (gates). */
  setClosed(b: NavBlocker, closed: boolean, inflate = 0.4): void {
    this.forCells(b, inflate, (k) => (this.closed[k] = closed ? 1 : 0));
  }

  cellOf(x: number, z: number): number {
    const i = Math.floor((x - this.minX) / this.cell), j = Math.floor((z - this.minZ) / this.cell);
    if (i < 0 || j < 0 || i >= this.w || j >= this.h) return -1;
    return j * this.w + i;
  }
  center(k: number): XZ {
    return { x: this.minX + ((k % this.w) + 0.5) * this.cell, z: this.minZ + (Math.floor(k / this.w) + 0.5) * this.cell };
  }
  isWalkable(x: number, z: number): boolean {
    const k = this.cellOf(x, z);
    return k >= 0 && this.walk[k] === 1 && this.closed[k] === 0;
  }
  private ok(k: number): boolean {
    return this.walk[k] === 1 && this.closed[k] === 0;
  }
  heightAt(x: number, z: number): number {
    const k = this.cellOf(x, z);
    return k >= 0 ? this.height[k] : 0;
  }
  nearestWalkable(x: number, z: number, maxR = 6): XZ | null {
    if (this.isWalkable(x, z)) return { x, z };
    const steps = Math.ceil(maxR / this.cell);
    for (let r = 1; r <= steps; r++) {
      let best: XZ | null = null, bd = Infinity;
      for (let dj = -r; dj <= r; dj++) {
        for (let di = -r; di <= r; di++) {
          if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
          const px = x + di * this.cell, pz = z + dj * this.cell;
          if (!this.isWalkable(px, pz)) continue;
          const d = di * di + dj * dj;
          if (d < bd) {
            bd = d;
            best = this.center(this.cellOf(px, pz));
          }
        }
      }
      if (best) return best;
    }
    return null;
  }
  /** True when a straight walk from a to b stays on connected walkable cells. */
  lineWalkable(a: XZ, b: XZ): boolean {
    const d = Math.hypot(b.x - a.x, b.z - a.z);
    const n = Math.max(1, Math.ceil(d / (this.cell * 0.5)));
    let prev = this.cellOf(a.x, a.z);
    if (prev < 0 || !this.ok(prev)) return false;
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      const k = this.cellOf(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t);
      if (k < 0 || !this.ok(k)) return false;
      if (Math.abs(this.height[k] - this.height[prev]) > this.maxStep) return false;
      prev = k;
    }
    return true;
  }

  /** A* path from a to b, smoothed. Returns waypoints excluding the start, or null. */
  findPath(a: XZ, b: XZ, maxNodes = 120000): XZ[] | null {
    const sa = this.nearestWalkable(a.x, a.z, 3), sb = this.nearestWalkable(b.x, b.z, 6);
    if (!sa || !sb) return null;
    const start = this.cellOf(sa.x, sa.z), goal = this.cellOf(sb.x, sb.z);
    if (start === goal) return [sb];
    this.gen++;
    const gen = this.gen;
    const heap = new Heap();
    const gx = goal % this.w, gz = Math.floor(goal / this.w);
    const hfn = (k: number) => {
      const dx = Math.abs((k % this.w) - gx), dz = Math.abs(Math.floor(k / this.w) - gz);
      return (dx + dz + (Math.SQRT2 - 2) * Math.min(dx, dz)) * 1.001;
    };
    this.stamp[start] = gen;
    this.g[start] = 0;
    this.parent[start] = -1;
    heap.push(start, hfn(start));
    const closedGen = gen + 0x80000000;
    let expanded = 0;
    const dirs = [
      [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
      [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
    ];
    let found = false;
    while (heap.size) {
      const k = heap.pop();
      if (this.stamp[k] === closedGen) continue;
      this.stamp[k] = closedGen;
      if (k === goal) {
        found = true;
        break;
      }
      if (++expanded > maxNodes) break;
      const i = k % this.w, j = Math.floor(k / this.w);
      for (const [di, dj, cost] of dirs) {
        const ii = i + di, jj = j + dj;
        if (ii < 0 || jj < 0 || ii >= this.w || jj >= this.h) continue;
        const nk = jj * this.w + ii;
        if (!this.ok(nk) || this.stamp[nk] === closedGen) continue;
        if (Math.abs(this.height[nk] - this.height[k]) > this.maxStep) continue;
        if (di && dj && (!this.ok(j * this.w + ii) || !this.ok(jj * this.w + i))) continue;
        const ng = this.g[k] + cost;
        if (this.stamp[nk] !== gen || ng < this.g[nk]) {
          this.stamp[nk] = gen;
          this.g[nk] = ng;
          this.parent[nk] = k;
          heap.push(nk, ng + hfn(nk));
        }
      }
    }
    if (!found) return null;
    const cells: XZ[] = [];
    for (let k = goal; k !== -1; k = this.parent[k]) cells.push(this.center(k));
    cells.reverse();
    cells[cells.length - 1] = sb;
    return this.smooth(sa, cells);
  }

  /** String-pulling: drop waypoints that are directly reachable. */
  private smooth(from: XZ, pts: XZ[]): XZ[] {
    const out: XZ[] = [];
    let anchor = from;
    let i = 0;
    while (i < pts.length) {
      let j = pts.length - 1;
      while (j > i && !this.lineWalkable(anchor, pts[j])) j--;
      out.push(pts[j]);
      anchor = pts[j];
      i = j + 1;
    }
    return out;
  }
}
