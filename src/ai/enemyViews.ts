import * as THREE from 'three';
import { buildEnemyVisual, type EnemyVisual } from '../world/models/enemyModels';
import type { Director } from './director';
import { AI, SPITTER, FOREMAN } from '../data/enemies';
import { h } from '../ui/screens';

/** Visuals for enemies, projectiles, hazards and pickups, synced from the director each frame. */
export class EnemyViews {
  readonly group = new THREE.Group();
  private views = new Map<number, EnemyVisual>();
  private laser: THREE.LineSegments;
  private laserPos = new Float32Array(12 * 6);
  private lobMesh: THREE.InstancedMesh;
  private poolMesh: THREE.InstancedMesh;
  private ringMesh: THREE.InstancedMesh;
  private pickMesh: THREE.InstancedMesh;
  private labels = new Map<number, HTMLElement>();
  private t = 0;
  private m = new THREE.Matrix4();

  constructor(
    private dir: Director,
    private labelLayer: HTMLElement | null,
  ) {
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(this.laserPos, 3));
    this.laser = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0xff2010, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.laser.frustumCulled = false;
    this.group.add(this.laser);
    const acid = new THREE.MeshStandardMaterial({ color: 0x9aff40, emissive: 0x6adf20, emissiveIntensity: 1.5, roughness: 0.3 });
    this.lobMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.25, 1), acid, 16);
    this.poolMesh = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x8aef30, transparent: true, opacity: 0.45, depthWrite: false }), 16);
    this.ringMesh = new THREE.InstancedMesh(new THREE.RingGeometry(0.85, 1, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff3020, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide }), 12);
    this.pickMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.35, 0.22, 0.25), new THREE.MeshStandardMaterial({ color: 0x5a6a3a, emissive: 0xf2a541, emissiveIntensity: 0.5 }), 24);
    for (const im of [this.lobMesh, this.poolMesh, this.ringMesh, this.pickMesh]) {
      im.count = 0;
      im.frustumCulled = false;
      this.group.add(im);
    }
  }

  update(dt: number, alpha: number, showLabels: boolean, camera: THREE.Camera): void {
    this.t += dt;
    const seen = new Set<number>();
    let li = 0;
    for (const e of this.dir.enemies) {
      if (e.removed && e.deadT > AI.fadeAfter + 1) continue;
      seen.add(e.uid);
      let v = this.views.get(e.uid);
      if (!v) {
        v = buildEnemyVisual(e.type);
        this.views.set(e.uid, v);
        this.group.add(v.root);
      }
      v.root.position.lerpVectors(e.prevPos, e.pos, alpha);
      let dy = e.yaw - e.prevYaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      v.root.rotation.y = e.prevYaw + dy * alpha;
      v.update(dt, {
        state: e.alive ? (e.flinch > 0.6 && e.anim !== 'attack' ? 'flinch' : e.anim) : 'dead',
        stateT: e.alive ? e.stateT : e.deadT,
        speed: e.speedNow,
        dist: e.dist,
        flinch: e.flinch,
        glow: e.glow,
        crouch: e.crouch,
        aimPitch: e.aimPitch,
        weakOpen: e.weakOpen,
        deadT: e.deadT,
      });
      if (!e.alive && e.deadT > AI.fadeAfter) v.setOpacity(Math.max(0, 1 - (e.deadT - AI.fadeAfter)));
      if (e.laser && li < 12) {
        const mz = v.muzzle(new THREE.Vector3());
        this.laserPos.set([mz.x, mz.y, mz.z, e.laser.x, e.laser.y, e.laser.z], li * 6);
        li++;
      }
    }
    this.laserPos.fill(0, li * 6);
    this.laser.geometry.setDrawRange(0, li * 2);
    this.laser.geometry.attributes.position.needsUpdate = true;
    for (const [uid, v] of this.views) {
      if (seen.has(uid)) continue;
      this.group.remove(v.root);
      v.root.traverse((o) => {
        const mm = o as THREE.Mesh;
        mm.geometry?.dispose();
        (mm.material as THREE.Material | undefined)?.dispose?.();
      });
      this.views.delete(uid);
    }
    // Projectiles and hazards.
    const p = this.dir.proj;
    this.lobMesh.count = Math.min(16, p.lobs.length);
    p.lobs.slice(0, 16).forEach((l, i) => this.lobMesh.setMatrixAt(i, this.m.makeTranslation(l.pos.x, l.pos.y, l.pos.z)));
    this.lobMesh.instanceMatrix.needsUpdate = true;
    this.poolMesh.count = Math.min(16, p.pools.length);
    p.pools.slice(0, 16).forEach((q, i) => {
      const s = q.r * Math.min(1, q.t * 4) * (1 - Math.max(0, q.t - SPITTER.poolTime + 0.5));
      this.poolMesh.setMatrixAt(i, this.m.compose(new THREE.Vector3(q.x, q.y + 0.04, q.z), new THREE.Quaternion(), new THREE.Vector3(s, 1, s)));
    });
    this.poolMesh.instanceMatrix.needsUpdate = true;
    this.ringMesh.count = Math.min(12, p.mortars.length);
    p.mortars.slice(0, 12).forEach((mo, i) => {
      const k = Math.min(1, mo.t / FOREMAN.mortarWarn);
      const s = FOREMAN.mortarRadius * (0.3 + 0.7 * k);
      this.ringMesh.setMatrixAt(i, this.m.compose(new THREE.Vector3(mo.x, mo.y + 0.06, mo.z), new THREE.Quaternion(), new THREE.Vector3(s, 1, s)));
    });
    this.ringMesh.instanceMatrix.needsUpdate = true;
    const picks = this.dir.pickups;
    this.pickMesh.count = Math.min(24, picks.length);
    picks.slice(0, 24).forEach((k, i) =>
      this.pickMesh.setMatrixAt(i, this.m.compose(new THREE.Vector3(k.x, k.y + 0.3 + Math.sin(this.t * 3 + i) * 0.08, k.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.t * 1.5), new THREE.Vector3(1, 1, 1))),
    );
    this.pickMesh.instanceMatrix.needsUpdate = true;
    this.syncLabels(showLabels, camera);
  }

  private syncLabels(show: boolean, camera: THREE.Camera): void {
    if (!this.labelLayer) return;
    const w = window.innerWidth, hh = window.innerHeight;
    const v = new THREE.Vector3();
    const alive = new Set<number>();
    if (show) {
      for (const e of this.dir.enemies) {
        if (!e.alive) continue;
        alive.add(e.uid);
        let l = this.labels.get(e.uid);
        if (!l) {
          l = h('div', 'map-label', '', this.labelLayer);
          l.style.color = '#ffb090';
          this.labels.set(e.uid, l);
        }
        v.set(e.pos.x, e.pos.y + e.def.height + 0.4, e.pos.z).project(camera);
        const on = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
        l.style.display = on ? 'block' : 'none';
        l.style.left = ((v.x + 1) / 2) * w + 'px';
        l.style.top = ((1 - v.y) / 2) * hh + 'px';
        l.textContent = e.type + ' ' + e.state + (e.token ? ' *' : '') + ' ' + Math.ceil(e.v.health + e.v.armor);
      }
    }
    for (const [uid, l] of this.labels) if (!alive.has(uid)) {
      l.remove();
      this.labels.delete(uid);
    }
  }
  dispose(): void {
    for (const l of this.labels.values()) l.remove();
    this.labels.clear();
  }
}
