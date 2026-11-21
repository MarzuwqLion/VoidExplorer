import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildEnemyVisual } from '../../src/world/models/enemyModels';
import { optimizeModel } from '../../src/world/models/optimize';
import { buildHumanoid } from '../../src/world/models/humanoid';
import { animateFace } from '../../src/world/models/humanoidHead';
import { LOOKS } from '../../src/data/characters';
import { FACE } from '../../src/data/tuning';

/** Distinct vertex colours across every vertex-coloured mesh of a model. */
function vertexColours(root: THREE.Object3D): Set<string> {
  const out = new Set<string>();
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    const c = m.isMesh ? (m.geometry.attributes.color as THREE.BufferAttribute | undefined) : undefined;
    if (!c) return;
    for (let i = 0; i < c.count; i++) out.add([c.getX(i), c.getY(i), c.getZ(i)].map((v) => v.toFixed(3)).join(','));
  });
  return out;
}

describe('model optimisation', () => {
  it('keeps raider suit colours when a model is optimised twice', () => {
    const v = buildEnemyVisual('rifleman');
    const before = vertexColours(v.root);
    optimizeModel(v.root);
    const after = vertexColours(v.root);
    expect(before.size).toBeGreaterThan(2);
    expect(after).toEqual(before);
    // Rust-orange armour survives, not flattened to white.
    const armor = new THREE.Color(0xb0562a);
    const key = [armor.r, armor.g, armor.b].map((x) => x.toFixed(3)).join(',');
    expect(after.has(key)).toBe(true);
    expect(after.has('1.000,1.000,1.000')).toBe(false);
  });
});

describe('character rigs', () => {
  const meshes = (root: THREE.Object3D) => {
    const out: THREE.Mesh[] = [];
    root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) out.push(o as THREE.Mesh);
    });
    return out;
  };
  for (const [name, look] of Object.entries(LOOKS)) {
    it(name + ': jointed, finite, smooth-shaded and cheap to draw', () => {
      const h = buildHumanoid(look);
      expect(Object.keys(h.joints).length).toBeGreaterThanOrEqual(15);
      const list = meshes(h.root);
      // One merged mesh per moving part, plus a few emissive extras.
      expect(list.length, name + ' draw calls').toBeLessThanOrEqual(20);
      let tris = 0;
      for (const m of list) {
        const p = m.geometry.attributes.position.array as ArrayLike<number>;
        const n = m.geometry.attributes.normal.array as ArrayLike<number>;
        expect(Array.prototype.every.call(p, Number.isFinite), name + ' positions').toBe(true);
        expect(Array.prototype.every.call(n, Number.isFinite), name + ' normals').toBe(true);
        tris += p.length / 9;
      }
      expect(tris, name + ' triangles').toBeLessThan(20000);
      expect(list.some((m) => (m.material as THREE.MeshStandardMaterial).flatShading === false)).toBe(true);
      // Feet on the floor.
      const box = new THREE.Box3().setFromObject(h.root);
      expect(Math.abs(box.min.y)).toBeLessThan(0.02);
      if (look.helmet) expect(h.face.eyes).toBeNull();
      else {
        expect(h.face.eyes!.children.length).toBeGreaterThan(0);
        expect(h.face.brows!.children.length).toBeGreaterThan(0);
      }
    });
  }
  it('faces blink shut briefly and reopen', () => {
    const h = buildHumanoid(LOOKS.zhao);
    const scales: number[] = [];
    for (let t = 0; t < 10; t += 0.01) {
      animateFace(h.face, t, 2, 0);
      scales.push(h.face.eyes!.scale.y);
    }
    expect(Math.min(...scales)).toBeLessThan(0.3);
    expect(scales.filter((s) => s === 1).length / scales.length).toBeGreaterThan(0.9);
    expect(FACE.blinkTime).toBeLessThan(0.3);
  });
});
