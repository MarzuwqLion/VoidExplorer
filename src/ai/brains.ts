import * as THREE from 'three';
import type { Enemy } from './enemy';
import type { Director } from './director';
import type { EnemyType } from '../data/names';
import { AI, STALKER, SPITTER, RIFLEMAN, RUSHER, MARKSMAN, ENEMIES } from '../data/enemies';
import { alphaBrain, foremanBrain } from './bosses';

export type Brain = (e: Enemy, d: Director, dt: number) => void;
const tmp = new THREE.Vector3();

function flatDist(e: Enemy, p: THREE.Vector3): number {
  return Math.hypot(p.x - e.pos.x, p.z - e.pos.z);
}
/** Unaware behaviour: patrol between two points or stand. */
function idle(e: Enemy, d: Director, dt: number): void {
  e.anim = 'idle';
  e.speedNow = 0;
  if (e.mem.px1 !== undefined) {
    const leg = e.mem.leg ?? 0;
    const gx = leg ? e.mem.px1 : e.mem.px0, gz = leg ? e.mem.pz1 : e.mem.pz0;
    const r = d.moveTo(e, { x: gx, z: gz }, ENEMIES[e.type].speed * 0.3, dt);
    e.anim = 'move';
    if (r < 0.6) e.mem.leg = leg ? 0 : 1;
  }
}
/** Raider aim error in degrees against the commander right now. */
export function aimError(d: Director): number {
  return AI.aimErrorBase + AI.aimErrorPerSpeed * d.world.player.speed;
}
function spotted(e: Enemy, dt: number): number {
  if (e.seesPlayer) e.mem.spot = (e.mem.spot ?? 0) + dt;
  else if (e.sinceSeen > 3) e.mem.spot = 0;
  return e.mem.spot ?? 0;
}

const stalker: Brain = (e, d, dt) => {
  if (!e.alerted) return idle(e, d, dt);
  const p = d.player;
  const dist = flatDist(e, p);
  switch (e.state) {
    case 'crouch':
      e.anim = 'telegraph';
      e.glow = Math.min(1, e.stateT / STALKER.crouch);
      e.speedNow = 0;
      d.face(e, p.x, p.z, dt, 12);
      if (e.stateT >= STALKER.crouch) {
        e.setState('lunge');
        e.mem.lx = -Math.sin(e.yaw);
        e.mem.lz = -Math.cos(e.yaw);
        e.mem.hit = 0;
        d.sound('stalker_lunge', e.pos);
      }
      return;
    case 'lunge': {
      e.anim = 'attack';
      e.glow = 1;
      const nx = e.pos.x + e.mem.lx * STALKER.lungeSpeed * dt, nz = e.pos.z + e.mem.lz * STALKER.lungeSpeed * dt;
      if (d.world.nav.isWalkable(nx, nz)) {
        e.pos.x = nx;
        e.pos.z = nz;
        e.pos.y = d.world.nav.heightAt(nx, nz);
        e.dist += STALKER.lungeSpeed * dt;
      }
      e.speedNow = STALKER.lungeSpeed;
      if (!e.mem.hit && flatDist(e, p) < STALKER.hitRange && Math.abs(p.y - e.pos.y) < 1.5) {
        e.mem.hit = 1;
        d.combat.damagePlayer(STALKER.damage, e.pos);
      }
      if (e.stateT >= STALKER.lungeTime) e.setState('recover');
      return;
    }
    case 'recover':
      e.anim = 'recover';
      e.glow = 0;
      e.speedNow = 0;
      if (e.stateT >= STALKER.recover) e.setState('chase');
      return;
  }
  e.glow = 0;
  e.anim = 'move';
  const lunging = d.enemies.filter((o) => o.alive && o.type === 'stalker' && (o.state === 'crouch' || o.state === 'lunge')).length;
  if (dist <= STALKER.lungeRange && e.seesPlayer && lunging < STALKER.maxLunging && (e.mem.cd ?? 0) <= 0) {
    e.setState('crouch');
    e.mem.cd = 1.5 + d.rng.next() * 1.5;
    d.sound('stalker_screech', e.pos);
    return;
  }
  e.mem.cd = (e.mem.cd ?? 0) - dt;
  if (dist > STALKER.circleRadius + 2 || !e.seesPlayer) {
    d.moveTo(e, e.seesPlayer ? p : e.lastKnown, ENEMIES.stalker.speed, dt);
  } else {
    // Circle the commander, drifting inward.
    const side = e.uid % 2 ? 1 : -1;
    const ang = Math.atan2(e.pos.z - p.z, e.pos.x - p.x) + side * 0.9 * dt * 2;
    const r = Math.max(STALKER.lungeRange - 0.5, dist - dt * 1.5);
    d.moveTo(e, { x: p.x + Math.cos(ang) * r, z: p.z + Math.sin(ang) * r }, ENEMIES.stalker.speed * 0.8, dt, false);
    d.face(e, p.x, p.z, dt, 8);
  }
};

