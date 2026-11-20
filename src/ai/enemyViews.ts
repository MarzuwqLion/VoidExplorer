import * as THREE from 'three';
import { buildEnemyVisual, type EnemyVisual } from '../world/models/enemyModels';
import type { Director } from './director';
import { AI, SPITTER, FOREMAN } from '../data/enemies';
import { h } from '../ui/screens';
import { optimizeModel, bakeSingleMesh } from '../world/models/optimize';

const LOD_DIST = 18;

/** Acid pool texture: a bright rim around a mottled, bubbling centre. */
function acidTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(120,200,40,0.55)');
  grd.addColorStop(0.7, 'rgba(150,240,50,0.7)');
  grd.addColorStop(0.88, 'rgba(220,255,120,1)');
  grd.addColorStop(1, 'rgba(160,255,60,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 26; i++) {
    const a = (i * 2.399) % (Math.PI * 2), r = 8 + ((i * 37) % 44);
    g.fillStyle = 'rgba(230,255,150,0.55)';
    g.beginPath();
    g.arc(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 2 + (i % 4), 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Visuals for enemies, projectiles, hazards and pickups, synced from the director each frame. */
export class EnemyViews {
  readonly group = new THREE.Group();
  private views = new Map<number, EnemyVisual>();
  /** Distant level of detail: one baked mesh per enemy type, shared geometry per type. */
  private lods = new Map<number, THREE.Mesh>();
  private lodGeo = new Map<string, THREE.Mesh>();
  private laser: THREE.LineSegments;
  private laserPos = new Float32Array(12 * 6);
  private lobMesh: THREE.InstancedMesh;
  private poolMesh: THREE.InstancedMesh;
  private ringMesh: THREE.InstancedMesh;
  private fillMesh: THREE.InstancedMesh;
  private pickMesh: THREE.InstancedMesh;
  private labels = new Map<number, HTMLElement>();
  /** Hit flash per enemy: the non-glowing materials it brightens, the flash level and the last flinch seen. */
  private flashes = new Map<number, { mats: THREE.MeshStandardMaterial[]; k: number; flinch: number }>();
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
    const acidMap = acidTexture();
    this.poolMesh = new THREE.InstancedMesh(
      new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: acidMap ? 0xffffff : 0x8aef30, map: acidMap, transparent: true, opacity: 0.75, depthWrite: false }),
      16,
    );
    this.ringMesh = new THREE.InstancedMesh(new THREE.RingGeometry(0.9, 1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff3020, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }), 12);
    // Mortar warning fill: grows from the centre to the ring as the shell comes down.
    this.fillMesh = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff3020, transparent: true, opacity: 0.28, depthWrite: false }), 12);
    this.pickMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.35, 0.22, 0.25), new THREE.MeshStandardMaterial({ color: 0x5a6a3a, emissive: 0xf2a541, emissiveIntensity: 0.5 }), 24);
    for (const im of [this.lobMesh, this.poolMesh, this.ringMesh, this.fillMesh, this.pickMesh]) {
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
        optimizeModel(v.root);
        // Only the largest few parts cast shadows: enough to ground the model, cheap on draw calls.
        const meshes: THREE.Mesh[] = [];
        v.root.traverse((o) => (o as THREE.Mesh).isMesh && meshes.push(o as THREE.Mesh));
        meshes.forEach((m) => m.geometry.computeBoundingSphere());
        meshes.sort((a, b) => (b.geometry.boundingSphere?.radius ?? 0) - (a.geometry.boundingSphere?.radius ?? 0));
        meshes.forEach((m, i) => (m.castShadow = i < (e.def.boss ? 4 : 2)));
        this.views.set(e.uid, v);
        this.group.add(v.root);
        const mats = new Set<THREE.MeshStandardMaterial>();
        v.root.traverse((o) => {
          const mm = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
          if (mm?.isMeshStandardMaterial && mm.emissive && mm.emissive.getHex() === 0) mats.add(mm);
        });
        this.flashes.set(e.uid, { mats: [...mats], k: 0, flinch: 0 });
      }
      const fl = this.flashes.get(e.uid);
      if (fl) {
        if (e.alive && e.flinch > fl.flinch + 0.3) fl.k = 1;
        fl.flinch = e.flinch;
        if (fl.k > 0) {
          fl.k = Math.max(0, fl.k - dt * AI.hitFlashDecay);
          const c = fl.k * AI.hitFlash;
          for (const m of fl.mats) m.emissive.setRGB(c, c * 0.92, c * 0.85);
        }
      }
      v.root.position.lerpVectors(e.prevPos, e.pos, alpha);
      // Swap to the baked single mesh when far from the camera.
      const far = e.alive && camera.position.distanceTo(v.root.position) > LOD_DIST;
      let lod = this.lods.get(e.uid);
      if (far && !lod) {
        let proto = this.lodGeo.get(e.type);
        if (!proto) {
          proto = bakeSingleMesh(v.root.clone(true));
          this.lodGeo.set(e.type, proto);
        }
        lod = new THREE.Mesh(proto.geometry, proto.material);
        lod.castShadow = true;
        this.lods.set(e.uid, lod);
        this.group.add(lod);
      }
      if (lod) {
        lod.visible = far;
        lod.position.copy(v.root.position);
        lod.rotation.y = v.root.rotation.y;
        // The baked pose cannot animate, so a moving distant enemy bobs and rocks with its stride instead.
        const gait = e.alive ? Math.min(1, e.speedNow / AI.lodGaitSpeed) : 0;
        const ph = e.dist * AI.lodGaitRate;
        lod.position.y += Math.abs(Math.sin(ph)) * AI.lodGaitBob * gait;
        lod.rotation.z = Math.sin(ph) * AI.lodGaitRoll * gait;
      }
      v.root.visible = !far;
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
    for (const [uid, l] of this.lods) {
      if (seen.has(uid)) continue;
      this.group.remove(l);
      this.lods.delete(uid);
    }
    for (const [uid, v] of this.views) {
      if (seen.has(uid)) continue;
      this.group.remove(v.root);
      v.root.traverse((o) => {
        const mm = o as THREE.Mesh;
        mm.geometry?.dispose();
        (mm.material as THREE.Material | undefined)?.dispose?.();
      });
      this.views.delete(uid);
      this.flashes.delete(uid);
    }
    // Projectiles and hazards.
    const p = this.dir.proj;
    this.lobMesh.count = Math.min(16, p.lobs.length);
    p.lobs.slice(0, 16).forEach((l, i) => this.lobMesh.setMatrixAt(i, this.m.makeTranslation(l.pos.x, l.pos.y, l.pos.z)));
    this.lobMesh.instanceMatrix.needsUpdate = true;
    this.poolMesh.count = Math.min(16, p.pools.length);
    p.pools.slice(0, 16).forEach((q, i) => {
      const wobble = 1 + Math.sin(this.t * 6 + i * 1.7) * 0.03;
      const s = q.r * Math.min(1, q.t * 4) * (1 - Math.max(0, q.t - SPITTER.poolTime + 0.5)) * wobble;
      const spin = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.t * 0.4 + i);
      this.poolMesh.setMatrixAt(i, this.m.compose(new THREE.Vector3(q.x, q.y + 0.04, q.z), spin, new THREE.Vector3(s, 1, s)));
    });
    this.poolMesh.instanceMatrix.needsUpdate = true;
    this.ringMesh.count = this.fillMesh.count = Math.min(12, p.mortars.length);
    p.mortars.slice(0, 12).forEach((mo, i) => {
      const k = Math.min(1, mo.t / FOREMAN.mortarWarn);
      const r = FOREMAN.mortarRadius;
      const at = new THREE.Vector3(mo.x, mo.y + 0.06, mo.z);
      this.ringMesh.setMatrixAt(i, this.m.compose(at, new THREE.Quaternion(), new THREE.Vector3(r, 1, r)));
      const f = Math.max(0.02, r * k);
      this.fillMesh.setMatrixAt(i, this.m.compose(at.setY(mo.y + 0.05), new THREE.Quaternion(), new THREE.Vector3(f, 1, f)));
    });
    this.ringMesh.instanceMatrix.needsUpdate = true;
    this.fillMesh.instanceMatrix.needsUpdate = true;
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
    for (const p of this.lodGeo.values()) {
      p.geometry.dispose();
      (p.material as THREE.Material).dispose();
    }
    for (const l of this.labels.values()) l.remove();
    this.labels.clear();
  }
}
