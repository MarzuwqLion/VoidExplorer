import * as THREE from 'three';
import { WalkScene } from './walkScene';
import { WalkWorld } from '../world/walkWorld';
import { bridgePrims } from '../world/bridgeLayout';
import { buildLevelView } from '../world/levelView';
import { BRIDGE } from '../data/layouts';
import { NAMES, type CrewId } from '../data/names';
import { LOOKS } from '../data/characters';
import { Npc } from '../world/npc';
import { CREW_GRAPHS } from '../data/dialogue/crew';
import { makeStarfield, makeStar } from '../world/space';
import { buildHologram } from '../world/hologram';
import { PLANETS } from '../data/planets';
import { openUpgradeTerminal } from '../ui/upgradeTerminal';
import type { Effect } from '../data/dialogue/types';

const CREW: { id: CrewId; look: keyof typeof LOOKS; x: number; z: number; yaw: number; seated?: boolean }[] = [
  { id: 'xo', look: 'okonkwo', x: BRIDGE.xo.x, z: BRIDGE.xo.z, yaw: Math.atan2(BRIDGE.xo.x - BRIDGE.mapTable.x, BRIDGE.xo.z - BRIDGE.mapTable.z) },
  { id: 'helm', look: 'reyes', x: BRIDGE.helm.x, z: BRIDGE.helm.z, yaw: 0, seated: true },
  { id: 'science', look: 'zhao', x: BRIDGE.science.x + 0.6, z: BRIDGE.science.z, yaw: Math.PI / 2 },
  { id: 'quartermaster', look: 'brandt', x: BRIDGE.armory.x, z: BRIDGE.armory.z, yaw: Math.PI / 2 },
];

/** The bridge hub: crew, star map console, upgrade terminal. */
export class BridgeScene extends WalkScene {
  readonly id = 'bridge' as const;
  protected armed = false;
  protected helmet = false;
  protected hudMode = 'bridge' as const;
  private holo: THREE.Group | null = null;
  private t = 0;
  private screens: THREE.MeshStandardMaterial[] = [];

  enter(): void {
    const g = this.game;
    const B = BRIDGE;
    const world = new WalkWorld({
      prims: bridgePrims(),
      ground: () => 0,
      bounds: { minX: -B.halfX, minZ: -B.halfZ, maxX: B.halfX, maxZ: B.halfZ },
      spawn: { x: B.spawn.x, z: B.spawn.z - 0.3, yaw: B.spawn.yaw, y: 0.02 },
      mode: 'bridge',
    });
    this.setupWalk(world);
    const view = buildLevelView(world.level.prims);
    this.three.add(view.group);
    this.buildScenery();
    for (const c of CREW) {
      const npc = new Npc(c.id, LOOKS[c.look], new THREE.Vector3(c.x, c.seated ? 0.05 : 0, c.z), c.yaw, !!c.seated, CREW.indexOf(c) + 1);
      this.npcs.push(npc);
      this.three.add(npc.root);
      world.interactables.push({
        id: 'talk-' + c.id,
        x: c.x,
        y: 0,
        z: c.z,
        range: c.seated ? 2.6 : 2.2,
        label: 'Talk to ' + NAMES.crew[c.id].short,
        onUse: () => this.talk(c.id, npc),
      });
    }
    world.interactables.push({
      id: 'starmap',
      x: B.mapTable.x,
      y: 0,
      z: B.mapTable.z,
      range: B.mapTable.r + 1.2,
      label: 'Use the star map',
      onUse: () => this.useStarMap(),
    });
    world.interactables.push({
      id: 'terminal',
      x: B.terminal.x,
      y: 0,
      z: B.terminal.z,
      label: 'Upgrade terminal',
      onUse: () => openUpgradeTerminal(g),
    });
    g.audio.setAmbient('bridge_hum');
    g.audio.setTension(0);
    this.api.info = () => ({
      objective: this.objective().text,
      prompt: this.world.focus?.label ?? null,
      focus: this.world.focus?.id ?? null,
      inDialogue: !!this.dialogue,
      dialogueNode: this.dialogue?.runner.node?.id ?? null,
      dialogueText: this.dialogue?.runner.node?.text ?? null,
      choices: this.dialogue?.runner.choices().map((c) => c.label) ?? [],
      x: this.world.player.pos.x,
      y: this.world.player.pos.y,
      z: this.world.player.pos.z,
      yaw: this.world.cam.yaw,
      targets: this.world.interactables.map((i) => ({ id: i.id, x: i.x, z: i.z })),
    });
    this.api.completeObjective = () => {
      const s = g.state;
      if (!s.flag('briefed')) s.setFlag('briefed');
      else if (s.missionsDone() >= 2 && !s.flag('debriefed')) {
        s.setFlag('debriefed');
        void g.goto('end');
      }
    };
  }

