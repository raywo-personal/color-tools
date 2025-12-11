import {base62ToBigInt} from "@common/helpers/base62.helper";
import {validateId} from "@common/helpers/validate-string-id.helper";


/**
 * Decodes the ID into a raw byte array.
 */
export function getBytesFromId(id: string, expectedLength: number): number[] {
  validateId(id, expectedLength);

  // Omit style index
  const colorData = id.substring(1);
  const bigNumber = base62ToBigInt(colorData);

  const bytes: number[] = [];
  let remaining = bigNumber;

  // Extract all bytes
  while (remaining > 0n) {
    bytes.unshift(Number(remaining % 256n));
    remaining = remaining / 256n;
  }

  // Ensure we have exactly 31 bytes (30 for RGB values + 1 for pinned mask)
  // Pad with leading zeros if necessary
  while (bytes.length < 31) {
    bytes.unshift(0);
  }

  return bytes;
}
