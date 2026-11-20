/** Input action names and their default bindings. */
export type Action =
  | 'aim' | 'fire' | 'reload' | 'interact' | 'sprint' | 'roll' | 'crouch' | 'melee' | 'medkit'
  | 'weapon1' | 'weapon2' | 'weapon3' | 'nextWeapon' | 'prevWeapon' | 'shoulder' | 'objectives'
  | 'pause' | 'debug' | 'confirm' | 'back' | 'menuUp' | 'menuDown' | 'menuLeft' | 'menuRight'
  | 'boost' | 'land' | 'returnBridge' | 'zoomIn' | 'zoomOut';

export const ACTIONS: Action[] = [
  'aim', 'fire', 'reload', 'interact', 'sprint', 'roll', 'crouch', 'melee', 'medkit',
  'weapon1', 'weapon2', 'weapon3', 'nextWeapon', 'prevWeapon', 'shoulder', 'objectives',
  'pause', 'debug', 'confirm', 'back', 'menuUp', 'menuDown', 'menuLeft', 'menuRight',
  'boost', 'land', 'returnBridge', 'zoomIn', 'zoomOut',
];

/** Keyboard codes (KeyboardEvent.code), plus Mouse0/Mouse2 and WheelUp/WheelDown. Never Ctrl. */
export const KEY_BINDINGS: Record<Action, string[]> = {
  aim: ['Mouse2'],
  fire: ['Mouse0'],
  reload: ['KeyR'],
  interact: ['KeyE'],
  sprint: ['ShiftLeft', 'ShiftRight'],
  roll: ['Space'],
  crouch: ['KeyC'],
  melee: ['KeyF'],
  medkit: ['KeyQ'],
  weapon1: ['Digit1'],
  weapon2: ['Digit2'],
  weapon3: ['Digit3'],
  nextWeapon: ['WheelDown'],
  prevWeapon: ['WheelUp'],
  shoulder: ['KeyX'],
  objectives: ['Tab'],
  pause: ['Escape'],
  debug: ['Backquote'],
  confirm: ['KeyE', 'Enter', 'NumpadEnter'],
  back: ['Escape', 'Backspace'],
  menuUp: ['KeyW', 'ArrowUp'],
  menuDown: ['KeyS', 'ArrowDown'],
  menuLeft: ['KeyA', 'ArrowLeft'],
  menuRight: ['KeyD', 'ArrowRight'],
  boost: ['ShiftLeft', 'ShiftRight'],
  land: ['KeyE'],
  returnBridge: ['Tab'],
  zoomIn: ['WheelUp'],
  zoomOut: ['WheelDown'],
};

/** Standard gamepad button indices (Xbox layout). */
export const PAD = {
  A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, View: 8, Menu: 9, LS: 10, RS: 11,
  DUp: 12, DDown: 13, DLeft: 14, DRight: 15,
} as const;
export type PadButton = keyof typeof PAD;

export const PAD_BINDINGS: Record<Action, PadButton[]> = {
  aim: ['LT'],
  fire: ['RT'],
  reload: ['X'],
  interact: ['X'],
  sprint: ['LS'],
  roll: ['A'],
  crouch: ['B'],
  melee: ['RB'],
  medkit: ['LB'],
  weapon1: ['DLeft'],
  weapon2: ['DUp'],
  weapon3: ['DRight'],
  nextWeapon: ['Y'],
  prevWeapon: [],
  shoulder: ['RS'],
  objectives: ['View'],
  pause: ['Menu'],
  debug: [],
  confirm: ['A'],
  back: ['B'],
  menuUp: ['DUp'],
  menuDown: ['DDown'],
  menuLeft: ['DLeft'],
  menuRight: ['DRight'],
  boost: ['RT'],
  land: ['A'],
  returnBridge: ['B'],
  zoomIn: [],
  zoomOut: [],
};

/** Glyph text shown in prompts for the device used last. */
export const KEY_GLYPHS: Partial<Record<Action, string>> = {
  aim: 'RMB', fire: 'LMB', reload: 'R', interact: 'E', sprint: 'Shift', roll: 'Space', crouch: 'C',
  melee: 'F', medkit: 'Q', objectives: 'Tab', pause: 'Esc', confirm: 'E', back: 'Esc', boost: 'Shift',
  land: 'E', returnBridge: 'Hold Tab', shoulder: 'X', nextWeapon: 'Wheel',
};
export const PAD_GLYPHS: Partial<Record<Action, string>> = {
  aim: 'LT', fire: 'RT', reload: 'X', interact: 'X', sprint: 'LS', roll: 'A', crouch: 'B', melee: 'RB',
  medkit: 'LB', objectives: 'View', pause: 'Menu', confirm: 'A', back: 'B', boost: 'RT', land: 'A',
  returnBridge: 'Hold B', shoulder: 'RS', nextWeapon: 'Y',
};
