import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

/** Replaces NaN or infinite pixels with black so one bad pixel cannot be blurred across the frame by bloom. */
const NAN_GUARD = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader:
    'uniform sampler2D tDiffuse; varying vec2 vUv; void main() { vec4 c = texture2D(tDiffuse, vUv); ' +
    'bvec4 bad = bvec4(isnan(c.r) || isinf(c.r), isnan(c.g) || isinf(c.g), isnan(c.b) || isinf(c.b), isnan(c.a) || isinf(c.a)); ' +
    'gl_FragColor = any(bad) ? vec4(0.0, 0.0, 0.0, 1.0) : max(c, vec4(0.0)); }',
};
import { FixedLoop } from './loop';
import { Input } from './input';
import { GameState, type SceneId } from './state';
import { AudioEngine } from './audio';
import { Emitter } from './events';
import { loadSettings, saveSettings, saveGame, type Settings } from './save';
import { SIM, RENDER, TRANSITIONS, BLOOM } from '../data/tuning';
import { UI } from '../ui/ui';
import { openPause } from '../ui/menus';
import { MenuList } from '../ui/screens';
import type { Scene } from '../scenes/scene';
import { initPhysics } from '../world/physics';
import { installShaderFixes } from '../world/shaderFixes';

export type SceneFactory = (game: Game) => Scene;
export interface GameEvents extends Record<string, unknown> {
  scene: SceneId;
}

/** Owns the renderer, input, state, audio, UI and the current scene. */
export class Game {
  readonly renderer: THREE.WebGLRenderer | null;
  private composer: EffectComposer | null = null;
  private renderPass: RenderPass | null = null;
  bloom: UnrealBloomPass | null = null;
  readonly ui: UI;
  readonly input = new Input();
  readonly state = new GameState();
  readonly audio = new AudioEngine();
  readonly events = new Emitter<GameEvents>();
  readonly loop: FixedLoop;
  settings: Settings = loadSettings();
  scene: Scene | null = null;
  sceneId: SceneId | null = null;
  transitioning = false;
  debug = { god: false, infiniteAmmo: false, showColliders: false, showNav: false, aiLabels: false };
  /** Called each frame with real dt for the debug panel. */
  onFrame: ((dt: number) => void) | null = null;
  onTick: ((dt: number) => void) | null = null;
  /** Runs before input is sampled each step (the loop bot injects input here). */
  preTick: ((dt: number) => void) | null = null;
  fps = 0;
  drawCalls = 0;
  private lastT = 0;
  private wantsLock = false;
  private factories = new Map<SceneId, SceneFactory>();
  webgl = true;
  /** Game state captured at the moment of landing, restored by "Abort mission". */
  landingSnapshot: import('./state').GameStateData | null = null;

