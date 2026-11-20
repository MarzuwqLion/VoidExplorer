import * as THREE from 'three';

export interface SkyDef {
  top: number;
  horizon: number;
  sunDir: THREE.Vector3;
  sunColor: number;
  sunSize: number;
}

/** Gradient sky dome with a sun disc. */
export function buildSky(d: SkyDef, radius = 900): THREE.Mesh {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color(d.top) },
      horizon: { value: new THREE.Color(d.horizon) },
      sunDir: { value: d.sunDir.clone().normalize() },
      sunColor: { value: new THREE.Color(d.sunColor) },
      sunSize: { value: d.sunSize },
    },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader:
      'uniform vec3 top; uniform vec3 horizon; uniform vec3 sunDir; uniform vec3 sunColor; uniform float sunSize; varying vec3 vDir;' +
      'void main(){ float h = clamp(vDir.y, -0.2, 1.0); vec3 c = mix(horizon, top, pow(max(h,0.0), 0.55));' +
      'float s = dot(normalize(vDir), sunDir); c += sunColor * smoothstep(1.0 - sunSize, 1.0 - sunSize*0.6, s);' +
      'c += sunColor * 0.25 * pow(max(s,0.0), 24.0); gl_FragColor = vec4(c, 1.0); }',
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 12), mat);
  m.name = 'sky';
  m.frustumCulled = false;
  return m;
}

/** A distant planet disc in the sky. */
export function skyPlanet(color: number, ringColor: number | null, dir: THREE.Vector3, size: number, dist = 800): THREE.Group {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.SphereGeometry(size, 20, 14), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, fog: false, depthWrite: false }));
  g.add(m);
  if (ringColor !== null) {
    const r = new THREE.Mesh(new THREE.RingGeometry(size * 1.4, size * 2.3, 48), new THREE.MeshBasicMaterial({ color: ringColor, transparent: true, opacity: 0.35, side: THREE.DoubleSide, fog: false, depthWrite: false }));
    r.rotation.x = -Math.PI / 2 + 0.45;
    g.add(r);
  }
  g.position.copy(dir.clone().normalize().multiplyScalar(dist));
  g.lookAt(0, 0, 0);
  return g;
}
