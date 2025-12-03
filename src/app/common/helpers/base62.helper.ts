const BASE62_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/**
 * Converts a given integer to its Base62 string representation.
 *
 * @param {number} num The integer to be converted to Base62.
 * @return {string} The Base62 encoded string representation of the input number.
 */
function toBase62(num: number): string {
  if (num === 0) return '0';

  let result = '';

  while (num > 0) {
    result = BASE62_CHARS[num % 62] + result;
    num = Math.floor(num / 62);
  }

  return result;
}

/**
 * Decodes a Base62-encoded string into a numeric value.
 *
 * @param {string} str - The Base62-encoded string to be decoded.
 * @return {number} The numeric value obtained from decoding the input string.
 */
function fromBase62(str: string): number {
  let result = 0;

  for (let i = 0; i < str.length; i++) {
    result = result * 62 + BASE62_CHARS.indexOf(str[i]);
  }

  return result;
}


/**
 * Converts a BigInt into a Base62 encoded string.
 *
 * @param {bigint} num - The BigInt value to be converted to Base62.
 * @param {number} [minLength] - Optional minimum length for the resulting
 *                               string. If the generated string is shorter, it
 *                               will be padded with leading zeros.
 * @return {string} The Base62 encoded string representation of the
 *                  provided BigInt.
 */
export function bigIntToBase62(num: bigint, minLength?: number): string {
  if (num === 0n) {
    const zero = '0';
    return minLength ? zero.padStart(minLength, '0') : zero;
  }

  let result = '';
  while (num > 0n) {
    result = BASE62_CHARS[Number(num % 62n)] + result;
    num = num / 62n;
  }

  // Pad with leading zeros if minLength is specified
  if (minLength && result.length < minLength) {
    result = result.padStart(minLength, '0');
  }

  return result;
}


/**
 * Converts a Base62 encoded string into a BigInt.
 *
 * @param {string} str The Base62 encoded string to convert.
 * @return {bigint} The resulting BigInt representation of the input string.
 */
export function base62ToBigInt(str: string): bigint {
  let result = 0n;

  for (let i = 0; i < str.length; i++) {
    result = result * 62n + BigInt(BASE62_CHARS.indexOf(str[i]));
  }

  return result;
}
