import {APCAContrastValue, APCALookupTable, FONT_SIZES, FONT_WEIGHTS, FontSize, FontWeight} from "@engine/contrast/apca-lookup-table.model";
import {apcaLookup} from "@engine/contrast/apca-look-up-table.helper";


export type APCARating = 0 | 1 | 2 | 3;
export const APCA_RATING_LABELS = ["Not readable", "Weak", "Good", "Excellent"] as const;
export type APCARatingLabel = typeof APCA_RATING_LABELS[number];
export const APCA_POLARITIES = ["dark-on-light", "light-on-dark"] as const;
export type APCAPolarity = typeof APCA_POLARITIES[number];

export const POSITIVE_MAX_APCA_CONTRAST = 106;
export const NEGATIVE_MAX_APCA_CONTRAST = 108;

/**
 * Whether a piece of text is a column of body copy or spot text - the
 * distinction the table's body-text footnote turns on.
 *
 * The original's third case, non-text, is not one of these: the cells it names
 * are already `null` in `apcaLookup`, so there is nothing to look up and
 * nothing to classify. Spot text is the original's own list - a copyright
 * line, a placeholder, a disabled label - text nobody reads fluently.
 */
export const TEXT_KINDS = ["bodyCopy", "spotText"] as const;

export type TextKind = typeof TEXT_KINDS[number];

/**
 * The Lc a column of body copy has to reach, whatever its row asks of its size
 * and weight.
 *
 * **A floor, not the footnote's arithmetic.** The original asks for Lc 15 on
 * top of any requirement under Lc 70. Added cell by cell that lifts the 60s to
 * 75 and leaves the 70s where they are, and six of the nine weight columns
 * then *rise* as the size grows - at weight 400, 21px asks 70 and 24px asks
 * 75. `verdictState()` calls a pairing that misses its own row and clears
 * another `largeOnly` without comparing the two sizes, so a paragraph set at
 * 22px would be told it would pass at 21px, smaller than it already is.
 *
 * A floor is the footnote's own answer where the cell asks 60, and stricter
 * than it everywhere else bar one: 18px/700 asks 55, which the addition takes
 * to 70 and the floor takes to 75, and the 70 cells the addition leaves alone
 * the floor lifts as well. The one cell it is softer on is 32px/300, where 65
 * plus the addition would ask 80. And it keeps every column falling, which is
 * what the verdict states rest on. Do not turn it back into `+15`.
 *
 * Not a per-cell field either: `APCAContrastValue` says why the Lc is the
 * whole cell.
 */
export const BODY_COPY_MIN_LC = 75;

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
 * @param fontSizeKey - The row to rate against, a table key such as "16px"
 * @param fontWeight - The font weight (100-900)
 * @param textKind - Whether the text is a column of body copy or spot text
 * @param lookupTable - The APCA lookup table
 * @returns Rating from 0-3
 */
export function getAPCARating(
  apcaContrast: number,
  fontSizeKey: FontSize,
  fontWeight: FontWeight,
  textKind: TextKind,
  lookupTable: APCALookupTable = apcaLookup
): APCARating {
  const absContrast = Math.abs(apcaContrast);
  const requiredLc = getRequiredLc(fontSizeKey, fontWeight, textKind, lookupTable);

  if (requiredLc === null) return 0;

  return calculateRating(absContrast, requiredLc);
}


export function getAPCAPolarity(apcaContrast: number): APCAPolarity {
  return apcaContrast >= 0 ? "dark-on-light" : "light-on-dark";
}


/**
 * The Lc a size and weight has to reach, with the body-copy floor applied
 * where the text is a column of it.
 *
 * **The one place the floor is applied.** The marks beside the preview, the
 * page's tally, the "would pass at" rows and both MCP tools reach the
 * requirement through this function and through the two searches below, which
 * apply it the same way - a caller that read `apcaLookup` itself would be a
 * second answer about the same element, and the advice would contradict the
 * mark above it.
 *
 * @param fontSizeKey - The row to read, a table key such as "16px"
 * @param fontWeight - The font weight (100-900)
 * @param textKind - Whether the text is a column of body copy or spot text
 * @param lookupTable - The APCA lookup table
 * @returns The required Lc, or null where the cell carries no text at all
 */