const spitter: Brain = (e, d, dt) => {
  if (!e.alerted) return idle(e, d, dt);
  const p = d.player;
  const dist = flatDist(e, p);
  if (e.state === 'glow') {
    e.anim = 'telegraph';
    e.glow = Math.min(1, e.stateT / SPITTER.glow);
    e.speedNow = 0;
    d.face(e, p.x, p.z, dt, 6);
    if (e.stateT >= SPITTER.glow) {
      const from = e.pos.clone().add(new THREE.Vector3(0, 1.2, 0)).addScaledVector(e.forward(tmp), 0.8);
      const lead = d.world.player.vel.clone().multiplyScalar(SPITTER.flight * 0.5);
      const to = new THREE.Vector3(p.x + lead.x, p.y, p.z + lead.z);
      d.proj.lob(from, to);
      d.sound('spitter_spit', e.pos);
      e.setState('cool');
      e.anim = 'attack';
    }
    return;
  }
  e.glow = Math.max(0, e.glow - dt * 2);
  e.anim = e.speedNow > 0.2 ? 'move' : 'idle';
  if (e.state === 'cool' && e.stateT < SPITTER.cooldown) {
    if (e.stateT < 0.4) e.anim = 'attack';
  } else if (e.seesPlayer && dist >= SPITTER.minRange - 2 && dist <= SPITTER.maxRange + 4) {
    e.setState('glow');
    d.sound('spitter_gurgle', e.pos);
    return;
  }
  // Keep 15 to 30 m away with a line of sight; retreat when approached.
  if (dist < SPITTER.minRange) {
    const away = new THREE.Vector3(e.pos.x - p.x, 0, e.pos.z - p.z).normalize();
    d.moveTo(e, { x: e.pos.x + away.x * 6, z: e.pos.z + away.z * 6 }, ENEMIES.spitter.speed, dt, false);
    d.face(e, p.x, p.z, dt, 4);
  } else if (dist > SPITTER.maxRange || !e.seesPlayer) {
    d.moveTo(e, e.seesPlayer ? p : e.lastKnown, ENEMIES.spitter.speed, dt);
  } else {
    e.speedNow = 0;
    d.face(e, p.x, p.z, dt, 4);
  }
};

