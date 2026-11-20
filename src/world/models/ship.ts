import * as THREE from 'three';
import { mat, glow, box, cyl } from '../materials';

/** The Sojourner: wedge-shaped survey frigate about 120 m long (1 unit = 1 m). Nose points -Z. */
export function buildShip(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'sojourner';
  const hull = mat(0xc9ced4, { rough: 0.6, metal: 0.3 });
  const dark = mat(0x4a525c, { rough: 0.7, metal: 0.4 });
  const amber = glow(0xffa53a, 3);
  const engine = glow(0x8fd0ff, 4);
  // Wedge hull: a tapered extrusion.
  const shape = new THREE.Shape();
  shape.moveTo(0, -60);
  shape.lineTo(22, 40);
  shape.lineTo(16, 60);
  shape.lineTo(-16, 60);
  shape.lineTo(-22, 40);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 10, bevelEnabled: true, bevelThickness: 3, bevelSize: 2, bevelSegments: 1 });
  geo.rotateX(Math.PI / 2);
  geo.translate(0, 5, 0);
  const body = new THREE.Mesh(geo, hull);
  body.castShadow = true;
  g.add(body);
  // Dorsal spine and bridge block.
  g.add(box(10, 6, 70, dark, 0, 8, 15));
  g.add(box(14, 5, 14, hull, 0, 11, 30));
  // Sensor mast.
  const mast = cyl(0.8, 1.2, 22, dark, 6);
  mast.position.set(0, 22, 26);
  g.add(mast);
  const dish = cyl(5, 1, 1.5, hull, 12);
  dish.position.set(0, 33, 26);
  g.add(dish);
  // Twin nacelles.
  for (const sx of [-1, 1]) {
    const n = cyl(6, 7, 46, dark, 12);
    n.rotation.x = Math.PI / 2;
    n.position.set(sx * 26, -1, 38);
    g.add(n);
    const pylon = box(10, 3, 18, hull, sx * 19, 0, 38);
    g.add(pylon);
    const e = new THREE.Mesh(new THREE.CircleGeometry(5.5, 16), engine);
    e.position.set(sx * 26, -1, 61.2);
    g.add(e);
  }
  // Amber running lights along the edges.
  for (let i = 0; i < 6; i++) {
    const z = -45 + i * 17;
    const x = 4 + (z + 60) * 0.18;
    for (const sx of [-1, 1]) g.add(box(1.4, 1, 3, amber, sx * x, 3, z));
  }
  g.add(box(16, 0.8, 1.2, amber, 0, 13.6, 23));
  return g;
}

/** Boxy 9 m dropship with tilting thrusters and a rear ramp. Nose points -Z. */
export function buildShuttle(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'shuttle';
  const hull = mat(0xb9bfc6, { rough: 0.6, metal: 0.3 });
  const dark = mat(0x3c434c, { rough: 0.7 });
  const amber = glow(0xffa53a, 2.5);
  const glass = mat(0x1d3550, { rough: 0.2, metal: 0.6 });
  g.add(box(3.6, 2.6, 7.5, hull, 0, 2.1, 0));
  const nose = box(3.0, 1.8, 1.8, hull, 0, 2.0, -4.4);
  g.add(nose);
  g.add(box(2.6, 0.7, 0.3, glass, 0, 2.6, -5.35));
  g.add(box(4.2, 0.4, 6, dark, 0, 3.55, 0.3));
  // Rear ramp, lowered.
  const ramp = box(3, 0.2, 2.6, dark, 0, 0.55, 4.6);
  ramp.rotation.x = -0.32;
  ramp.name = 'ramp';
  g.add(ramp);
  // Tilting thruster pods.
  const pods = new THREE.Group();
  pods.name = 'thrusters';
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const p = cyl(0.55, 0.7, 1.4, dark, 8);
      p.position.set(sx * 2.7, 2.4, sz * 2.4);
      p.name = 'pod';
      pods.add(p);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.6, 8), glow(0x9ad8ff, 3));
      flame.position.set(sx * 2.7, 1.2, sz * 2.4);
      flame.rotation.x = Math.PI;
      flame.name = 'flame';
      pods.add(flame);
    }
  }
  g.add(pods);
  // Landing skids.
  for (const sx of [-1, 1]) g.add(box(0.25, 0.25, 6.5, dark, sx * 1.6, 0.2, 0));
  g.add(box(0.2, 0.2, 2, amber, 1.85, 2.8, -2));
  g.add(box(0.2, 0.2, 2, amber, -1.85, 2.8, -2));
  return g;
}
