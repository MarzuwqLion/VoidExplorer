import * as THREE from 'three';
import { WalkScene } from './walkScene';
import { WalkWorld } from '../world/walkWorld';
import { gymPrims, GYM } from '../world/gymLayout';
import { buildLevelView } from '../world/levelView';

/** Test gym, reachable only from the debug panel. */
export class GymScene extends WalkScene {
  readonly id = 'gym' as const;
  protected armed = true;
  protected helmet = true;
  protected hudMode = 'planet' as const;
  private sun!: THREE.DirectionalLight;

  enter(): void {
    const world = new WalkWorld({
      prims: gymPrims(),
      ground: () => 0,
      bounds: { minX: -GYM.half, minZ: -GYM.half, maxX: GYM.half, maxZ: GYM.half },
      spawn: GYM.spawn,
      mode: 'field',
    });
    this.setupWalk(world);
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
    this.game.audio.setAmbient(null);
    this.api.info = () => {
      const p = this.world.player;
      return {
        x: p.pos.x, y: p.pos.y, z: p.pos.z, speed: p.speed, state: p.state, crouched: p.crouched, aiming: p.aiming,
        sprinting: p.sprinting, popUp: p.popUp, lean: p.lean, yaw: this.world.cam.yaw, fov: this.world.cam.fov,
      };
    };
  }
  objective() {
    return { text: 'Test gym', target: null };
  }
}
