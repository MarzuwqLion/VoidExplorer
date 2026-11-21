import * as THREE from 'three';
import type { Enemy } from './enemy';
import type { Director } from './director';
import { ALPHA, FOREMAN, ENEMIES } from '../data/enemies';
import { SHAKE } from '../data/tuning';
import type { EnemyType } from '../data/names';

const tmp = new THREE.Vector3();

/** Spawn adds in a ring around a point, out of the commander's sight where possible. */
function spawnAdds(d: Director, e: Enemy, types: EnemyType[], radius: number): void {
  const p = d.player;
  types.forEach((t, i) => {
    const away = Math.atan2(e.pos.z - p.z, e.pos.x - p.x);
    // Try angles and radii until the spot is reachable from the boss.
    for (let k = 0; k < 12; k++) {
      const a = away + (i - (types.length - 1) / 2) * 0.7 + k * 0.5;
      const r = radius * (1 - (k % 3) * 0.25);
      const x = e.pos.x + Math.cos(a) * r, z = e.pos.z + Math.sin(a) * r;
      const q = d.world.nav.nearestWalkable(x, z, 3);
      if (!q) continue;
      const path = d.world.nav.findPath(e.pos, q, 20000);
      if (!path || Math.abs(d.world.nav.heightAt(q.x, q.z) - e.pos.y) > 3) continue;
      d.spawn(t, q.x, q.z, { encounter: e.encounter ?? undefined, alerted: true });
      return;
    }
    d.spawn(t, e.pos.x, e.pos.z, { encounter: e.encounter ?? undefined, alerted: true });
  });
}

