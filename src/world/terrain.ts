import * as THREE from 'three';

export interface TerrainDef {
  min: number;
  max: number;
  /** Metres per vertex. */
  step: number;
  height: (x: number, z: number) => number;
  color: (x: number, z: number, h: number, slope: number) => THREE.Color;
  /** Extra visual ring beyond the playable area (m). */
  skirt?: number;
}

/** Sample a height function into a grid. Returns trimesh arrays for physics. */
export function terrainArrays(d: TerrainDef): { verts: Float32Array; idx: Uint32Array; n: number } {
  const n = Math.round((d.max - d.min) / d.step) + 1;
  const verts = new Float32Array(n * n * 3);
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const x = d.min + i * d.step, z = d.min + j * d.step;
      verts.set([x, d.height(x, z), z], (j * n + i) * 3);
    }
  const idx = new Uint32Array((n - 1) * (n - 1) * 6);
  let k = 0;
  for (let j = 0; j < n - 1; j++)
    for (let i = 0; i < n - 1; i++) {
      const a = j * n + i, b = a + 1, c = a + n, e = c + 1;
      idx.set([a, c, b, b, c, e], k);
      k += 6;
    }
  return { verts, idx, n };
}

/** Visual terrain mesh with vertex colors, plus a coarser skirt out to the horizon. */
export function buildTerrainMesh(d: TerrainDef, arrays = terrainArrays(d)): THREE.Group {
  const g = new THREE.Group();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(arrays.verts, 3));
  geo.setIndex(new THREE.BufferAttribute(arrays.idx, 1));
  geo.computeVertexNormals();
  const nor = geo.attributes.normal as THREE.BufferAttribute;
  const col = new Float32Array(arrays.verts.length);
  for (let i = 0; i < arrays.verts.length / 3; i++) {
    const x = arrays.verts[i * 3], y = arrays.verts[i * 3 + 1], z = arrays.verts[i * 3 + 2];
    const slope = 1 - nor.getY(i);
    const c = d.color(x, z, y, slope);
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true });
  const mesh = new THREE.Mesh(geo, m);
  mesh.receiveShadow = true;
  mesh.name = 'terrain';
  g.add(mesh);
  if (d.skirt) {
    const S = d.skirt, step = 12;
    const sg = new THREE.PlaneGeometry((d.max - d.min) + S * 2, (d.max - d.min) + S * 2, Math.round(((d.max - d.min) + S * 2) / step), Math.round(((d.max - d.min) + S * 2) / step));
    sg.rotateX(-Math.PI / 2);
    const p = sg.attributes.position as THREE.BufferAttribute;
    const sc = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      const inside = x > d.min - 1 && x < d.max + 1 && z > d.min - 1 && z < d.max + 1;
      const cx = Math.max(d.min, Math.min(d.max, x)), cz = Math.max(d.min, Math.min(d.max, z));
      const y = inside ? -30 : d.height(cx, cz) + Math.max(0, Math.hypot(x - cx, z - cz) - 4) * 0.15;
      p.setY(i, y);
      const c = d.color(cx, cz, y, 0.3);
      sc.set([c.r, c.g, c.b], i * 3);
    }
    sg.setAttribute('color', new THREE.BufferAttribute(sc, 3));
    sg.computeVertexNormals();
    const skirt = new THREE.Mesh(sg, m);
    skirt.receiveShadow = true;
    g.add(skirt);
  }
  return g;
}
