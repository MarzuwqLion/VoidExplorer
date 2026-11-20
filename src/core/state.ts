import type { MissionPlanet, ResourceId, UpgradeId } from '../data/names';
import { UPGRADES, UPGRADE_VALUES } from '../data/upgrades';
import { SURVIVAL } from '../data/tuning';

export type SceneId = 'title' | 'bridge' | 'systemMap' | 'planet' | 'end' | 'gym';

export interface Stats {
  playTime: number;
  kills: number;
  shotsFired: number;
  shotsHit: number;
}
export interface GameStateData {
  version: number;
  flags: Record<string, boolean>;
  resources: Record<ResourceId, number>;
  gathered: Record<ResourceId, number>;
  upgrades: UpgradeId[];
  surveyed: string[];
  missions: Record<MissionPlanet, boolean>;
  choices: Record<string, string>;
  stats: Stats;
  ship: { x: number; z: number; heading: number };
  scene: SceneId;
  visitedTopics: string[];
}

export const SAVE_VERSION = 1;

export function newStateData(): GameStateData {
  return {
    version: SAVE_VERSION,
    flags: {},
    resources: { alloy: 0, biomass: 0, isotopes: 0 },
    gathered: { alloy: 0, biomass: 0, isotopes: 0 },
    upgrades: [],
    surveyed: [],
    missions: { amara: false, korr: false },
    choices: {},
    stats: { playTime: 0, kills: 0, shotsFired: 0, shotsHit: 0 },
    ship: { x: 0, z: 0, heading: 0 },
    scene: 'bridge',
    visitedTopics: [],
  };
}

/** The one game state object. Serializes to JSON. */
export class GameState {
  data: GameStateData = newStateData();

  reset(): void {
    this.data = newStateData();
  }
  flag(name: string): boolean {
    return !!this.data.flags[name];
  }
  setFlag(name: string, v = true): void {
    if (v) this.data.flags[name] = true;
    else delete this.data.flags[name];
  }
  give(r: ResourceId, n: number, gathered = false): void {
    this.data.resources[r] = Math.max(0, this.data.resources[r] + n);
    if (gathered && n > 0) this.data.gathered[r] += n;
  }
  hasUpgrade(id: UpgradeId): boolean {
    return this.data.upgrades.includes(id);
  }
  canAfford(id: UpgradeId): boolean {
    const c = UPGRADES[id].cost;
    return (Object.keys(c) as ResourceId[]).every((r) => this.data.resources[r] >= (c[r] ?? 0));
  }
  buy(id: UpgradeId): boolean {
    if (this.hasUpgrade(id) || !this.canAfford(id)) return false;
    const c = UPGRADES[id].cost;
    for (const r of Object.keys(c) as ResourceId[]) this.data.resources[r] -= c[r] ?? 0;
    this.data.upgrades.push(id);
    return true;
  }
  get shieldMax(): number {
    return this.hasUpgrade('shield') ? UPGRADE_VALUES.shieldMax : SURVIVAL.shield;
  }
  get magMultiplier(): number {
    return this.hasUpgrade('mags') ? UPGRADE_VALUES.magMultiplier : 1;
  }
  get medkitMax(): number {
    return this.hasUpgrade('medic') ? UPGRADE_VALUES.medkits : SURVIVAL.medkits;
  }
  survey(id: string): boolean {
    if (this.data.surveyed.includes(id)) return false;
    this.data.surveyed.push(id);
    return true;
  }
  missionsDone(): number {
    return (this.data.missions.amara ? 1 : 0) + (this.data.missions.korr ? 1 : 0);
  }
  toJSON(): string {
    return JSON.stringify(this.data);
  }
  load(json: string): boolean {
    try {
      const d = JSON.parse(json) as GameStateData;
      if (!d || d.version !== SAVE_VERSION) return false;
      this.data = { ...newStateData(), ...d };
      return true;
    } catch {
      return false;
    }
  }
  snapshot(): GameStateData {
    return JSON.parse(JSON.stringify(this.data)) as GameStateData;
  }
  restore(s: GameStateData): void {
    this.data = JSON.parse(JSON.stringify(s)) as GameStateData;
  }
}
