import {randomBetween} from '@common/helpers/random.helper';


/**
 * Generates a symmetrical variation of a given number by adding or
 * subtracting a random value within the specified amount.
 *
 * @param {number} x - The base number to be varied.
 * @param {number} amount - The maximum value for the symmetrical variation.
 * @return {number} A randomly varied number within the range
 *                  [x - amount, x + amount].
 */
export function vary(x: number, amount: number): number {
  return x + randomBetween(-amount, amount);
}
