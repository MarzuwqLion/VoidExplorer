import * as THREE from 'three';
import { glowTexture } from './space';

const MAX_TRACERS = 64;
const MAX_PARTS = 600;

/** Pooled effects: tracers, particles, muzzle flashes, glows. A few draw calls in total. */
export class Fx {
  readonly group = new THREE.Group();
  private tracerGeo: THREE.BufferGeometry;
  private tracerPos: Float32Array;
  private tracerCol: Float32Array;
  private tracers: { life: number; max: number; color: THREE.Color }[] = [];
  private tracerIdx = 0;
  private partGeo: THREE.BufferGeometry;
  private pPos: Float32Array;
  private pCol: Float32Array;
  private parts: { vx: number; vy: number; vz: number; life: number; max: number; g: number; r: number; gC: number; b: number }[] = [];
  private partIdx = 0;
  private flash: THREE.Sprite;
  private flashLight: THREE.PointLight;
  private flashT = 0;
  private tex: THREE.Texture | null = null;

  constructor() {
    this.tracerPos = new Float32Array(MAX_TRACERS * 6);
    this.tracerCol = new Float32Array(MAX_TRACERS * 6);
    this.tracerGeo = new THREE.BufferGeometry();
    this.tracerGeo.setAttribute('position', new THREE.BufferAttribute(this.tracerPos, 3));
    this.tracerGeo.setAttribute('color', new THREE.BufferAttribute(this.tracerCol, 3));
    for (let i = 0; i < MAX_TRACERS; i++) this.tracers.push({ life: 0, max: 1, color: new THREE.Color() });
    const lines = new THREE.LineSegments(this.tracerGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    lines.frustumCulled = false;
    this.group.add(lines);
    this.pPos = new Float32Array(MAX_PARTS * 3);
    this.pCol = new Float32Array(MAX_PARTS * 3);
    this.partGeo = new THREE.BufferGeometry();
    this.partGeo.setAttribute('position', new THREE.BufferAttribute(this.pPos, 3));
    this.partGeo.setAttribute('color', new THREE.BufferAttribute(this.pCol, 3));
    for (let i = 0; i < MAX_PARTS; i++) {
      this.parts.push({ vx: 0, vy: 0, vz: 0, life: 0, max: 1, g: 0, r: 0, gC: 0, b: 0 });
      this.pPos[i * 3 + 1] = -9999;
    }
    const pts = new THREE.Points(this.partGeo, new THREE.PointsMaterial({ size: 0.12, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    pts.frustumCulled = false;
    this.group.add(pts);
    if (typeof document !== 'undefined') this.tex = glowTexture('rgba(255,230,170,1)', 'rgba(255,140,40,0)', 64);
    this.flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex, color: 0xffd090, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    this.flash.scale.setScalar(0.5);
    this.flash.visible = false;
    this.group.add(this.flash);
    this.flashLight = new THREE.PointLight(0xffc070, 0, 8, 2);
    this.group.add(this.flashLight);
  }

  tracer(a: THREE.Vector3, b: THREE.Vector3, color: number, life = 0.07): void {
    const i = this.tracerIdx++ % MAX_TRACERS;
    const t = this.tracers[i];
    t.life = t.max = life;
    t.color.set(color);
    // Short streak near the far end reads as a bullet; full line is faint.
    const start = a.clone().lerp(b, 0.05);
    this.tracerPos.set([start.x, start.y, start.z, b.x, b.y, b.z], i * 6);
  }
  muzzle(p: THREE.Vector3, color = 0xffc070): void {
    this.flash.position.copy(p);
    (this.flash.material as THREE.SpriteMaterial).color.set(color);
    this.flash.material.rotation = Math.random() * Math.PI;
    this.flash.visible = true;
    this.flashLight.position.copy(p);
    this.flashLight.color.set(color);
    this.flashLight.intensity = 6;
    this.flashT = 0.05;
  }
  /** Burst of particles. */
  burst(p: THREE.Vector3, n: number, color: number, speed: number, life: number, gravity = -9, up = 0.4, normal?: THREE.Vector3): void {
    const c = new THREE.Color(color);
    for (let k = 0; k < n; k++) {
      const i = this.partIdx++ % MAX_PARTS;
      const q = this.parts[i];
      let vx = (Math.random() - 0.5) * 2, vy = Math.random() * up + (Math.random() - 0.5), vz = (Math.random() - 0.5) * 2;
      if (normal) {
        vx += normal.x * 1.5;
        vy += normal.y * 1.5;
        vz += normal.z * 1.5;
      }
      const l = Math.hypot(vx, vy, vz) || 1;
      const s = speed * (0.4 + Math.random() * 0.6);
      q.vx = (vx / l) * s;
      q.vy = (vy / l) * s;
      q.vz = (vz / l) * s;
      q.life = q.max = life * (0.6 + Math.random() * 0.4);
      q.g = gravity;
      q.r = c.r;
      q.gC = c.g;
      q.b = c.b;
      this.pPos.set([p.x, p.y, p.z], i * 3);
    }
  }
  impact(p: THREE.Vector3, normal: THREE.Vector3, kind: 'hard' | 'flesh' | 'metal' | 'shield'): void {
    if (kind === 'hard') {
      this.burst(p, 6, 0xffd080, 4, 0.25, -12, 0.5, normal);
      this.burst(p, 5, 0x8a7a6a, 1.5, 0.6, -2, 0.8, normal);
    } else if (kind === 'metal') this.burst(p, 9, 0xfff0a0, 6, 0.3, -12, 0.5, normal);
    else if (kind === 'shield') this.burst(p, 10, 0x5cc8ff, 3, 0.35, 0, 0.5, normal);
    else this.burst(p, 7, 0xff7050, 2.5, 0.35, -9, 0.4, normal);
  }
  update(dt: number): void {
    for (let i = 0; i < MAX_TRACERS; i++) {
      const t = this.tracers[i];
      if (t.life <= 0) {
        this.tracerCol.fill(0, i * 6, i * 6 + 6);
        continue;
      }
      t.life -= dt;
      const k = Math.max(0, t.life / t.max);
      this.tracerCol.set([t.color.r * k * 0.3, t.color.g * k * 0.3, t.color.b * k * 0.3, t.color.r * k * 1.5, t.color.g * k * 1.5, t.color.b * k * 1.5], i * 6);
    }
    this.tracerGeo.attributes.position.needsUpdate = true;
    this.tracerGeo.attributes.color.needsUpdate = true;
    for (let i = 0; i < MAX_PARTS; i++) {
      const q = this.parts[i];
      if (q.life <= 0) continue;
      q.life -= dt;
      q.vy += q.g * dt;
      const j = i * 3;
      this.pPos[j] += q.vx * dt;
      this.pPos[j + 1] += q.vy * dt;
      this.pPos[j + 2] += q.vz * dt;
      const k = Math.max(0, q.life / q.max);
      this.pCol.set([q.r * k, q.gC * k, q.b * k], j);
      if (q.life <= 0) this.pPos[j + 1] = -9999;
    }
    this.partGeo.attributes.position.needsUpdate = true;
    this.partGeo.attributes.color.needsUpdate = true;
    if (this.flashT > 0) {
      this.flashT -= dt;
      if (this.flashT <= 0) {
        this.flash.visible = false;
        this.flashLight.intensity = 0;
      }
    }
  }
}
