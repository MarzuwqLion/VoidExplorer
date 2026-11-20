import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildEnemyVisual } from '../../src/world/models/enemyModels';
import { optimizeModel } from '../../src/world/models/optimize';

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
