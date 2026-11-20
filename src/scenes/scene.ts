import * as THREE from 'three';
import type { Game } from '../core/game';
import type { SceneId } from '../core/state';

/** Scene-specific hooks for the debug API. */
export interface SceneApi {
  teleport?(x: number, y: number, z: number): void;
  completeObjective?(): void;
  killAll?(): void;
  spawn?(type: string, n: number): void;
  teleportShipTo?(id: string): void;
  /** Named beats or checkpoints this scene can jump to. */
  beats?(): string[];
  jumpTo?(beat: string): void;
  layoutMap?(): string;
  info?(): Record<string, unknown>;
}

/** Base scene: owns its Three.js objects and listeners, and disposes all of them on exit. */
export abstract class Scene {
  abstract readonly id: SceneId;
  readonly three = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, 16 / 9, 0.1, 4000);
  api: SceneApi = {};
  private cleanups: (() => void)[] = [];
  constructor(readonly game: Game) {}

  abstract enter(opts: Record<string, unknown>): Promise<void> | void;
  abstract update(dt: number): void;
  render(_alpha: number, _frameDt: number): void {}

  /** Register a cleanup callback run on exit. */
  onExit(fn: () => void): void {
    this.cleanups.push(fn);
  }
  listen<K extends keyof WindowEventMap>(target: Window, type: K, fn: (e: WindowEventMap[K]) => void): void {
    target.addEventListener(type, fn);
    this.cleanups.push(() => target.removeEventListener(type, fn));
  }

  exit(): void {
    for (const fn of this.cleanups.splice(0).reverse()) fn();
    disposeObject(this.three);
    this.three.clear();
  }
}

/** Dispose every geometry, material and texture under an object. */
export function disposeObject(root: THREE.Object3D): void {
  const mats = new Set<THREE.Material>();
  const geos = new Set<THREE.BufferGeometry>();
  root.traverse((o) => {
    const light = o as unknown as { isLight?: boolean; dispose?: () => void };
    if (light.isLight) light.dispose?.();
    const m = o as THREE.Mesh;
    if (m.geometry) geos.add(m.geometry);
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((x) => mats.add(x));
    else if (mat) mats.add(mat);
  });
  for (const g of geos) g.dispose();
  for (const m of mats) {
    for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose();
    m.dispose();
  }
  const bg = (root as THREE.Scene).background;
  if (bg instanceof THREE.Texture) bg.dispose();
}
