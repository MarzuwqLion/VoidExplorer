import * as THREE from 'three';

/**
 * Merge the static meshes under each group of a jointed model to cut draw calls.
 * Opaque standard-material meshes without a name become one vertex-coloured mesh per group;
 * other meshes are merged per shared material. Named meshes are kept for animation.
 */
export function optimizeModel(root: THREE.Object3D, opts: { shadow?: (group: THREE.Object3D) => boolean } = {}): void {
  const vc = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.72, metalness: 0.18 });
  let used = false;
  const groups: THREE.Object3D[] = [];
  root.traverse((o) => {
    if (!(o as THREE.Mesh).isMesh) groups.push(o);
  });
  for (const g of groups) {
    const plain: THREE.Mesh[] = [];
    const byMat = new Map<string, THREE.Mesh[]>();
    for (const c of g.children) {
      const m = c as THREE.Mesh;
      if (!m.isMesh || m.name || (m as unknown as THREE.InstancedMesh).isInstancedMesh || m.children.length) continue;
      const mat = m.material as THREE.MeshStandardMaterial;
      if (Array.isArray(mat) || !mat.isMeshStandardMaterial) continue;
      const emissive = mat.emissive && (mat.emissive.r + mat.emissive.g + mat.emissive.b) * mat.emissiveIntensity > 0.05;
      if (!mat.transparent && !emissive && !mat.map) plain.push(m);
      else {
        // Same-looking materials merge even when they are separate instances.
        const key = mat.map ? mat.uuid : [mat.color.getHex(), mat.emissive.getHex(), mat.emissiveIntensity, mat.transparent, mat.opacity, mat.side].join('|');
        if (!byMat.has(key)) byMat.set(key, []);
        byMat.get(key)!.push(m);
      }
    }
    const castShadow = opts.shadow ? opts.shadow(g) : true;
    if (plain.length) {
      used = true;
      const merged = mergeMeshes(plain, true);
      const mesh = new THREE.Mesh(merged, vc);
      mesh.castShadow = castShadow;
      mesh.receiveShadow = true;
      for (const m of plain) {
        g.remove(m);
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      }
      g.add(mesh);
    }
    for (const list of byMat.values()) {
      if (list.length < 2) {
        list[0].castShadow = false;
        continue;
      }
      const mat = list[0].material as THREE.Material;
      const mesh = new THREE.Mesh(mergeMeshes(list, false), mat);
      for (const m of list) {
        g.remove(m);
        m.geometry.dispose();
        if (m.material !== mat) (m.material as THREE.Material).dispose();
      }
      g.add(mesh);
    }
  }
  if (!used) vc.dispose();
}

/** Bake a whole model in its current pose into one vertex-coloured mesh (distant LOD). */
export function bakeSingleMesh(root: THREE.Object3D): THREE.Mesh {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const pos: number[] = [], nor: number[] = [], col: number[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.visible) return;
    const mat = m.material as THREE.MeshStandardMaterial;
    const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()).applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
    g.computeVertexNormals();
    const p = g.attributes.position.array as ArrayLike<number>, n = g.attributes.normal.array as ArrayLike<number>;
    const vc = g.attributes.color as THREE.BufferAttribute | undefined;
    const base = mat.emissive && mat.emissive.r + mat.emissive.g + mat.emissive.b > 0.1 ? mat.emissive : mat.color ?? new THREE.Color(0x888888);
    for (let i = 0; i < p.length; i++) {
      pos.push(p[i]);
      nor.push(n[i]);
    }
    for (let i = 0; i < p.length / 3; i++) {
      if (vc && m.geometry.attributes.color) col.push(vc.getX(i), vc.getY(i), vc.getZ(i));
      else col.push(base.r, base.g, base.b);
    }
    g.dispose();
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  out.computeBoundingSphere();
  const mesh = new THREE.Mesh(out, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.75, metalness: 0.15 }));
  mesh.castShadow = true;
  return mesh;
}

function mergeMeshes(list: THREE.Mesh[], colors: boolean): THREE.BufferGeometry {
  const pos: number[] = [], nor: number[] = [], col: number[] = [];
  for (const m of list) {
    m.updateMatrix();
    const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()).applyMatrix4(m.matrix);
    g.computeVertexNormals();
    const p = g.attributes.position.array as ArrayLike<number>, n = g.attributes.normal.array as ArrayLike<number>;
    for (let i = 0; i < p.length; i++) {
      pos.push(p[i]);
      nor.push(n[i]);
    }
    if (colors) {
      const c = (m.material as THREE.MeshStandardMaterial).color;
      // Stored in linear space, matching how material colours are used.
      for (let i = 0; i < p.length / 3; i++) col.push(c.r, c.g, c.b);
    }
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  if (colors) out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  out.computeBoundingSphere();
  return out;
}
