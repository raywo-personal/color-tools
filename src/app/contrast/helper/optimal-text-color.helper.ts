import chroma, {Color} from "chroma-js";

import {apcaLookup} from "@contrast/helper/apca-look-up-table.helper";
import {FontSize, FontWeight} from "@contrast/models/apca-lookup-table.model";
import {generateRange} from "@common/helpers/iterables.helper";


/**
 * Configuration for optimal text color calculation.
 */
export interface OptimalColorConfigOptions {
  /** Font size for APCA lookup (default: "16px") */
  fontSize: FontSize;
  /** Font weight for APCA lookup (default: "400") */
  fontWeight: FontWeight;
  /** Whether to include colored alternatives (default: false) */
  includeColoredAlternatives: boolean;
}

export const DEFAULT_COLOR_CONFIG: OptimalColorConfigOptions = {
  fontSize: "16px",
  fontWeight: "400",
  includeColoredAlternatives: false
};

/**
 * Result of optimal text color calculation.
 */
export interface OptimalTextColorResult {
  /** The optimal text color */
  color: Color;
  /** The APCA contrast value (can be negative) */
  contrast: number;
  /** Whether the contrast meets the APCA requirement for the given font size/weight */
  meetsRequirement: boolean;
  /** The required contrast from the lookup table (null if not readable at this size) */
  requiredContrast: number | null;
}


const WHITE = chroma("#ffffff");
const BLACK = chroma("#000000");

// Grayscale candidates for fine-tuning
const GRAYSCALE_STEPS = [
  "#000000", "#111111", "#222222", "#333333", "#444444",
  "#555555", "#666666", "#777777", "#888888", "#999999",
  "#aaaaaa", "#bbbbbb", "#cccccc", "#dddddd", "#eeeeee", "#ffffff"
];


/**
 * Calculates the APCA contrast ratio between text and background colors.
 *
 * @param textColor - The text color
 * @param bgColor - The background color
 * @returns The APCA contrast value (can be negative)
 */
export function calculateAPCAContrast(
  textColor: Color | string,
  bgColor: Color | string
): number {
  const text = typeof textColor === "string" ? chroma(textColor) : textColor;
  const bg = typeof bgColor === "string" ? chroma(bgColor) : bgColor;

  return chroma.contrastAPCA(text, bg);
}


/**
 * Checks if a text/background color combination meets APCA requirements.
 *
 * @param textColor - The text color
 * @param bgColor - The background color
 * @param fontSize - The font size
 * @param fontWeight - The font weight
 * @returns True if the combination meets APCA requirements
 */
export function meetsAPCARequirement(
  textColor: Color | string,
  bgColor: Color | string,
  fontSize: FontSize = "16px",
  fontWeight: FontWeight = "400"
): boolean {
  const contrast = calculateAPCAContrast(textColor, bgColor);
  const entry = apcaLookup[fontSize]?.[fontWeight];
  const requiredContrast = entry?.contrast;

  if (requiredContrast === null || requiredContrast === undefined) {
    return false; // Text not readable at this size/weight
  }

  return Math.abs(contrast) >= requiredContrast;
}


/**
 * Finds the optimal text color for a given background color based on
 * APCA contrast.
 *
 * The algorithm:
 * 1. Tests black and white as primary candidates
 * 2. Selects the color with the highest absolute APCA contrast
 * 3. Checks if the contrast meets the APCA requirement for the given font
 *    size/weight
 *
 * @param bgColor - The background color
 * @param config - Optional configuration
 * @returns The optimal text color result
 */
export function findOptimalTextColor(
  bgColor: Color | string,
  config?: Partial<OptimalColorConfigOptions>
): OptimalTextColorResult {
  const options: OptimalColorConfigOptions = {...DEFAULT_COLOR_CONFIG, ...config};

  const bg = typeof bgColor === "string" ? chroma(bgColor) : bgColor;
  const {fontSize, fontWeight} = options;

  // Beste Farbe aus Schwarz/Weiß wählen
  const {color: optimalColor, contrast: optimalContrast} =
    findBestContrastColorFromSteps([BLACK.hex(), WHITE.hex()], bg);

  // Anforderung aus Lookup prüfen
  const requiredContrast = apcaLookup[fontSize]?.[fontWeight]?.contrast ?? null;
  const meetsRequirement =
    requiredContrast !== null && Math.abs(optimalContrast) >= requiredContrast;

  return {
    color: optimalColor,
    contrast: optimalContrast,
    meetsRequirement,
    requiredContrast
  };
}


