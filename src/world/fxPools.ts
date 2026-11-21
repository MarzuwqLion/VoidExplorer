import * as THREE from 'three';
import { FX } from '../data/fx';

const hasDoc = typeof document !== 'undefined';
const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const tmpS = new THREE.Vector3();
const Z = new THREE.Vector3(0, 0, 1);
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

/** Canvas texture helper (null outside a browser, e.g. unit tests). */
export function canvasTexture(size: number, draw: (g: CanvasRenderingContext2D, s: number) => void): THREE.Texture | null {
  if (!hasDoc) return null;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d')!, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Soft round puff, alpha only. */
export function puffTexture(): THREE.Texture | null {
  return canvasTexture(64, (g, s) => {
    const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.45, 'rgba(255,255,255,0.55)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, s, s);
  });
}

/** Irregular blot with a dark core: bullet holes, scorch marks and splatter all tint it. */
function blotTexture(): THREE.Texture | null {
  return canvasTexture(128, (g, s) => {
    const c = s / 2;
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 + Math.random() * 0.3;
      const r = s * (0.12 + Math.random() * 0.26);
      const x = c + Math.cos(a) * r * 0.7, y = c + Math.sin(a) * r * 0.7;
      const grd = g.createRadialGradient(x, y, 0, x, y, s * 0.16);
      grd.addColorStop(0, 'rgba(255,255,255,0.55)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, s, s);
    }
    const core = g.createRadialGradient(c, c, 0, c, c, s * 0.3);
    core.addColorStop(0, 'rgba(255,255,255,1)');
    core.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = core;
    g.fillRect(0, 0, s, s);
  });
}

interface Chunk {
  p: THREE.Vector3;
  v: THREE.Vector3;
  r: THREE.Vector3;
  w: THREE.Vector3;
  life: number;
  floor: number;
  s: number;
}

/** Bouncing instanced bits (shell casings, rock and metal chips). One draw call, hidden when idle. */
export class Chunks {
  readonly mesh: THREE.InstancedMesh;
  private items: Chunk[] = [];
  private next = 0;
  private alive = 0;
  constructor(geo: THREE.BufferGeometry, mat: THREE.Material, max: number) {
    this.mesh = new THREE.InstancedMesh(geo, mat, max);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    for (let i = 0; i < max; i++) {
      this.items.push({ p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Vector3(), w: new THREE.Vector3(), life: 0, floor: 0, s: 1 });
      this.mesh.setMatrixAt(i, ZERO);
      this.mesh.setColorAt(i, new THREE.Color(1, 1, 1));
    }
  }
  spawn(p: THREE.Vector3, v: THREE.Vector3, life: number, floor: number, scale: number, color?: number): void {
    const i = this.next++ % this.items.length;
    const c = this.items[i];
    c.p.copy(p);
    c.v.copy(v);
    c.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    c.w.set((Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30);
    c.life = life * (0.8 + Math.random() * 0.4);
    c.floor = floor;
    c.s = scale * (0.7 + Math.random() * 0.6);
    if (color !== undefined) {
      this.mesh.setColorAt(i, new THREE.Color(color));
      this.mesh.instanceColor!.needsUpdate = true;
    }
  }
  update(dt: number): void {
    let alive = 0;
    for (let i = 0; i < this.items.length; i++) {
      const c = this.items[i];
      if (c.life <= 0) continue;
      c.life -= dt;
      if (c.life <= 0) {
        this.mesh.setMatrixAt(i, ZERO);
        continue;
      }
      alive++;
      c.v.y += FX.gravity * dt;
      c.p.addScaledVector(c.v, dt);
      if (c.p.y < c.floor) {
        c.p.y = c.floor;
        c.v.y = Math.abs(c.v.y) * FX.bounce;
        c.v.x *= FX.friction;
        c.v.z *= FX.friction;
        c.w.multiplyScalar(FX.friction);
      }
      c.r.addScaledVector(c.w, dt);
      const shrink = Math.min(1, c.life / 0.4);
      tmpQ.setFromEuler(tmpE.set(c.r.x, c.r.y, c.r.z));
      this.mesh.setMatrixAt(i, tmpM.compose(c.p, tmpQ, tmpS.setScalar(c.s * shrink)));
    }
    if (alive || this.alive) this.mesh.instanceMatrix.needsUpdate = true;
    this.alive = alive;
    this.mesh.visible = alive > 0;
  }
}

const DECAL_VERT = `
attribute float aFade;
varying vec2 vUv;
varying float vFade;
varying vec3 vColor;
#include <fog_pars_vertex>
void main() {
  vUv = uv;
  vFade = aFade;
  #ifdef USE_INSTANCING_COLOR
  vColor = instanceColor;
  #else
  vColor = vec3(1.0);
  #endif
  vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const DECAL_FRAG = `
uniform sampler2D map;
varying vec2 vUv;
varying float vFade;
varying vec3 vColor;
#include <fog_pars_fragment>
void main() {
  float a = texture2D(map, vUv).a * vFade;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

/** Instanced surface marks (bullet holes, scorch, splatter) with per-mark fade. One draw call. */
export class Decals {
  readonly mesh: THREE.InstancedMesh;
  private life: Float32Array;
  private fade: THREE.InstancedBufferAttribute;
  private next = 0;
  constructor(max: number = FX.maxDecals) {
    const geo = new THREE.PlaneGeometry(1, 1);
    this.fade = new THREE.InstancedBufferAttribute(new Float32Array(max), 1);
    this.fade.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aFade', this.fade);
    const mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { map: { value: null } }]),
      vertexShader: DECAL_VERT,
      fragmentShader: DECAL_FRAG,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -4,
      fog: true,
    });
    mat.uniforms.map.value = blotTexture();
    this.mesh = new THREE.InstancedMesh(geo, mat, max);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    this.mesh.renderOrder = 1;
    this.life = new Float32Array(max);
    for (let i = 0; i < max; i++) {
      this.mesh.setMatrixAt(i, ZERO);
      this.mesh.setColorAt(i, new THREE.Color(0, 0, 0));
    }
  }
  add(p: THREE.Vector3, normal: THREE.Vector3, size: number, color: number): void {
    const i = this.next++ % this.life.length;
    tmpQ.setFromUnitVectors(Z, normal);
    tmpQ.multiply(new THREE.Quaternion().setFromAxisAngle(Z, Math.random() * Math.PI * 2));
    const pos = p.clone().addScaledVector(normal, 0.015);
    this.mesh.setMatrixAt(i, tmpM.compose(pos, tmpQ, tmpS.set(size, size, 1)));
    this.mesh.setColorAt(i, new THREE.Color(color));
    this.life[i] = FX.decalLife;
    this.fade.setX(i, 1);
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor!.needsUpdate = true;
    this.fade.needsUpdate = true;
    this.mesh.visible = true;
  }
  update(dt: number): void {
    let any = false, changed = false;
    for (let i = 0; i < this.life.length; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] > 0) any = true;
      if (this.life[i] < FX.decalFade) {
        this.fade.setX(i, Math.max(0, this.life[i] / FX.decalFade));
        changed = true;
      }
    }
    if (changed) this.fade.needsUpdate = true;
    this.mesh.visible = any;
  }
  get active(): number {
    let n = 0;
    for (const l of this.life) if (l > 0) n++;
    return n;
  }
}