/** The Alpha: charge, swipe, pillar stuns and two waves of stalkers. */
export function alphaBrain(e: Enemy, d: Director, dt: number): void {
  if (!e.alerted) {
    e.anim = 'idle';
    e.speedNow = 0;
    return;
  }
  const p = d.player;
  const dist = Math.hypot(p.x - e.pos.x, p.z - e.pos.z);
  const frac = e.v.health / e.v.maxHealth;
  const phase = e.mem.phase ?? 1;
  // Phase changes: howl and call stalkers at 50% and 25%.
  if ((phase === 1 && frac <= 0.5) || (phase === 2 && frac <= 0.25)) {
    e.mem.phase = phase + 1;
    e.setState('howl');
    e.stunned = false;
    d.sound('alpha_howl', e.pos);
    spawnAdds(d, e, Array(ALPHA.adds).fill('stalker'), 14);
  }
  e.mem.cd = (e.mem.cd ?? 3) - dt;
  const cooldown = (e.mem.phase ?? 1) >= 2 ? ALPHA.chargeCooldown2 : ALPHA.chargeCooldown;
  switch (e.state) {
    case 'howl':
      e.anim = 'telegraph';
      e.glow = 1;
      e.speedNow = 0;
      if (e.stateT > 1.5) e.setState('stalk');
      return;
    case 'windup':
      e.anim = 'telegraph';
      e.glow = Math.min(1, e.stateT / ALPHA.chargeWindup);
      e.speedNow = 0;
      d.face(e, p.x, p.z, dt, 10);
      if (e.stateT >= ALPHA.chargeWindup) {
        e.setState('charge');
        e.mem.cx = -Math.sin(e.yaw);
        e.mem.cz = -Math.cos(e.yaw);
        e.mem.run = 0;
        e.mem.hit = 0;
      }
      return;
    case 'charge': {
      e.anim = 'attack';
      e.glow = 1;
      const step = ALPHA.chargeSpeed * dt;
      const fx = e.mem.cx, fz = e.mem.cz;
      // Pillar ahead across the Alpha's width? Stun.
      let ray = null;
      for (const off of [0, -0.9, 0.9]) {
        const r = d.world.physics.ray({ x: e.pos.x - fz * off, y: e.pos.y + 1.2, z: e.pos.z + fx * off }, { x: fx, y: 0, z: fz }, e.radius + step + 0.3);
        if (r && (!ray || r.tag?.id?.startsWith('pillar'))) ray = r;
      }
      if (ray && ray.tag?.id?.startsWith('pillar')) {
        e.setState('stunned');
        e.stunned = true;
        e.speedNow = 0;
        d.sound('knockdown', e.pos);
        d.quake(e.pos, SHAKE.pillarStun);
        return;
      }
      const nx = e.pos.x + fx * step, nz = e.pos.z + fz * step;
      if (ray || !d.world.nav.isWalkable(nx, nz)) {
        e.setState('recover');
        return;
      }
      e.pos.x = nx;
      e.pos.z = nz;
      e.pos.y = d.world.nav.heightAt(nx, nz);
      e.dist += step;
      e.speedNow = ALPHA.chargeSpeed;
      e.mem.run += step;
      d.quake(e.pos, SHAKE.chargePerSec * dt);
      if (!e.mem.hit && Math.hypot(p.x - e.pos.x, p.z - e.pos.z) < ALPHA.hitRadius + 0.35) {
        e.mem.hit = 1;
        d.combat.damagePlayer(ALPHA.chargeDamage, e.pos, { knockdown: true });
      }
      if (e.mem.run >= ALPHA.chargeMax) e.setState('recover');
      return;
    }
    case 'stunned':
      e.anim = 'stunned';
      e.glow = 0;
      e.weakOpen = 1;
      e.speedNow = 0;
      if (e.stateT >= ALPHA.stun) {
        e.stunned = false;
        e.weakOpen = 0;
        e.setState('stalk');
        e.mem.cd = cooldown;
      }
      return;
    case 'recover':
      e.anim = 'recover';
      e.glow = 0;
      e.speedNow = 0;
      if (e.stateT > 1.0) {
        e.setState('stalk');
        e.mem.cd = cooldown;
      }
      return;
    case 'swipe':
      e.anim = e.stateT < ALPHA.swipeWindup ? 'telegraph' : 'attack';
      e.glow = Math.min(1, e.stateT / ALPHA.swipeWindup);
      e.speedNow = 0;
      d.face(e, p.x, p.z, dt, 5);
      if (e.stateT >= ALPHA.swipeWindup && !e.mem.swung) {
        e.mem.swung = 1;
        const to = new THREE.Vector3(p.x - e.pos.x, 0, p.z - e.pos.z);
        const inFront = to.normalize().dot(e.forward(tmp)) > 0.3;
        if (dist <= ALPHA.swipeRange + 0.6 && inFront) d.combat.damagePlayer(ALPHA.swipeDamage, e.pos);
      }
      if (e.stateT >= ALPHA.swipeWindup + 0.5) e.setState('stalk');
      return;
  }
  e.glow = 0;
  e.weakOpen = 0;
  e.anim = 'move';
  if (dist <= ALPHA.swipeRange) {
    e.setState('swipe');
    e.mem.swung = 0;
    d.sound('alpha_swipe', e.pos);
    return;
  }
  if (e.mem.cd <= 0 && e.seesPlayer && dist > 6) {
    e.setState('windup');
    d.sound('alpha_roar', e.pos);
    return;
  }
  d.moveTo(e, p, ENEMIES.alpha.speed, dt);
}

