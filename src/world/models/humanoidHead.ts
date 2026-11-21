import * as THREE from 'three';
import { part, ell, rbox, tube, dome, band, rod } from './shapes';
import type { HumanoidLook, Palette } from './humanoid';
import { FACE } from '../../data/tuning';

/** Skull centre and proportions, relative to the head joint. */
const SKULL = { y: 0.125, z: 0.005, r: 0.1, sx: 0.86, sz: 0.98 };
const JAW = { y: 0.062, z: -0.022, r: 0.075 };
/** Bare heads are scaled up slightly so they sit well on the heroic body. */
const HEAD_SCALE = 1.1;

export interface Face {
  eyes: THREE.Group | null;
  brows: THREE.Group | null;
}

/** Bare head (skull, jaw, nose, ears, eyes, brows, hair, beard) or a helmet, plus headgear. */
export function buildHead(head: THREE.Group, look: HumanoidLook, P: Palette): Face {
  if (look.helmet) {
    helmet(head, look, P);
    return { eyes: null, brows: null };
  }
  const jw = 0.92 + (look.build - 1) * 0.6;
  head.scale.setScalar(HEAD_SCALE);
  head.add(part(ell(SKULL.r, SKULL.sx, 1, SKULL.sz, 22, 16), P.skin, 0, SKULL.y, SKULL.z));
  head.add(part(ell(JAW.r, jw, 0.72, 1, 18, 12), P.skin, 0, JAW.y, JAW.z));
  head.add(part(ell(0.03, 1.1, 0.8, 0.9, 10, 8), P.skin, 0, 0.035, -0.066));
  head.add(part(rbox(0.13, 0.024, 0.03, 0.01), P.skin, 0, 0.143, -0.084));
  head.add(part(rbox(0.026, 0.05, 0.03, 0.01), P.skin, 0, 0.103, -0.094, 0.28));
  head.add(part(ell(0.015, 1.25, 0.9, 1, 10, 8), P.skin, 0, 0.082, -0.104));
  for (const side of [-1, 1]) head.add(part(ell(0.026, 0.38, 1, 0.7, 10, 8), P.skin, side * 0.084, 0.11, 0.008));
  const lipZ = look.beard === 'full' ? -0.108 : look.beard === 'stubble' ? -0.1 : -0.097;
  head.add(part(rbox(0.046, 0.011, 0.012, 0.004), P.lip, 0, 0.056, lipZ));
  if (look.beard) {
    const full = look.beard === 'full';
    const r = full ? 0.081 : 0.0765;
    const m = full ? P.hair : P.stubble;
    head.add(part(band(r, 0.42 * Math.PI, Math.PI, jw * 1.02, 0.78, 1.04), m, 0, JAW.y, JAW.z));
    if (full) head.add(part(rbox(0.064, 0.016, 0.022, 0.007), P.hair, 0, 0.068, -0.1));
  }
  // Eyes in their own group so a blink is one scale.
  const eyes = new THREE.Group();
  eyes.name = 'eyes';
  eyes.position.set(0, 0.122, -0.083);
  for (const side of [-1, 1]) {
    eyes.add(part(ell(0.0165, 1.1, 0.72, 0.55, 12, 8), P.white, side * 0.035, 0, 0));
    eyes.add(part(ell(0.0085, 1, 1, 0.5, 10, 8), P.iris, side * 0.035, 0, -0.0075));
  }
  head.add(eyes);
  const brows = new THREE.Group();
  brows.name = 'brows';
  brows.position.set(0, 0.147, -0.094);
  brows.userData.baseY = brows.position.y;
  const tilt = look.brow ?? 0.1;
  for (const side of [-1, 1]) brows.add(part(rbox(0.042, 0.011, 0.014, 0.004), P.hair, side * 0.036, 0, 0, 0, 0, -side * tilt));
  head.add(brows);
  hair(head, look, P);
  if (look.gear?.includes('headset')) headset(head, P);
  if (look.gear?.includes('goggles')) goggles(head, P);
  return { eyes, brows };
}

