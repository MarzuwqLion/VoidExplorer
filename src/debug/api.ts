import type { Game } from '../core/game';
import type { SceneId } from '../core/state';
import type { ResourceId } from '../data/names';
import type { Action } from '../data/bindings';
import { rng } from '../core/rng';
import { Bot } from './bot';

/** Installs window.__game, the debug and test API. */
export function installDebugApi(game: Game, extra: Record<string, unknown> = {}): void {
  const v = game.input.virtual;
  const bot = new Bot(game);
  const api = {
    game,
    state: () => ({ ...game.state.snapshot(), sceneId: game.sceneId, transitioning: game.transitioning, info: game.scene?.api.info?.() ?? {} }),
    scene: () => game.sceneId,
    info: () => game.scene?.api.info?.() ?? {},
    ready: () => !!game.scene && !game.transitioning,
    goto: (scene: SceneId, opts: Record<string, unknown> = {}) => game.goto(scene, opts),
    teleport: (x: number, y: number, z: number) => game.scene?.api.teleport?.(x, y, z),
    teleportShipTo: (id: string) => game.scene?.api.teleportShipTo?.(id),
    give: (r: ResourceId, n: number) => game.state.give(r, n),
    setFlag: (name: string, value = true) => game.state.setFlag(name, value),
    completeObjective: () => game.scene?.api.completeObjective?.(),
    god: (on = true) => (game.debug.god = on),
    killAll: () => game.scene?.api.killAll?.(),
    spawn: (type: string, n = 1) => game.scene?.api.spawn?.(type, n),
    beats: () => game.scene?.api.beats?.() ?? [],
    jumpTo: (beat: string) => game.scene?.api.jumpTo?.(beat),
    step: (seconds: number) => {
      game.loop.stepSeconds(seconds);
      game.renderNow();
      return game.loop.time;
    },
    seed: (n: number) => rng.seed(n),
    timeScale: (s: number) => (game.loop.timeScale = s),
    layoutMap: () => game.scene?.api.layoutMap?.() ?? null,
    input: {
      hold: (a: Action) => v.held.add(a),
      release: (a: Action) => v.held.delete(a),
      tap: (a: Action) => v.taps.add(a),
      move: (x: number, y: number) => (v.move = { x, y }),
      look: (x: number, y: number) => (v.look = { x, y }),
      clear: () => {
        v.held.clear();
        v.taps.clear();
        v.move = { x: 0, y: 0 };
        v.look = { x: 0, y: 0 };
      },
      device: () => game.input.lastDevice,
    },
    ui: {
      text: () => game.ui.root.innerText,
      screen: () => (game.ui.modal.lastElementChild as HTMLElement | null)?.dataset.screen ?? null,
      click: (label: string) => {
        const b = [...game.ui.root.querySelectorAll('button')].find((x) => x.textContent?.trim() === label && !x.disabled);
        b?.click();
        return !!b;
      },
      toasts: () => game.ui.toasts(),
    },
    renderInfo: () => ({
      calls: game.drawCalls,
      geometries: game.renderer?.info.memory.geometries ?? 0,
      textures: game.renderer?.info.memory.textures ?? 0,
      triangles: game.renderer?.info.render.triangles ?? 0,
      webgl: game.webgl,
    }),
    audio: () => Object.fromEntries(game.audio.played),
    bot,
    ...extra,
  };
  (window as unknown as { __game: typeof api }).__game = api;
}