  constructor(
    readonly canvas: HTMLCanvasElement,
    uiRoot: HTMLElement,
  ) {
    installShaderFixes();
    let r: THREE.WebGLRenderer | null = null;
    try {
      r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
      r.setPixelRatio(Math.min(window.devicePixelRatio || 1, RENDER.maxPixelRatio));
      r.toneMapping = THREE.ACESFilmicToneMapping;
      r.toneMappingExposure = 1.0;
      r.outputColorSpace = THREE.SRGBColorSpace;
      r.shadowMap.enabled = true;
      r.shadowMap.type = THREE.PCFShadowMap;
    } catch (e) {
      console.error('WebGL unavailable', e);
      this.webgl = false;
    }
    this.renderer = r;
    if (r) {
      r.info.autoReset = false;
      this.composer = new EffectComposer(r);
      this.renderPass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
      this.composer.addPass(this.renderPass);
      this.composer.addPass(new ShaderPass(NAN_GUARD));
      this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), BLOOM.strength, BLOOM.radius, BLOOM.threshold);
      this.composer.addPass(this.bloom);
      this.composer.addPass(new OutputPass());
    }
    this.ui = new UI(uiRoot);
    this.loop = new FixedLoop(SIM.hz, (dt) => this.tick(dt), SIM.maxStepsPerFrame);
    this.applySettings();
    MenuList.onTick = () => this.audio.play('ui_tick');
  }

  /** Gamepad rumble where supported. */
  rumble(strong: number, weak: number, ms: number): void {
    if (this.input.lastDevice !== 'pad' || typeof navigator === 'undefined' || !navigator.getGamepads) return;
    for (const p of navigator.getGamepads()) {
      const a = (p as unknown as { vibrationActuator?: { playEffect?: (t: string, o: object) => Promise<unknown> } } | null)?.vibrationActuator;
      a?.playEffect?.('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak })?.catch?.(() => undefined);
    }
  }

  register(id: SceneId, f: SceneFactory): void {
    this.factories.set(id, f);
  }

  async start(): Promise<void> {
    await initPhysics();
    this.input.attach(this.canvas);
    const unlock = () => this.audio.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    this.canvas.addEventListener('click', () => {
      if (this.scene && this.lockScene() && !this.ui.blocking()) this.requestLock();
    });
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement === this.canvas) return;
      if (this.wantsLock && this.scene && this.lockScene() && !this.ui.top() && !this.transitioning) this.pause(true);
      this.wantsLock = false;
    });
    window.addEventListener('resize', () => this.resize());
    this.resize();
    await this.goto('title');
    requestAnimationFrame(this.frame);
  }

  private lockScene(): boolean {
    return this.sceneId === 'bridge' || this.sceneId === 'planet' || this.sceneId === 'systemMap' || this.sceneId === 'gym';
  }
  requestLock(): void {
    try {
      const p = this.canvas.requestPointerLock() as unknown as Promise<void> | undefined;
      this.wantsLock = true;
      p?.catch?.(() => (this.wantsLock = false));
    } catch {
      this.wantsLock = false;
    }
  }
  exitLock(): void {
    this.wantsLock = false;
    if (document.pointerLockElement) document.exitPointerLock();
  }

  resize(): void {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer?.setSize(w, h, false);
    this.composer?.setSize(w, h);
    this.composer?.setPixelRatio(Math.min(window.devicePixelRatio || 1, RENDER.maxPixelRatio));
    if (this.scene) {
      this.scene.camera.aspect = w / h;
      this.scene.camera.updateProjectionMatrix();
    }
  }

  applySettings(): void {
    const s = this.settings;
    this.input.settings.mouseSens = s.mouseSens;
    this.input.settings.padSens = s.padSens;
    this.input.settings.invertY = s.invertY;
    this.audio.setVolumes({ master: s.master, effects: s.effects, ambient: s.ambient, music: s.music });
    saveSettings(s);
  }

  /** One fixed simulation step. */
  private tick(dt: number): void {
    this.preTick?.(dt);
    this.input.poll(dt);
    this.onTick?.(dt);
    if (this.ui.blocking()) {
      this.ui.update(this.input, dt);
      return;
    }
    if (!this.scene || this.transitioning) return;
    if (this.input.pressed('pause') && this.sceneId !== 'title' && this.sceneId !== 'end') {
      this.input.consume('pause');
      this.input.consume('back');
      this.pause(false);
      return;
    }
    if (this.sceneId !== 'title') this.state.data.stats.playTime += dt;
    this.scene.update(dt);
  }

  pause(lockLost: boolean): void {
    this.exitLock();
    openPause(this, lockLost);
  }
  resume(): void {
    this.ui.popAll();
    this.input.reset();
    if (this.lockScene()) this.requestLock();
  }

  private frame = (t: number): void => {
    const dt = this.lastT ? (t - this.lastT) / 1000 : 1 / 60;
    this.lastT = t;
    this.fps = this.fps * 0.95 + (dt > 0 ? 1 / dt : 60) * 0.05;
    const alpha = this.loop.advance(dt);
    this.renderNow(alpha, dt);
    this.onFrame?.(dt);
    requestAnimationFrame(this.frame);
  };

  renderNow(alpha = 1, dt = 1 / 60): void {
    if (!this.scene) return;
    this.scene.render(alpha, dt * this.loop.timeScale);
    if (this.renderer) {
      this.renderer.info.reset();
      if (this.composer && this.renderPass && this.settings.bloom) {
        this.renderPass.scene = this.scene.three;
        this.renderPass.camera = this.scene.camera;
        this.composer.render();
      } else this.renderer.render(this.scene.three, this.scene.camera);
      this.drawCalls = this.renderer.info.render.calls;
    }
  }

  /** Change scene with a fade. Exits and disposes the old scene first. */
  async goto(id: SceneId, opts: Record<string, unknown> = {}): Promise<void> {
    const f = this.factories.get(id);
    if (!f) throw new Error('Unknown scene ' + id);
    if (this.transitioning) return;
    this.transitioning = true;
    try {
      const fadeTime = opts.instant ? 0 : TRANSITIONS.fade;
      if (this.scene) await this.ui.fade(true, fadeTime);
      this.exitLock();
      this.input.reset();
      this.scene?.exit();
      this.scene = null;
      this.ui.popAll();
      const s = f(this);
      this.scene = s;
      this.sceneId = id;
      this.resize();
      await s.enter(opts);
      if (id === 'bridge' || id === 'systemMap') {
        this.state.data.scene = id;
        saveGame(this.state);
      }
      this.events.emit('scene', id);
      this.renderNow();
      void this.ui.fade(false, fadeTime);
    } finally {
      this.transitioning = false;
    }
  }
}
