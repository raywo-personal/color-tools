import chroma, {Color} from "chroma-js";

import {apcaLookup} from "@contrast/helper/apca-look-up-table.helper";
import {FontSize, FontWeight} from "@contrast/models/apca-lookup-table.model";


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
 * Finds the optimal text color for a given background color based on APCA contrast.
 *
 * The algorithm:
 * 1. Tests black and white as primary candidates
 * 2. Selects the color with the highest absolute APCA contrast
 * 3. Checks if the contrast meets the APCA requirement for the given font size/weight
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
  const fontSize = options.fontSize;
  const fontWeight = options.fontWeight;

  // Calculate APCA contrast for black and white
  const contrastWhite = chroma.contrastAPCA(WHITE, bg);
  const contrastBlack = chroma.contrastAPCA(BLACK, bg);

  // Select the color with higher absolute contrast
  const useWhite = Math.abs(contrastWhite) > Math.abs(contrastBlack);
  const optimalColor = useWhite ? WHITE : BLACK;
  const optimalContrast = useWhite ? contrastWhite : contrastBlack;

  // Get required contrast from lookup table
  const entry = apcaLookup[fontSize]?.[fontWeight];
  const requiredContrast = entry?.contrast ?? null;
  const meetsRequirement = requiredContrast !== null &&
    Math.abs(optimalContrast) >= requiredContrast;

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
  const fontSize = options.fontSize;
  const fontWeight = options.fontWeight;

  // Get required contrast from lookup table
  const entry = apcaLookup[fontSize]?.[fontWeight];
  const requiredContrast = entry?.contrast ?? null;

  let bestColor = BLACK;
  let bestContrast = chroma.contrastAPCA(BLACK, bg);

  // Test all grayscale candidates
  for (const gray of GRAYSCALE_STEPS) {
    const grayColor = chroma(gray);
    const contrast = chroma.contrastAPCA(grayColor, bg);

    if (Math.abs(contrast) > Math.abs(bestContrast)) {
      bestColor = grayColor;
      bestContrast = contrast;
    }
  }

  const meetsRequirement = requiredContrast !== null &&
    Math.abs(bestContrast) >= requiredContrast;

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
  const fontSize = options.fontSize;
  const fontWeight = options.fontWeight;

  // Get required contrast from lookup table
  const entry = apcaLookup[fontSize]?.[fontWeight];
  const requiredContrast = entry?.contrast;

  if (requiredContrast === null || requiredContrast === undefined) {
    return null; // Text not readable at this size/weight
  }

  // Determine direction based on background luminance
  const bgLuminance = bg.luminance();
  const isLightBg = bgLuminance > 0.5;

  // Start from middle gray and move toward black (light bg) or white (dark bg)
  const startL = 50;
  const endL = isLightBg ? 0 : 100;
  const step = isLightBg ? -1 : 1;

  let bestColor: Color | null = null;
  let bestContrast = 0;

  for (let l = startL; isLightBg ? l >= endL : l <= endL; l += step) {
    const testColor = chroma.hsl(0, 0, l / 100);
    const contrast = chroma.contrastAPCA(testColor, bg);

    if (Math.abs(contrast) >= requiredContrast) {
      if (bestColor === null || Math.abs(contrast) < Math.abs(bestContrast)) {
        bestColor = testColor;
        bestContrast = contrast;
      }
    }
  }

  if (bestColor === null) {
    // Fallback to maximum contrast if minimum not found
    return findOptimalTextColor(bgColor, config);
  }

  return {
    color: bestColor,
    contrast: bestContrast,
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
  const fontSize = options.fontSize;
  const fontWeight = options.fontWeight;

  // Get required contrast from lookup table
  const entry = apcaLookup[fontSize]?.[fontWeight];
  const requiredContrast = entry?.contrast;

  if (requiredContrast === null || requiredContrast === undefined) {
    // Fall back to grayscale if text not readable at this size/weight
    return findMinimumContrastTextColor(bgColor, options) ??
      findOptimalTextColor(bgColor, options);
  }

  // Extract HSL from background
  const [bgHue, , bgLight] = bg.hsl();
  const hue = bgHue || 0; // Handle achromatic colors (NaN hue)

  // Determine search direction based on background lightness
  const isLightBg = bgLight > 0.5;

  // Search for a color with the same hue that meets contrast requirements
  // Try different saturation levels (from full saturation to lower)
  const saturationLevels = [1.0, 0.8, 0.6, 0.4, 0.3, 0.2];
  const lightnessRange = isLightBg
    ? generateRange(0, bgLight - 0.1, 0.05)  // Dark text on light bg
    : generateRange(bgLight + 0.1, 1, 0.05); // Light text on dark bg

  let bestMatch: { color: Color; contrast: number } | null = null;

  for (const sat of saturationLevels) {
    for (const light of lightnessRange) {
      const testColor = chroma.hsl(hue, sat, light);
      const contrast = chroma.contrastAPCA(testColor, bg);

      if (Math.abs(contrast) >= requiredContrast) {
        // Found a valid color - prefer the one closest to meeting the requirement
        // (minimum sufficient contrast for a softer look)
        if (bestMatch === null || Math.abs(contrast) < Math.abs(bestMatch.contrast)) {
          bestMatch = {color: testColor, contrast};
        }
      }
    }

    // If we found a match at this saturation level, use it
    if (bestMatch !== null) {
      break;
    }
  }

  // If no harmonic color found, fall back to minimum contrast grayscale
  if (bestMatch === null) {
    const fallback = findMinimumContrastTextColor(bgColor, options);
    if (fallback) {
      return fallback;
    }
    // Ultimate fallback to black/white
    return findOptimalTextColor(bgColor, options);
  }

  return {
    color: bestMatch.color,
    contrast: bestMatch.contrast,
    meetsRequirement: true,
    requiredContrast
  };
}


/**
 * Generates an array of numbers from start to end with the given step.
 */
function generateRange(start: number, end: number, step: number): number[] {
  const result: number[] = [];
  const ascending = start < end;

  for (let i = start; ascending ? i <= end : i >= end; i += ascending ? step : -step) {
    result.push(Math.round(i * 100) / 100); // Round to avoid floating point issues
  }

  return result;
}


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
