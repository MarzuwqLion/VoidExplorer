import * as THREE from 'three';
import { Scene } from './scene';
import { MapSim } from './mapSim';
import { PLANETS, PLANET_BY_ID, STAR, BELT, type PlanetDef } from '../data/planets';
import { MAP } from '../data/systemMap';
import { TRANSITIONS } from '../data/tuning';
import { NAMES, speakerName, type MissionPlanet } from '../data/names';
import { MAP_RADIO } from '../data/dialogue/radio';
import { buildPlanetMesh } from '../world/planetMesh';
import { buildShip, buildShuttle } from '../world/models/ship';
import { makeStarfield, makeStar } from '../world/space';
import { rockGeometry } from '../world/levelView';
import { SurveyPanel, planetPanelData, ensureMapCss, type PanelData } from '../ui/surveyPanel';
import { h } from '../ui/screens';
import { Rng } from '../core/rng';

type Phase = 'fly' | 'landing' | 'takeoff';

/** The steerable system map. */
export class SystemMapScene extends Scene {
  readonly id = 'systemMap' as const;
  readonly sim = new MapSim();
  private planets = new Map<string, THREE.Group>();
  private ship = buildShip();
  private shuttle = buildShuttle();
  private trail!: THREE.Mesh;
  private zoom = MAP.zoomStart;
  private panel!: SurveyPanel;
  private hudEl!: HTMLElement;
  private labels = new Map<string, HTMLElement>();
  private arrows = new Map<string, HTMLElement>();
  private warn!: HTMLElement;
  private hold!: HTMLElement;
  private comms!: HTMLElement;
  private commsT = 0;
  private phase: Phase = 'fly';
  private phaseT = 0;
  private target: PlanetDef | null = null;
  private card: HTMLElement | null = null;
  private belt!: THREE.InstancedMesh;
  private closeup: { renderer: THREE.WebGLRenderer | null; scene: THREE.Scene; cam: THREE.PerspectiveCamera; mesh: THREE.Group | null; id: string } | null = null;
  private wasSunWarn = false;

