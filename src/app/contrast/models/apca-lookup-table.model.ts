export const FONT_SIZES = [
  "12px", "14px", "15px", "16px", "18px", "21px", "24px", "28px",
  "32px", "36px", "42px", "48px", "60px", "72px", "96px"
];

export type FontSize = typeof FONT_SIZES[number];

export const FONT_WEIGHTS = [
  "100", "200", "300", "400", "500", "600", "700", "800", "900"
] as const;

export type FontWeight = typeof FONT_WEIGHTS[number];

export interface APCAContrastValue {
  contrast: number | null;
  requiresBold?: boolean;
  requires15pt?: boolean;
}

export type APCAContrastValueForWeight = Record<FontWeight, APCAContrastValue>;
export type APCALookupTable = Record<FontSize, APCAContrastValueForWeight>;
