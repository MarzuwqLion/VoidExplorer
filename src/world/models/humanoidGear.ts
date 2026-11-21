import * as THREE from 'three';
import { part, ell, rbox, tube, rod } from './shapes';
import type { HumanoidLook, Palette } from './humanoid';

/** The joint groups clothing and gear attach to; index 0 is the left side, 1 the right. */
export interface Rig {
  pelvis: THREE.Group;
  torso: THREE.Group;
  chest: THREE.Group;
  shoulder: [THREE.Group, THREE.Group];
  upperArm: [THREE.Group, THREE.Group];
  lowerArm: [THREE.Group, THREE.Group];
  upperLeg: [THREE.Group, THREE.Group];
  lowerLeg: [THREE.Group, THREE.Group];
}
const SIDES = [-1, 1] as const;
const has = (look: HumanoidLook, g: Gear) => !!look.gear?.includes(g);
export type Gear = 'headset' | 'goggles' | 'datapad' | 'gloves' | 'toolbelt' | 'rank' | 'coat' | 'satchel' | 'vest' | 'sleeves' | 'scarf';

/** Crew and civilian uniform: collar, piping, shoulder boards, pocket, name tape, patch, cuffs and leg stripes. */
export function dressUniform(r: Rig, look: HumanoidLook, P: Palette): void {
  const bw = look.build;
  const c = r.chest;
  c.add(part(tube(0.064, 0.078, 0.07, 16), P.suit, 0, 0.31, 0));
  c.add(part(tube(0.08, 0.08, 0.01, 16), P.trim, 0, 0.278, 0));
  for (const s of SIDES) c.add(part(rbox(0.11 * bw, 0.018, 0.09, 0.007), P.board, s * 0.19 * bw, 0.286, 0, 0, 0, -s * 0.3));
  if (!has(look, 'vest') && !has(look, 'coat')) {
    c.add(part(rbox(0.012, 0.2, 0.006, 0.002), P.suitDark, 0.05 * bw, 0.13, -0.121));
    c.add(part(rbox(0.075, 0.065, 0.01, 0.004), P.suitDark, -0.1 * bw, 0.165, -0.121));
    c.add(part(rbox(0.08, 0.018, 0.012, 0.004), P.suit, -0.1 * bw, 0.2, -0.123));
    c.add(part(new THREE.BoxGeometry(0.075, 0.018, 0.006), P.tape, 0.1 * bw, 0.2, -0.121));
  }
  r.upperArm[0].add(part(tube(0.028, 0.028, 0.008, 14), P.trim, -0.06 * bw, -0.08, 0, 0, 0, Math.PI / 2));
  for (let i = 0; i < 2; i++) {
    const s = SIDES[i];
    if (!has(look, 'sleeves') && !has(look, 'gloves')) r.lowerArm[i].add(part(tube(0.045 * bw, 0.045 * bw, 0.018, 14), P.trim, 0, -0.235, 0));
    r.upperLeg[i].add(part(rbox(0.012, 0.36, 0.02, 0.004), P.trim, s * 0.074 * bw, -0.2, 0));
  }
  if (has(look, 'rank'))
    for (const s of SIDES) for (let i = 0; i < 3; i++) c.add(part(new THREE.BoxGeometry(0.012, 0.008, 0.06), P.gold, s * (0.16 + i * 0.022) * bw, 0.29 - i * 0.0065, 0, 0, 0, -s * 0.3));
}