/** The Foreman: rotary cannon sweeps, heat sinks, stomp, and a mortar in phase 2. */
export function foremanBrain(e: Enemy, d: Director, dt: number): void {
  if (!e.alerted) {
    e.anim = 'idle';
    e.speedNow = 0;
    return;
  }
  const p = d.player;
  const dist = Math.hypot(p.x - e.pos.x, p.z - e.pos.z);
  const total = e.v.health + e.v.armor, max = e.v.maxHealth + e.v.maxArmor;
  if ((e.mem.phase ?? 1) === 1 && total <= max * 0.5) {
    e.mem.phase = 2;
    d.sound('alarm', e.pos);
    spawnAdds(d, e, ['rifleman', 'rifleman', 'rusher', 'rusher'], 16);
    e.mem.mortar = 2;
  }
  // Mortar in phase 2.
  if ((e.mem.phase ?? 1) >= 2) {
    e.mem.mortar = (e.mem.mortar ?? 0) - dt;
    if (e.mem.mortar <= 0) {
      e.mem.mortar = FOREMAN.mortarCooldown;
      d.sound('mortar_warn', p);
      for (let i = 0; i < FOREMAN.mortarCircles; i++) {
        const a = d.rng.next() * Math.PI * 2, r = i === 0 ? 0 : 3 + d.rng.next() * 4;
        const x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r;
        d.proj.mortar(x, d.world.nav.heightAt(x, z), z);
      }
    }
  }
  // Stomp takes priority when the commander is close.
  if (dist <= FOREMAN.stompRange && e.state !== 'stomp' && e.state !== 'sweep') {
    e.setState('stomp');
    d.sound('foreman_stomp_windup', e.pos);
  }
  switch (e.state) {
    case 'stomp':
      e.anim = 'telegraph';
      e.glow = Math.min(1, e.stateT / FOREMAN.stompWindup);
      e.speedNow = 0;
      if (e.stateT >= FOREMAN.stompWindup && !e.mem.stomped) {
        e.mem.stomped = 1;
        d.sound('foreman_stomp', e.pos);
        d.quake(e.pos, SHAKE.stomp);
        if (dist <= FOREMAN.stompRange + 0.5) {
          d.combat.damagePlayer(FOREMAN.stompDamage, e.pos);
          const pl = d.world.player;
          const away = new THREE.Vector3(p.x - e.pos.x, 0, p.z - e.pos.z).normalize();
          pl.vel.addScaledVector(away, 9);
        }
      }
      if (e.stateT >= FOREMAN.stompWindup + 0.6) {
        e.mem.stomped = 0;
        e.setState('walk');
      }
      return;
    case 'spinup':
      e.anim = 'telegraph';
      e.glow = Math.min(1, e.stateT / FOREMAN.spinup);
      e.speedNow = 0;
      d.face(e, p.x, p.z, dt, 3);
      if (e.stateT >= FOREMAN.spinup) {
        e.setState('sweep');
        e.mem.shotAcc = 0;
      }
      return;
    case 'sweep': {
      e.anim = 'attack';
      e.glow = 1;
      d.face(e, p.x, p.z, dt, 1.6);
      e.mem.shotAcc = (e.mem.shotAcc ?? 0) + dt * FOREMAN.hitsPerSecond;
      while (e.mem.shotAcc >= 1) {
        e.mem.shotAcc -= 1;
        const f = e.forward(tmp);
        const m = new THREE.Vector3(e.pos.x - f.z * 0.9 + f.x * 1.2, e.pos.y + 1.7, e.pos.z + f.x * 0.9 + f.z * 1.2);
        d.combat.enemyShot(m, FOREMAN.cannonError, FOREMAN.damagePerHit, 0xffd060, 'foreman_cannon');
        d.quake(e.pos, SHAKE.cannon);
      }
      if (e.stateT >= FOREMAN.sweep) {
        e.setState('vent');
        d.sound('heatsink_open', e.pos);
      }
      return;
    }
    case 'vent':
      e.anim = 'idle';
      e.glow = 0;
      e.weakOpen = Math.min(1, e.stateT * 4);
      e.speedNow = 0;
      d.face(e, p.x, p.z, dt, 2);
      if (e.stateT >= FOREMAN.sinkOpen) {
        e.weakOpen = 0;
        e.setState('walk');
      }
      return;
  }
  // Walk toward the commander; never takes cover.
  e.weakOpen = Math.max(0, e.weakOpen - dt * 3);
  e.glow = 0;
  e.anim = 'move';
  if (dist > 9) d.moveTo(e, p, ENEMIES.foreman.speed, dt);
  else {
    e.speedNow = 0;
    d.face(e, p.x, p.z, dt, 2);
  }
  if (e.state !== 'walk') e.setState('walk');
  if (e.stateT >= FOREMAN.burstCooldown && (e.seesPlayer || e.sinceSeen < 4)) {
    e.setState('spinup');
    d.sound('foreman_spinup', e.pos);
  }
}
