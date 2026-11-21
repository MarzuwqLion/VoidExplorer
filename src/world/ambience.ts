import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { AMBIENCE, type AmbienceDef } from '../data/ambience';
import { SoftParticles } from './fxParticles';
import type { PhysicsWorld } from './physics';
import { swayTime } from './sway';

const NOISE_GLSL = `
float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash2(i), hash2(i + vec2(1.0, 0.0)), u.x), mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), u.x), u.y);
}`;
const OUT = '#include <tonemapping_fragment>\n#include <colorspace_fragment>\n#include <fog_fragment>';

function mistMaterial(color: number, speed: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) }, uSpeed: { value: speed } }]),
    vertexShader: `attribute float aAlpha; varying vec2 vUv; varying vec2 vW; varying float vA; varying float vDist;
#include <fog_pars_vertex>
void main() { vUv = uv; vA = aAlpha; vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xz; vec4 mvPosition = viewMatrix * wp; vDist = length(mvPosition.xyz); gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`,
    fragmentShader: `uniform float uTime; uniform vec3 uColor; uniform float uSpeed; varying vec2 vUv; varying vec2 vW; varying float vA; varying float vDist;
#include <fog_pars_fragment>
${NOISE_GLSL}
void main() {
  vec2 p = vW * 0.07 + vec2(uTime * 0.02, uTime * 0.013) * uSpeed;
  float n = vnoise(p) * 0.6 + vnoise(p * 2.3 - vec2(uTime * 0.03 * uSpeed, 0.0)) * 0.4;
  vec2 e = min(vUv, 1.0 - vUv);
  // Wisps rather than a sheet, and fade out close to the camera so the flat layer never reads as a surface.
  float a = vA * smoothstep(0.0, 0.25, e.x) * smoothstep(0.0, 0.25, e.y) * smoothstep(0.38, 0.92, n) * smoothstep(4.0, 16.0, vDist);
  if (a < 0.003) discard;
  gl_FragColor = vec4(uColor, a);
  ${OUT}
}`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
  });
}

function shaftMaterial(color: number, alpha: number, lamp: boolean): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) }, uAlpha: { value: alpha }, uLamp: { value: lamp ? 1 : 0 } }]),
    vertexShader: `varying vec2 vUv; varying float vFace;
#include <fog_pars_vertex>
void main() { vUv = uv; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); vec3 n = normalize(normalMatrix * normal); vFace = abs(dot(n, normalize(-mvPosition.xyz)));
gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`,
    fragmentShader: `uniform vec3 uColor; uniform float uAlpha; uniform float uLamp; uniform float uTime; varying vec2 vUv; varying float vFace;
#include <fog_pars_fragment>
void main() {
  float along = mix(pow(sin(3.14159 * vUv.y), 0.8), pow(vUv.y, 1.3), uLamp);
  float a = uAlpha * along * pow(vFace, 1.6) * (0.9 + 0.1 * sin(uTime * 1.3 + vUv.x * 20.0));
  gl_FragColor = vec4(uColor * a, 1.0);
  ${OUT}
}`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    fog: true,
  });
}

function flockMaterial(color: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) } }]),
    vertexShader: `attribute float aPhase; uniform float uTime;
#include <fog_pars_vertex>
void main() { vec3 p = position; p.y += sin(uTime * 7.0 + aPhase) * abs(p.x) * 0.7;
vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`,
    fragmentShader: `uniform vec3 uColor;
#include <fog_pars_fragment>
void main() { gl_FragColor = vec4(uColor, 1.0);
${OUT}
}`,
    side: THREE.DoubleSide,
    fog: true,
  });
}

/** Work light with a flicker: constant shimmer, and one faulty unit that stutters now and then. */
interface Lamp { light: THREE.PointLight; base: number }

/**
 * Planet atmosphere: drifting motes, ground mist, light shafts, steam vents, snow gusts with spindrift,
 * flickering work lights and a distant flock. Each system is a single draw call.
 */
