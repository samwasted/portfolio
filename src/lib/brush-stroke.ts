/**
 * Brush stroke geometry for vertical timelines.
 *
 * Each item gets one segment of a single continuous stroke, drawn in a
 * 10 x 100 viewBox that is stretched to the item's height. Segment widths
 * blend into their neighbours so pressure changes read as one hand, and
 * the first and last segments taper off, so any number of items works.
 */

/** Stroke width per weight, in viewBox units (max 10) */
export const BRUSH_WEIGHT = {
  standard: 1.6,
  medium: 3.6,
  highlight: 7.5,
} as const;

export type BrushWeight = keyof typeof BRUSH_WEIGHT;

/** Width the stroke starts and ends at, so the ends taper */
const START_TIP = 0.3;
const END_TIP = 0.2;

/** SVG path data for each segment, in the same order as `weights` */
export function brushSegments(weights: BrushWeight[]): string[] {
  const widths = weights.map((w) => BRUSH_WEIGHT[w]);

  return widths.map((w, i) => {
    const prev = i > 0 ? widths[i - 1] : START_TIP;
    const next = i < widths.length - 1 ? widths[i + 1] : END_TIP;
    const top = (prev + w) / 2;
    const bot = (w + next) / 2;
    const L = (x: number) => (5 - x / 2).toFixed(2);
    const R = (x: number) => (5 + x / 2).toFixed(2);

    return [
      `M${L(top)} 0`,
      `C${L(top)} 22 ${L(w)} 18 ${L(w)} 40`,
      `C${L(w)} 70 ${L(bot)} 80 ${L(bot)} 100`,
      `L${R(bot)} 100`,
      `C${R(bot)} 80 ${R(w)} 70 ${R(w)} 40`,
      `C${R(w)} 18 ${R(top)} 22 ${R(top)} 0Z`,
    ].join(" ");
  });
}
