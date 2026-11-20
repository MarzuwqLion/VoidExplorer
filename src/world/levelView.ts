import * as THREE from 'three';
import type { Prim, RockPrim, TreePrim, BoxPrim } from './level';
import { Rng } from '../core/rng';
import { quatYawPitch } from './level';

function key(p: { color: number; emissive?: number; mat?: string }): string {
  return p.color + ':' + (p.emissive ?? 0) + ':' + (p.mat ?? '');
}
function material(p: { color: number; emissive?: number; mat?: string }): THREE.Material {
  const metal = p.mat === 'metal';
  return new THREE.MeshStandardMaterial({
    color: p.color,
    roughness: metal ? 0.55 : p.mat === 'glass' ? 0.1 : 0.9,
    metalness: metal ? 0.45 : p.mat === 'glass' ? 0.5 : 0.05,
    emissive: p.emissive ?? 0,
    emissiveIntensity: p.emissive ? 1.6 : 1,
    flatShading: true,
    transparent: p.mat === 'glass',
    opacity: p.mat === 'glass' ? 0.35 : 1,
  });
}

/** Low-poly rock geometry variant. */
export function rockGeometry(seed: number): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(0.5, 1);
  const r = new Rng(seed * 977 + 13);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const cache = new Map<string, number>();
  for (let i = 0; i < pos.count; i++) {
    const k = pos.getX(i).toFixed(3) + pos.getY(i).toFixed(3) + pos.getZ(i).toFixed(3);
    let s = cache.get(k);
    if (s === undefined) cache.set(k, (s = 0.8 + r.next() * 0.4));
    pos.setXYZ(i, pos.getX(i) * s, pos.getY(i) * s, pos.getZ(i) * s);
  }
  g.translate(0, 0.42, 0);
  g.computeVertexNormals();
  return g;
}

function instanced(geo: THREE.BufferGeometry, m: THREE.Material, mats: THREE.Matrix4[], shadow = true): THREE.InstancedMesh {
  const im = new THREE.InstancedMesh(geo, m, mats.length);
  mats.forEach((mm, i) => im.setMatrixAt(i, mm));
  im.instanceMatrix.needsUpdate = true;
  im.castShadow = shadow;
  im.receiveShadow = true;
  im.computeBoundingSphere();
  return im;
}

/** Build instanced meshes for every primitive. Returns a group plus a map of id to object for animated pieces. */
export function buildLevelView(prims: Prim[]): { group: THREE.Group; byId: Map<string, THREE.Object3D> } {
  const group = new THREE.Group();
  const byId = new Map<string, THREE.Object3D>();
  const boxes = new Map<string, { p: BoxPrim; m: THREE.Matrix4[] }>();
  const rocks = new Map<string, { p: RockPrim; m: THREE.Matrix4[]; v: number }>();
  const trees: TreePrim[] = [];
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  unitBox.translate(0, 0.5, 0);
  const tmpQ = new THREE.Quaternion();
  for (const p of prims) {
    if (p.kind === 'box') {
      const m = new THREE.Matrix4().compose(
        new THREE.Vector3(p.x, p.y ?? 0, p.z),
        tmpQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.rotY ?? 0),
        new THREE.Vector3(p.w, p.h, p.d),
      );
      if (p.id) {
        // Named boxes are separate meshes so they can be hidden or animated.
        const mesh = new THREE.Mesh(unitBox, material(p));
        mesh.applyMatrix4(m);
        mesh.castShadow = !p.noShadow;
        mesh.receiveShadow = true;
        group.add(mesh);
        byId.set(p.id, mesh);
        continue;
      }
      const k = key(p) + (p.noShadow ? ':ns' : '');
      if (!boxes.has(k)) boxes.set(k, { p, m: [] });
      boxes.get(k)!.m.push(m);
    } else if (p.kind === 'ramp') {
      const dx = p.x1 - p.x0, dz = p.z1 - p.z0, dy = p.y1 - p.y0;
      const len = Math.hypot(dx, dz);
      const th = p.thickness ?? 0.4;
      const q = quatYawPitch(Math.atan2(-dx, -dz), Math.atan2(dy, len));
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(p.width, th, Math.hypot(len, dy)), material(p));
      mesh.position.set((p.x0 + p.x1) / 2, (p.y0 + p.y1) / 2 - th / 2, (p.z0 + p.z1) / 2);
      mesh.quaternion.set(q.x, q.y, q.z, q.w);
      mesh.castShadow = mesh.receiveShadow = true;
      group.add(mesh);
    } else if (p.kind === 'cyl') {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(p.rTop ?? p.r, p.r, p.h, p.seg ?? 10), material(p));
      mesh.position.set(p.x, (p.y ?? 0) + p.h / 2, p.z);
      mesh.castShadow = !p.noShadow;
      mesh.receiveShadow = true;
      group.add(mesh);
      if (p.id) byId.set(p.id, mesh);
    } else if (p.kind === 'rock') {
      const v = p.seed % 4;
      const k = key(p) + ':' + v;
      if (!rocks.has(k)) rocks.set(k, { p, m: [], v });
      rocks.get(k)!.m.push(
        new THREE.Matrix4().compose(
          new THREE.Vector3(p.x, (p.y ?? 0) - 0.15, p.z),
          tmpQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.rotY ?? 0),
          new THREE.Vector3(p.w, p.h * 1.12, p.d),
        ),
      );
    } else if (p.kind === 'tree') trees.push(p);
  }
  for (const { p, m } of boxes.values()) group.add(instanced(unitBox, material(p), m, !p.noShadow));
  const rockGeos = [0, 1, 2, 3].map((s) => rockGeometry(s));
  for (const { p, m, v } of rocks.values()) group.add(instanced(rockGeos[v], material({ ...p, mat: 'rock' }), m));
  if (trees.length) group.add(buildTrees(trees));
  return { group, byId };
}

