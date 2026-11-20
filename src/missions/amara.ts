import { BeatMission, type Beat } from './beatMission';
import type { PlanetScene } from '../scenes/planet';
import type { EncounterDef } from '../ai/encounter';
import { AMARA, type XZ } from '../data/layouts';
import { NAMES } from '../data/names';
import { AMARA_RADIO as R } from '../data/dialogue/missionRadio';
import { BOATENG, VARGA, PARK } from '../data/dialogue/planets';
import type { Enemy } from '../ai/enemy';

const P = AMARA.places;
const C = AMARA.cores;

export const AMARA_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'grove',
    trigger: { x: 22, z: 50, r: 9 },
    waves: [
      [ { type: 'stalker', x: 50, z: 52 }, { type: 'stalker', x: 48, z: 61 }, { type: 'stalker', x: 52, z: 44 }, { type: 'stalker', x: 46, z: 38 } ],
      [ { type: 'stalker', x: 52, z: 58 }, { type: 'stalker', x: 50, z: 40 }, { type: 'stalker', x: 47, z: 66 } ],
    ],
    nextWaveAt: 1,
    checkpoint: { x: 54, z: 36, yaw: -30 },
    crate: { x: 56, z: 38 },
  },
  {
    id: 'ravine',
    trigger: { x: 70, z: 28, r: 6 },
    alt: [{ x: 58, z: 6, r: 6 }],
    waves: [[ { type: 'spitter', x: 82, z: -5 }, { type: 'spitter', x: 82, z: 12 }, { type: 'stalker', x: 70, z: -20 }, { type: 'stalker', x: 68, z: -24 }, { type: 'stalker', x: 72, z: -18 }, { type: 'stalker', x: 66, z: -16 } ]],
    checkpoint: { x: 70, z: -24, yaw: 0 },
    crate: { x: 73.5, z: -24 },
  },
  {
    id: 'ridge',
    trigger: { x: 62, z: -50, r: 7 },
    waves: [
      [ { type: 'spitter', x: 40, z: -58 }, { type: 'spitter', x: 30, z: -52 }, { type: 'spitter', x: 48, z: -61 }, { type: 'stalker', x: 35, z: -55 }, { type: 'stalker', x: 28, z: -60 }, { type: 'stalker', x: 44, z: -51 } ],
      [ { type: 'stalker', x: 20, z: -56 }, { type: 'stalker', x: 16, z: -54 }, { type: 'stalker', x: 22, z: -60 } ],
    ],
    nextWaveAt: 2,
    checkpoint: { x: 12, z: -56, yaw: 90 },
    crate: { x: 10, z: -53 },
  },
  {
    id: 'den',
    trigger: { x: -14, z: -58, r: 6 },
    waves: [[ { type: 'alpha', x: -38, z: -60, yaw: -90 } ]],
    checkpoint: { x: -30, z: -37, yaw: 180 },
    crate: { x: -27, z: -37 },
  },
];

function near(m: BeatMission, p: XZ, r: number): boolean {
  const q = m.host.world.player.pos;
  return Math.hypot(q.x - p.x, q.z - p.z) <= r;
}
function cleared(m: BeatMission, id: string): boolean {
  return m.host.director.status.get(id) === 'cleared';
}
function skipEncounter(m: BeatMission, id: string): void {
  const d = m.host.director;
  if (d.status.get(id) === 'active') for (const e of d.enemies) if (e.encounter === id) d.remove(e);
  d.markCleared(id);
}