export function getRequiredLc(fontSizeKey: FontSize,
                              fontWeight: FontWeight,
                              textKind: TextKind,
                              lookupTable: APCALookupTable = apcaLookup): number | null {
  return requiredLcOf(lookupTable[fontSizeKey][fontWeight], textKind);
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
 * @param {number} apcaContrast - The APCA contrast value (positive or negative)
 * @param {FontWeight} fontWeight - The weight the size is looked up for
 * @param {TextKind} textKind - Whether the text is a column of body copy or
 *                              spot text
 * @param {APCALookupTable} lookupTable - The APCA lookup table
 * @return {FontSize | null} The smallest passing size, or null where no size
 *                           passes at this weight
 */
export function smallestPassingFontSize(
  apcaContrast: number,
  fontWeight: FontWeight,
  textKind: TextKind,
  lookupTable: APCALookupTable = apcaLookup
): FontSize | null {
  const absContrast = Math.abs(apcaContrast);
  const passing = FONT_SIZES
    .filter(size => passesRequirement(absContrast, lookupTable[size][fontWeight], textKind));

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
 * @param {TextKind} textKind - Whether the text is a column of body copy or
 *                              spot text
 * @param {APCALookupTable} lookupTable - The APCA lookup table
 * @return {FontWeight | null} The lightest passing weight, or null where no
 *                             weight passes at this size
 */
export function lightestPassingFontWeight(
  apcaContrast: number,
  fontSize: FontSize,
  textKind: TextKind,
  lookupTable: APCALookupTable = apcaLookup
): FontWeight | null {
  const absContrast = Math.abs(apcaContrast);
  const row = lookupTable[fontSize];
  const passing = FONT_WEIGHTS
    .filter(weight => passesRequirement(absContrast, row[weight], textKind));

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
                                   availableSizeKeys: readonly FontSize[] = FONT_SIZES): FontSize {
  if (availableSizeKeys.length === 0) {
    throw new Error("No available font sizes given");
  }

  if (!Number.isFinite(fontSize)) {
    throw new Error("Invalid font size. Font size must be a number.");
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
 * What a single cell asks of a piece of text: its own Lc, lifted to
 * `BODY_COPY_MIN_LC` where the text is a column of body copy.
 *
 * A `null` cell stays null. The floor is a stricter requirement, not a
 * readable one - a cell the original writes as "prohibited" or "non text"
 * carries no body copy either, and answering with 75 there would offer a size
 * the table has already ruled out.
 *
 * @param {APCAContrastValue} entry - The cell to read
 * @param {TextKind} textKind - Whether the text is a column of body copy or
 *                              spot text
 * @return {number | null} The Lc the text has to reach, or null where the cell
 *                         carries no text
 */
function requiredLcOf(entry: APCAContrastValue, textKind: TextKind): number | null {
  const {contrast} = entry;

  if (contrast === null) return null;

  return textKind === "bodyCopy" ? Math.max(contrast, BODY_COPY_MIN_LC) : contrast;
}


/**
 * Whether an absolute contrast satisfies a single cell of the lookup table.
 *
 * @param {number} absContrast - The absolute APCA contrast value
 * @param {APCAContrastValue} entry - The cell to test against
 * @param {TextKind} textKind - Whether the text is a column of body copy or
 *                              spot text
 * @return {boolean} True where the cell asks for a value and the contrast
 *                   reaches it
 */
function passesRequirement(absContrast: number,
                           entry: APCAContrastValue,
                           textKind: TextKind): boolean {
  const required = requiredLcOf(entry, textKind);

  return required !== null && absContrast >= required;
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
