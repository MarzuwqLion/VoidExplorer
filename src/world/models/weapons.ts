import * as THREE from 'three';
import { mat, glow, box, cyl } from '../materials';
import type { WeaponId } from '../../data/names';

/** Weapon models. Muzzle points -Z; the "muzzle" child marks the barrel tip. */
export function buildWeapon(id: WeaponId): THREE.Group {
  const g = new THREE.Group();
  g.name = id;
  const body = mat(0x2a2e33, { rough: 0.5, metal: 0.5 });
  const accent = mat(0x5a6068, { rough: 0.5, metal: 0.4 });
  const amber = glow(0xffa53a, 1.5);
  const muzzle = new THREE.Object3D();
  muzzle.name = 'muzzle';
  if (id === 'pistol') {
    g.add(box(0.045, 0.06, 0.2, body, 0, 0.03, -0.06));
    const grip = box(0.04, 0.11, 0.05, accent, 0, -0.04, 0.02);
    grip.rotation.x = -0.25;
    g.add(grip);
    g.add(box(0.047, 0.012, 0.05, amber, 0, 0.065, -0.08));
    muzzle.position.set(0, 0.035, -0.17);
  } else if (id === 'smg') {
    g.add(box(0.06, 0.09, 0.32, body, 0, 0.02, -0.08));
    const barrel = cyl(0.018, 0.018, 0.12, accent, 6);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.035, -0.29);
    g.add(barrel);
    g.add(box(0.12, 0.04, 0.06, accent, 0.08, 0.02, -0.1));
    g.add(box(0.04, 0.1, 0.05, accent, 0, -0.06, 0.02));
    g.add(box(0.05, 0.05, 0.14, accent, 0, 0.0, 0.14));
    g.add(box(0.062, 0.012, 0.1, amber, 0, 0.07, -0.05));
    muzzle.position.set(0, 0.035, -0.36);
  } else {
    g.add(box(0.06, 0.1, 0.62, body, 0, 0.02, -0.12));
    const barrel = cyl(0.016, 0.016, 0.28, accent, 6);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.04, -0.56);
    g.add(barrel);
    g.add(box(0.025, 0.02, 0.36, accent, 0, 0.08, -0.12));
    const scope = cyl(0.025, 0.025, 0.16, body, 8);
    scope.rotation.x = Math.PI / 2;
    scope.position.set(0, 0.115, -0.08);
    g.add(scope);
    g.add(box(0.045, 0.12, 0.06, accent, 0, -0.07, -0.18));
    g.add(box(0.04, 0.1, 0.05, accent, 0, -0.06, 0.04));
    g.add(box(0.055, 0.09, 0.18, accent, 0, 0.0, 0.26));
    g.add(box(0.062, 0.012, 0.2, amber, 0, 0.075, -0.3));
    muzzle.position.set(0, 0.04, -0.71);
  }
  g.add(muzzle);
  g.traverse((o) => ((o as THREE.Mesh).castShadow = true));
  return g;
}