export class Ambience {
  readonly group = new THREE.Group();
  private def: AmbienceDef;
  private motes: SoftParticles | null = null;
  private steam = new SoftParticles(220);
  private drift: SoftParticles | null = null;
  private mats: THREE.ShaderMaterial[] = [];
  private lamps: Lamp[] = [];
  private vents: { x: number; y: number; z: number; rate: number; acc: number }[] = [];
  private flock: THREE.InstancedMesh | null = null;
  private t = 0;
  private moteAcc = 0;
  private driftAcc = 0;
  /** Current wind multiplier for snow (1 is calm). */
  wind = 1;

  constructor(
    planet: 'amara' | 'korr',
    sunDir: THREE.Vector3,
    lamps: { x: number; y: number; z: number; color: number; intensity: number; range: number }[],
    private physics: PhysicsWorld,
  ) {
    const d = (this.def = AMBIENCE[planet]);
    if (d.motes) {
      this.motes = new SoftParticles(d.motes.count, d.motes.additive);
      this.group.add(this.motes.points);
    }
    this.group.add(this.steam.points);
    if (d.gust) {
      this.drift = new SoftParticles(260);
      this.group.add(this.drift.points);
    }
    if (d.mist.length) this.group.add(this.buildMist(d));
    for (const l of lamps) {
      const light = new THREE.PointLight(l.color, l.intensity, l.range, 1.6);
      light.position.set(l.x, l.y, l.z);
      this.group.add(light);
      this.lamps.push({ light, base: l.intensity });
    }
    const cones: THREE.BufferGeometry[] = [];
    const up = new THREE.Vector3(0, 1, 0);
    const lean = new THREE.Vector3(sunDir.x * 0.5, 1, sunDir.z * 0.5).normalize();
    for (const s of d.shafts) {
      const base = new THREE.Vector3(s.x, this.floor(s.x, s.z, 40), s.z);
      const g = new THREE.CylinderGeometry(s.r0, s.r1, s.length, 16, 1, true);
      const q = new THREE.Quaternion().setFromUnitVectors(up, lean);
      cones.push(g.applyMatrix4(new THREE.Matrix4().compose(base.clone().addScaledVector(lean, s.length / 2), q, new THREE.Vector3(1, 1, 1))));
    }
    if (d.lampShafts)
      for (const l of lamps) {
        const floor = this.floor(l.x, l.z, l.y - 0.2);
        const len = l.y - floor;
        cones.push(new THREE.CylinderGeometry(0.25, len * 0.55, len, 16, 1, true).translate(l.x, floor + len / 2, l.z));
      }
    if (cones.length) {
      const m = shaftMaterial(d.shaftColor, d.shaftAlpha, d.lampShafts);
      this.mats.push(m);
      const mesh = new THREE.Mesh(mergeGeometries(cones), m);
      mesh.renderOrder = 2;
      this.group.add(mesh);
    }
    for (const v of d.vents) this.vents.push({ x: v.x, z: v.z, y: this.floor(v.x, v.z, 40), rate: v.rate, acc: 0 });
    if (d.flock) this.buildFlock(d.flock);
  }

  /** Top surface below a height (terrain, roof or prop). */
  private floor(x: number, z: number, fromY: number): number {
    return this.physics.ray({ x, y: fromY, z }, { x: 0, y: -1, z: 0 }, fromY + 60)?.point.y ?? 0;
  }

