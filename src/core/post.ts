import * as THREE from 'three';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import type { Grade } from '../data/atmosphere';
import { POST } from '../data/atmosphere';

const GRADE_SHADER = {
  uniforms: {
    tDiffuse: { value: null },
    uLift: { value: new THREE.Vector3() },
    uGain: { value: new THREE.Vector3(1, 1, 1) },
    uSat: { value: 1 },
    uContrast: { value: 1 },
    uVignette: { value: 0 },
    uGrain: { value: 0 },
    uRun: { value: 0 },
    uHit: { value: 0 },
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1280, 720) },
  },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
uniform sampler2D tDiffuse;
uniform vec3 uLift; uniform vec3 uGain;
uniform float uSat; uniform float uContrast; uniform float uVignette; uniform float uGrain;
uniform float uRun; uniform float uHit; uniform float uTime; uniform vec2 uRes;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec2 c = vUv - 0.5;
  float r = length(c * vec2(uRes.x / uRes.y, 1.0)) / 0.9;
  vec3 col = texture2D(tDiffuse, vUv).rgb;
  if (uRun > 0.001) {
    float k = uRun * smoothstep(0.25, 0.8, r);
    vec3 acc = col;
    for (int i = 1; i < 8; i++) acc += texture2D(tDiffuse, 0.5 + c * (1.0 - float(i) / 7.0 * 0.045 * k)).rgb;
    col = acc / 8.0;
  }
  if (uHit > 0.001) {
    vec2 off = c * uHit * 0.018;
    col.r = texture2D(tDiffuse, vUv + off).r;
    col.b = texture2D(tDiffuse, vUv - off).b;
  }
  col = max(col * uGain + uLift, 0.0);
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = max(mix(vec3(l), col, uSat), 0.0);
  col = 0.18 * pow(col / 0.18 + 1e-6, vec3(uContrast));
  col *= 1.0 - uVignette * smoothstep(0.3, 1.0, r);
  col += (hash(vUv * uRes + fract(uTime * 7.31) * 91.7) - 0.5) * uGrain * (0.3 + min(l, 1.0));
  gl_FragColor = vec4(max(col, 0.0), 1.0);
}`,
};

/** Live screen effects a scene drives each frame (0 to 1). */
export interface PostState {
  run: number;
  hit: number;
}

/** The colour grade pass: grade, vignette, grain, sprint edge blur and hit colour fringe in one shader. */
export class GradePass {
  readonly pass = new ShaderPass(GRADE_SHADER);
  private t = 0;
  apply(g: Grade, s: PostState, dt: number, w: number, h: number): void {
    const u = this.pass.uniforms as Record<string, THREE.IUniform>;
    this.t += dt;
    (u.uLift.value as THREE.Vector3).set(...g.lift);
    (u.uGain.value as THREE.Vector3).set(...g.gain);
    u.uSat.value = g.sat;
    u.uContrast.value = g.contrast;
    u.uVignette.value = g.vignette;
    u.uGrain.value = g.grain;
    u.uRun.value = s.run * POST.runBlur;
    u.uHit.value = s.hit * POST.hitFringe;
    u.uTime.value = this.t;
    (u.uRes.value as THREE.Vector2).set(w, h);
  }
}
