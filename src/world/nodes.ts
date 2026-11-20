import * as THREE from 'three';
import type { NodeDef } from '../data/layouts';
import { NAMES } from '../data/names';
import { HARVEST } from '../data/tuning';
import { mat, glow } from './materials';
import { optimizeModel } from './models/optimize';

export const NODE_COLORS = { alloy: 0x8fa8c8, biomass: 0xb8d65a, isotopes: 0xc48cff };

/** Visual for a resource node: ore vein, plant cluster or crystal. */
export function buildNodeView(n: NodeDef): THREE.Group {
  const g = new THREE.Group();
  const c = NODE_COLORS[n.type];
  if (n.type === 'alloy') {
    const rock = mat(0x4a4f58, { rough: 0.9 });
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35 + i * 0.08, 0), rock);
      m.position.set((i - 1) * 0.35, 0.25, (i % 2) * 0.2);
      m.castShadow = true;
      g.add(m);
    }
    for (let i = 0; i < 4; i++) {
      const v = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), glow(c, 1.4));
      v.position.set((i - 1.5) * 0.25, 0.35, 0.15);
      v.rotation.z = (i - 1.5) * 0.4;
      g.add(v);
    }
  } else if (n.type === 'biomass') {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const m = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.7 + (i % 3) * 0.2, 5), glow(c, 0.9));
      m.position.set(Math.cos(a) * 0.3, 0.4, Math.sin(a) * 0.3);
      m.rotation.set(Math.sin(a) * 0.3, 0, Math.cos(a) * 0.3);
      g.add(m);
    }
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), glow(0xf0e070, 1.6));
    bulb.position.y = 0.55;
    g.add(bulb);
  } else {
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.22 + i * 0.05, 0), glow(c, 1.8));
      m.scale.y = 2.2;
      m.position.set((i - 1.5) * 0.2, 0.4, (i % 2) * 0.15);
      m.rotation.z = (i - 1.5) * 0.25;
      g.add(m);
    }
  }
  g.name = n.id;
  optimizeModel(g, { shadow: () => false });
  return g;
}

export function nodeLabel(n: NodeDef): string {
  return 'Harvest ' + NAMES.resources[n.type];
}
export const HARVEST_TIME = HARVEST.holdTime;

/** Scanner beam from the commander's hand to a node while harvesting. */
export class ScanBeam {
  readonly mesh: THREE.Mesh;
  constructor() {
    this.mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.08, 1, 6, 1, true).translate(0, 0.5, 0).rotateX(Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x7fe0ff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    this.mesh.visible = false;
  }
  set(from: THREE.Vector3 | null, to?: THREE.Vector3): void {
    if (!from || !to) {
      this.mesh.visible = false;
      return;
    }
    this.mesh.visible = true;
    this.mesh.position.copy(from);
    this.mesh.lookAt(to);
    this.mesh.scale.set(1, 1, from.distanceTo(to));
    (this.mesh.material as THREE.MeshBasicMaterial).opacity = 0.5 + Math.random() * 0.3;
  }
}

/** Ammo crate model, locked (red light) or unlocked (green light). */
export function buildCrate(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.6, 0.7), mat(0x3e4a3a, { rough: 0.8 }));
  body.position.y = 0.3;
  body.castShadow = true;
  g.add(body);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.08, 0.74), mat(0x2c3428));
  lid.position.y = 0.64;
  g.add(lid);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.06, 0.72), glow(0xf2a541, 0.8));
  stripe.position.y = 0.45;
  g.add(stripe);
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.12), glow(0xff3020, 2));
  lamp.position.set(0.4, 0.72, 0);
  lamp.name = 'lamp';
  g.add(lamp);
  optimizeModel(g, { shadow: () => false });
  body.castShadow = true;
  return g;
}
export function setCrateUnlocked(g: THREE.Group, on: boolean): void {
  const l = g.getObjectByName('lamp') as THREE.Mesh | undefined;
  if (l) {
    const m = l.material as THREE.MeshStandardMaterial;
    m.color.set(on ? 0x40ff70 : 0xff3020);
    m.emissive.set(on ? 0x40ff70 : 0xff3020);
  }
}
