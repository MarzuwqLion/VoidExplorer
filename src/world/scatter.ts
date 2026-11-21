import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SCATTER, SNOWDRESS } from '../data/ambience';
import { KORR } from '../data/layouts';
import { valueNoise } from '../core/rng';
import { Rng } from '../core/rng';
import type { TerrainDef } from './terrain';
import type { PhysicsWorld } from './physics';
import type { Prim } from './level';
import { addSway } from './sway';

const UP = new THREE.Vector3(0, 1, 0);

/** Three thin blades fanned around the origin, one unit tall, two-sided by geometry; normals point up so both sides light evenly. */
function grassGeometry(): THREE.BufferGeometry {
  const pos: number[] = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.3;
    const cx = Math.cos(a), cz = Math.sin(a), lean = 0.25;
    const a0 = [-cz * 0.05, 0, cx * 0.05], a1 = [cz * 0.05, 0, -cx * 0.05], tip = [cx * lean, 1, cz * lean];
    // Both windings, so either side faces the light with an upward normal.
    pos.push(...a0, ...a1, ...tip, ...a1, ...a0, ...tip);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length / 3).fill([0, 1, 0]).flat(), 3));
  return g;
}

/** Snow drift profile: a curved wedge against a wall, extruded along it. */
function driftGeometry(length: number): THREE.BufferGeometry {
  const H = SNOWDRESS.driftHeight, D = SNOWDRESS.driftDepth;
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(D, 0);
  s.quadraticCurveTo(D * 0.25, H * 0.15, 0, H);
  s.lineTo(0, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: length, bevelEnabled: false, curveSegments: 6 });
  g.translate(0, 0, -length / 2);
  return g;
}

/**
 * Ground scatter for a planet: swaying grass (Amara), pebbles, scrap debris (Korr), snow drifts and ice (Korr).
 * Everything is instanced or merged; no shadows, no colliders.
 */
