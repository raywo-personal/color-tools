export const FONT_SIZES = [
  "12px", "14px", "15px", "16px", "18px", "21px", "24px", "28px",
  "32px", "36px", "42px", "48px", "60px", "72px", "96px"
] as const;

export type FontSize = typeof FONT_SIZES[number];

export const FONT_WEIGHTS = [
  "100", "200", "300", "400", "500", "600", "700", "800", "900"
] as const;

export type FontWeight = typeof FONT_WEIGHTS[number];

/**
 * One cell of the lookup table: the Lc a pair has to reach at that size and
 * weight, or `null` where no Lc carries text there.
 *
 * The Lc is the whole cell. An advisory field - "needs bold", "add Lc 15 for
 * body copy" - goes in only together with the code that acts on it. Unread it
 * states a requirement every caller then contradicts, and a verdict names the
 * cells it would mark as the size and weight that carry the element.
 */
export interface APCAContrastValue {
  contrast: number | null;
}

export type APCAContrastValueForWeight = Record<FontWeight, APCAContrastValue>;
export type APCALookupTable = Record<FontSize, APCAContrastValueForWeight>;
