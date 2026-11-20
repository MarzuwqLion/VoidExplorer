import { BeatMission, type Beat } from './beatMission';
import type { PlanetScene } from '../scenes/planet';
import type { EncounterDef, SpawnDef } from '../ai/encounter';
import { KORR, type XZ } from '../data/layouts';
import { NAMES } from '../data/names';
import { KORR_RADIO as R } from '../data/dialogue/missionRadio';
import { LOOKOUT, KWAN } from '../data/dialogue/planets';
import type { Npc } from '../world/npc';

const P = KORR.places;
const PERCHES: XZ[] = [ { x: 40, z: -40.5 }, { x: 20, z: -40.5 }, { x: 0, z: -40.5 } ];
export const KORR_EXTRA_WAVE: SpawnDef[] = [ { type: 'rifleman', x: 50, z: 6 }, { type: 'rifleman', x: 52, z: -20 }, { type: 'rusher', x: 46, z: 9 } ];

export const KORR_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'canyon',
    trigger: { x: -66, z: 64, r: 13 },
    waves: [[
      { type: 'rifleman', x: -55, z: 45, patrol: { x: 7, z: -10 } },
      { type: 'rifleman', x: -58, z: 49, patrol: { x: 5, z: -12 } },
      { type: 'rifleman', x: -51, z: 41, patrol: { x: 6, z: -8 } },
    ]],
    checkpoint: { x: -38, z: 22, yaw: -45 },
    crate: { x: -36, z: 25 },
  },
  {
    id: 'yard',
    trigger: { x: -19, z: 0, r: 6 },
    alt: [{ x: -9, z: -34, r: 5 }],
    waves: [
      [
        { type: 'rifleman', x: 5, z: -5, patrol: { x: 8, z: 0 } },
        { type: 'rifleman', x: 25, z: 0, patrol: { x: 0, z: 8 } },
        { type: 'rifleman', x: 35, z: -25, patrol: { x: -8, z: 0 } },
        { type: 'rifleman', x: 15, z: -30, patrol: { x: 6, z: 0 } },
        { type: 'rusher', x: 30, z: 5 },
        { type: 'rusher', x: 10, z: -22 },
        { type: 'marksman', x: 40, z: -40.5 },
      ],
      [ { type: 'rusher', x: 45, z: -10 }, { type: 'rusher', x: 50, z: 2 }, { type: 'rifleman', x: 48, z: -30 } ],
    ],
    nextWaveAt: 2,
    perches: PERCHES,
    checkpoint: { x: 55, z: -25, yaw: -90 },
    crate: { x: 54, z: -20 },
  },
  {
    id: 'hall',
    trigger: { x: 62, z: -27, r: 5 },
    waves: [[ { type: 'rusher', x: 80, z: -25 }, { type: 'rusher', x: 84, z: -30 }, { type: 'rifleman', x: 72, z: -36 }, { type: 'rifleman', x: 78, z: -22 } ]],
    startAlerted: true,
    checkpoint: { x: 75, z: -38, yaw: 0 },
    crate: { x: 70, z: -38 },
  },
  {
    id: 'dock',
    trigger: { x: 75, z: -60, r: 6 },
    waves: [[ { type: 'foreman', x: KORR.dock.foreman.x, z: KORR.dock.foreman.z, yaw: 180 } ]],
    startAlerted: true,
    checkpoint: { x: 75, z: -58, yaw: 0 },
    crate: { x: 71, z: -58 },
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

/** Mission "Cold Seam". */
export function korrMission(host: PlanetScene): BeatMission {
  const d = host.director;
  const encs = KORR_ENCOUNTERS.map((e) => ({ ...e, waves: e.waves.map((w) => [...w]) }));
  d.addEncounters(encs);
  const yard = encs.find((e) => e.id === 'yard')!;
  for (const e of encs) host.addCrate(e.id, e.crate);
  host.addNodes(KORR.nodes);
  host.addNpc('lookout', 'lookout', KORR.lookoutNpc, () => LOOKOUT, true);
  let kwan: Npc | null = null;
  const applyChoice = (choice: string | undefined) => {
    if (choice === 'reassure') {
      host.openGate('gate-main');
      host.openGate('gate-side');
      yard.startAlerted = false;
    } else if (choice === 'threaten') {
      host.openGate('gate-main');
      yard.startAlerted = true;
      if (!yard.waves.includes(KORR_EXTRA_WAVE)) d.addWave('yard', KORR_EXTRA_WAVE);
    }
  };
  host.onEffect((e) => {
    if (e.event === 'lookoutReassure') {
      applyChoice('reassure');
      host.radio(...R.yardQuiet);
    }
    if (e.event === 'lookoutThreaten') {
      applyChoice('threaten');
      host.game.audio.play('alarm');
      host.radio(...R.yardAlarm);
    }
  });
  // A choice made before an abort is restored with the snapshot, so it can never be stale here.
  applyChoice(host.game.state.data.choices.lookout);
  d.events.on('cleared', (enc) => {
    host.checkpointAt(enc.checkpoint, enc.id);
    const r = enc.id === 'canyon' ? R.canyonClear : enc.id === 'yard' ? R.yardClear : enc.id === 'hall' ? R.hallClear : null;
    if (r) host.radio(r[0], r[1]);
  });
  d.events.on('started', (enc) => {
    if (enc.id === 'canyon') host.radio(...R.canyon);
    if (enc.id === 'hall') host.radio(...R.hall);
  });
  let vaultTaken = false;
  host.addInteract({
    id: 'vault',
    x: KORR.vault.x,
    y: 0,
    z: KORR.vault.z + 1.4,
    range: 2.6,
    label: 'Take the isotope samples',
    enabled: () => host.game.state.flag('korr_vault') && !vaultTaken,
    onUse: () => {
      vaultTaken = true;
      host.giveResource('isotopes', 2);
      host.openGate('vault-door');
    },
  });
  d.events.on('spawned', (e) => {
    if (e.type === 'foreman') host.setBoss(e, NAMES.enemies.foreman);
  });
  let foremanDown = false;
  d.events.on('kill', (e) => {
    if (e.type !== 'foreman') return;
    foremanDown = true;
    host.game.state.setFlag('korr_foreman');
    host.radio(...R.foremanDown);
    landShuttle();
  });
  const landShuttle = () => {
    host.moveShuttle(KORR.extraction.x, KORR.extraction.z + 2, 180);
    host.game.audio.play('shuttle_thrust');
    if (kwan) {
      kwan.pos.set(KORR.kwanAtDock.x, host.world.nav.heightAt(KORR.kwanAtDock.x, KORR.kwanAtDock.z), KORR.kwanAtDock.z);
      kwan.root.position.copy(kwan.pos);
      const it = host.world.interactables.find((i) => i.id === 'talk-kwan');
      if (it) {
        it.x = kwan.pos.x;
        it.z = kwan.pos.z;
        it.y = kwan.pos.y;
      }
    }
  };
  const addKwan = () => {
    if (!kwan) kwan = host.addNpc('kwan', 'kwan', { x: KORR.office.x, z: KORR.office.z, yaw: -135 }, () => KWAN);
  };
  const beats: Beat[] = [
    {
      id: 'landing', label: 'Head down the canyon toward the mine',
      objective: () => 'Head down the canyon toward the mine',
      target: () => KORR.patrolStart,
      start: { x: KORR.spawn.x, z: KORR.spawn.z, yaw: KORR.spawn.yaw },
      enter: () => host.radio(...R.landing),
      done: (mm) => d.isActive('canyon') || cleared(mm, 'canyon') || near(mm, KORR.patrolStart, 12),
    },
    {
      id: 'canyon', label: 'Clear the canyon patrol',
      objective: () => 'Clear the canyon patrol',
      target: () => ({ x: -40, z: 26 }),
      start: { x: -66, z: 64, yaw: -30 },
      done: (mm) => cleared(mm, 'canyon'),
      skip: (mm) => skipEncounter(mm, 'canyon'),
    },
    {
      id: 'lookout', label: 'Question the lookout',
      objective: () => 'Question the wounded lookout',
      target: () => KORR.lookoutNpc,
      start: { x: -36, z: 20, yaw: -30 },
      enter: () => host.radio(...R.lookout),
      done: (mm) => mm.flag('korr_lookout'),
      skip: (mm) => {
        mm.setFlag('korr_lookout');
        host.game.state.data.choices.lookout = 'reassure';
        applyChoice('reassure');
      },
      wantFocus: () => 'talk-lookout',
    },
    {
      id: 'yard', label: 'Fight through the ' + NAMES.places.yard,
      objective: () => 'Fight through the ' + NAMES.places.yard,
      target: () => (d.isActive('yard') ? KORR.hall.entry : host.game.state.data.choices.lookout === 'reassure' ? { x: KORR.sideDoor.x + 4, z: KORR.sideDoor.z + 1 } : { x: KORR.mainGate.x + 6, z: KORR.mainGate.z - 5 }),
      start: { x: -26, z: 4, yaw: -60 },
      done: (mm) => cleared(mm, 'yard'),
      skip: (mm) => skipEncounter(mm, 'yard'),
    },
    {
      id: 'hall', label: 'Clear the ' + NAMES.places.hall,
      objective: () => 'Clear the ' + NAMES.places.hall,
      target: () => P.hall,
      start: { x: 55, z: -25, yaw: -90 },
      done: (mm) => cleared(mm, 'hall'),
      skip: (mm) => skipEncounter(mm, 'hall'),
      exit: () => {
        addKwan();
        host.radio(...R.kwan);
      },
    },
    {
      id: 'kwan', label: 'Free ' + NAMES.npcs.kwan.full,
      objective: () => 'Free ' + NAMES.npcs.kwan.full,
      target: () => KORR.office.door,
      start: { x: 80, z: -30, yaw: -60 },
      enter: () => addKwan(),
      done: (mm) => mm.flag('korr_kwan'),
      skip: (mm) => {
        mm.setFlag('korr_kwan');
        mm.setFlag('korr_vault');
      },
      wantFocus: () => 'talk-kwan',
    },
    {
      id: 'dock', label: 'Stop the ' + NAMES.enemies.foreman,
      objective: () => (d.isActive('dock') ? 'Destroy the ' + NAMES.enemies.foreman + "'s rig" : 'Reach the ' + NAMES.places.dock),
      target: () => (d.isActive('dock') ? null : { x: 75, z: -60 }),
      start: { x: 75, z: -50, yaw: 0 },
      enter: () => host.radio(...R.dock),
      done: () => foremanDown,
      skip: (mm) => {
        skipEncounter(mm, 'dock');
        foremanDown = true;
        host.game.state.setFlag('korr_foreman');
        landShuttle();
      },
    },
  ];
  return new BeatMission(NAMES.missions.korr, host, beats);
}
