/** Authoritative coordinates from spec sections 8 and 10. Scenes and the top-down map build from this file. */

export interface XZ {
  x: number;
  z: number;
}

/** Bridge: origin at floor center, +x starboard, -z forward. */
export const BRIDGE = {
  halfX: 6,
  halfZ: 9,
  height: 4,
  viewport: { z: -9, x0: -5, x1: 5 },
  helm: { x: 0, z: -6.5 },
  mapTable: { x: 0, z: -1, r: 1.5 },
  xo: { x: 1.8, z: -1.5 },
  science: { x: -5, z: -2 },
  armory: { x: 4.5, z: 5.5 },
  terminal: { x: 5.5, z: 6.5 },
  door: { x: 0, z: 8 },
  spawn: { x: 0, z: 8, yaw: 0 },
};

export interface Place {
  id: string;
  name: string;
  x: number;
  z: number;
  /** Ground height of the place (m). */
  h: number;
  size: string;
}
export interface NodeDef {
  id: string;
  type: 'alloy' | 'biomass' | 'isotopes';
  x: number;
  z: number;
  /** Optional explicit height (ledges, gantry); otherwise ground. */
  y?: number;
}

/** Amara, mission "Landfall". +x east, -z north, area -110..110. */
export const AMARA = {
  places: {
    lz: { id: 'lz', name: 'Landing zone', x: -80, z: 80, h: 6, size: '12 m pad' },
    station: { id: 'station', name: 'Landfall Station', x: -20, z: 45, h: 2, size: '18 m radius' },
    grove: { id: 'grove', name: 'The Grove', x: 35, z: 50, h: 0, size: '22 m radius' },
    tunnelGate: { id: 'tunnelGate', name: 'Tunnel gate', x: 45, z: 28, h: 0, size: '3 m wide' },
    tunnelExit: { id: 'tunnelExit', name: 'Tunnel exit', x: 58, z: 5, h: 0, size: 'ledge' },
    ravine: { id: 'ravine', name: 'The Ravine', x: 70, z: 0, h: -6, size: '60 m N-S, 14 m wide' },
    ridge: { id: 'ridge', name: 'The Ridge', x: 40, z: -55, h: 14, size: '70 m E-W, 16 m wide' },
    den: { id: 'den', name: 'The Den', x: -30, z: -60, h: -4, size: '20 m radius bowl' },
    returnPath: { id: 'returnPath', name: 'Return path', x: -26, z: -6, h: 0, size: '4 m wide' },
  } as Record<string, Place>,
  shuttle: { x: -84, z: 84, yaw: 135 },
  spawn: { x: -78, z: 76, yaw: -55 },
  ravine: { x0: 63, x1: 77, z0: -30, z1: 30, floor: -6, entry: { x: 70, z: 30 }, north: { x: 70, z: -28 } },
  ridgeRamp: { from: { x: 70, z: -30 }, to: { x: 62, z: -50 } },
  ridgeDescent: { from: { x: 22, z: -56 }, to: { x: -8, z: -58 } },
  den: { entry: { x: -8, z: -58 }, pillarRing: 11, pillarWidth: 2, nest: { x: -41, z: -60 }, exit: { x: -30, z: -40 } },
  returnPath: [ { x: -32, z: -40 }, { x: -29, z: -10 }, { x: -24, z: 12 }, { x: -20, z: 27 } ] as XZ[],
  tunnel: [ { x: 45, z: 28 }, { x: 50, z: 18 }, { x: 58, z: 5 } ] as XZ[],
  npcs: {
    boateng: { x: -18, z: 47.5, yaw: 40 },
    varga: { x: -20, z: 33, yaw: 180 },
    park: { x: -8, z: 45, yaw: 90 },
  },
  beacon: { x: -20, z: 45 },
  cores: [ { x: 35, z: 50 }, { x: 70, z: -28 }, { x: -41, z: -60 } ] as XZ[],
  nodes: [
    { id: 'a-b1', type: 'biomass', x: 0, z: 49 },
    { id: 'a-b2', type: 'biomass', x: 11, z: 43 },
    { id: 'a-b3', type: 'biomass', x: 21, z: 56 },
    { id: 'a-b4', type: 'biomass', x: 27, z: 63 },
    { id: 'a-b5', type: 'biomass', x: 46, z: 60 },
    { id: 'a-b6', type: 'biomass', x: 41, z: 37 },
    { id: 'a-b7', type: 'biomass', x: 65.5, z: 10 },
    { id: 'a-b8', type: 'biomass', x: 74.5, z: -12 },
    { id: 'a-b9', type: 'biomass', x: -25, z: -12 },
    { id: 'a-a1', type: 'alloy', x: 73.5, z: 19 },
    { id: 'a-a2', type: 'alloy', x: 54, z: -61 },
    { id: 'a-a3', type: 'alloy', x: 31, z: -49 },
    { id: 'a-i1', type: 'isotopes', x: 73, z: -56 },
    { id: 'a-i2', type: 'isotopes', x: 76, z: -27 },
  ] as NodeDef[],
};

