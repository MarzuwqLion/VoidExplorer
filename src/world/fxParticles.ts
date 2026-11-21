import * as THREE from 'three';
import { FX } from '../data/fx';
import { puffTexture } from './fxPools';

const SMOKE_VERT = `
attribute float aSize;
attribute float aAlpha;
attribute vec3 aColor;
uniform float uHalfH;
varying float vAlpha;
varying vec3 vColor;
#include <fog_pars_vertex>
void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = aSize * projectionMatrix[1][1] * uHalfH / max(0.2, -mvPosition.z);
  vAlpha = aAlpha;
  vColor = aColor;
  #include <fog_vertex>
}`;
const SMOKE_FRAG = `
uniform sampler2D map;
varying float vAlpha;
varying vec3 vColor;
#include <fog_pars_fragment>
void main() {
  float a = texture2D(map, gl_PointCoord).a * vAlpha;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vColor, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

interface Puff {
  vx: number;
  vy: number;
  vz: number;
  life: number;
  max: number;
  s0: number;
  s1: number;
  a: number;
}

/**
 * Soft billboard particles with normal blending: muzzle smoke, impact dust, blast columns, steam, mist and motes.
 * One draw call; per-particle size, alpha and colour. Additive mode for glowing motes.
 */
export class SoftParticles {
  readonly points: THREE.Points;
  private pos: Float32Array;
  private size: Float32Array;
  private alpha: Float32Array;
  private col: Float32Array;
  private items: Puff[] = [];
  private next = 0;
  private mat: THREE.ShaderMaterial;
  constructor(max: number = FX.maxSmoke, additive = false) {
    this.pos = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    this.col = new Float32Array(max * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { map: { value: null }, uHalfH: { value: 360 } }]),
      vertexShader: SMOKE_VERT,
      fragmentShader: SMOKE_FRAG,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      fog: true,
    });
    this.mat.uniforms.map.value = puffTexture();
    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false;
    this.points.visible = false;
    for (let i = 0; i < max; i++) this.items.push({ vx: 0, vy: 0, vz: 0, life: 0, max: 1, s0: 0, s1: 0, a: 0 });
  }
  /** One puff: start position, velocity, life, start and end size (m), peak alpha, colour. */
  emit(p: { x: number; y: number; z: number }, v: { x: number; y: number; z: number }, life: number, s0: number, s1: number, a: number, color: number): void {
    const i = this.next++ % this.items.length;
    const q = this.items[i];
    q.vx = v.x;
    q.vy = v.y;
    q.vz = v.z;
    q.life = q.max = life * (0.8 + Math.random() * 0.4);
    q.s0 = s0;
    q.s1 = s1;
    q.a = a;
    this.pos.set([p.x, p.y, p.z], i * 3);
    const c = new THREE.Color(color);
    this.col.set([c.r, c.g, c.b], i * 3);
  }
  /** A cluster of puffs spreading from a point. */
  burst(p: THREE.Vector3, n: number, spread: number, rise: number, life: number, s0: number, s1: number, a: number, color: number): void {
    for (let k = 0; k < n; k++) {
      const v = { x: (Math.random() - 0.5) * spread, y: rise * (0.5 + Math.random() * 0.8), z: (Math.random() - 0.5) * spread };
      this.emit(p, v, life, s0, s1, a, color);
    }
  }
  update(dt: number): void {
    this.mat.uniforms.uHalfH.value = typeof window !== 'undefined' ? (window.innerHeight * Math.min(window.devicePixelRatio || 1, 1.5)) / 2 : 360;
    let any = false;
    for (let i = 0; i < this.items.length; i++) {
      const q = this.items[i];
      if (q.life <= 0) {
        this.alpha[i] = 0;
        continue;
      }
      any = true;
      q.life -= dt;
      const drag = Math.max(0, 1 - dt * 1.5);
      q.vx *= drag;
      q.vz *= drag;
      const j = i * 3;
      this.pos[j] += q.vx * dt;
      this.pos[j + 1] += q.vy * dt;
      this.pos[j + 2] += q.vz * dt;
      const k = 1 - Math.max(0, q.life) / q.max;
      this.size[i] = q.s0 + (q.s1 - q.s0) * Math.sqrt(k);
      // Quick fade in, long fade out.
      this.alpha[i] = q.a * Math.min(1, k * 8) * (1 - k);
    }
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.aSize.needsUpdate = true;
    g.attributes.aAlpha.needsUpdate = true;
    g.attributes.aColor.needsUpdate = true;
    this.points.visible = any;
  }
}

/** Spark streaks: short additive lines that trail their velocity and fall. One draw call. */
export class Sparks {
  readonly lines: THREE.LineSegments;
  private pos: Float32Array;
  private col: Float32Array;
  private items: { p: THREE.Vector3; v: THREE.Vector3; life: number; max: number; c: THREE.Color }[] = [];
  private next = 0;
  constructor(max: number = FX.maxSparks) {
    this.pos = new Float32Array(max * 6);
    this.col = new Float32Array(max * 6);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    this.lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.lines.frustumCulled = false;
    this.lines.visible = false;
    for (let i = 0; i < max; i++) this.items.push({ p: new THREE.Vector3(), v: new THREE.Vector3(), life: 0, max: 1, c: new THREE.Color() });
  }
  spray(p: THREE.Vector3, normal: THREE.Vector3, n: number, speed: number, color: number): void {
    for (let k = 0; k < n; k++) {
      const s = this.items[this.next++ % this.items.length];
      s.p.copy(p);
      s.v.set(Math.random() - 0.5, Math.random() - 0.3, Math.random() - 0.5).multiplyScalar(1.6).add(normal).normalize().multiplyScalar(speed * (0.4 + Math.random() * 0.8));
      s.life = s.max = FX.sparkLife * (0.5 + Math.random());
      s.c.set(color);
    }
  }
  update(dt: number): void {
    let any = false;
    this.items.forEach((s, i) => {
      const j = i * 6;
      if (s.life <= 0) {
        this.col.fill(0, j, j + 6);
        return;
      }
      any = true;
      s.life -= dt;
      s.v.y += FX.gravity * 0.6 * dt;
      s.p.addScaledVector(s.v, dt);
      const k = Math.max(0, s.life / s.max);
      const t = FX.sparkTrail;
      this.pos.set([s.p.x, s.p.y, s.p.z, s.p.x - s.v.x * t, s.p.y - s.v.y * t, s.p.z - s.v.z * t], j);
      this.col.set([s.c.r * 2 * k, s.c.g * 2 * k, s.c.b * 2 * k, 0, 0, 0], j);
    });
    this.lines.geometry.attributes.position.needsUpdate = true;
    this.lines.geometry.attributes.color.needsUpdate = true;
    this.lines.visible = any;
  }
}

/** A brief hexagonal energy shell around the commander when the shield takes a hit. */
export class ShieldBubble {
  readonly mesh: THREE.Mesh;
  private t = 0;
  private mat: THREE.ShaderMaterial;
  constructor() {
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uAmt: { value: 0 }, uColor: { value: new THREE.Color(0x5cc8ff) } },
      vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vP; void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vP = position; gl_Position = projectionMatrix * mv; }',
      fragmentShader:
        'uniform float uAmt; uniform vec3 uColor; varying vec3 vN; varying vec3 vV; varying vec3 vP; void main() { float f = pow(1.0 - abs(dot(vN, vV)), 2.2); ' +
        'vec2 h = vec2(atan(vP.z, vP.x) * 4.0, vP.y * 7.0); vec2 g = abs(fract(h + vec2(0.0, floor(h.x) * 0.5)) - 0.5); float hex = smoothstep(0.42, 0.5, max(g.x, g.y)); ' +
        'gl_FragColor = vec4(uColor * (f * 1.4 + hex * 0.5) * uAmt, 1.0); }',
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), this.mat);
    this.mesh.scale.set(FX.shieldRadius, FX.shieldRadius * 1.35, FX.shieldRadius);
    this.mesh.visible = false;
  }
  hit(): void {
    this.t = FX.shieldTime;
  }
  update(dt: number, center: THREE.Vector3): void {
    this.t = Math.max(0, this.t - dt);
    this.mesh.visible = this.t > 0;
    if (!this.mesh.visible) return;
    this.mesh.position.copy(center);
    const k = this.t / FX.shieldTime;
    this.mat.uniforms.uAmt.value = k * k;
    this.mesh.scale.setScalar(FX.shieldRadius * (1 + (1 - k) * 0.15)).y *= 1.35;
  }
}