/**
 * Finds the optimal text color from a range of grayscale values.
 *
 * This provides more fine-grained control than just black/white,
 * useful when you want a softer contrast that still meets APCA requirements.
 *
 * @param bgColor - The background color
 * @param config - Optional configuration
 * @returns The optimal text color result
 */
export function findOptimalGrayscaleTextColor(
  bgColor: Color | string,
  config?: Partial<OptimalColorConfigOptions>
): OptimalTextColorResult {
  const options: OptimalColorConfigOptions = {...DEFAULT_COLOR_CONFIG, ...config};

  const bg = typeof bgColor === "string" ? chroma(bgColor) : bgColor;
  const {fontSize, fontWeight} = options;

  const requiredContrast = apcaLookup[fontSize]?.[fontWeight]?.contrast ?? null;

  const {color: bestColor, contrast: bestContrast} =
    findBestContrastColorFromSteps(GRAYSCALE_STEPS, bg);

  const meetsRequirement =
    requiredContrast !== null && Math.abs(bestContrast) >= requiredContrast;

  return {
    color: bestColor,
    contrast: bestContrast,
    meetsRequirement,
    requiredContrast
  };
}


/**
 * Finds the minimum contrast text color that still meets APCA requirements.
 *
 * Useful when you want a softer, less harsh contrast that still passes
 * accessibility requirements.
 *
 * @param bgColor - The background color
 * @param config - Optional configuration
 * @returns The optimal text color result, or null if no valid color found
 */
export function findMinimumContrastTextColor(
  bgColor: Color | string,
  config?: Partial<OptimalColorConfigOptions>
): OptimalTextColorResult | null {
  const options: OptimalColorConfigOptions = {...DEFAULT_COLOR_CONFIG, ...config};

  const bg = typeof bgColor === "string" ? chroma(bgColor) : bgColor;
  const {fontSize, fontWeight} = options;

  const requiredContrast = apcaLookup[fontSize]?.[fontWeight]?.contrast ?? null;

  if (requiredContrast == null) return null;

  const bestMatch =
    findMinimumContrastGray(bg, requiredContrast);

  if (!bestMatch) return findOptimalTextColor(bgColor, config);

  return {
    color: bestMatch.color,
    contrast: bestMatch.contrast,
    meetsRequirement: true,
    requiredContrast
  };
}


/**
 * Finds an optimal text color that preserves the hue of the background color.
 *
 * The algorithm:
 * 1. Extracts the hue from the background color
 * 2. Tests various lightness/saturation combinations with the same hue
 * 3. Finds a color that meets APCA requirements while staying in the same color family
 * 4. Falls back to findMinimumContrastTextColor() if no matching color is found
 *
 * @param bgColor - The background color
 * @param config - Optional configuration
 * @returns The optimal text color result
 */
export function findHarmonicTextColor(
  bgColor: Color | string,
  config?: Partial<OptimalColorConfigOptions>
): OptimalTextColorResult {
  const options: OptimalColorConfigOptions = {...DEFAULT_COLOR_CONFIG, ...config};

  const bg = typeof bgColor === "string" ? chroma(bgColor) : bgColor;
  const {fontSize, fontWeight} = options;

  const requiredContrast = apcaLookup[fontSize]?.[fontWeight]?.contrast;

  if (requiredContrast == null) return findWithFallbacks(bgColor, options);

  const [bgHue, , bgLight] = bg.hsl();
  const hue = bgHue || 0;
  const isLightBg = bgLight > 0.5;

  const saturationLevels = generateRange(0.2, 1.0, 0.1);
  const lightnessRange = isLightBg
    ? generateRange(0, bgLight - 0.1, 0.05)  // dunkler Text auf hellem BG
    : generateRange(bgLight + 0.1, 1, 0.05); // heller Text auf dunklem BG

  const bestMatch =
    findBestHarmonicColor(bg, hue, saturationLevels, lightnessRange, requiredContrast);

  if (!bestMatch) return findWithFallbacks(bgColor, options);

  return {
    color: bestMatch.color,
    contrast: bestMatch.contrast,
    meetsRequirement: true,
    requiredContrast
  };
}


