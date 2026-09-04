import chroma, {Color} from "chroma-js";

import {apcaLookup} from "@contrast/helper/apca-look-up-table.helper";
import {FontSize, FontWeight} from "@contrast/models/apca-lookup-table.model";
import {generateRange} from "@common/helpers/iterables.helper";


/**
 * An array of predefined mode constants used to specify different operational states or configurations.
 */
export const MODES = ["optimal", "minimum", "harmonic", "grayscale"] as const;
export type Mode = typeof MODES[number];

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
  color: Color | null;

  /** The APCA contrast value (can be negative) */
  contrast: number;

  /** Whether the contrast meets the APCA requirement for the given font size/weight */
  meetsRequirement: boolean;

  /** The required contrast from the lookup table (null if not readable at this size) */
  requiredContrast: number | null;

  /**
   * Represents the currently applied mode of operation or configuration.
   */
  appliedMode: Mode;
}

/**
 * A result that carries a color. Only `findTextColor()` and the optimal finder
 * can promise one - every other search can come up empty.
 */
export type GuaranteedOptimalTextColorResult =
  Omit<OptimalTextColorResult, "color"> & {
  color: Color;
};

/** The shape every mode's search shares, so `findTextColor()` can dispatch. */
export type TextColorFinder = (bgColor: Color | string, config?: Partial<OptimalColorConfigOptions>) => OptimalTextColorResult


const WHITE = chroma("#ffffff");
const BLACK = chroma("#000000");


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
  return chroma.contrastAPCA(toColor(textColor), toColor(bgColor));
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

  if (requiredContrast === null) {
    return false; // Text not readable at this size/weight
  }

  return Math.abs(contrast) >= requiredContrast;
}


/**
 * Runs the search for `mode` and answers with a color in every case.
 *
 * Where the mode's own scale holds nothing that meets the requirement, the
 * optimal finder answers instead and `appliedMode` names it. Reporting that is
 * the point: a caller who asked for `minimum`, got white and was not told would
 * describe the answer as the softest color that still passes, when it is the
 * hardest one and it fails.
 *
 * `contrast`, `requiredContrast` and `meetsRequirement` all describe the color
 * that comes back, never the search that failed - a search without a match has
 * no color and no contrast, so numbers taken from it would report a pair that
 * was never handed over.
 *
 * @param bgColor - The background color the text will sit on
 * @param mode - The character of the answer to look for
 * @param config - Font size and weight; the lookup row depends on them
 * @returns A result whose color is never null
 */
export function findTextColor(bgColor: Color | string,
                              mode: Mode,
                              config?: Partial<OptimalColorConfigOptions>): GuaranteedOptimalTextColorResult {
  const finders: Record<Mode, TextColorFinder> = {
    optimal: findOptimalTextColor,
    minimum: findMinimumContrastTextColor,
    harmonic: findHarmonicTextColor,
    grayscale: findOptimalGrayscaleTextColor,
  } as const;

  const foundResult = finders[mode](toColor(bgColor), config);
  const optimalResult = foundResult.meetsRequirement ? foundResult : finders.optimal(toColor(bgColor), config);
  const appliedMode: Mode = foundResult.meetsRequirement ? foundResult.appliedMode : optimalResult.appliedMode;
  const color = optimalResult.color!;

  return {
    color,
    contrast: optimalResult.contrast,
    requiredContrast: optimalResult.requiredContrast,
    meetsRequirement: optimalResult.meetsRequirement,
    appliedMode
  };
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
): GuaranteedOptimalTextColorResult {
  const options: OptimalColorConfigOptions = {...DEFAULT_COLOR_CONFIG, ...config};

  const bg = toColor(bgColor);
  const {fontSize, fontWeight} = options;

  // Pick the better of black and white
  const bestMatch = findBestContrastColorFromBW(bg);

  // Check it against the lookup row
  const requiredContrast = getRequiredContrast(fontSize, fontWeight);
  const meetsRequirement = requiredContrast === null ? false : Math.abs(bestMatch.contrast) >= requiredContrast;

  return {
    color: bestMatch.color,
    contrast: bestMatch.contrast,
    meetsRequirement,
    requiredContrast,
    appliedMode: "optimal"
  };
}


/**
 * Finds the optimal text color on a gray scale.
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

  const bg = toColor(bgColor);
  const {fontSize, fontWeight} = options;

  const requiredContrast = getRequiredContrast(fontSize, fontWeight);
  const bestMatch = findBestContrastColorFromGrays(bg, requiredContrast);

  const meetsRequirement =
    requiredContrast !== null && Math.abs(bestMatch.contrast) >= requiredContrast;

  return {
    ...createResult("grayscale", requiredContrast, bestMatch),
    meetsRequirement
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
 * @returns The optimal text color result (color may be null if no valid color
 *          was found)
 */