  private buildScenery(): void {
    const B = BRIDGE;
    this.three.background = new THREE.Color(0x01030a);
    const stars = makeStarfield(1500, 600, 11);
    this.three.add(stars);
    const star = makeStar(40);
    star.position.set(-140, 40, -420);
    this.three.add(star);
    const near = PLANETS.find((p) => p.id === 'amara')!;
    const planet = new THREE.Mesh(
      new THREE.IcosahedronGeometry(30, 4),
      new THREE.MeshStandardMaterial({ color: near.colors[0], roughness: 0.9, flatShading: true }),
    );
    planet.position.set(45, -18, -120);
    this.three.add(planet);
    this.three.add(new THREE.HemisphereLight(0xc8dcf8, 0x3a4450, 2.2));
    const key = new THREE.DirectionalLight(0xffd2a0, 2.2);
    key.position.set(-3, 8, -12);
    key.target.position.set(0, 0, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    const sc = key.shadow.camera;
    sc.left = -12;
    sc.right = 12;
    sc.top = 12;
    sc.bottom = -12;
    sc.near = 1;
    sc.far = 40;
    this.three.add(key, key.target);
    for (const z of [-5, 1, 6]) {
      const fill = new THREE.PointLight(0xcfe2ff, 14, 12, 1.4);
      fill.position.set(0, 3.5, z);
      this.three.add(fill);
    }
    const amber = new THREE.PointLight(0xffa53a, 4, 8, 1.8);
    amber.position.set(4.5, 3, 6);
    this.three.add(amber);
    // Hologram over the map table.
    this.holo = buildHologram();
    this.holo.position.set(B.mapTable.x, 1.55, B.mapTable.z);
    this.three.add(this.holo);
    // Animated console screens.
    const addScreen = (x: number, y: number, z: number, w: number, h: number, rotY: number, color: number) => {
      const m = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: color, emissiveIntensity: 1.2 });
      this.screens.push(m);
      const s = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
      s.position.set(x, y, z);
      s.rotation.y = rotY;
      this.three.add(s);
    };
    addScreen(B.helm.x, 1.15, B.helm.z - 1.0, 2.6, 0.35, 0, 0x2a7ab8);
    addScreen(B.science.x - 0.74, 1.6, B.science.z, 2.2, 1.0, Math.PI / 2, 0x2a9a7a);
    addScreen(B.terminal.x + 0.08, 1.4, B.terminal.z, 0.7, 0.5, -Math.PI / 2, 0xb87a2a);
    addScreen(5.89, 1.4, -4.5, 2.6, 0.6, -Math.PI / 2, 0x2a7ab8);
  }

  private talk(id: CrewId, npc: Npc): void {
    this.startDialogue(CREW_GRAPHS[id], npc);
  }
  protected handleEffect(e: Effect): void {
    if (e.event === 'debriefDone') {
      setTimeout(() => void this.game.goto('end'), 50);
    }
    if (e.event === 'openTerminal') setTimeout(() => openUpgradeTerminal(this.game), 30);
  }

  private useStarMap(): void {
    this.game.audio.play('ui_confirm');
    void this.game.goto('systemMap', { fromBridge: true });
  }

  objective(): { text: string; target?: THREE.Vector3 | null; log?: { text: string; done: boolean }[] } {
    const s = this.game.state;
    const B = BRIDGE;
    const briefed = s.flag('briefed');
    const done = s.missionsDone();
    let text: string, target: THREE.Vector3 | null;
    if (!briefed) {
      text = 'Speak with the XO';
      target = new THREE.Vector3(B.xo.x, 0, B.xo.z);
    } else if (done < 2) {
      text = 'Use the star map';
      target = new THREE.Vector3(B.mapTable.x, 0, B.mapTable.z);
    } else if (!s.flag('debriefed')) {
      text = 'Report to the XO for debrief';
      target = new THREE.Vector3(B.xo.x, 0, B.xo.z);
    } else {
      text = 'Explore the ' + NAMES.system + ' system';
      target = null;
    }
    return {
      text,
      target,
      log: [
        { text: 'Speak with the XO', done: briefed },
        { text: 'Mission: ' + NAMES.missions.amara + ' (' + NAMES.planets.amara + ')', done: s.data.missions.amara },
        { text: 'Mission: ' + NAMES.missions.korr + ' (' + NAMES.planets.korr + ')', done: s.data.missions.korr },
        { text: 'Report to the XO for debrief', done: s.flag('debriefed') },
      ],
    };
  }

  update(dt: number): void {
    super.update(dt);
    this.t += dt;
  }

  render(alpha: number, frameDt: number): void {
    super.render(alpha, frameDt);
    if (this.holo) this.holo.rotation.y += frameDt * 0.15;
    this.screens.forEach((m, i) => (m.emissiveIntensity = 1.0 + Math.sin(this.t * (1.3 + i * 0.4) + i) * 0.25));
  }
}
