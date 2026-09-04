import {APCAContrastValue, APCALookupTable, FONT_SIZES, FONT_WEIGHTS, FontSize, FontWeight} from "@contrast/models/apca-lookup-table.model";
import {apcaLookup} from "@contrast/helper/apca-look-up-table.helper";


export type APCARating = 0 | 1 | 2 | 3;
export const APCA_RATING_LABELS = ["Not readable", "Weak", "Good", "Excellent"] as const;
export type APCARatingLabel = typeof APCA_RATING_LABELS[number];
export const APCA_POLARITIES = ["dark-on-light", "light-on-dark"] as const;
export type APCAPolarity = typeof APCA_POLARITIES[number];

export const POSITIVE_MAX_APCA_CONTRAST = 106;
export const NEGATIVE_MAX_APCA_CONTRAST = 108;

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
  lookupTable: APCALookupTable = apcaLookup
): APCARating {
  const absContrast = Math.abs(apcaContrast);
  const requiredLc = getRequiredLc(fontSize, fontWeight, lookupTable);

  if (requiredLc === null) return 0;

  return calculateRating(absContrast, requiredLc);
}


export function getAPCAPolarity(apcaContrast: number): APCAPolarity {
  return apcaContrast >= 0 ? "dark-on-light" : "light-on-dark";
}


export function getRequiredLc(fontSize: number,
                              fontWeight: FontWeight,
                              lookupTable: APCALookupTable = apcaLookup): number | null {
  const sizeKey = findClosestSizeKey(fontSize, FONT_SIZES);
  const entry = lookupTable[sizeKey][fontWeight];

  return entry.contrast;
}


/**
 * Finds the smallest font size whose requirement the given contrast satisfies
 * at a fixed font weight.
 *
 * This is the answer to "the pair fails, what would make it pass": the first
 * row of the weight's column that the contrast clears. The column is scanned in
 * full rather than up to the first miss - a cell without a value is a gap in
 * the table, not its end, and the requirements do not fall in step across a
 * column.
 *
 * `requiresBold` and `requires15pt` are ignored, as everywhere else in this
 * app: at weight 400 every size from 14px to 36px carries one of them, so
 * honouring them would push every answer past 42px and make the value useless.
 *
 * @param {number} apcaContrast - The APCA contrast value (positive or negative)
 * @param {FontWeight} fontWeight - The weight the size is looked up for
 * @param {APCALookupTable} lookupTable - The APCA lookup table
 * @return {FontSize | null} The smallest passing size, or null where no size
 *                           passes at this weight
 */
export function smallestPassingFontSize(
  apcaContrast: number,
  fontWeight: FontWeight,
  lookupTable: APCALookupTable = apcaLookup
): FontSize | null {
  const absContrast = Math.abs(apcaContrast);
  const passing = FONT_SIZES
    .filter(size => passesRequirement(absContrast, lookupTable[size][fontWeight]));

  return smallestByNumber(passing);
}


/**
 * Finds the lightest font weight whose requirement the given contrast satisfies
 * at a fixed font size.
 *
 * The row counterpart to {@link smallestPassingFontSize}, and the one that
 * comes back empty far more often: at 16px the lowest requirement in the whole
 * row is 60, and at 12px every cell is null, so a contrast the size cannot
 * carry leaves no weight to name.
 *
 * @param {number} apcaContrast - The APCA contrast value (positive or negative)
 * @param {FontSize} fontSize - The size the weight is looked up for
 * @param {APCALookupTable} lookupTable - The APCA lookup table
 * @return {FontWeight | null} The lightest passing weight, or null where no
 *                             weight passes at this size
 */
export function lightestPassingFontWeight(
  apcaContrast: number,
  fontSize: FontSize,
  lookupTable: APCALookupTable = apcaLookup
): FontWeight | null {
  const absContrast = Math.abs(apcaContrast);
  const row = lookupTable[fontSize];
  const passing = FONT_WEIGHTS
    .filter(weight => passesRequirement(absContrast, row[weight]));

  return smallestByNumber(passing);
}


export function getAPCARatingLabel(rating: APCARating): APCARatingLabel {
  if (!isAPCARating(rating)) {
    throw new Error(`Invalid APCA rating: ${rating}`);
  }

  return APCA_RATING_LABELS[rating];
}


function isAPCARating(value: number): value is APCARating {
  return Number.isInteger(value) && value >= 0 && value <= 3;
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
  if (requiredContrast === 0) return 0;

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
export function findClosestSizeKey(fontSize: number,
                            availableSizeKeys: readonly FontSize[]): FontSize {
  if (availableSizeKeys.length === 0) {
    throw new Error("No available font sizes given");
  }

  const numericSizes = availableSizeKeys
    .map(key => parseInt(key, 10))
    .sort((a, b) => a - b);

  const closestSize = findClosestSize(fontSize, numericSizes);

  return `${closestSize}px` as FontSize;
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

  const nextLargerIndex = availableSizes.findIndex(size => size >= fontSize);

  return availableSizes[nextLargerIndex];
}


/**
 * Whether an absolute contrast satisfies a single cell of the lookup table.
 *
 * @param {number} absContrast - The absolute APCA contrast value
 * @param {APCAContrastValue} entry - The cell to test against
 * @return {boolean} True where the cell asks for a value and the contrast
 *                   reaches it
 */
function passesRequirement(absContrast: number,
                           entry: APCAContrastValue): boolean {
  return entry.contrast !== null && absContrast >= entry.contrast;
}


/**
 * Picks the numerically smallest of a list of table keys.
 *
 * The keys are strings - "12px", "400" - so their declaration order is what a
 * caller would otherwise have to trust. Reading the number keeps the answer
 * right if the constants are ever reordered, the same reason
 * findClosestSizeKey() sorts rather than indexing.
 *
 * @param {readonly T[]} keys - The keys to choose from
 * @return {T | null} The smallest key, or null where the list is empty
 */
function smallestByNumber<T extends string>(keys: readonly T[]): T | null {
  return keys.reduce<T | null>(
    (smallest, key) =>
      smallest === null || parseInt(key, 10) < parseInt(smallest, 10)
        ? key
        : smallest,
    null
  );
}
