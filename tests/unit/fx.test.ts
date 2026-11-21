import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { Fx } from '../../src/world/fx';
import { FX } from '../../src/data/fx';

describe('combat effect pools', () => {
  it('casings fall, bounce on the floor, settle and expire', () => {
    const fx = new Fx(() => 0);
    fx.casing(new THREE.Vector3(0, 1.5, 0), new THREE.Vector3(1, 0, 0));
    let minY = Infinity;
    for (let t = 0; t < 1.5; t += 1 / 60) {
      fx.update(1 / 60);
      const c = (fx.casings as unknown as { items: { p: THREE.Vector3; life: number }[] }).items[0];
      minY = Math.min(minY, c.p.y);
    }
    expect(minY).toBeGreaterThanOrEqual(0);
    expect(fx.casings.mesh.visible).toBe(true);
    for (let t = 0; t < FX.casingLife * 1.3; t += 1 / 30) fx.update(1 / 30);
    expect(fx.casings.mesh.visible).toBe(false);
  });
  it('bullet holes stay, fade out at the end of their life, and the pool wraps', () => {
    const fx = new Fx(() => 0);
    for (let i = 0; i < FX.maxDecals + 10; i++) fx.impact(new THREE.Vector3(i * 0.1, 1, 0), new THREE.Vector3(0, 0, 1), 'hard');
    expect(fx.decals.active).toBe(FX.maxDecals);
    fx.update(FX.decalLife - 1);
    expect(fx.decals.mesh.visible).toBe(true);
    fx.update(2);
    expect(fx.decals.active).toBe(0);
    expect(fx.decals.mesh.visible).toBe(false);
  });
  it('a blast leaves a scorch mark, a ring, chips and smoke, then clears', () => {
    const fx = new Fx(() => 0);
    fx.blast(new THREE.Vector3(0, 0.2, 0));
    fx.update(1 / 60);
    expect(fx.decals.active).toBe(1);
    expect(fx.rings.mesh.visible).toBe(true);
    expect(fx.chips.mesh.visible).toBe(true);
    expect(fx.smoke.points.visible).toBe(true);
    for (let t = 0; t < 5; t += 1 / 30) fx.update(1 / 30);
    expect(fx.rings.mesh.visible).toBe(false);
    expect(fx.smoke.points.visible).toBe(false);
  });
  it('body hits leave no marks on the target', () => {
    const fx = new Fx(() => null);
    for (let i = 0; i < 20; i++) fx.impact(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), 'metal', false);
    expect(fx.decals.active).toBe(0);
  });
});