  private buildMist(d: AmbienceDef): THREE.Mesh {
    const geos = d.mist.map((s) => {
      const g = new THREE.PlaneGeometry(s.w, s.d).rotateX(-Math.PI / 2).translate(s.x, s.y, s.z);
      g.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(s.alpha), 1));
      return g;
    });
    const m = mistMaterial(d.mistColor, d.mistSpeed);
    this.mats.push(m);
    const mesh = new THREE.Mesh(mergeGeometries(geos), m);
    mesh.renderOrder = 1;
    return mesh;
  }

  private buildFlock(f: NonNullable<AmbienceDef['flock']>): void {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.5, 1.4, 0, 0.15, 0, 0, 0.35, 0, 0, -0.5, 0, 0, 0.35, -1.4, 0, 0.15], 3));
    const phase = new Float32Array(f.count).map(() => Math.random() * 6.28);
    g.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phase, 1));
    const m = flockMaterial(f.color);
    this.mats.push(m);
    this.flock = new THREE.InstancedMesh(g, m, f.count);
    this.flock.frustumCulled = false;
    this.group.add(this.flock);
  }

  update(dt: number, player: THREE.Vector3): void {
    this.t += dt;
    const d = this.def, t = this.t;
    for (const m of this.mats) m.uniforms.uTime.value = t;
    swayTime.value = t;
    // Snow gusts.
    const g = d.gust ? Math.pow(Math.max(0, Math.sin((t / d.gust.period) * Math.PI * 2)), 3) : 0;
    this.wind = d.gust ? 1 + (d.gust.peak - 1) * g : 1;
    if (this.motes && d.motes) {
      const M = d.motes;
      this.moteAcc += dt * (M.count / 6);
      while (this.moteAcc >= 1) {
        this.moteAcc -= 1;
        const p = { x: player.x + (Math.random() - 0.5) * M.box, y: player.y + Math.random() * M.height - 1, z: player.z + (Math.random() - 0.5) * M.box };
        const v = { x: (Math.random() - 0.5) * M.sway, y: M.rise * (0.5 + Math.random()), z: (Math.random() - 0.5) * M.sway };
        const s = M.size[0] + Math.random() * (M.size[1] - M.size[0]);
        this.motes.emit(p, v, 6, s, s, M.alpha, M.colors[Math.floor(Math.random() * M.colors.length)]);
      }
      this.motes.update(dt);
    }
    for (const v of this.vents) {
      if (Math.hypot(v.x - player.x, v.z - player.z) > 90) continue;
      v.acc += dt * v.rate;
      while (v.acc >= 1) {
        v.acc -= 1;
        this.steam.emit({ x: v.x + (Math.random() - 0.5) * 0.6, y: v.y + 0.1, z: v.z + (Math.random() - 0.5) * 0.6 }, { x: 0.3 + this.wind * 0.5, y: 1.1 + Math.random() * 0.5, z: (Math.random() - 0.5) * 0.3 }, 2.8, 0.4, 2.4, 0.32, d.steamColor);
      }
    }
    this.steam.update(dt);
    if (this.drift && d.gust) {
      this.driftAcc += dt * d.gust.drift * g;
      while (this.driftAcc >= 1) {
        this.driftAcc -= 1;
        const p = { x: player.x - 14 + Math.random() * 10, y: player.y + 0.2 + Math.random() * 0.8, z: player.z + (Math.random() - 0.5) * 30 };
        this.drift.emit(p, { x: 5 + 6 * g, y: 0.1, z: (Math.random() - 0.5) * 0.6 }, 3.5, 0.8, 3.2, 0.2, 0xf0f6ff);
      }
      this.drift.update(dt);
    }
    if (d.flicker)
      this.lamps.forEach((l, i) => {
        let k = 1 + d.flicker!.shimmer * Math.sin(t * 9 + i * 1.7) * Math.sin(t * 13.3 + i);
        if (i === d.flicker!.faulty && Math.sin(t * 0.9) * Math.sin(t * 2.3) > 0.55) k *= Math.sin(t * 61) > 0 ? 1 : 1 - d.flicker!.stutter;
        l.light.intensity = l.base * k;
      });
    if (this.flock && d.flock) {
      const f = d.flock;
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1.6, 1.6, 1.6), p = new THREE.Vector3();
      for (let i = 0; i < f.count; i++) {
        const a = t * f.speed + i * 0.07;
        const r = f.radius + Math.sin(i * 1.7) * 9;
        p.set(f.x + Math.cos(a) * r, f.height + Math.sin(i * 2.3) * 3 + Math.sin(t * 0.7 + i) * 1.5, f.z + Math.sin(a) * r);
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI - a);
        this.flock.setMatrixAt(i, m.compose(p, q, s));
      }
      this.flock.instanceMatrix.needsUpdate = true;
    }
  }
}
