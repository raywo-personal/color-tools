import {hueWrap} from "./hsl.helper";


/**
 * Calculates the complementary hue of the given hue by adding 180 degrees
 * and wrapping within the acceptable range.
 *
 * @param {number} h - The original hue to find the complement for.
 * @return {number} The complementary hue wrapped within the acceptable range.
 */
export function complement(h: number): number {
  return hueWrap(h + 180);
}


/**
 * Generates a triad of hues based on the given hue value.
 *
 * @param {number} h - The base hue value, typically in the range [0, 360).
 * @return {number[]} An array containing three hue values: the base hue,
 *                     and two hues offset by +120 and -120 degrees, respectively,
 *                     each wrapped within the valid hue range.
 */
export function triad(h: number): number[] {
  return [hueWrap(h), hueWrap(h + 120), hueWrap(h - 120)];
}


/**
 * Calculates the split-complementary colors of a given hue.
 *
 * @param {number} h - The base hue in degrees, typically within the range 0-360.
 * @param {number} [splitDeg=30] - The degree of split offset for the complementary hues.
 * @return {number[]} An array containing two split-complementary hues in degrees.
 */
export function splitComplement(h: number, splitDeg: number = 30): number[] {
  return [hueWrap(h + 180 - splitDeg), hueWrap(h + 180 + splitDeg)];
}


/**
 * Generates an array of hues starting from a specified central hue and
 * spanning across a given range of degrees.
 *
 * @param {number} h - The central hue in degrees.
 * @param {number} [rangeDeg=30] - The total range in degrees to span. Default
 *                                 is 30 degrees.
 * @param {number} [count=3] - The number of hues to generate within the range.
 *                             Must be greater than 1.
 * @return {number[]} An array of hues in degrees, evenly spaced across the
 *                    specified range.
 * @throws {Error} Throws an error if count is less than or equal to 1.
 */
export function analogRange(h: number,
                            rangeDeg: number = 30,
                            count: number = 3): number[] {
  if (count <= 1) {
    throw new Error("analogRange: count must be > 1");
  }

  const start = h - rangeDeg / 2;
  const step = rangeDeg / (count - 1);

  // Counted out, so the count is what is guaranteed - not the end point. A
  // walk from `start` upwards would compare a floating point sum against the
  // end, and on some hues `(h - 14) + 28` lands a hair above `h + 14`: the
  // last hue falls out of the range and the caller is handed fewer hues than
  // it asked for. `analogRange(h, 28, 2)` feeds two palette slots, and the
  // generator died on the second.
  return Array.from({length: count}, (_, i) => hueWrap(start + i * step));
}
