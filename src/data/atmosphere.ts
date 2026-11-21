/** Colour grade applied after bloom, in linear light: gain and lift per channel, saturation, contrast around mid grey,
 * vignette strength and film grain. */
export interface Grade {
  lift: [number, number, number];
  gain: [number, number, number];
  sat: number;
  contrast: number;
  vignette: number;
  grain: number;
}

export const GRADES = {
  neutral: { lift: [0, 0, 0], gain: [1, 1, 1], sat: 1, contrast: 1, vignette: 0.18, grain: 0 },
  title: { lift: [0, 0.001, 0.004], gain: [1, 1, 1.03], sat: 1.05, contrast: 1.05, vignette: 0.38, grain: 0.012 },
  bridge: { lift: [0, 0.002, 0.006], gain: [0.98, 1, 1.05], sat: 1.05, contrast: 1.06, vignette: 0.3, grain: 0.014 },
  systemMap: { lift: [0, 0, 0.003], gain: [1, 1, 1.02], sat: 1.08, contrast: 1.04, vignette: 0.34, grain: 0.01 },
  amara: { lift: [0, 0.005, 0.007], gain: [1.03, 1.01, 0.95], sat: 1.07, contrast: 1.08, vignette: 0.3, grain: 0.014 },
  korr: { lift: [0.002, 0.004, 0.01], gain: [0.93, 0.98, 1.08], sat: 0.8, contrast: 1.12, vignette: 0.4, grain: 0.024 },
} satisfies Record<string, Grade>;
export type GradeId = keyof typeof GRADES;

/** Screen effects driven by play: sprint edge blur and hit colour fringing strengths. */
export const POST = { runBlur: 1, hitFringe: 1 };