/** Korr, mission "Cold Seam". Canyon walls on every side; route runs south-west to north-east. */
export const KORR = {
  places: {
    lz: { id: 'lz', name: 'Landing zone', x: -85, z: 85, h: 18, size: '14 m mesa top' },
    canyon: { id: 'canyon', name: 'Canyon approach', x: -55, z: 45, h: 0, size: '75 m long, 12 to 16 m wide' },
    lookout: { id: 'lookout', name: 'Lookout post', x: -30, z: 10, h: 1, size: '8 m platform' },
    yard: { id: 'yard', name: 'Mining Yard', x: 20, z: -15, h: 0, size: '70 m E-W, 55 m N-S' },
    hall: { id: 'hall', name: 'Processing Hall', x: 75, z: -30, h: 0, size: '30 m by 22 m interior' },
    dock: { id: 'dock', name: 'Loading Dock', x: 75, z: -80, h: 0, size: '35 m E-W, 45 m N-S' },
    extraction: { id: 'extraction', name: 'Extraction', x: 75, z: -98, h: 0, size: '12 m pad' },
  } as Record<string, Place>,
  shuttle: { x: -88, z: 88, yaw: 135 },
  spawn: { x: -83, z: 82, yaw: -45 },
  lzRamp: { from: { x: -80, z: 79 }, to: { x: -68, z: 66 } },
  canyonPath: [ { x: -70, z: 65 }, { x: -60, z: 52 }, { x: -55, z: 45 }, { x: -48, z: 34 }, { x: -35, z: 20 } ] as XZ[],
  patrolStart: { x: -55, z: 45 },
  lookoutNpc: { x: -31, z: 11.5, yaw: 150 },
  mainGate: { x: -22, z: 2 },
  sideDoor: { x: -12, z: -35 },
  yard: { x0: -15, x1: 55, z0: -42.5, z1: 12.5 },
  conveyor: { z: -15, x0: -8, x1: 48, h: 1.1 },
  gantry: { z: -40, x0: -10, x1: 52, h: 8, width: 3, stairs: { x: -12, z: -36 } },
  marksman: { x: 40, z: -38 },
  hall: { x0: 60, x1: 90, z0: -41, z1: -19, entry: { x: 57, z: -25 }, northDoor: { x: 75, z: -41 } },
  office: { x: 86, z: -38, door: { x: 84, z: -35 } },
  vault: { x: 81, z: -38.5 },
  corridor: { x: 75, z0: -41, z1: -56, width: 5 },
  dock: { x0: 57.5, x1: 92.5, z0: -102.5, z1: -57.5, stacks: [ { x: 63, z: -72 }, { x: 87, z: -88 } ] as XZ[], foreman: { x: 75, z: -96 } },
  extraction: { x: 75, z: -98 },
  kwanAtDock: { x: 70, z: -60 },
  nodes: [
    { id: 'k-a1', type: 'alloy', x: -62, z: 59 },
    { id: 'k-a2', type: 'alloy', x: -44, z: 28 },
    { id: 'k-a3', type: 'alloy', x: -11, z: 8 },
    { id: 'k-a4', type: 'alloy', x: 51, z: 9 },
    { id: 'k-a5', type: 'alloy', x: 52, z: -33 },
    { id: 'k-a6', type: 'alloy', x: -11, z: -22 },
    { id: 'k-a7', type: 'alloy', x: 18, z: 10 },
    { id: 'k-a8', type: 'alloy', x: 63, z: -38 },
    { id: 'k-a9', type: 'alloy', x: 88, z: -22 },
    { id: 'k-b1', type: 'biomass', x: -76, z: 54, y: 3 },
    { id: 'k-b2', type: 'biomass', x: -38, z: 38, y: 3 },
    { id: 'k-b3', type: 'biomass', x: 12, z: -40.5, y: 8 },
    { id: 'k-i1', type: 'isotopes', x: -35, z: 14 },
    { id: 'k-i2', type: 'isotopes', x: 50, z: -40.5, y: 8 },
  ] as NodeDef[],
};