/** Instanced trees in three styles: coral fans, poles, dead snags. */
function buildTrees(trees: TreePrim[]): THREE.Group {
  const g = new THREE.Group();
  const byStyle = new Map<string, TreePrim[]>();
  for (const t of trees) {
    const k = t.style + ':' + t.color + ':' + t.canopy;
    if (!byStyle.has(k)) byStyle.set(k, []);
    byStyle.get(k)!.push(t);
  }
  for (const list of byStyle.values()) {
    const s = list[0];
    const trunkGeo = new THREE.CylinderGeometry(0.6, 1, 1, 6);
    trunkGeo.translate(0, 0.5, 0);
    const trunkMats = list.map((t) => new THREE.Matrix4().compose(new THREE.Vector3(t.x, t.y ?? 0, t.z), new THREE.Quaternion(), new THREE.Vector3(t.r, t.h, t.r)));
    g.add(instanced(trunkGeo, material({ color: s.color, mat: 'organic' }), trunkMats));
    if (s.style === 'dead') continue;
    const canopyGeo = s.style === 'fan' ? fanGeometry() : new THREE.SphereGeometry(1, 7, 5);
    const r = new Rng(s.seed);
    const cMats = list.map((t) => {
      const sc = (t.h * 0.45) * (0.85 + r.next() * 0.3);
      return new THREE.Matrix4().compose(
        new THREE.Vector3(t.x, (t.y ?? 0) + t.h * 0.95, t.z),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r.next() * Math.PI * 2),
        new THREE.Vector3(sc, s.style === 'fan' ? sc : sc * 0.7, sc),
      );
    });
    g.add(instanced(canopyGeo, material({ color: s.canopy, mat: 'organic', emissive: s.style === 'fan' ? s.canopy & 0x0f0f0f : 0 }), cMats));
  }
  return g;
}

/** A coral-like fan canopy: several flattened blades radiating up and out. */
function fanGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const b = new THREE.CylinderGeometry(0.9, 0.15, 0.12, 6, 1);
    b.scale(1, 1, 0.45);
    b.translate(0, 0, 0);
    const a = (i / 5) * Math.PI * 2;
    const m = new THREE.Matrix4().makeRotationY(a).multiply(new THREE.Matrix4().makeRotationX(-0.55)).multiply(new THREE.Matrix4().makeTranslation(0, 0.25, -0.65));
    b.applyMatrix4(m);
    parts.push(b);
  }
  const top = new THREE.CylinderGeometry(0.75, 0.2, 0.14, 7);
  top.translate(0, 0.45, 0);
  parts.push(top);
  return mergeGeos(parts);
}

/** Merge non-indexed copies of geometries (position + normal only). */
export function mergeGeos(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const pos: number[] = [], nor: number[] = [];
  for (const g0 of geos) {
    const g = g0.index ? g0.toNonIndexed() : g0;
    g.computeVertexNormals();
    pos.push(...(g.attributes.position.array as Float32Array));
    nor.push(...(g.attributes.normal.array as Float32Array));
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return out;
}