function hair(head: THREE.Group, look: HumanoidLook, P: Palette): void {
  const cap = (r: number, theta: number, tilt: number) => head.add(part(dome(r, theta, 0.88, 1, 1), P.hair, 0, SKULL.y, SKULL.z, tilt));
  const hs = look.hairStyle;
  if (hs === 'crop') cap(0.104, 0.5 * Math.PI, 0.55);
  if (hs === 'shaved') cap(0.1015, 0.52 * Math.PI, 0.55);
  if (hs === 'short' || hs === 'swept') {
    cap(0.11, 0.54 * Math.PI, 0.6);
    if (!look.gear?.includes('goggles')) head.add(part(ell(0.06, 1.2, 0.62, 0.9), P.hair, 0, 0.19, -0.05, -0.55));
  }
  if (hs === 'swept') head.add(part(ell(0.05, 1.15, 0.6, 1.15), P.hair, 0, 0.205, -0.058, -0.6));
  if (hs === 'bun') {
    cap(0.107, 0.56 * Math.PI, 0.55);
    head.add(part(ell(0.05, 1, 0.9, 0.9), P.hair, 0, 0.19, 0.112));
    head.add(part(tube(0.03, 0.03, 0.018, 12), P.trimDark, 0, 0.19, 0.075, Math.PI / 2));
  }
  if (hs === 'curly') {
    cap(0.112, 0.55 * Math.PI, 0.55);
    const n = 14;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const phi = i % 2 ? 0.5 : 1.0;
      const R = 0.098;
      head.add(part(ell(0.05, 1, 0.9, 1, 10, 8), P.hair, Math.sin(a) * Math.sin(phi) * R * 0.9, SKULL.y + Math.cos(phi) * R, SKULL.z + Math.cos(a) * Math.sin(phi) * R));
    }
    head.add(part(ell(0.05, 1, 0.8, 1, 10, 8), P.hair, 0, SKULL.y + 0.11, SKULL.z));
  }
}

function headset(head: THREE.Group, P: Palette): void {
  for (const side of [-1, 1]) {
    head.add(part(tube(0.032, 0.032, 0.026, 14), P.dark, side * 0.095, 0.11, 0.008, 0, 0, Math.PI / 2));
    head.add(part(tube(0.022, 0.022, 0.01, 12), P.trimDark, side * 0.11, 0.11, 0.008, 0, 0, Math.PI / 2));
  }
  const arc = new THREE.TorusGeometry(0.13, 0.008, 6, 20, Math.PI).scale(0.74, 1, 1);
  head.add(part(arc, P.dark, 0, 0.11, 0.008));
  const from = new THREE.Vector3(0.1, 0.1, -0.01), to = new THREE.Vector3(0.04, 0.06, -0.105);
  head.add(rod(from, to, 0.0045, P.dark));
  head.add(part(ell(0.01), P.dark, to.x, to.y, to.z));
}

function goggles(head: THREE.Group, P: Palette): void {
  const strap = new THREE.TorusGeometry(0.108, 0.007, 6, 28).scale(0.88, 1, 1);
  head.add(part(strap, P.dark, 0, 0.16, 0.005, Math.PI / 2 + 0.4));
  for (const side of [-1, 1]) {
    head.add(part(tube(0.024, 0.027, 0.024, 14), P.dark, side * 0.034, 0.2, -0.078, Math.PI / 2 - 0.45));
    head.add(part(tube(0.02, 0.02, 0.006, 14), P.glass, side * 0.034, 0.205, -0.089, Math.PI / 2 - 0.45));
  }
}

function helmet(head: THREE.Group, look: HumanoidLook, P: Palette): void {
  head.add(part(ell(0.15, 0.92, 0.95, 1, 22, 16), P.armor, 0, 0.12, 0.01));
  head.add(part(rbox(0.2, 0.05, 0.2, 0.02), P.armorDark, 0, 0.02, 0));
  head.add(part(rbox(0.03, 0.03, 0.24, 0.012), P.armor, 0, 0.255, 0.012));
  for (const side of [-1, 1]) head.add(part(tube(0.045, 0.045, 0.03, 14), P.armorDark, side * 0.135, 0.11, 0.01, 0, 0, Math.PI / 2));
  if (look.roundVisor !== undefined) {
    const v = part(ell(0.09, 1, 1, 0.5, 14, 10), P.glass, 0, 0.12, -0.1);
    head.add(v);
    head.add(part(rbox(0.1, 0.065, 0.05, 0.018), P.armorDark, 0, 0.035, -0.115));
    for (const side of [-1, 1]) head.add(part(tube(0.024, 0.024, 0.05, 12), P.dark, side * 0.06, 0.03, -0.128, Math.PI / 2 - 0.3, 0, side * 0.35));
  } else {
    const visor = new THREE.CylinderGeometry(0.155, 0.155, 0.06, 22, 1, true, Math.PI - 0.85, 1.7).scale(0.92, 1, 1);
    head.add(part(visor, P.visor, 0, 0.13, 0.01));
    head.add(part(rbox(0.12, 0.05, 0.05, 0.018), P.armorDark, 0, 0.045, -0.12));
  }
}

/** Blink and brow movement; talking (0 to 1) adds small brow lifts. */
export function animateFace(face: Face, t: number, seed: number, talking: number): void {
  if (face.eyes) {
    const period = FACE.blinkEvery + ((seed * 7.31) % 1) * FACE.blinkJitter;
    const ph = (t + seed * 1.93) % period;
    const k = ph < FACE.blinkTime ? Math.sin((ph / FACE.blinkTime) * Math.PI) : 0;
    face.eyes.scale.y = 1 - (1 - FACE.closedScale) * k;
  }
  if (face.brows) face.brows.position.y = (face.brows.userData.baseY as number) + talking * Math.max(0, Math.sin(t * 2.7 + seed)) * FACE.browLift;
}