/** Mission "Landfall". */
export function amaraMission(host: PlanetScene): BeatMission {
  const d = host.director;
  d.addEncounters(AMARA_ENCOUNTERS.map((e) => ({ ...e, waves: e.waves.map((w) => [...w]) })));
  for (const e of AMARA_ENCOUNTERS) host.addCrate(e.id, e.crate);
  host.addCrate('station', { x: -23, z: 49 });
  host.unlockCrate('station');
  host.addNodes(AMARA.nodes);
  host.addNpc('boateng', 'boateng', AMARA.npcs.boateng, () => BOATENG);
  host.addNpc('varga', 'varga', AMARA.npcs.varga, () => VARGA);
  host.addNpc('park', 'park', AMARA.npcs.park, () => PARK);
  host.onEffect((e) => {
    if (e.event === 'tunnelOpen') host.openGate('gate-tunnel');
    if (e.event === 'vargaBiomass') host.game.ui.toast('Biomass beds marked on your compass');
  });
  if (host.game.state.flag('amara_tunnel')) host.openGate('gate-tunnel');
  // Encounter clears: checkpoint and crate.
  d.events.on('cleared', (enc) => {
    host.checkpointAt(enc.checkpoint, enc.id);
    const r = enc.id === 'grove' ? R.groveClear : enc.id === 'ravine' ? R.ravineClear : enc.id === 'ridge' ? R.ridgeClear : null;
    if (r) host.radio(r[0], r[1]);
  });
  // Relay cores as pick-ups after each nest is cleared.
  const cores = [false, false, false];
  C.forEach((c, i) => {
    const enc = ['grove', 'ravine', 'den'][i];
    host.addInteract({
      id: 'core' + (i + 1),
      x: c.x,
      y: host.world.nav.heightAt(c.x, c.z),
      z: c.z,
      range: 2.6,
      label: 'Take relay core ' + (i + 1),
      enabled: () => !cores[i] && cleared(m, enc),
      onUse: () => {
        cores[i] = true;
        host.game.ui.toast('Relay core ' + (i + 1) + ' recovered');
        host.game.audio.play('pickup');
      },
    });
  });
  let alpha: Enemy | null = null;
  d.events.on('spawned', (e) => {
    if (e.type === 'alpha') {
      alpha = e;
      host.setBoss(e, NAMES.enemies.alpha);
    }
  });
  d.events.on('kill', (e) => {
    if (e.type === 'alpha') {
      host.giveResource('isotopes', 1);
      host.openGate('gate-den');
      host.radio(...R.alphaDown);
    }
  });
  let installed = false;
  host.addInteract({
    id: 'beacon',
    x: AMARA.beacon.x + 1.5,
    y: host.world.nav.heightAt(AMARA.beacon.x + 1.5, AMARA.beacon.z),
    z: AMARA.beacon.z,
    range: 2.8,
    label: 'Install relay cores',
    enabled: () => cores.every(Boolean) && !installed,
    onUse: () => {
      installed = true;
      host.lightBeacon();
      host.game.state.setFlag('amara_beacon');
      host.radio(...R.beacon, 9);
      if (host.game.state.flag('amara_tunnel')) setTimeout(() => host.radio(...R.beaconTunnel, 6), 7000);
    },
  });
  const beats: Beat[] = [
    {
      id: 'landing', label: 'Reach ' + NAMES.places.landfall,
      objective: () => 'Reach ' + NAMES.places.landfall,
      target: () => P.station,
      start: { x: AMARA.spawn.x, z: AMARA.spawn.z, yaw: AMARA.spawn.yaw },
      enter: () => host.radio(...R.landing),
      done: (m) => near(m, P.station, 14),
    },
    {
      id: 'station', label: 'Speak with ' + NAMES.npcs.boateng.full,
      objective: () => 'Speak with ' + NAMES.npcs.boateng.short,
      target: () => AMARA.npcs.boateng,
      start: { x: -26, z: 52, yaw: -30 },
      done: (m) => m.flag('amara_briefed'),
      skip: (m) => m.setFlag('amara_briefed'),
      exit: () => host.checkpointAt({ x: -24, z: 50, yaw: -90 }),
      wantFocus: () => 'talk-boateng',
    },
    {
      id: 'grove', label: 'Recover relay core 1 from ' + NAMES.places.grove,
      objective: () => (cleared(m, 'grove') ? 'Take relay core 1' : 'Recover relay core 1 from ' + NAMES.places.grove),
      target: () => C[0],
      start: { x: 15, z: 50, yaw: -90 },
      enter: () => undefined,
      done: () => cores[0],
      skip: (mm) => {
        skipEncounter(mm, 'grove');
        cores[0] = true;
      },
      wantFocus: () => 'core1',
    },
    {
      id: 'ravine', label: 'Recover relay core 2 from ' + NAMES.places.ravine,
      objective: () => (cleared(m, 'ravine') ? 'Take relay core 2' : host.game.state.flag('amara_tunnel') && !d.isActive('ravine') ? 'Take the survey tunnel to the Ravine ledge' : 'Recover relay core 2 from ' + NAMES.places.ravine),
      target: () => (cleared(m, 'ravine') || d.isActive('ravine') ? C[1] : host.game.state.flag('amara_tunnel') ? P.tunnelExit : AMARA.ravine.entry),
      start: { x: 58, z: 36, yaw: -150 },
      enter: () => {
        const r = host.game.state.flag('amara_tunnel') ? R.ravineTunnel : R.ravine;
        host.radio(r[0], r[1]);
      },
      done: () => cores[1],
      skip: (mm) => {
        skipEncounter(mm, 'ravine');
        cores[1] = true;
      },
      wantFocus: () => 'core2',
    },
    {
      id: 'ridge', label: 'Cross ' + NAMES.places.ridge,
      objective: () => 'Cross ' + NAMES.places.ridge,
      target: () => ({ x: 12, z: -56 }),
      start: { x: 70, z: -26, yaw: 20 },
      enter: () => host.radio(...R.ridge),
      done: (mm) => cleared(mm, 'ridge') && near(mm, { x: 12, z: -56 }, 10),
      skip: (mm) => skipEncounter(mm, 'ridge'),
    },
    {
      id: 'den', label: 'Find the last relay core in ' + NAMES.places.den,
      objective: () => (cleared(m, 'den') ? 'Take relay core 3' : alpha && alpha.alive ? 'Defeat the ' + NAMES.enemies.alpha : 'Find the last relay core in ' + NAMES.places.den),
      target: () => (cleared(m, 'den') ? C[2] : P.den),
      start: { x: 0, z: -57, yaw: 90 },
      enter: () => undefined,
      done: () => cores[2],
      skip: (mm) => {
        skipEncounter(mm, 'den');
        host.openGate('gate-den');
        cores[2] = true;
      },
      wantFocus: () => 'core3',
    },
    {
      id: 'beacon', label: 'Relight the beacon',
      objective: () => 'Return to the station and install the relay cores',
      target: () => AMARA.beacon,
      start: { x: -30, z: -36, yaw: 180 },
      enter: () => host.radio(...R.cores),
      done: () => installed,
      skip: () => {
        installed = true;
        host.lightBeacon();
        host.game.state.setFlag('amara_beacon');
      },
      wantFocus: () => 'beacon',
    },
  ];
  // Den trigger radio line.
  d.events.on('started', (enc) => {
    if (enc.id === 'den') host.radio(...R.den);
    if (enc.id === 'grove') host.radio(...R.grove);
  });
  const m = new BeatMission(NAMES.missions.amara, host, beats);
  (m as unknown as { onRespawn: () => void }).onRespawn = () => undefined;
  return m;
}
