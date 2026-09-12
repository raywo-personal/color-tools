/**
 * Generates a range of numbers from `start` to `end`, incrementing or
 * decrementing by `step`.
 *
 * @param {number} start - The starting value of the range.
 * @param {number} end - The ending value of the range.
 * @param {number} step - The step value for incrementing or decrementing. Must
 *                        be greater than 0.
 * @throws {Error} Throws an error if `step` is less than or equal to 0.
 * @return {Iterable<number>} A generator that yields the numbers in the range.
 */
export function* generateRange(
  start: number,
  end: number,
  step: number
): Iterable<number> {
  if (step <= 0) {
    throw new Error("generateRange: step must be > 0");
  }

  const delta = step * (start < end ? 1 : -1);
  const steps = stepCount(start, end, step);

  for (let i = 0; i <= steps; i++) {
    yield round2(start + i * delta);
  }
}


/** Units in the last place the step count tolerates. */
const FLOAT_SLACK = 8 * Number.EPSILON;


/**
 * How many whole steps of `step` fit between `start` and `end`.
 *
 * Counting the steps up front is what makes the walk exact. Adding `step` to a
 * running value drifts, and comparing that running value against `end` drops
 * the end point once the drift passes it: the harmonic text search walked
 * 0.12 to 0.92 in hundredths and stopped at 0.91, so the lightest colour it
 * was allowed to offer was never measured, and where only that one passed the
 * search reported nothing and the text fell back to gray.
 *
 * The span and the division round too, so the tolerance covers that and
 * nothing wider. It scales with the ratio because so does the error, and it
 * stays far below one step at every size - a span that genuinely falls short
 * of the next step still does.
 */
function stepCount(start: number, end: number, step: number): number {
  const ratio = Math.abs(end - start) / step;

  return Math.floor(ratio + Math.max(ratio, 1) * FLOAT_SLACK);
}


/**
 * Generates an array of numbers within a specified range.
 *
 * @param {number} start - The starting number of the range.
 * @param {number} end - The ending number of the range.
 * @param {number} step - The step value to increment or decrement between
 *                        numbers in the range.
 * @return {number[]} An array containing numbers within the specified range.
 */
export function rangeToArray(
  start: number,
  end: number,
  step: number
): number[] {
  return Array.from(generateRange(start, end, step));
}


/**
 * Rounds a given number to two decimal places.
 *
 * @param {number} value - The number to be rounded to two decimal places.
 * @return {number} The number rounded to two decimal places.
 */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
