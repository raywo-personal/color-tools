/**
 * One field of a packed value: what it holds and how many bits it takes.
 */
export interface BitField {

  readonly value: number;
  readonly bits: number;

}


/**
 * The base62 characters it takes to spell any value of the given width.
 *
 * Counted on bigints rather than through a logarithm: at a few hundred bits a
 * floating-point quotient can land on the wrong side of a whole number, and a
 * length one short drops the leading field.
 *
 * @param {number} bits - The width of the packed value.
 * @return {number} The number of base62 characters.
 */
export function base62LengthFor(bits: number): number {
  const limit = 1n << BigInt(bits);
  let length = 0;

  for (let reach = 1n; reach < limit; reach *= 62n) length++;

  return length;
}


/**
 * Packs the fields into one value, the first field in the highest bits.
 *
 * @param {readonly BitField[]} fields - The fields in reading order.
 * @return {bigint} The packed value, below `2 ** totalBits(fields)`.
 * @throws {Error} If a value is not an integer its field can hold.
 */
export function packBits(fields: readonly BitField[]): bigint {
  let packed = 0n;

  for (const {value, bits} of fields) {
    if (!Number.isInteger(value) || value < 0 || value >= 2 ** bits) {
      throw new Error(`${value} does not fit into ${bits} bits`);
    }

    packed = (packed << BigInt(bits)) | BigInt(value);
  }

  return packed;
}


/**
 * Reads the fields back out of a packed value, in the order they were packed.
 *
 * The caller checks the value against `2 ** totalBits` first: bits above the
 * widths are not read, so a value that carries them would decode into a
 * window shifted against the one it was written in.
 *
 * @param {bigint} packed - The value `packBits()` returned.
 * @param {readonly number[]} widths - The fields' widths in reading order.
 * @return {number[]} One value per width.
 */
export function unpackBits(packed: bigint, widths: readonly number[]): number[] {
  let remaining = BigInt(widths.reduce((sum, bits) => sum + bits, 0));

  return widths.map(bits => {
    remaining -= BigInt(bits);

    return Number((packed >> remaining) & ((1n << BigInt(bits)) - 1n));
  });
}
