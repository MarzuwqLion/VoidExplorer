import * as THREE from 'three';
import type { PlanetLevel } from '../../missions/types';
import type { MissionPlanet } from '../../data/names';
import { fbm } from '../../core/rng';

/** Walking-skeleton field used until a planet's full layout exists. */
export function flatLevel(id: MissionPlanet): PlanetLevel {
  const amara = id === 'amara';
  const base = new THREE.Color(amara ? 0x2f8a78 : 0x8a3e24);
  const alt = new THREE.Color(amara ? 0x7a9a3a : 0x5a2a1a);
  return {
    id,
    terrain: {
      min: -110,
      max: 110,
      step: 2,
      height: () => 0,
      color: (x, z) => base.clone().lerp(alt, fbm(x * 0.03, z * 0.03, 3, 3)),
      skirt: 300,
    },
    prims: [],
    spawn: { x: -80, z: 74, yaw: -45 },
    shuttle: { x: -84, z: 80, yaw: 30 },
    sky: { top: amara ? 0x3a78b8 : 0x1a2a48, horizon: amara ? 0xf0c890 : 0x6a7a9a, sunDir: new THREE.Vector3(-0.5, 0.25, -0.6), sunColor: 0xffc070, sunSize: 0.004 },
    fog: { color: amara ? 0xe0c090 : 0x5a6a8a, near: 60, far: 420 },
    light: { hemiSky: 0xbfd8ff, hemiGround: 0x4a3a2a, hemi: 0.8, sun: 2.4, sunColor: 0xffd8a0 },
    ambient: amara ? 'amara_wind' : 'korr_wind',
    footstep: amara ? 'footstep_grass' : 'footstep_rock',
    inside: (x, z) => Math.abs(x) < 108 && Math.abs(z) < 108,
  };
}
