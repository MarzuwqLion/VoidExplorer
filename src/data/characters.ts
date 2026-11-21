import type { HumanoidLook } from '../world/models/humanoid';

/** Character looks. Corps armor: matte slate-gray plates over a dark undersuit, amber stripe. */
export const LOOKS = {
  kade: { brow: 0.06, eye: 0x3a2a1a, skin: 0xb07a55, hair: 0x2a1d14, hairStyle: 'crop', suit: 0x1c2026, armor: 0x5b636c, trim: 0xf2a541, build: 1.08, stripe: true, visor: 0xffa53a } as HumanoidLook,
  okonkwo: { gear: ['rank', 'coat', 'datapad'], brow: 0.02, eye: 0x1e130c, skin: 0x5a3a26, hair: 0x15100c, hairStyle: 'bun', suit: 0x26303c, armor: 0x5b636c, trim: 0xd9e2ea, build: 0.92, uniform: true, height: 1.74 } as HumanoidLook,
  reyes: { gear: ['headset'], brow: 0.2, eye: 0x3a2614, skin: 0xc08a62, hair: 0x1c1410, hairStyle: 'swept', suit: 0x26303c, armor: 0x5b636c, trim: 0x6fb7ff, build: 0.98, uniform: true, height: 1.78 } as HumanoidLook,
  zhao: { gear: ['goggles', 'datapad'], brow: 0.08, eye: 0x1a120c, skin: 0xe0b896, hair: 0x0e0c0c, hairStyle: 'short', suit: 0x26303c, armor: 0x5b636c, trim: 0x7be38a, build: 0.86, uniform: true, height: 1.66 } as HumanoidLook,
  brandt: { gear: ['gloves', 'toolbelt', 'sleeves'], beard: 'full', brow: -0.05, eye: 0x4a6a80, skin: 0xd8a888, hair: 0x8a8a86, hairStyle: 'shaved', suit: 0x2a2f36, armor: 0x5b636c, trim: 0xf2a541, build: 1.22, uniform: true, height: 1.86 } as HumanoidLook,
  boateng: { gear: ['vest', 'satchel'], brow: 0.05, skin: 0x4a2e1e, hair: 0x120d0a, hairStyle: 'curly', suit: 0x4a5a3a, armor: 0x8a8f6a, trim: 0xf2a541, build: 0.95, uniform: true, height: 1.72 } as HumanoidLook,
  varga: { gear: ['satchel', 'gloves'], beard: 'stubble', brow: 0.15, eye: 0x4a5a2a, skin: 0xd9b090, hair: 0x6b4a2a, hairStyle: 'short', suit: 0x55663f, armor: 0x8a8f6a, trim: 0x9fd65a, build: 0.9, uniform: true, height: 1.8 } as HumanoidLook,
  park: { gear: ['toolbelt', 'gloves', 'goggles', 'sleeves'], brow: 0.12, skin: 0xd8b08a, hair: 0x101010, hairStyle: 'crop', suit: 0x5a4f40, armor: 0x8a8f6a, trim: 0xe0a040, build: 1.0, uniform: true, height: 1.7 } as HumanoidLook,
  kwan: { gear: ['scarf'], beard: 'stubble', brow: 0.18, skin: 0xc89870, hair: 0x2a2420, hairStyle: 'short', suit: 0x3d4a58, armor: 0x5b636c, trim: 0xf2a541, build: 0.92, uniform: true, height: 1.75 } as HumanoidLook,
  lookout: { skin: 0xb88a68, hair: 0x221a14, hairStyle: 'none', suit: 0x2a1f1a, armor: 0xb0562a, trim: 0x1a1a1a, build: 0.95, helmet: true, roundVisor: 1 } as HumanoidLook,
  rifleman: { skin: 0xb88a68, hair: 0x221a14, hairStyle: 'none', suit: 0x1e1814, armor: 0xb0562a, trim: 0x111111, build: 1.05, helmet: true, roundVisor: 1 } as HumanoidLook,
  rusher: { skin: 0xb88a68, hair: 0x221a14, hairStyle: 'none', suit: 0x3a2a20, armor: 0xc0682e, trim: 0x111111, build: 0.9, helmet: true, roundVisor: 1, cloth: 0xb02a22, uniform: true } as HumanoidLook,
  marksman: { skin: 0xb88a68, hair: 0x221a14, hairStyle: 'none', suit: 0x1e1814, armor: 0x8a4a26, trim: 0x111111, build: 0.95, helmet: true, roundVisor: 1, cloak: 0x5a4a3a, antenna: true } as HumanoidLook,
};