/** Expanding ground shockwave rings, additive. One draw call. */
export class Rings {
  readonly mesh: THREE.InstancedMesh;
  private items: { p: THREE.Vector3; t: number; r: number; c: THREE.Color }[] = [];
  private next = 0;
  constructor(max: number = FX.maxRings) {
    const geo = new THREE.RingGeometry(0.82, 1, 48).rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    this.mesh = new THREE.InstancedMesh(geo, mat, max);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    for (let i = 0; i < max; i++) {
      this.items.push({ p: new THREE.Vector3(), t: 0, r: 1, c: new THREE.Color() });
      this.mesh.setMatrixAt(i, ZERO);
      this.mesh.setColorAt(i, new THREE.Color(0, 0, 0));
    }
  }
  add(p: THREE.Vector3, radius: number, color: number): void {
    const it = this.items[this.next++ % this.items.length];
    it.p.copy(p).y += 0.08;
    it.t = FX.ringLife;
    it.r = radius;
    it.c.set(color);
  }
  update(dt: number): void {
    let any = false;
    this.items.forEach((it, i) => {
      if (it.t <= 0) return;
      it.t -= dt;
      const k = 1 - Math.max(0, it.t) / FX.ringLife;
      const s = it.r * (0.15 + 0.85 * Math.sqrt(k));
      this.mesh.setMatrixAt(i, it.t > 0 ? tmpM.compose(it.p, tmpQ.identity(), tmpS.set(s, 1, s)) : ZERO);
      this.mesh.setColorAt(i, it.c.clone().multiplyScalar(Math.max(0, 1 - k) * 1.6));
      any = true;
    });
    if (any) {
      this.mesh.instanceMatrix.needsUpdate = true;
      this.mesh.instanceColor!.needsUpdate = true;
    }
    this.mesh.visible = this.items.some((it) => it.t > 0);
  }
}
