import * as THREE from 'three';
import { GRADES } from '../data/atmosphere';
import { Snow } from '../world/snow';
import { FieldScene } from './fieldScene';
import { WalkWorld, type Interactable } from '../world/walkWorld';
import { buildLevelView } from '../world/levelView';
import { terrainArrays, buildTerrainMesh } from '../world/terrain';
import { buildSky, skyPlanet } from '../world/sky';
import { buildShuttle } from '../world/models/ship';
import { NAMES, speakerName, type MissionPlanet, type ResourceId } from '../data/names';
import { PLANET_BY_ID } from '../data/planets';
import { BOUNDARY, HARVEST, SNOW_ROOF } from '../data/tuning';
import type { Mission, PlanetLevel } from '../missions/types';
import { createPlanet } from '../missions/registry';
import type { NodeDef, XZ } from '../data/layouts';
import { buildNodeView, nodeLabel, ScanBeam, buildCrate, setCrateUnlocked, NODE_COLORS } from '../world/nodes';
import { Npc } from '../world/npc';
import { LOOKS } from '../data/characters';
import type { DGraph, Effect } from '../data/dialogue/types';
import type { Enemy } from '../ai/enemy';
import type { CompassMarker } from '../ui/hud';
import { glow } from '../world/materials';
import { optimizeModel } from '../world/models/optimize';

/** A landable planet: terrain, mission, shuttle, combat, NPCs and resources. */
export class PlanetScene extends FieldScene {
  readonly id = 'planet' as const;
  protected armed = true;
  protected helmet = true;
  protected hudMode = 'planet' as const;
  planet!: MissionPlanet;
  level!: PlanetLevel;
  mission!: Mission;
  private sun!: THREE.DirectionalLight;
  private outsideT = 0;
  private lastInside = new THREE.Vector3();
  private leaving = false;
  shuttle!: THREE.Group;
  private shuttleCollider: import('@dimforge/rapier3d-compat').Collider | null = null;
  private byId = new Map<string, THREE.Object3D>();
  readonly nodes = new Map<string, { def: NodeDef; view: THREE.Group; y: number; done: boolean }>();
  private crates = new Map<string, { view: THREE.Group; unlocked: boolean }>();
  private beam = new ScanBeam();
  private beacon: THREE.Mesh | null = null;
  private snow: Snow | null = null;
  private lamp: THREE.PointLight | null = null;
  boss: Enemy | null = null;
  bossName = '';
  private effectHandlers: ((e: Effect) => void)[] = [];
  private t = 0;

  async enter(opts: Record<string, unknown>): Promise<void> {
    const g = this.game;
    this.planet = (opts.planet as MissionPlanet) ?? 'amara';
    this.grade = GRADES[this.planet];
    const { level, mission } = createPlanet(this.planet);
    this.level = level;
    const arrays = terrainArrays(level.terrain);
    const world = new WalkWorld({
      prims: level.prims,
      ground: level.terrain.height,
      navGround: level.navGround,
      bounds: { minX: level.terrain.min, minZ: level.terrain.min, maxX: level.terrain.max, maxZ: level.terrain.max },
      spawn: level.spawn,
      mode: 'field',
      addColliders: (ph) => ph.addTrimesh(arrays.verts, arrays.idx, { kind: 'terrain' }),
    });
    this.setupField(world);
    this.lastInside.copy(world.player.pos);
    this.three.add(buildTerrainMesh(level.terrain, arrays));
    const lv = buildLevelView(world.level.prims);
    this.byId = lv.byId;
    this.three.add(lv.group);
    this.three.add(buildSky(level.sky));
    for (const sp of level.skyPlanets ?? []) this.three.add(skyPlanet(sp.color, sp.ring, sp.dir, sp.size));
    this.three.fog = new THREE.Fog(level.fog.color, level.fog.near, level.fog.far);
    this.three.add(new THREE.HemisphereLight(level.light.hemiSky, level.light.hemiGround, level.light.hemi));
    this.sun = new THREE.DirectionalLight(level.light.sunColor, level.light.sun);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = sc.bottom = -45;
    sc.right = sc.top = 45;
    sc.near = 1;
    sc.far = 200;
    this.sun.shadow.bias = -0.0005;
    this.three.add(this.sun, this.sun.target);
    this.camera.far = 1200;
    this.three.add(this.beam.mesh);
    for (const l of level.lamps ?? []) {
      const lamp = new THREE.PointLight(l.color, l.intensity, l.range, 1.6);
      lamp.position.set(l.x, l.y, l.z);
      this.three.add(lamp);
    }
    if (level.weather === 'snow') {
      const nav = world.nav, terrain = level.terrain;
      const overhead = level.prims.flatMap((p) =>
        p.kind === 'box' && p.solid === false && (p.y ?? 0) >= SNOW_ROOF.minHeight && p.w * p.d >= SNOW_ROOF.minArea ? [{ x: p.x, z: p.z, hw: p.w / 2, hd: p.d / 2, rotY: p.rotY ?? 0, y: p.y ?? 0 }] : [],
      );
      this.snow = new Snow(world.physics, (x, z) => Math.max(terrain.height(x, z), nav.heightAt(x, z)), overhead);
      this.three.add(this.snow.points);
      // Suit lamp for the dusk interiors.
      this.lamp = new THREE.PointLight(0xdce8ff, 5, 12, 1.8);
      this.three.add(this.lamp);
    }
    // Shuttle.
    this.shuttle = buildShuttle();
    optimizeModel(this.shuttle);
    this.three.add(this.shuttle);
    this.moveShuttle(level.shuttle.x, level.shuttle.z, level.shuttle.yaw);
    world.interactables.push({
      id: 'shuttle',
      x: 0,
      y: 0,
      z: 0,
      range: 3,
      label: '',
      onUse: () => (this.mission.complete ? this.extract() : this.abort()),
    });
    this.placeShuttleInteract();
    g.audio.setAmbient(level.ambient);
    this.mission = mission(this);
    const pd = PLANET_BY_ID[this.planet];
    this.hud.showBanner(pd.landing.missionName ?? '', pd.name);
    this.api.info = () => this.info();
    this.api.completeObjective = () => this.mission.completeBeat();
    this.api.beats = () => this.mission.beats();
    this.api.jumpTo = (b) => this.mission.jumpTo(b);
    this.api.layoutMap = () => this.layoutMapUrl();
  }