/**
 * Finds the best harmonic color that meets the required contrast ratio.
 *
 * @param {Color} bg - The background color against which the contrast is
 *                     measured.
 * @param {number} hue - The hue value of the desired color.
 * @param {Iterable<number> | number[]} saturationLevels - A collection of
 *                            saturation values to evaluate.
 * @param {Iterable<number> | number[]} lightnessRange - A collection of
 *                            lightness values to evaluate.
 * @param {number} requiredContrast - The minimum absolute contrast ratio
 *                                    required between the color and the
 *                                    background.
 * @return {{color: Color, contrast: number} | null} An object containing the
 *                             best matching color and its contrast value, or
 *                             null if no match is found.
 */
function findBestHarmonicColor(
  bg: Color,
  hue: number,
  saturationLevels: Iterable<number> | number[],
  lightnessRange: Iterable<number> | number[],
  requiredContrast: number
): { color: Color; contrast: number } | null {
  let bestMatch: { color: Color; contrast: number } | null = null;

  for (const sat of saturationLevels) {
    for (const light of lightnessRange) {
      const testColor = chroma.hsl(hue, sat, light);
      const contrast = chroma.contrastAPCA(testColor, bg);

      if (Math.abs(contrast) < requiredContrast) continue;

      if (!bestMatch || Math.abs(contrast) < Math.abs(bestMatch.contrast)) {
        bestMatch = {color: testColor, contrast};
      }
    }

    if (bestMatch) break;
  }

  return bestMatch;
}


/**
 * Finds the gray color with the minimum acceptable contrast against a given
 * background color.
 *
 * @param {Color} bg - The background color to check contrast against.
 * @param {number} requiredContrast - The minimum acceptable contrast value.
 * @return {{ color: Color; contrast: number } | null} An object containing the
 *          gray color and its contrast if a suitable one is found, or null if
 *          no valid color meets the required contrast.
 */
function findMinimumContrastGray(
  bg: Color,
  requiredContrast: number
): { color: Color; contrast: number } | null {
  const isLightBg = bg.luminance() > 0.5;

  // Start bei Mittelgrau, dann Richtung Schwarz (heller BG) oder Weiß (dunkler BG)
  const endL = isLightBg ? 0 : 100;
  const lightnessValues = generateRange(50, endL, 1);

  let best: { color: Color; contrast: number } | null = null;

  for (const l of lightnessValues) {
    const testColor = chroma.hsl(0, 0, l / 100);
    const contrast = chroma.contrastAPCA(testColor, bg);
    const abs = Math.abs(contrast);

    if (abs < requiredContrast) {
      continue;
    }

    if (!best || abs < Math.abs(best.contrast)) {
      best = {color: testColor, contrast};
    }
  }

  return best;
}


/**
 * Finds the best contrast color from a list of gray shades (steps) for a given
 * background color.
 *
 * @param {string[]} graySteps - An array of gray color strings to evaluate
 *                               for contrast.
 * @param {Color} bg - The background color to compare the gray shades against.
 * @return {{ color: Color, contrast: number }} An object containing the color
 *                                              with the best contrast and the
 *                                              contrast value.
 */
function findBestContrastColorFromSteps(
  graySteps: string[],
  bg: Color
): { color: Color; contrast: number } {
  let bestColor = BLACK;
  let bestContrast = chroma.contrastAPCA(BLACK, bg);

  for (const gray of graySteps) {
    const grayColor = chroma(gray);
    const contrast = chroma.contrastAPCA(grayColor, bg);

    if (Math.abs(contrast) > Math.abs(bestContrast)) {
      bestColor = grayColor;
      bestContrast = contrast;
    }
  }

  return {color: bestColor, contrast: bestContrast};
}


function findWithFallbacks(
  bgColor: Color | string,
  options: OptimalColorConfigOptions
): OptimalTextColorResult {
  return (
    findMinimumContrastTextColor(bgColor, options) ??
    findOptimalTextColor(bgColor, options)
  );
}
