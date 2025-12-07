import {APCALookupTable, FONT_SIZES, FontSize, FontWeight} from "@contrast/models/apca-lookup-table.model";


export type APCARating = 0 | 1 | 2 | 3;


/**
 * Calculates the APCA contrast rating based on font size, font weight, and
 * contrast value.
 *
 * The calculation is based on the APCA lookup table, which provides the
 * required contrast value for a given font size and weight. The rating is
 * calculated based on the absolute value of the contrast ratio, which is
 * always positive.
 *
 * Rating scale:
 * - 0: Not readable (< 70% of required contrast or null in lookup table)
 * - 1: Weak (70-100% of required contrast)
 * - 2: Good (100-130% of required contrast)
 * - 3: Excellent (> 130% of required contrast)
 *
 * @param apcaContrast - The APCA contrast value (positive or negative)
 * @param fontSize - The font size in pixels
 * @param fontWeight - The font weight (100-900)
 * @param lookupTable - The APCA lookup table
 * @returns Rating from 0-3
 */
export function getAPCARating(
  apcaContrast: number,
  fontSize: number,
  fontWeight: FontWeight,
  lookupTable: APCALookupTable
): APCARating {
  const absContrast = Math.abs(apcaContrast);
  const sizeKey = findClosestSizeKey(fontSize, FONT_SIZES);
  const entry = lookupTable[sizeKey][fontWeight];

  if (entry.contrast === null) return 0;

  return calculateRating(absContrast, entry.contrast);
}


/**
 * Calculates the APCA (Accessible Perceptual Contrast Algorithm) rating based
 * on the given absolute contrast value and required contrast value.
 *
 * @param {number} absContrast - The absolute contrast value of the text or
 *                               element being evaluated.
 * @param {number} requiredContrast - The required contrast value to be
 *                                    compared against.
 * @return {number} The calculated APCA rating:
 *  - 0 indicates the contrast is significantly below the required threshold.
 *  - 1 indicates the contrast is below the required threshold.
 *  - 2 indicates the contrast is close to or slightly above the required threshold.
 *  - 3 indicates the contrast well exceeds the required threshold.
 */
function calculateRating(absContrast: number, requiredContrast: number): APCARating {
  if (absContrast < requiredContrast * 0.7) return 0;
  if (absContrast < requiredContrast) return 1;
  if (absContrast < requiredContrast * 1.3) return 2;

  return 3;
}


/**
 * Finds the closest size key from a list of available font size keys
 * based on the given font size.
 *
 * @param {number} fontSize - The desired font size to match.
 * @param {FontSize[]} availableSizeKeys - A list of available font size keys
 *                                         represented as strings (e.g.,
 *                                         ["12px", "14px", "16px"]).
 * @return {FontSize} The closest matching size key as a string (e.g., "14px").
 * @throws {Error} If the list of available size keys is empty.
 */
function findClosestSizeKey(fontSize: number,
                            availableSizeKeys: FontSize[]): FontSize {
  if (availableSizeKeys.length === 0) {
    throw new Error("No available font sizes given");
  }

  const numericSizes = availableSizeKeys
    .map(key => parseInt(key, 10))
    .sort((a, b) => a - b);

  const closestSize = findClosestSize(fontSize, numericSizes);

  return `${closestSize}px`;
}


/**
 * Finds the closest available font size from the lookup table.
 * For values between two sizes, it chooses the larger size (more
 * conservative approach).
 *
 * @param fontSize - The target font size in pixels
 * @param availableSizes - Array of available font sizes sorted in
 *                         ascending order
 * @returns The closest available font size
 */
function findClosestSize(fontSize: number, availableSizes: number[]): number {
  if (availableSizes.length === 0) {
    throw new Error("No available font sizes given");
  }

  const first = availableSizes[0];
  const last = availableSizes[availableSizes.length - 1];

  if (fontSize <= first) return first;
  if (fontSize >= last) return last;

  const nextLargerIndex = availableSizes.findIndex(size => size > fontSize);

  return availableSizes[nextLargerIndex];
}