  // ----- Host API used by missions -----
  radio(speaker: string, text: string, seconds = 7): void {
    this.hud.showComms(speakerName(speaker), text, seconds);
    this.game.audio.play('toast');
  }
  addInteract(it: Interactable): void {
    this.world.interactables.push(it);
  }
  removeInteract(id: string): void {
    this.world.interactables = this.world.interactables.filter((i) => i.id !== id);
  }
  addNpc(id: string, look: keyof typeof LOOKS, at: XZ & { yaw: number }, graph: () => DGraph, seated = false): Npc {
    const y = this.world.nav.heightAt(at.x, at.z);
    const npc = new Npc(id, LOOKS[look], new THREE.Vector3(at.x, y, at.z), (at.yaw * Math.PI) / 180, seated, this.npcs.length + 3);
    this.npcs.push(npc);
    this.three.add(npc.root);
    this.addInteract({ id: 'talk-' + id, x: at.x, y, z: at.z, range: 2.4, label: 'Talk to ' + speakerName(id), onUse: () => this.startDialogue(graph(), npc) });
    return npc;
  }
  onEffect(fn: (e: Effect) => void): void {
    this.effectHandlers.push(fn);
  }
  protected handleEffect(e: Effect): void {
    for (const f of this.effectHandlers) f(e);
  }
  openGate(id: string): void {
    if (this.world.openGate(id)) {
      const v = this.byId.get(id);
      if (v) v.visible = false;
      this.game.audio.play('door_open');
    }
  }
  addCrate(id: string, at: XZ): void {
    const v = buildCrate();
    v.position.set(at.x, this.world.nav.heightAt(at.x, at.z), at.z);
    this.three.add(v);
    this.crates.set(id, { view: v, unlocked: false });
    this.addInteract({
      id: 'crate-' + id,
      x: at.x,
      y: v.position.y,
      z: at.z,
      label: 'Refill ammo and medkits',
      enabled: () => this.crates.get(id)!.unlocked,
      onUse: () => {
        this.combat.refillAmmo();
        this.game.audio.play('pickup');
        this.game.ui.toast('Ammo and medkits refilled');
      },
    });
  }
  unlockCrate(id: string): void {
    const c = this.crates.get(id);
    if (!c) return;
    c.unlocked = true;
    setCrateUnlocked(c.view, true);
  }
  /** Save a checkpoint and unlock the crate there. */
  checkpointAt(at: XZ & { yaw: number }, crate?: string): void {
    this.setCheckpoint(at.x, this.world.nav.heightAt(at.x, at.z), at.z, at.yaw);
    if (crate) this.unlockCrate(crate);
    this.game.audio.play('checkpoint');
    this.game.ui.toast('Checkpoint');
  }
  giveResource(r: ResourceId, n: number): void {
    this.game.state.give(r, n, true);
    this.game.ui.toast('+' + n + ' ' + NAMES.resources[r]);
    this.game.audio.play('pickup');
  }
  addNodes(list: NodeDef[]): void {
    for (const n of list) {
      const y = n.y ?? this.world.nav.heightAt(n.x, n.z);
      const view = buildNodeView(n);
      view.position.set(n.x, y, n.z);
      this.three.add(view);
      const rec = { def: n, view, y, done: false };
      this.nodes.set(n.id, rec);
      this.addInteract({
        id: 'node-' + n.id,
        x: n.x,
        y,
        z: n.z,
        hold: HARVEST.holdTime,
        label: nodeLabel(n),
        enabled: () => !rec.done,
        onUse: () => {
          rec.done = true;
          view.visible = false;
          this.giveResource(n.type, 1);
          this.game.audio.play('scan_chime');
        },
      });
    }
  }
  setBoss(e: Enemy | null, name = ''): void {
    this.boss = e;
    this.bossName = name;
  }
  lightBeacon(): void {
    const b = this.byId.get('beacon-light') ?? this.byId.get('beacon');
    const base = b ? b.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3();
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.2, 300, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    beam.position.set(base.x, base.y + 150, base.z);
    this.three.add(beam);
    this.beacon = beam;
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 8), glow(0x9fe8ff, 4));
    lamp.position.copy(base).add(new THREE.Vector3(0, 0.5, 0));
    this.three.add(lamp);
    this.game.audio.play('beacon_fire');
  }
  moveShuttle(x: number, z: number, yawDeg: number): void {
    const y = this.level.terrain.height(x, z);
    this.shuttle.position.set(x, y, z);
    this.shuttle.rotation.y = (yawDeg * Math.PI) / 180;
    if (this.shuttleCollider) this.world.physics.remove(this.shuttleCollider);
    this.shuttleCollider = this.world.physics.addBox({ x, y: y + 2, z }, { x: 1.8, y: 1.6, z: 3.8 }, this.shuttle.rotation.y, { kind: 'static', id: 'shuttle' });
    this.placeShuttleInteract();
  }
  private placeShuttleInteract(): void {
    const it = this.world?.interactables.find((i) => i.id === 'shuttle');
    if (!it) return;
    const r = this.shuttle.rotation.y;
    it.x = this.shuttle.position.x + Math.sin(r) * 5.5;
    it.z = this.shuttle.position.z + Math.cos(r) * 5.5;
    it.y = this.level.terrain.height(it.x, it.z);
  }
  shuttlePoint(): XZ {
    const it = this.world.interactables.find((i) => i.id === 'shuttle')!;
    return { x: it.x, z: it.z };
  }
  teleportTo(x: number, z: number, yaw: number): void {
    const y = this.world.nav.heightAt(x, z);
    this.world.player.setPosition(x, y + 0.1, z, yaw);
    this.world.cam.yaw = yaw;
    this.world.physics.step();
  }

  info(): Record<string, unknown> {
    const o = this.mission.objective();
    const p = this.world.player.pos;
    const sh = this.world.interactables.find((i) => i.id === 'shuttle');
    return {
      planet: this.planet,
      objective: o.text,
      target: o.target,
      beat: this.mission.beatId(),
      complete: this.mission.complete,
      wantFocus: (this.mission as { wantFocus?: () => string | null }).wantFocus?.() ?? null,
      prompt: this.world.focus ? this.world.focus.label : null,
      focus: this.world.focus?.id ?? null,
      inDialogue: !!this.dialogue,
      dialogueNode: this.dialogue?.runner.node?.id ?? null,
      choices: this.dialogue?.runner.choices().map((c) => c.label) ?? [],
      x: p.x,
      y: p.y,
      z: p.z,
      yaw: this.world.cam.yaw,
      shuttle: sh ? { x: sh.x, y: sh.y, z: sh.z } : null,
      enemies: this.director.activeCount(),
      health: this.combat.health,
      shield: this.combat.shield,
      dead: this.combat.dead,
      harvested: [...this.nodes.values()].filter((n) => n.done).length,
      boss: this.boss ? { hp: this.boss.v.health, armor: this.boss.v.armor, alive: this.boss.alive } : null,
    };
  }

  private extract(): void {
    if (this.leaving) return;
    this.leaving = true;
    const g = this.game;
    g.state.data.missions[this.planet] = true;
    g.state.setFlag(this.planet + 'Done');
    g.audio.play('shuttle_thrust');
    void g.goto('systemMap', { fromPlanet: this.planet });
  }
  private abort(): void {
    if (this.leaving) return;
    this.leaving = true;
    const g = this.game;
    if (g.landingSnapshot) g.state.restore(g.landingSnapshot);
    void g.goto('systemMap', { fromPlanet: this.planet });
  }

  objective() {
    const o = this.mission.objective();
    const target = o.target ? new THREE.Vector3(o.target.x, 0, o.target.z) : null;
    return { text: o.text, target, log: this.mission.log() };
  }

  protected postStep(dt: number): void {
    super.postStep(dt);
    this.t += dt;
    const sh = this.world.interactables.find((i) => i.id === 'shuttle');
    if (sh) sh.label = this.mission.complete ? 'Extract' : 'Abort mission';
    this.mission.update(dt);
    const p = this.world.player.pos;
    // Harvest beam and pose.
    const f = this.world.focus;
    const harvesting = !!f && f.id.startsWith('node-') && this.world.holdT > 0;
    this.harvestPose = harvesting ? 1 : 0;
    if (harvesting && this.t % 0.5 < dt) this.game.audio.play('harvest_beam');
    this.beam.set(harvesting ? new THREE.Vector3(p.x, p.y + 1.3, p.z) : null, f ? new THREE.Vector3(f.x, f.y + 0.4, f.z) : undefined);
    // Mission area boundary.
    if (this.level.inside(p.x, p.z) || this.combat.dead) {
      this.outsideT = 0;
      if (this.world.player.grounded) this.lastInside.copy(p);
      this.hud.setWarning(null);
    } else {
      this.outsideT += dt;
      this.hud.setWarning('Return to the mission area ' + Math.max(0, Math.ceil(BOUNDARY.warnTime - this.outsideT)));
      if (this.outsideT >= BOUNDARY.warnTime) {
        this.world.player.setPosition(this.lastInside.x, this.lastInside.y + 0.2, this.lastInside.z);
        this.outsideT = 0;
      }
    }
    // Compass: objective plus resource nodes within 25 m (all biomass if Varga shared her survey).
    const o = this.mission.objective();
    const markers: CompassMarker[] = [];
    if (o.target) markers.push({ bearing: bearing(p.x, p.z, o.target.x, o.target.z), kind: 'obj', dist: Math.hypot(o.target.x - p.x, o.target.z - p.z) });
    const allBio = this.game.state.flag('amara_varga_biomass');
    for (const n of this.nodes.values()) {
      if (n.done) continue;
      const d = Math.hypot(n.def.x - p.x, n.def.z - p.z);
      if (d <= HARVEST.compassRange || (allBio && n.def.type === 'biomass')) markers.push({ bearing: bearing(p.x, p.z, n.def.x, n.def.z), kind: n.def.type });
    }
    // The last stragglers of an active encounter show on the compass.
    for (const enc of this.director.encounters) {
      if (!this.director.isActive(enc.id)) continue;
      const left = this.director.enemies.filter((e) => e.alive && e.encounter === enc.id && !e.mem.flee);
      if (left.length && left.length <= 2) for (const e of left) markers.push({ bearing: bearing(p.x, p.z, e.pos.x, e.pos.z), kind: 'enemy' });
    }
    this.hud.setCompass(this.world.cam.yaw, markers);
    // Boss bar.
    if (this.boss && this.boss.alive && this.boss.alerted) {
      const b = this.boss.v;
      this.hud.setBoss(this.bossName, b.health / b.maxHealth, b.maxArmor > 0 ? b.armor / b.maxArmor : null);
    } else this.hud.setBoss(null);
  }

  protected footstep() {
    return this.level.footstep;
  }

  protected onRespawned(): void {
    (this.mission as { onRespawn?: () => void }).onRespawn?.();
  }

  render(alpha: number, frameDt: number): void {
    super.render(alpha, frameDt);
    const p = this.commander.root.position;
    const d = this.level.sky.sunDir.clone().normalize();
    this.sun.position.set(p.x + d.x * 80, p.y + d.y * 80, p.z + d.z * 80);
    this.sun.target.position.copy(p);
    for (const n of this.nodes.values()) if (!n.done) n.view.rotation.y += frameDt * 0.4;
    if (this.lamp) this.lamp.position.set(p.x, p.y + 2.2, p.z).addScaledVector(this.world.cam.forward(), 1.5);
    if (this.beacon) (this.beacon.material as THREE.MeshBasicMaterial).opacity = 0.35 + Math.sin(this.t * 3) * 0.1;
    this.snow?.update(frameDt, p);
  }

  /** Top-down layout map rendered to a data URL (no WebGL needed). */
  layoutMapUrl(): string {
    return drawLayoutMap(this);
  }
}

/** Compass bearing in degrees: 0 = north (-Z), 90 = east (+X). */
export function bearing(fx: number, fz: number, tx: number, tz: number): number {
  const b = (Math.atan2(tx - fx, -(tz - fz)) * 180) / Math.PI;
  return (b + 360) % 360;
}

import { drawLayoutMap } from '../debug/layoutMap';
export { NODE_COLORS };
