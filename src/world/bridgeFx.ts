import * as THREE from 'three';
import { BRIDGE_FX } from '../data/ambience';
import { BRIDGE } from '../data/layouts';
import { SoftParticles } from './fxParticles';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Console screen: scrolling readout rows, a live trace, scanlines and a frame, in the station's colour. */
export function screenMaterial(color: number, seed: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) }, uSeed: { value: seed } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uTime; uniform vec3 uColor; uniform float uSeed; varying vec2 vUv;
float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + uSeed * 17.0) * 43758.5453); }
void main() {
  vec2 uv = vUv;
  float rows = 12.0;
  float r = floor(uv.y * rows);
  float tick = floor(uTime * 1.5 + h(vec2(r, 3.0)) * 4.0);
  float len = h(vec2(r, tick)) * 0.45 + 0.08;
  float cell = floor(uv.x * 48.0);
  float fy = fract(uv.y * rows);
  float bar = step(uv.x, len) * step(0.3, fy) * step(fy, 0.7) * step(0.2, h(vec2(cell, r + tick)));
  float wave = 0.5 + 0.28 * sin(uv.x * 19.0 + uTime * 2.1 + uSeed) * sin(uv.x * 5.3 - uTime * 0.7);
  float trace = smoothstep(0.03, 0.0, abs(uv.y - wave)) * step(0.62, uv.x);
  float scan = 0.82 + 0.18 * sin(uv.y * 260.0 - uTime * 7.0);
  vec3 c = uColor * (0.07 + bar * 0.9 + trace * 1.5) * scan;
  float frame = step(0.015, uv.x) * step(uv.x, 0.985) * step(0.03, uv.y) * step(uv.y, 0.97);
  c = mix(uColor * 0.6, c, frame);
  gl_FragColor = vec4(c * 1.5, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
  });
}

/** Bridge dressing that moves: console screens, dust drifting in the light, the hull nose and its running lights. */
export class BridgeFx {
  readonly group = new THREE.Group();
  readonly screens: THREE.ShaderMaterial[] = [];
  private dust = new SoftParticles(BRIDGE_FX.motes, true);
  private lights: THREE.MeshStandardMaterial;
  private t = 0;
  private acc = 0;
  constructor() {
    this.group.add(this.dust.points);
    // Hull nose beyond the viewport, sloping away below eye level.
    const B = BRIDGE;
    const hull = new THREE.BoxGeometry(1, 1, 1, 1, 1, 8);
    const p = hull.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const t = p.getZ(i) + 0.5;
      p.setX(i, p.getX(i) * (0.35 + 0.65 * t));
      p.setY(i, p.getY(i) - (1 - t) * 0.9);
    }
    hull.computeVertexNormals();
    const hullMesh = new THREE.Mesh(hull, new THREE.MeshStandardMaterial({ color: 0xb8bec6, roughness: 0.55, metalness: 0.4 }));
    hullMesh.scale.set(16, 1.2, 30);
    hullMesh.position.set(0, -0.9, B.viewport.z - 15.5);
    this.group.add(hullMesh);
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.06, 26), new THREE.MeshStandardMaterial({ color: 0x5a6068, roughness: 0.6 }));
    seam.position.set(0, -0.83, B.viewport.z - 16);
    seam.rotation.x = -0.035;
    this.group.add(seam);
    this.lights = new THREE.MeshStandardMaterial({ color: 0xffa53a, emissive: 0xffa53a, emissiveIntensity: 3 });
    // Running lights along the hull edges; the far pair sits lower where the nose slopes away.
    const bulbs = [[-6.5, -0.3, -12], [6.5, -0.3, -12], [-3.2, -0.74, -24], [3.2, -0.74, -24]].map(([x, y, z]) => new THREE.SphereGeometry(0.16, 10, 8).translate(x, y, z));
    this.group.add(new THREE.Mesh(mergeGeometries(bulbs), this.lights));
    this.group.traverse((o) => (o.castShadow = false));
  }
  update(dt: number): void {
    this.t += dt;
    for (const m of this.screens) m.uniforms.uTime.value = this.t;
    const on = this.t % BRIDGE_FX.blink < 0.25;
    this.lights.emissiveIntensity = on ? 4 : 0.15;
    const B = BRIDGE;
    this.acc += dt * (BRIDGE_FX.motes / 8);
    while (this.acc >= 1) {
      this.acc -= 1;
      const pos = { x: (Math.random() * 2 - 1) * (B.halfX - 0.5), y: 0.4 + Math.random() * (B.height - 0.8), z: (Math.random() * 2 - 1) * (B.halfZ - 0.5) };
      this.dust.emit(pos, { x: (Math.random() - 0.5) * 0.08, y: (Math.random() - 0.3) * 0.05, z: (Math.random() - 0.5) * 0.08 }, 8, 0.025, 0.035, 0.45, BRIDGE_FX.moteColor);
    }
    this.dust.update(dt);
  }
}
