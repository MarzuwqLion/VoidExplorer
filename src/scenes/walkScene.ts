import * as THREE from 'three';
import { Scene } from './scene';
import type { WalkWorld } from '../world/walkWorld';
import { CommanderView, type WeaponPose } from '../player/view';
import { Hud } from '../ui/hud';
import { DialogueRunner } from '../core/dialogueRunner';
import { DialogueView } from '../ui/dialogueView';
import type { DGraph, Effect } from '../data/dialogue/types';
import type { Npc } from '../world/npc';
import type { PlayerCmd } from '../player/controller';
import { CameraRig } from '../player/camera';
import { DIALOGUE_LIGHT } from '../data/tuning';

/** Shared base for scenes where the commander walks: bridge, planets, test gym. */
export abstract class WalkScene extends Scene {
  world!: WalkWorld;
  commander!: CommanderView;
  hud!: Hud;
  npcs: Npc[] = [];
  dialogue: DialogueView | null = null;
  private talkingTo: Npc | null = null;
  private logOpen = false;
  protected weaponPose: WeaponPose | null = null;
  /** Conversation key and rim lights; always present (at zero) so starting a conversation never recompiles shaders. */
  private keyLight = new THREE.PointLight(DIALOGUE_LIGHT.keyColor, 0, DIALOGUE_LIGHT.range, 2);
  private rimLight = new THREE.PointLight(DIALOGUE_LIGHT.rimColor, 0, DIALOGUE_LIGHT.range, 2);
  private talkLight = 0;
  protected abstract armed: boolean;
  protected abstract helmet: boolean;
  protected abstract hudMode: 'bridge' | 'planet';

  /** Called once the world exists to add commander, HUD and API. */
  protected setupWalk(world: WalkWorld): void {
    this.world = world;
    this.commander = new CommanderView(this.armed, this.helmet);
    this.three.add(this.commander.root);
    this.three.add(this.keyLight, this.rimLight);
    this.hud = new Hud(this.game.ui.hud, this.hudMode);
    this.world.cam.shakeEnabled = this.game.settings.shake;
    this.onExit(() => {
      this.dialogue?.destroy();
      this.hud.destroy();
      this.world.dispose();
    });
    this.api.teleport = (x, y, z) => {
      this.world.player.setPosition(x, y, z);
      this.world.physics.step();
    };
    // Settle the camera.
    this.world.cam.update(1 / 60, this.world.player, this.world.physics, { aiming: false, running: false });
    this.world.cam.snap();
  }

  /** Objective line, log items and an optional world target for compass and distance. */
  abstract objective(): { text: string; target?: THREE.Vector3 | null; log?: { text: string; done: boolean }[] };

  startDialogue(graph: DGraph, npc: Npc | null, onEffect: (e: Effect) => void = () => undefined, onDone: () => void = () => undefined): void {
    const g = this.game;
    const runner = new DialogueRunner(graph, g.state, (e) => {
      onEffect(e);
      this.handleEffect(e);
    });
    if (runner.done) return onDone();
    this.dialogue?.destroy();
    this.dialogue = new DialogueView(g.ui.overlay, runner, (a) => g.input.glyph(a));
    this.dialogue.onTick = () => g.audio.play('type_tick');
    this.world.locked = true;
    this.talkingTo = npc;
    g.audio.play('ui_open');
    if (npc) {
      npc.faceToward(this.world.head());
      const head = npc.head();
      const me = this.world.head();
      const shot = CameraRig.dialogueShot(me, head, this.world.physics);
      this.world.cam.setDialogue(shot.pos, shot.look);
      // Face the commander toward the speaker.
      this.world.player.facing = Math.atan2(-(head.x - me.x), -(head.z - me.z));
    }
    this.dialogueDone = onDone;
  }
  private dialogueDone: () => void = () => undefined;
  protected handleEffect(_e: Effect): void {}

  private endDialogue(): void {
    this.dialogue?.destroy();
    this.dialogue = null;
    this.world.locked = false;
    this.world.cam.setDialogue(null);
    this.talkingTo?.faceToward(null);
    this.talkingTo = null;
    this.game.input.reset();
    const done = this.dialogueDone;
    this.dialogueDone = () => undefined;
    done();
  }

