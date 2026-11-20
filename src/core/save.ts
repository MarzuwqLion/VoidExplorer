import type { GameState } from './state';

const KEY = 'sojourner.save.v1';
const SETTINGS_KEY = 'sojourner.settings.v1';

function store(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}
export function saveGame(state: GameState): void {
  store()?.setItem(KEY, state.toJSON());
}
export function hasSave(): boolean {
  return !!store()?.getItem(KEY);
}
export function loadGame(state: GameState): boolean {
  const s = store()?.getItem(KEY);
  return s ? state.load(s) : false;
}
export function clearSave(): void {
  store()?.removeItem(KEY);
}

export interface Settings {
  mouseSens: number;
  padSens: number;
  invertY: boolean;
  master: number;
  effects: number;
  ambient: number;
  music: number;
  shake: boolean;
  bloom: boolean;
}
export const DEFAULT_SETTINGS: Settings = {
  mouseSens: 1,
  padSens: 1,
  invertY: false,
  master: 0.8,
  effects: 0.9,
  ambient: 0.7,
  music: 0.6,
  shake: true,
  bloom: true,
};
export function loadSettings(): Settings {
  try {
    const s = store()?.getItem(SETTINGS_KEY);
    return s ? { ...DEFAULT_SETTINGS, ...(JSON.parse(s) as Partial<Settings>) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}
export function saveSettings(s: Settings): void {
  store()?.setItem(SETTINGS_KEY, JSON.stringify(s));
}
