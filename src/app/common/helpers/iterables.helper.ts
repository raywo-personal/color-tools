/**
 * Iterable/Generator-Helfer
 */

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

  if (start === end) {
    yield round2(start);
    return;
  }

  const direction = start < end ? 1 : -1;
  const delta = step * direction;

  for (
    let value = start;
    direction > 0 ? value <= end : value >= end;
    value += delta
  ) {
    yield round2(value);
  }
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