  /** Scene-specific per-step work before the player moves (combat etc.). Returns extra command fields. */
  protected preStep(_dt: number): Partial<PlayerCmd> {
    return {};
  }
  protected postStep(_dt: number): void {}

  update(dt: number): void {
    const input = this.game.input;
    if (this.dialogue) {
      this.dialogue.update(input, dt);
      if (this.dialogue.runner.done) this.endDialogue();
    }
    this.world.applyLook(input, dt, this.lookSlowdown());
    if (input.pressed('shoulder') && this.world.player.mode === 'field') this.world.cam.shoulder *= -1;
    const extra = this.preStep(dt);
    this.world.stepPlayer(dt, this.world.cmdFromInput(input, extra));
    if (!this.dialogue) this.world.updateInteract(input, dt);
    this.postStep(dt);
    this.stepSounds();
    // Objective and prompt.
    const o = this.objective();
    const p = this.world.player.pos;
    const dist = o.target ? Math.hypot(o.target.x - p.x, o.target.z - p.z) : undefined;
    if (this.hud.setObjective(o.text, this.hudMode === 'planet' ? dist : undefined)) this.game.audio.play('objective');
    const f = this.world.focus;
    this.hud.setPrompt(f && !this.dialogue ? f.label : null, input.glyph('interact'), f?.hold ? this.world.holdT / f.hold : 0);
    if (input.pressed('objectives')) this.logOpen = !this.logOpen;
    this.hud.setLog(this.logOpen, 'Objectives', o.log ?? [{ text: o.text, done: false }]);
    this.hud.update(dt);
  }

  private lastStep = 0;
  private wasRoll = false;
  /** Surface sound for footsteps in this scene. */
  protected footstep(): import('../data/sounds').SoundId {
    return 'footstep_metal';
  }
  protected stepSounds(): void {
    const p = this.world.player;
    const stride = p.sprinting ? 1.6 : 1.1;
    if (p.state === 'move' && p.grounded && p.odometer - this.lastStep > stride) {
      this.lastStep = p.odometer;
      this.game.audio.play(this.footstep(), { volume: p.crouched ? 0.5 : p.sprinting ? 1.3 : 1 });
    }
    const roll = p.state === 'roll';
    if (roll && !this.wasRoll) this.onRollStart();
    this.wasRoll = roll;
  }
  protected onRollStart(): void {
    this.game.audio.play('roll');
  }

  protected lookSlowdown(): boolean {
    return false;
  }

  render(alpha: number, frameDt: number): void {
    const cam = this.world.cam;
    this.commander.update(frameDt, alpha, this.world.player, this.weaponPose, cam.headDist);
    for (const n of this.npcs) n.update(frameDt);
    cam.apply(this.camera, alpha);
    this.post.run = cam.runAmount;
    this.updateTalkLight(frameDt);
  }

  /** Fade the conversation lights in around the speaker's head, placed from the dialogue shot. */
  private updateTalkLight(dt: number): void {
    const L = DIALOGUE_LIGHT;
    const shot = this.world.cam.dialogue;
    this.talkLight += ((this.talkingTo && shot ? 1 : 0) - this.talkLight) * Math.min(1, dt * L.fade);
    if (this.talkingTo && shot) {
      const head = this.talkingTo.head();
      const toCam = new THREE.Vector3().subVectors(shot.pos, head).setY(0).normalize();
      const side = new THREE.Vector3(-toCam.z, 0, toCam.x);
      // Of the two sides, light from the one further from the commander so the key never blows out the shoulder.
      const me = this.world.head();
      const a = head.clone().addScaledVector(toCam, L.keyDist).addScaledVector(side, L.keySide);
      const b = head.clone().addScaledVector(toCam, L.keyDist).addScaledVector(side, -L.keySide);
      this.keyLight.position.copy(a.distanceToSquared(me) > b.distanceToSquared(me) ? a : b).y += L.keyUp;
      this.rimLight.position.copy(head).addScaledVector(toCam, -L.rimBack).y += L.rimUp;
    }
    this.keyLight.intensity = L.key * this.talkLight;
    this.rimLight.intensity = L.rim * this.talkLight;
  }
}
