import * as THREE from 'three';
import { FieldScene } from './fieldScene';
import { WalkWorld } from '../world/walkWorld';
import { gymPrims, GYM } from '../world/gymLayout';
import { buildLevelView } from '../world/levelView';
import { Dummy, buildDummyView, updateDummyView } from '../world/dummy';

/** Test gym, reachable only from the debug panel. */
export class GymScene extends FieldScene {
  readonly id = 'gym' as const;
  protected armed = true;
  protected helmet = true;
  protected hudMode = 'planet' as const;
  private sun!: THREE.DirectionalLight;
  dummies: Dummy[] = [];
  private dummyViews: THREE.Group[] = [];

  enter(): void {
    const world = new WalkWorld({
      prims: gymPrims(),
      ground: () => 0,
      bounds: { minX: -GYM.half, minZ: -GYM.half, maxX: GYM.half, maxZ: GYM.half },
      spawn: GYM.spawn,
      mode: 'field',
    });
    this.setupField(world);
    this.three.add(buildLevelView(world.level.prims).group);
    this.three.background = new THREE.Color(0x6a7a8a);
    this.three.fog = new THREE.Fog(0x6a7a8a, 40, 120);
    this.three.add(new THREE.HemisphereLight(0xdfe8ff, 0x404850, 1.4));
    this.sun = new THREE.DirectionalLight(0xffffff, 2.2);
    this.sun.position.set(-20, 40, 15);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = sc.bottom = -35;
    sc.right = sc.top = 35;
    this.three.add(this.sun);
    for (const d of GYM.dummies) {
      const dm = new Dummy(d.x, 0, d.z, d.kind);
      this.dummies.push(dm);
      this.combat.targets.push(dm);
      const v = buildDummyView(dm);
      this.dummyViews.push(v);
      this.three.add(v);
    }
    this.game.audio.setAmbient(null);
    this.api.info = () => {
      const p = this.world.player;
      const ws = this.combat.weapons;
      return {
        x: p.pos.x, y: p.pos.y, z: p.pos.z, speed: p.speed, state: p.state, crouched: p.crouched, aiming: p.aiming,
        sprinting: p.sprinting, popUp: p.popUp, lean: p.lean, yaw: this.world.cam.yaw, pitch: this.world.cam.pitch, fov: this.world.cam.fov,
        weapon: ws.current, mag: ws.slot.mag, reserve: ws.slot.reserve, reloading: ws.reloading,
        shield: this.combat.shield, health: this.combat.health, medkits: this.combat.medkits, dead: this.combat.dead,
        dummies: this.dummies.map((d) => ({ kind: d.kind, alive: d.alive, kills: d.kills, hits: d.hits, health: d.v.health, shield: d.v.shield, armor: d.v.armor, x: d.pos.x, z: d.pos.z })),
        hitKind: this.hud.lastHitKind(),
        blocked: this.combat.aimBlocked,
      };
    };
  }
  objective() {
    return { text: 'Test gym', target: null };
  }
  protected postStep(dt: number): void {
    super.postStep(dt);
    for (const d of this.dummies) d.update(dt);
  }
  render(alpha: number, frameDt: number): void {
    super.render(alpha, frameDt);
    this.dummies.forEach((d, i) => updateDummyView(this.dummyViews[i], d));
  }
}