const rifleman: Brain = (e, d, dt) => {
  if (!e.alerted) return idle(e, d, dt);
  const p = d.player;
  const spot = spotted(e, dt);
  const dist = flatDist(e, p);
  const cover = e.cover >= 0 ? d.cover[e.cover] : null;
  const findCover = (closer = false) => d.findCover(e, { minTargetDist: RIFLEMAN.rangeMin, maxTargetDist: RIFLEMAN.rangeMax, maxDist: closer ? 30 : 22, prefer: closer ? 'closer' : 'near', lowOnly: true });
  // Fire bursts while peeking.
  const shoot = () => {
    if (!e.seesPlayer || spot < AI.firstShotDelay || dist > RIFLEMAN.rangeMax + 10) {
      d.releaseToken(e);
      return;
    }
    if (!d.requestToken(e)) return;
    e.mem.bt = (e.mem.bt ?? 0) - dt;
    if ((e.mem.left ?? 0) <= 0 && e.mem.bt <= 0) {
      e.mem.left = RIFLEMAN.burst;
      if (d.rng.chance(0.25)) d.sound('raider_bark', e.pos);
    }
    if ((e.mem.left ?? 0) > 0 && e.mem.bt <= 0) {
      e.mem.left--;
      e.mem.bt = e.mem.left > 0 ? RIFLEMAN.burstGap : RIFLEMAN.burstEvery;
      const m = e.eye().addScaledVector(e.forward(tmp), 0.5);
      m.y -= 0.15;
      d.combat.enemyShot(m, aimError(d), RIFLEMAN.damage);
      e.anim = 'attack';
    }
  };
  d.face(e, p.x, p.z, dt, e.state === 'toCover' ? 0 : 6);
  switch (e.state) {
    case 'toCover': {
      if (!cover) {
        e.setState('open');
        return;
      }
      e.crouch = Math.max(0, e.crouch - dt * 4);
      e.anim = 'move';
      d.releaseToken(e);
      const r = d.moveTo(e, cover, ENEMIES.rifleman.speed, dt);
      if (r < 0.4) {
        e.setState('duck');
        e.mem.peeks = 0;
        e.mem.relocAt = RIFLEMAN.relocateMin + Math.floor(d.rng.next() * (RIFLEMAN.relocateMax - RIFLEMAN.relocateMin + 1));
      }
      if (e.stateT > 12) e.setState('open');
      return;
    }
    case 'duck':
      e.crouch = Math.min(1, e.crouch + dt * 5);
      e.anim = 'cover';
      e.speedNow = 0;
      d.releaseToken(e);
      if (d.playerHiddenT > RIFLEMAN.advanceAfter) {
        if (findCover(true)) e.setState('toCover');
        d.playerHiddenT = 0;
        return;
      }
      if (e.mem.duckLen === undefined) e.mem.duckLen = RIFLEMAN.duck * (0.6 + d.rng.next() * 0.8);
      if (e.stateT >= e.mem.duckLen) {
        e.mem.duckLen = RIFLEMAN.duck * (0.6 + d.rng.next() * 0.8);
        e.setState('peek');
        e.mem.peekLen = RIFLEMAN.peekMin + d.rng.next() * (RIFLEMAN.peekMax - RIFLEMAN.peekMin);
      }
      return;
    case 'peek':
      e.crouch = Math.max(0, e.crouch - dt * 5);
      e.anim = 'idle';
      e.speedNow = 0;
      shoot();
      if (e.stateT >= (e.mem.peekLen ?? 2)) {
        e.mem.peeks = (e.mem.peeks ?? 0) + 1;
        d.releaseToken(e);
        if (e.mem.peeks >= (e.mem.relocAt ?? 3) && findCover()) e.setState('toCover');
        else e.setState(cover && cover.low ? 'duck' : 'duck');
      }
      return;
    case 'open':
      // No cover available: hold position and fire, sidestepping occasionally.
      e.crouch = 0;
      e.anim = 'idle';
      shoot();
      if (dist < RIFLEMAN.rangeMin) {
        const away = new THREE.Vector3(e.pos.x - p.x, 0, e.pos.z - p.z).normalize();
        d.moveTo(e, { x: e.pos.x + away.x * 4, z: e.pos.z + away.z * 4 }, ENEMIES.rifleman.speed * 0.6, dt, false);
        e.anim = 'move';
      } else if (!e.seesPlayer) {
        d.moveTo(e, e.lastKnown, ENEMIES.rifleman.speed, dt);
        e.anim = 'move';
      }
      if (e.stateT > 4) {
        if (findCover()) e.setState('toCover');
        else e.stateT = 0;
      }
      return;
    default:
      e.setState(findCover() ? 'toCover' : 'open');
  }
};