/** Corps and raider armour: chest and back plates, abdominal plates, pauldrons, forearm, thigh, knee and shin guards, pouches. */
export function dressArmor(r: Rig, look: HumanoidLook, P: Palette): void {
  const bw = look.build;
  const c = r.chest;
  c.add(part(rbox(0.45 * bw, 0.25, 0.07, 0.03), P.armor, 0, 0.14, -0.12));
  c.add(part(rbox(0.4 * bw, 0.24, 0.06, 0.025), P.armor, 0, 0.14, 0.125));
  c.add(part(tube(0.085, 0.095, 0.05, 16), P.armorDark, 0, 0.3, 0));
  if (look.stripe) c.add(part(rbox(0.05, 0.2, 0.012, 0.004), P.trimGlow, 0.12 * bw, 0.14, -0.157));
  for (const s of SIDES) {
    const pad = new THREE.SphereGeometry(0.095, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(bw, 0.8, 1.15);
    c.add(part(pad, P.armor, s * 0.27 * bw, 0.255, 0, 0, 0, -s * 0.3));
    for (const y of [0.07, 0.15]) r.torso.add(part(rbox(0.11 * bw, 0.06, 0.03, 0.012), P.armor, s * 0.06 * bw, y, -0.1));
  }
  if (look.stripe) c.add(part(rbox(0.035, 0.012, 0.15, 0.004), P.trimGlow, 0.3 * bw, 0.318, 0, 0, 0, -0.3));
  for (let i = 0; i < 2; i++) {
    r.lowerArm[i].add(part(rbox(0.09 * bw, 0.16, 0.095 * bw, 0.025), P.armor, 0, -0.12, -0.004));
    r.upperLeg[i].add(part(rbox(0.13 * bw, 0.2, 0.05, 0.02), P.armor, 0, -0.18, -0.07));
    r.lowerLeg[i].add(part(ell(0.055 * bw, 1, 1, 0.6, 12, 8), P.armor, 0, -0.01, -0.055));
    r.lowerLeg[i].add(part(rbox(0.09 * bw, 0.17, 0.04, 0.015), P.armor, 0, -0.16, -0.05));
  }
  for (const s of SIDES) r.pelvis.add(part(rbox(0.07, 0.07, 0.05, 0.015), P.leather, s * 0.12 * bw, 0, -0.115));
  r.pelvis.add(part(rbox(0.06, 0.08, 0.1, 0.015), P.leather, -0.2 * bw, -0.01, 0));
  if (look.cloak !== undefined) c.add(part(rbox(0.6 * bw, 1.0, 0.05, 0.02), P.cloak, 0, -0.32, 0.17, 0.12));
  if (look.antenna) c.add(part(tube(0.012, 0.012, 1.1, 5), P.dark, -0.16 * bw, 0.6, 0.14));
  if (look.cloth !== undefined) r.shoulder[1].add(part(rbox(0.17, 0.12, 0.22, 0.03), P.cloth, 0.03, -0.02, 0));
}

/** Per-character signature items. */
export function addGear(r: Rig, look: HumanoidLook, P: Palette): void {
  const bw = look.build;
  if (has(look, 'vest')) {
    r.chest.add(part(rbox(0.445 * bw, 0.27, 0.255, 0.05), P.armor, 0, 0.12, 0));
    r.torso.add(part(rbox(0.33 * bw, 0.2, 0.205, 0.05), P.armor, 0, 0.14, 0));
    for (const s of SIDES) for (const y of [0.07, 0.16]) r.chest.add(part(rbox(0.075, 0.065, 0.022, 0.006), P.armorDark, s * 0.09 * bw, y, -0.13));
  }
  if (has(look, 'coat')) {
    r.pelvis.add(part(rbox(0.36 * bw, 0.34, 0.03, 0.01), P.suit, 0, -0.17, 0.11, -0.12));
    for (const s of SIDES) {
      r.pelvis.add(part(rbox(0.03, 0.3, 0.16, 0.01), P.suit, s * 0.2 * bw, -0.15, 0.03));
      for (let i = 0; i < 3; i++) r.chest.add(part(ell(0.009, 1, 1, 0.5, 8, 6), P.gold, s * 0.06 * bw, 0.07 + i * 0.065, -0.122));
    }
  }
  if (has(look, 'toolbelt')) {
    r.pelvis.add(part(rbox(0.375 * bw, 0.06, 0.245, 0.02), P.brown, 0, 0.06, 0));
    for (const s of SIDES) {
      r.pelvis.add(part(rbox(0.06, 0.075, 0.045, 0.012), P.brown, s * 0.13 * bw, 0.0, -0.115));
      r.pelvis.add(part(rbox(0.045, 0.08, 0.07, 0.012), P.brown, s * 0.19 * bw, 0.0, 0.02));
    }
    r.pelvis.add(rod(new THREE.Vector3(-0.21 * bw, 0.02, 0.07), new THREE.Vector3(-0.21 * bw, -0.13, 0.07), 0.008, P.metal));
    r.pelvis.add(part(rbox(0.012, 0.022, 0.045, 0.004), P.metal, -0.21 * bw, 0.03, 0.07));
    r.pelvis.add(part(rbox(0.09, 0.06, 0.04, 0.012), P.brown, 0, 0.02, 0.125));
  }
  if (has(look, 'satchel')) {
    r.chest.add(part(rbox(0.035, 0.42, 0.01, 0.003), P.brown, 0, 0.12, -0.126, 0, 0, 0.72));
    r.chest.add(part(rbox(0.035, 0.42, 0.01, 0.003), P.brown, 0, 0.12, 0.126, 0, 0, -0.72));
    r.pelvis.add(part(rbox(0.06, 0.14, 0.17, 0.02), P.brown, 0.205 * bw, -0.08, -0.01));
    r.pelvis.add(part(rbox(0.065, 0.05, 0.172, 0.01), P.brownDark, 0.207 * bw, -0.03, -0.01));
  }
  if (has(look, 'scarf')) {
    r.chest.add(part(new THREE.TorusGeometry(0.066, 0.02, 8, 18), P.scarf, 0, 0.31, 0, Math.PI / 2));
    r.chest.add(part(ell(0.03, 1, 2.6, 0.6, 10, 8), P.scarf, 0.05, 0.22, -0.124, 0, 0, 0.18));
  }
  if (has(look, 'datapad')) {
    r.lowerArm[0].add(part(rbox(0.012, 0.16, 0.11, 0.004), P.dark, -0.032, -0.33, -0.03));
    r.lowerArm[0].add(part(new THREE.BoxGeometry(0.003, 0.135, 0.09), P.screen, -0.0395, -0.33, -0.03));
  }
  if (has(look, 'sleeves')) for (let i = 0; i < 2; i++) r.lowerArm[i].add(part(tube(0.056 * bw, 0.054 * bw, 0.045, 14), P.suit, 0, -0.025, 0));
  if (has(look, 'gloves')) for (let i = 0; i < 2; i++) r.lowerArm[i].add(part(tube(0.047 * bw, 0.045 * bw, 0.04, 14), P.glove, 0, -0.245, 0));
}