  enter(opts: Record<string, unknown>): void {
    const g = this.game;
    ensureMapCss();
    const st = g.state.data;
    this.sim.clock = st.stats.playTime;
    st.surveyed.forEach((s) => this.sim.surveyed.add(s));
    if (st.ship.x || st.ship.z) {
      this.sim.x = st.ship.x;
      this.sim.z = st.ship.z;
      this.sim.heading = st.ship.heading;
    }
    this.three.background = new THREE.Color(0x02050d);
    this.three.add(makeStarfield(3000, 2500, 3));
    this.three.add(makeStar(STAR.radius));
    this.three.add(new THREE.AmbientLight(0x8090b0, 0.35));
    const sunLight = new THREE.PointLight(0xffd0a0, 3.2, 0, 0);
    this.three.add(sunLight);
    const orbitMat = new THREE.LineBasicMaterial({ color: 0x3a5a7a, transparent: true, opacity: 0.45 });
    for (const p of PLANETS) {
      const mesh = buildPlanetMesh(p, p.size > 4 ? 4 : 3);
      this.planets.set(p.id, mesh);
      this.three.add(mesh);
      const pts: THREE.Vector3[] = [];
      const inc = p.inclination ?? 0;
      for (let i = 0; i <= 128; i++) {
        const a = (i / 128) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * p.orbit, Math.sin(a) * p.orbit * Math.sin(inc), Math.sin(a) * p.orbit * Math.cos(inc)));
      }
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), p.landing.viable ? new THREE.LineBasicMaterial({ color: 0x3f8a5a, transparent: true, opacity: 0.6 }) : orbitMat);
      this.three.add(line);
      if (p.landing.viable) {
        const ring = new THREE.Mesh(new THREE.RingGeometry(p.size * 1.6, p.size * 1.75, 40), new THREE.MeshBasicMaterial({ color: 0x7be38a, side: THREE.DoubleSide, transparent: true, opacity: 0.8 }));
        ring.rotation.x = -Math.PI / 2;
        ring.name = 'marker';
        mesh.add(ring);
      }
    }
    // The Shoal.
    const r = new Rng(42);
    const geo = rockGeometry(2);
    this.belt = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0x7a7068, roughness: 1, flatShading: true }), BELT.rocks);
    const m = new THREE.Matrix4();
    for (let i = 0; i < BELT.rocks; i++) {
      const a = r.next() * Math.PI * 2, rad = r.range(BELT.inner, BELT.outer);
      const s = r.range(0.3, 1.4);
      m.compose(new THREE.Vector3(Math.cos(a) * rad, r.range(-2, 2), Math.sin(a) * rad), new THREE.Quaternion().setFromEuler(new THREE.Euler(r.next() * 3, r.next() * 3, 0)), new THREE.Vector3(s, s * 0.7, s));
      this.belt.setMatrixAt(i, m);
    }
    this.three.add(this.belt);
    this.ship.scale.setScalar(MAP.shipScale);
    this.three.add(this.ship);
    this.trail = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0x8fd0ff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.trail.rotation.x = -Math.PI / 2;
    this.ship.add(this.trail);
    this.trail.scale.set(20, 20, 20);
    this.shuttle.scale.setScalar(0.12);
    this.shuttle.visible = false;
    this.three.add(this.shuttle);
    this.camera.far = 6000;
    this.camera.fov = 50;
    this.camera.updateProjectionMatrix();
    // UI.
    const ui = g.ui.hud;
    this.panel = new SurveyPanel(ui);
    this.hudEl = h('div', 'map-hud', undefined, ui);
    this.warn = h('div', 'map-warn', 'Heat warning', ui);
    this.hold = h('div', 'map-hold', undefined, ui);
    h('i', '', undefined, this.hold);
    this.comms = h('div', 'hud-comms', undefined, ui);
    const help = h('div', 'map-help', '', ui);
    const glyphs = () => {
      const i = g.input;
      help.innerHTML =
        'Steer: ' + (i.lastDevice === 'pad' ? 'Left stick' : 'W A S D') + '<br>Boost: ' + i.glyph('boost') + '<br>Zoom: ' + (i.lastDevice === 'pad' ? 'Right stick' : 'Mouse wheel') + '<br>Return to bridge: ' + i.glyph('returnBridge');
    };
    glyphs();
    const glyphTimer = setInterval(glyphs, 1000);
    for (const p of PLANETS) {
      const l = h('div', 'map-label' + (p.landing.viable ? ' hab' : ''), p.name, g.ui.world);
      this.labels.set(p.id, l);
      if (p.landing.viable) {
        const a = h('div', 'map-arrow', undefined, g.ui.world);
        a.style.display = 'none';
        this.arrows.set(p.id, a);
      }
    }
    this.onExit(() => {
      clearInterval(glyphTimer);
      this.panel.destroy();
      [this.hudEl, this.warn, this.hold, this.comms, help, this.card].forEach((e) => e?.remove());
      this.labels.forEach((l) => l.remove());
      this.arrows.forEach((a) => a.remove());
      if (this.closeup) {
        this.closeup.renderer?.dispose();
        this.closeup.scene.traverse((o) => {
          const mm = o as THREE.Mesh;
          mm.geometry?.dispose();
          (mm.material as THREE.Material | undefined)?.dispose?.();
        });
      }
    });
    this.setupCloseup();
    g.audio.setAmbient('space_drone');
    g.audio.setTension(0);
    const from = opts.fromPlanet as string | undefined;
    if (from) {
      this.sim.placeBeside(from);
      this.phase = 'takeoff';
      this.phaseT = 0;
      this.target = PLANET_BY_ID[from];
      this.zoom = 60;
    } else if (opts.fromBridge) this.radio(...MAP_RADIO.arrive);
    this.syncSurvey();
    this.api.teleportShipTo = (id) => {
      this.sim.placeBeside(id);
      this.syncSurvey();
    };
    this.api.info = () => this.info();
    this.api.completeObjective = () => this.land();
  }

  private info(): Record<string, unknown> {
    return {
      x: this.sim.x,
      z: this.sim.z,
      speed: this.sim.speed,
      near: this.sim.near,
      panel: this.panel.current ? { name: this.panel.current.name, className: this.panel.current.className, landing: this.panel.current.landing.text, canLand: this.canLand() } : null,
      surveyed: this.surveyedCount(),
      phase: this.phase,
      zoom: this.zoom,
      planets: Object.fromEntries(PLANETS.map((p) => [p.id, this.sim.planetPos(p)])),
    };
  }
  private surveyedCount(): number {
    return this.game.state.data.surveyed.filter((s) => PLANET_BY_ID[s]).length;
  }
  private syncSurvey(): void {
    for (const s of this.sim.surveyed) this.game.state.survey(s);
  }
  private radio(speaker: string, text: string): void {
    this.comms.innerHTML = '';
    h('div', 'who', speakerName(speaker), this.comms);
    h('div', '', text, this.comms);
    this.comms.classList.add('on');
    this.commsT = 5;
  }
  private setupCloseup(): void {
    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const d = new THREE.DirectionalLight(0xffe0c0, 2.2);
    d.position.set(-3, 2, 4);
    scene.add(d);
    const cam = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
    let renderer: THREE.WebGLRenderer | null;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: this.panel.canvas, alpha: true, antialias: true });
      renderer.setPixelRatio(1);
      renderer.setSize(256, 256, false);
    } catch {
      renderer = null;
    }
    this.closeup = { renderer, scene, cam, mesh: null, id: '' };
  }
  private canLand(): boolean {
    const p = this.sim.near ? PLANET_BY_ID[this.sim.near] : null;
    return !!p && p.landing.viable && !this.game.state.data.missions[p.landing.mission!];
  }
  private panelFor(id: string | null): PanelData | null {
    if (!id) return null;
    if (id === STAR.id) return { id, name: STAR.name, className: STAR.className, rows: STAR.stats, note: STAR.note, landing: { kind: 'none', text: '' } };
    if (id === BELT.id) return { id, name: BELT.name, className: BELT.className, rows: BELT.stats, note: BELT.note, landing: { kind: 'none', text: '' } };
    const p = PLANET_BY_ID[id];
    return planetPanelData(p, !!p.landing.mission && this.game.state.data.missions[p.landing.mission]);
  }

  private land(): void {
    if (!this.canLand() || this.phase !== 'fly') return;
    const g = this.game;
    this.target = PLANET_BY_ID[this.sim.near!];
    this.phase = 'landing';
    this.phaseT = 0;
    g.landingSnapshot = g.state.snapshot();
    g.audio.play('shuttle_thrust');
    this.saveShip();
  }
  private saveShip(): void {
    const s = this.game.state.data.ship;
    s.x = this.sim.x;
    s.z = this.sim.z;
    s.heading = this.sim.heading;
  }

  update(dt: number): void {
    const g = this.game;
    const input = g.input;
    if (this.commsT > 0 && (this.commsT -= dt) <= 0) this.comms.classList.remove('on');
    if (this.phase !== 'fly') {
      this.panel.show(null, '');
      this.phaseT += dt;
      this.sim.clock += dt;
      if (this.phase === 'landing' && this.phaseT >= TRANSITIONS.landing) {
        this.phase = 'fly';
        void g.goto('planet', { planet: this.target!.landing.mission as MissionPlanet });
      }
      if (this.phase === 'takeoff' && this.phaseT >= TRANSITIONS.takeoff) {
        this.phase = 'fly';
        this.radio(...MAP_RADIO.takeoff);
      }
      return;
    }
    const res = this.sim.step(dt, input.move, input.down('boost'));
    if (res.newlySurveyed) {
      g.state.survey(res.newlySurveyed);
      g.audio.play('scan_sweep');
      g.audio.play('scan_chime');
      g.ui.toast('Surveyed: ' + PLANET_BY_ID[res.newlySurveyed].name);
    }
    if (res.boundary) this.radio(...MAP_RADIO.boundary);
    if (res.sunWarn && !this.wasSunWarn) {
      this.radio(...MAP_RADIO.sun);
      g.audio.play('warning');
    }
    this.wasSunWarn = res.sunWarn;
    this.warn.style.display = res.sunWarn ? 'block' : 'none';
    if (input.pressed('boost')) g.audio.play('ship_boost');
    // Zoom.
    if (input.pressed('zoomIn')) this.zoom /= MAP.zoomStep;
    if (input.pressed('zoomOut')) this.zoom *= MAP.zoomStep;
    if (Math.abs(input.padLook.y) > 0.1) this.zoom *= Math.pow(1.8, -input.padLook.y * dt);
    this.zoom = Math.max(MAP.zoomMin, Math.min(MAP.zoomMax, this.zoom));
    // Panels and landing.
    this.panel.show(this.panelFor(this.sim.near), input.glyph('land'));
    if (this.canLand() && input.pressed('land')) {
      input.consume('land');
      this.land();
    }
    // Return to bridge (hold).
    const held = input.held('returnBridge');
    this.hold.style.display = held > 0 ? 'block' : 'none';
    (this.hold.firstElementChild as HTMLElement).style.width = Math.min(100, (held / MAP.returnHold) * 100) + '%';
    if (held >= MAP.returnHold) {
      this.saveShip();
      void g.goto('bridge');
    }
    this.hudEl.innerHTML = '<div class="lbl">Survey</div><div class="count">Surveyed ' + this.surveyedCount() + ' / 15</div>';
    this.saveShip();
  }

  render(_alpha: number, dt: number): void {
    const s = this.sim;
    for (const p of PLANETS) {
      const m = this.planets.get(p.id)!;
      const q = s.planetPos(p);
      m.position.set(q.x, q.y, q.z);
      const surf = m.getObjectByName('surface');
      if (surf) surf.rotation.y += dt * 0.15;
      const mk = m.getObjectByName('marker');
      if (mk) mk.visible = !this.game.state.data.missions[p.landing.mission!];
    }
    this.belt.rotation.y += dt * 0.002;
    this.ship.position.set(s.x, 0, s.z);
    this.ship.rotation.y = s.heading;
    const sp = s.speed / MAP.boost;
    this.trail.visible = sp > 0.05;
    this.trail.scale.set(18, 20 + sp * 90, 18);
    this.trail.position.set(0, 0, 70 + sp * 45);
    // Camera.
    let target = new THREE.Vector3(s.x, 0, s.z);
    let zoom = this.zoom;
    const tilt = (MAP.tilt * Math.PI) / 180;
    if (this.phase !== 'fly' && this.target) {
      const q = s.planetPos(this.target);
      const pp = new THREE.Vector3(q.x, q.y, q.z);
      const k = Math.min(1, this.phaseT / (this.phase === 'landing' ? TRANSITIONS.landing : TRANSITIONS.takeoff));
      const e = k * k * (3 - 2 * k);
      this.shuttle.visible = true;
      const shipP = new THREE.Vector3(s.x, 0, s.z);
      if (this.phase === 'landing') {
        this.shuttle.position.lerpVectors(shipP, pp, e);
        target = shipP.clone().lerp(pp, e);
        zoom = 40 - 28 * e;
        if (this.phaseT > 1.2 && !this.card) this.showCard();
      } else {
        this.shuttle.position.lerpVectors(pp, shipP, e);
        target = pp.clone().lerp(shipP, e);
        zoom = 18 + 30 * e;
        this.shuttle.visible = k < 0.97;
      }
      this.shuttle.lookAt(this.phase === 'landing' ? pp : shipP);
    } else this.shuttle.visible = false;
    this.camera.position.set(target.x, target.y + zoom * Math.sin(tilt), target.z + zoom * Math.cos(tilt));
    this.camera.lookAt(target);
    this.updateLabels();
    this.renderCloseup(dt);
  }

  private showCard(): void {
    const p = this.target!;
    this.card = h('div', 'card', undefined, this.game.ui.overlay);
    this.card.dataset.screen = 'missionCard';
    const t = h('p', 'title', p.landing.missionName ?? '', this.card);
    t.style.animationDelay = '0s';
    const sub = h('p', '', p.name + '  ·  ' + NAMES.corps, this.card);
    sub.style.animationDelay = '0.5s';
  }

  private updateLabels(): void {
    const w = window.innerWidth, hgt = window.innerHeight;
    const v = new THREE.Vector3();
    const allDone = this.game.state.missionsDone() >= 2;
    for (const p of PLANETS) {
      const m = this.planets.get(p.id)!;
      v.copy(m.position).project(this.camera);
      const on = v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1;
      const l = this.labels.get(p.id)!;
      const d = Math.hypot(m.position.x - this.sim.x, m.position.z - this.sim.z);
      const show = on && this.phase === 'fly' && (d < MAP.labelRange || this.zoom > MAP.zoomLabels);
      l.style.display = show ? 'block' : 'none';
      if (show) {
        l.style.left = ((v.x + 1) / 2) * w + 'px';
        l.style.top = ((1 - v.y) / 2) * hgt + 'px';
      }
      const a = this.arrows.get(p.id);
      if (a) {
        const need = !allDone && !this.game.state.data.missions[p.landing.mission!] && !on && this.phase === 'fly';
        a.style.display = need ? 'block' : 'none';
        if (need) {
          let x = v.x, y = v.y;
          if (v.z > 1) {
            x = -x;
            y = -y;
          }
          const ang = Math.atan2(y, x);
          const k = 0.9 / Math.max(Math.abs(Math.cos(ang)), Math.abs(Math.sin(ang)));
          const ex = Math.cos(ang) * k, ey = Math.sin(ang) * k;
          a.style.left = ((ex + 1) / 2) * w + 'px';
          a.style.top = ((1 - ey) / 2) * hgt + 'px';
          a.style.transform = 'translate(-50%,-50%) rotate(' + (90 - (ang * 180) / Math.PI) + 'deg)';
        }
      }
    }
  }

  private renderCloseup(dt: number): void {
    const c = this.closeup;
    const cur = this.panel.current;
    if (!c || !c.renderer || !cur) return;
    if (c.id !== cur.id) {
      if (c.mesh) {
        c.scene.remove(c.mesh);
        c.mesh.traverse((o) => {
          const mm = o as THREE.Mesh;
          mm.geometry?.dispose();
          (mm.material as THREE.Material | undefined)?.dispose?.();
        });
      }
      c.id = cur.id;
      const p = PLANET_BY_ID[cur.id];
      c.mesh = p ? buildPlanetMesh(p, 3) : cur.id === STAR.id ? makeStar(2) : null;
      if (cur.id === BELT.id) {
        c.mesh = new THREE.Group();
        const r = new Rng(5);
        for (let i = 0; i < 12; i++) {
          const rock = new THREE.Mesh(rockGeometry(i), new THREE.MeshStandardMaterial({ color: 0x7a7068, flatShading: true }));
          rock.position.set(r.range(-2, 2), r.range(-1.5, 1.5), r.range(-1, 1));
          rock.scale.setScalar(r.range(0.4, 1.1));
          c.mesh.add(rock);
        }
      }
      if (c.mesh) c.scene.add(c.mesh);
      const size = p ? p.size * (p.rings ? 2.4 : 1) : 2.2;
      c.cam.position.set(0, size * 0.5, size * 3.6);
      c.cam.lookAt(0, 0, 0);
    }
    if (c.mesh) c.mesh.rotation.y += dt * 0.4;
    c.renderer.render(c.scene, c.cam);
  }
}