const rusher: Brain = (e, d, dt) => {
  if (!e.alerted) return idle(e, d, dt);
  const p = d.player;
  const dist = flatDist(e, p);
  const speed = ENEMIES.rusher.speed;
  switch (e.state) {
    case 'shout':
      e.anim = 'telegraph';
      e.glow = 1;
      e.speedNow = 0;
      d.face(e, p.x, p.z, dt, 10);
      if (e.stateT >= RUSHER.shout) e.setState('charge');
      return;
    case 'charge': {
      e.glow = Math.max(0, e.glow - dt);
      e.anim = 'move';
      if (dist > 4.5) d.moveTo(e, p, speed, dt);
      else {
        e.speedNow = 0;
        d.face(e, p.x, p.z, dt, 10);
      }
      e.mem.cd = (e.mem.cd ?? 0) - dt;
      if (dist <= RUSHER.range && e.seesPlayer && e.mem.cd <= 0 && d.requestToken(e)) {
        e.mem.cd = 1 / RUSHER.rate;
        e.anim = 'attack';
        const m = e.eye().addScaledVector(e.forward(tmp), 0.5);
        m.y -= 0.2;
        for (let i = 0; i < RUSHER.pellets; i++) d.combat.enemyShot(m, RUSHER.spreadDeg, RUSHER.pelletDamage, 0xffa060, i === 0 ? 'scatter_fire' : 'impact_hard');
      }
      if (dist > RUSHER.chargeRange * 1.5) {
        d.releaseToken(e);
        e.setState('flank');
      }
      return;
    }
    case 'flank':
    default: {
      e.glow = 0;
      e.anim = 'move';
      // Run to a point beside the commander, then charge.
      const side = e.uid % 2 ? 1 : -1;
      const to = new THREE.Vector3(e.pos.x - p.x, 0, e.pos.z - p.z).normalize();
      const perp = new THREE.Vector3(-to.z * side, 0, to.x * side);
      const goal = { x: p.x + perp.x * RUSHER.flankOffset + to.x * 4, z: p.z + perp.z * RUSHER.flankOffset + to.z * 4 };
      const r = d.moveTo(e, goal, speed, dt);
      if (e.state !== 'flank') e.setState('flank');
      if ((r < 2 || dist < RUSHER.chargeRange * 0.6 || e.stateT > 6) && e.seesPlayer) {
        e.setState('shout');
        d.sound('rusher_shout', e.pos);
      }
    }
  }
};

const marksman: Brain = (e, d, dt) => {
  if (!e.alerted) return idle(e, d, dt);
  const p = d.player;
  const enc = d.encounters.find((x) => x.id === e.encounter);
  const perches = enc?.perches ?? [];
  const perch = perches.length ? perches[(e.mem.perch ?? 0) % perches.length] : null;
  switch (e.state) {
    case 'aim': {
      e.anim = 'telegraph';
      e.speedNow = 0;
      d.face(e, p.x, p.z, dt, 8);
      e.glow = Math.min(1, e.stateT / MARKSMAN.charge);
      e.laser = d.playerChest(new THREE.Vector3());
      if (!e.seesPlayer) {
        // Breaking line of sight cancels the shot.
        e.laser = null;
        d.releaseToken(e);
        e.setState('wait');
        return;
      }
      if (e.stateT >= MARKSMAN.charge) {
        const m = e.eye().addScaledVector(e.forward(tmp), 0.8);
        d.combat.enemyShot(m, MARKSMAN.errorDeg, MARKSMAN.damage, 0xff3020, 'marksman_fire');
        e.laser = null;
        e.anim = 'attack';
        d.releaseToken(e);
        e.mem.shots = (e.mem.shots ?? 0) + 1;
        if (e.mem.shots >= MARKSMAN.shotsBeforeMove && perches.length > 1) {
          e.mem.shots = 0;
          e.mem.perch = (e.mem.perch ?? 0) + 1;
          e.setState('move');
        } else e.setState('wait');
      }
      return;
    }
    case 'move':
      e.glow = 0;
      e.anim = 'move';
      if (!perch || d.moveTo(e, perch, ENEMIES.marksman.speed, dt) < 0.6) e.setState('wait');
      return;
    default: {
      e.glow = 0;
      e.anim = 'idle';
      e.speedNow = 0;
      d.face(e, p.x, p.z, dt, 4);
      if (perch && Math.hypot(perch.x - e.pos.x, perch.z - e.pos.z) > 1.5) {
        e.setState('move');
        return;
      }
      if (e.stateT >= MARKSMAN.cooldown && e.seesPlayer && d.requestToken(e)) {
        e.setState('aim');
        d.sound('marksman_charge', e.pos);
      }
    }
  }
};

export const BRAINS: Record<EnemyType, Brain> = { stalker, spitter, rifleman, rusher, marksman, alpha: alphaBrain, foreman: foremanBrain };
