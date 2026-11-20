import * as THREE from 'three';
import { FieldScene } from './fieldScene';
import { WalkWorld } from '../world/walkWorld';
import { buildLevelView } from '../world/levelView';
import { terrainArrays, buildTerrainMesh } from '../world/terrain';
import { buildSky, skyPlanet } from '../world/sky';
import { buildShuttle } from '../world/models/ship';
import { speakerName, type MissionPlanet } from '../data/names';
import { PLANET_BY_ID } from '../data/planets';
import { BOUNDARY } from '../data/tuning';
import type { Mission, PlanetLevel } from '../missions/types';
import { createPlanet } from '../missions/registry';

/** A landable planet: terrain, mission, shuttle, and (from M3) combat. */
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

  async enter(opts: Record<string, unknown>): Promise<void> {
    const g = this.game;
    this.planet = (opts.planet as MissionPlanet) ?? 'amara';
    const { level, mission } = createPlanet(this.planet, this);
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
    this.mission = mission(this);
    this.lastInside.copy(world.player.pos);
    // Visuals.
    this.three.add(buildTerrainMesh(level.terrain, arrays));
    this.three.add(buildLevelView(world.level.prims).group);
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
    // Shuttle.
    this.shuttle = buildShuttle();
    const s = level.shuttle;
    this.shuttle.position.set(s.x, level.terrain.height(s.x, s.z), s.z);
    this.shuttle.rotation.y = (s.yaw * Math.PI) / 180;
    this.three.add(this.shuttle);
    world.physics.addBox({ x: s.x, y: this.shuttle.position.y + 2, z: s.z }, { x: 1.8, y: 1.6, z: 3.8 }, this.shuttle.rotation.y, { kind: 'static', id: 'shuttle' });
    const rampX = s.x + Math.sin(this.shuttle.rotation.y) * 5.5, rampZ = s.z + Math.cos(this.shuttle.rotation.y) * 5.5;
    world.interactables.push({
      id: 'shuttle',
      x: rampX,
      y: level.terrain.height(rampX, rampZ),
      z: rampZ,
      range: 3,
      label: '',
      onUse: () => (this.mission.complete ? this.extract() : this.abort()),
    });
    g.audio.setAmbient(level.ambient);
    const pd = PLANET_BY_ID[this.planet];
    this.hud.showBanner(pd.landing.missionName ?? '', pd.name);
    this.api.info = () => this.info();
    this.api.completeObjective = () => this.mission.completeBeat();
    this.api.beats = () => this.mission.beats();
    this.api.jumpTo = (b) => this.mission.jumpTo(b);
  }

  info(): Record<string, unknown> {
    const o = this.mission.objective();
    const p = this.world.player.pos;
    return {
      planet: this.planet,
      objective: o.text,
      target: o.target,
      beat: this.mission.beatId(),
      complete: this.mission.complete,
      prompt: this.world.focus ? this.world.focus.label : null,
      focus: this.world.focus?.id ?? null,
      inDialogue: !!this.dialogue,
      dialogueNode: this.dialogue?.runner.node?.id ?? null,
      choices: this.dialogue?.runner.choices().map((c) => c.label) ?? [],
      x: p.x,
      y: p.y,
      z: p.z,
      yaw: this.world.cam.yaw,
      shuttle: { x: this.world.interactables[0]?.x, z: this.world.interactables[0]?.z },
    };
  }

  radio(speaker: string, text: string, seconds = 7): void {
    this.hud.showComms(speakerName(speaker), text, seconds);
    this.game.audio.play('toast');
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
    const sh = this.world.interactables.find((i) => i.id === 'shuttle');
    if (sh) sh.label = this.mission.complete ? 'Extract' : 'Abort mission';
    this.mission.update(dt);
    // Mission area boundary.
    const p = this.world.player.pos;
    if (this.level.inside(p.x, p.z)) {
      this.outsideT = 0;
      this.lastInside.copy(p);
      this.hud.setWarning(null);
    } else {
      this.outsideT += dt;
      this.hud.setWarning('Return to the mission area ' + Math.max(0, Math.ceil(BOUNDARY.warnTime - this.outsideT)));
      if (this.outsideT >= BOUNDARY.warnTime) {
        this.world.player.setPosition(this.lastInside.x, this.lastInside.y + 0.2, this.lastInside.z);
        this.outsideT = 0;
      }
    }
    // Compass.
    const o = this.mission.objective();
    const markers = [];
    if (o.target) markers.push({ bearing: bearing(p.x, p.z, o.target.x, o.target.z), kind: 'obj' as const, dist: Math.hypot(o.target.x - p.x, o.target.z - p.z) });
    this.hud.setCompass(this.world.cam.yaw, markers);
  }

  render(alpha: number, frameDt: number): void {
    super.render(alpha, frameDt);
    const p = this.commander.root.position;
    const d = this.level.sky.sunDir.clone().normalize();
    this.sun.position.set(p.x + d.x * 80, p.y + d.y * 80, p.z + d.z * 80);
    this.sun.target.position.copy(p);
  }
}

/** Compass bearing in degrees: 0 = north (-Z), 90 = east (+X). */
export function bearing(fx: number, fz: number, tx: number, tz: number): number {
  const b = (Math.atan2(tx - fx, -(tz - fz)) * 180) / Math.PI;
  return (b + 360) % 360;
}