export function buildScatter(planet: 'amara' | 'korr', terrain: TerrainDef, physics: PhysicsWorld, prims: Prim[]): THREE.Group {
  const group = new THREE.Group();
  const S = SCATTER[planet];
  const rng = new Rng(planet === 'amara' ? 4242 : 5151);
  const E = SCATTER.extent;
  const slopeAt = (x: number, z: number): number => {
    const dx = terrain.height(x + 0.5, z) - terrain.height(x - 0.5, z), dz = terrain.height(x, z + 0.5) - terrain.height(x, z - 0.5);
    return 1 - 1 / Math.sqrt(1 + dx * dx + dz * dz);
  };
  /** Ground y if this spot is open terrain (not under or on a prop), else null. */
  const open = (x: number, z: number, onSlab = 0.15): number | null => {
    const h = terrain.height(x, z);
    const top = physics.ray({ x, y: h + 25, z }, { x: 0, y: -1, z: 0 }, 40)?.point.y ?? h;
    return top - h > onSlab ? null : top;
  };
  /** Something solid overhead (indoors or under a canopy). */
  const roofed = (x: number, y: number, z: number): boolean => !!physics.ray({ x, y: y + 0.3, z }, { x: 0, y: 1, z: 0 }, 40);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), col = new THREE.Color();

  if (S.grass) {
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.9 });
    addSway(mat, S.sway, true);
    const mesh = new THREE.InstancedMesh(grassGeometry(), mat, S.grass);
    let n = 0;
    for (let tries = 0; tries < S.grass * 8 && n < S.grass; tries++) {
      const x = (rng.next() * 2 - 1) * E, z = (rng.next() * 2 - 1) * E;
      if (valueNoise(x * 0.07, z * 0.07, 99) < 0.38) continue;
      const slope = slopeAt(x, z);
      if (slope > S.grassSlope) continue;
      const y = open(x, z);
      if (y === null) continue;
      const c = terrain.color(x, z, y, slope);
      if (!(c.g > c.r * 1.02 && c.g > c.b * 0.85)) continue;
      const hgt = S.grassHeight[0] + rng.next() * (S.grassHeight[1] - S.grassHeight[0]);
      q.setFromAxisAngle(UP, rng.next() * Math.PI * 2);
      mesh.setMatrixAt(n, m4.compose(p.set(x, y - 0.02, z), q, sc.set(hgt * 1.4, hgt, hgt * 1.4)));
      mesh.setColorAt(n, col.copy(c).multiplyScalar(1.15 + rng.next() * 0.35));
      n++;
    }
    mesh.count = n;
    group.add(mesh);
  }

  if (S.pebbles) {
    const geo = new THREE.IcosahedronGeometry(1, 0).scale(1, 0.55, 1);
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true }), S.pebbles);
    let n = 0;
    for (let tries = 0; tries < S.pebbles * 6 && n < S.pebbles; tries++) {
      const x = (rng.next() * 2 - 1) * E, z = (rng.next() * 2 - 1) * E;
      if (slopeAt(x, z) > 0.45) continue;
      const y = open(x, z);
      if (y === null) continue;
      const s = 0.05 + Math.pow(rng.next(), 3) * 0.3;
      q.setFromEuler(new THREE.Euler(rng.next() * 0.5, rng.next() * 6.28, rng.next() * 0.5));
      mesh.setMatrixAt(n, m4.compose(p.set(x, y + s * 0.2, z), q, sc.set(s * (0.8 + rng.next() * 0.6), s, s * (0.8 + rng.next() * 0.6))));
      mesh.setColorAt(n, col.set(S.pebbleColor).multiplyScalar(0.75 + rng.next() * 0.5));
      n++;
    }
    mesh.count = n;
    group.add(mesh);
  }

  if (S.debris) {
    const areas = [KORR.yard, { x0: KORR.dock.x0, x1: KORR.dock.x1, z0: KORR.dock.z0, z1: KORR.dock.z1 }];
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.4, flatShading: true }), S.debris);
    let n = 0;
    for (let tries = 0; tries < S.debris * 8 && n < S.debris; tries++) {
      const a = areas[n % areas.length];
      const x = a.x0 + rng.next() * (a.x1 - a.x0), z = a.z0 + rng.next() * (a.z1 - a.z0);
      const y = open(x, z, 0.6);
      if (y === null) continue;
      q.setFromEuler(new THREE.Euler((rng.next() - 0.5) * 0.4, rng.next() * 6.28, (rng.next() - 0.5) * 0.4));
      const w = 0.1 + rng.next() * 0.5;
      mesh.setMatrixAt(n, m4.compose(p.set(x, y + 0.03, z), q, sc.set(w, 0.03 + rng.next() * 0.12, 0.1 + rng.next() * 0.6)));
      mesh.setColorAt(n, col.set(SCATTER.debrisColors[Math.floor(rng.next() * SCATTER.debrisColors.length)]).multiplyScalar(0.7 + rng.next() * 0.5));
      n++;
    }
    mesh.count = n;
    group.add(mesh);
  }

  if (planet === 'korr') {
    // Drifts banked against the windward and lee faces of tall ground-standing walls.
    const drifts: THREE.BufferGeometry[] = [];
    for (const pr of prims) {
      if (pr.kind !== 'box' || pr.solid === false || pr.h < SNOWDRESS.minWall || (pr.y ?? 0) > 0.5) continue;
      const rot = pr.rotY ?? 0;
      const base = terrain.height(pr.x, pr.z) + (pr.y ?? 0);
      for (const side of [-1, 1]) {
        const g = driftGeometry(pr.d * 0.9);
        const off = new THREE.Vector3(side * pr.w / 2, 0, 0).applyAxisAngle(UP, rot);
        const out = new THREE.Vector3(side * (pr.w / 2 + 0.4), 0, 0).applyAxisAngle(UP, rot);
        if (roofed(pr.x + out.x, base, pr.z + out.z)) continue;
        const mm = new THREE.Matrix4().compose(new THREE.Vector3(pr.x + off.x, base, pr.z + off.z), new THREE.Quaternion().setFromAxisAngle(UP, rot + (side < 0 ? Math.PI : 0)), new THREE.Vector3(1, side < 0 ? 1 : 0.6, 1));
        drifts.push(g.applyMatrix4(mm));
      }
    }
    if (drifts.length) {
      const merged = mergeGeometries(drifts);
      merged.computeVertexNormals();
      const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ color: SNOWDRESS.driftColor, roughness: 0.85 }));
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    // Ice patches conformed to the ground in the open.
    const ice: THREE.BufferGeometry[] = [];
    for (let tries = 0; tries < 400 && ice.length < SNOWDRESS.icePatches; tries++) {
      const x = -80 + rng.next() * 170, z = -100 + rng.next() * 190;
      const gy = open(x, z);
      if (slopeAt(x, z) > 0.12 || gy === null || roofed(x, gy, z)) continue;
      const r = SNOWDRESS.iceRadius[0] + rng.next() * (SNOWDRESS.iceRadius[1] - SNOWDRESS.iceRadius[0]);
      const g = new THREE.CircleGeometry(r, 14).rotateX(-Math.PI / 2);
      const pa = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pa.count; i++) {
        const vx = x + pa.getX(i) * (1 + Math.sin(i * 2.1) * 0.25), vz = z + pa.getZ(i);
        pa.setXYZ(i, vx, (open(vx, vz, 9) ?? terrain.height(vx, vz)) + 0.035, vz);
      }
      ice.push(g);
    }
    if (ice.length) {
      const mesh = new THREE.Mesh(mergeGeometries(ice), new THREE.MeshStandardMaterial({ color: SNOWDRESS.iceColor, roughness: 0.08, metalness: 0.25, transparent: true, opacity: 0.8, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }));
      mesh.receiveShadow = true;
      group.add(mesh);
    }
  }
  group.traverse((o) => (o.castShadow = false));
  return group;
}