export function findMinimumContrastTextColor(
  bgColor: Color | string,
  config?: Partial<OptimalColorConfigOptions>
): OptimalTextColorResult {
  const options: OptimalColorConfigOptions = {...DEFAULT_COLOR_CONFIG, ...config};
  const bg = toColor(bgColor);
  const {fontSize, fontWeight} = options;

  const requiredContrast = getRequiredContrast(fontSize, fontWeight);

  if (requiredContrast == null) return createResult("minimum", null);

  const bestMatch =
    findMinimumContrastGray(bg, requiredContrast);

  return createResult("minimum", requiredContrast, bestMatch);
}


/**
 * Finds an optimal text color that preserves the hue of the background color.
 *
 * The algorithm:
 * 1. Extracts the hue from the background color
 * 2. Tests various lightness/saturation combinations with the same hue
 * 3. Finds a color that meets APCA requirements while staying in the same color family
 * 4. Comes back without a color where nothing on that hue passes -
 *    findTextColor() is what falls back
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

  const bg = toColor(bgColor);
  const {fontSize, fontWeight} = options;

  const requiredContrast = getRequiredContrast(fontSize, fontWeight);

  if (requiredContrast == null) return createResult("harmonic", null);

  const [bgHue, , bgLight] = bg.hsl();
  const hue = bgHue || 0;
  const isLightBg = bgLight > 0.5;

  const saturationLevels = generateRange(0.2, 1.0, 0.1);
  const lightnessRange = isLightBg
    ? generateRange(0, bgLight - 0.1, 0.05)  // dark text on a light background
    : generateRange(bgLight + 0.1, 1, 0.05); // light text on a dark background

  const bestMatch =
    findBestHarmonicColor(bg, hue, saturationLevels, lightnessRange, requiredContrast);

  return createResult("harmonic", requiredContrast, bestMatch);
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
  const endL = isLightColor(bg) ? 0 : 100;
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


function findBestContrastColorFromBW(bg: Color): { color: Color; contrast: number } {
  const color = isLightColor(bg) ? BLACK : WHITE;

  return {
    color,
    contrast: chroma.contrastAPCA(color, bg)
  };
}


function findBestContrastColorFromGrays(bg: Color, requiredContrast: number | null): { color: Color; contrast: number } {
  const bgIsLightColor = isLightColor(bg);

  if (!requiredContrast) {
    const color = bgIsLightColor ? BLACK : WHITE;

    return {
      color,
      contrast: chroma.contrastAPCA(color, bg)
    };
  }

  const start = bgIsLightColor ? 1 : 0;
  const direction = bgIsLightColor ? -1 : 1;

  let bestColor = bgIsLightColor ? WHITE : BLACK;
  let bestContrast = chroma.contrastAPCA(bestColor, bg);

  for (let i = 0; i <= 100; i++) {
    const lightness = start + (i / 100) * direction;
    const grayColor = chroma.hsl(0, 0, lightness);
    const contrast = chroma.contrastAPCA(grayColor, bg);

    if (Math.abs(contrast) >= Math.abs(requiredContrast)) {
      return {color: grayColor, contrast};
    }

    if (Math.abs(contrast) > Math.abs(bestContrast)) {
      bestColor = grayColor;
      bestContrast = contrast;
    }
  }

  return {color: bestColor, contrast: bestContrast};
}

/** Accepts either spelling of a color and hands back a chroma `Color`. */
function toColor(color: Color | string): Color {
  return typeof color === "string" ? chroma(color) : color;
}


function isLightColor(color: Color): boolean {
  return Math.abs(chroma.contrastAPCA(WHITE, color)) <= Math.abs(chroma.contrastAPCA(BLACK, color));
}


/**
 * The APCA contrast the lookup table asks for at a size and weight.
 *
 * @param fontSize - The font size to look up
 * @param fontWeight - The font weight to look up
 * @returns The required contrast, or null where no text is readable at all
 */
function getRequiredContrast(
  fontSize: FontSize,
  fontWeight: FontWeight
): number | null {
  return apcaLookup[fontSize]?.[fontWeight]?.contrast ?? null;
}


/**
 * Builds a result from a search that may have found nothing.
 *
 * Where there is no match there is no color and no contrast, so both come back
 * empty rather than as a guess; `findTextColor()` is what turns that into an
 * answer. `meetsRequirement` therefore means "a match was found", which is the
 * same thing for a search that only keeps candidates clearing the requirement.
 * A finder that always yields its best candidate - the grayscale one - has to
 * override it.
 *
 * @param appliedMode - The mode that produced the match
 * @param requiredContrast - The lookup row's requirement, null where unreadable
 * @param match - The search result, absent or null where nothing was found
 * @returns The assembled result
 */
function createResult(
  appliedMode: Mode,
  requiredContrast: number | null,
  match?: { color: Color; contrast: number } | null
): OptimalTextColorResult {
  return {
    color: match?.color ?? null,
    contrast: match?.contrast ?? 0,
    meetsRequirement: requiredContrast !== null && !!match,
    requiredContrast,
    appliedMode
  };
}
