import chroma, {Color} from "chroma-js";
import {base62ToBigInt, bigIntToBase62} from "@common/helpers/base62.helper";
import {isRestorable, validateId} from "@common/helpers/validate-string-id.helper";
import {findHarmonicTextColor} from "@contrast/helper/optimal-text-color.helper";
import {ContrastColors} from "@contrast/models/contrast-colors.model";


/**
 * Represents the fixed length for a contrast identifier.
 * 6 bytes (2 colors × 3 RGB channels) encoded in base62.
 * Maximum value: 256^6 - 1 requires 9 characters in base62.
 * Calculation: log(256^6) / log(62) ≈ 8.06, so we need 9 characters.
 */
export const CONTRAST_ID_LENGTH = 9;


/**
 * Generates a contrast ID based on the RGB values of the provided text and
 * background colors.
 *
 * @param {ContrastColors} colors - An object containing the text and
 *                                  background color information.
 * @return {string} The base-62 encoded contrast ID derived from the
 *                  colors' RGB values.
 */
export function contrastIdFromColors(
  colors: Pick<ContrastColors, "text" | "background">
): string {
  const bytes: number[] = [];
  bytes.push(...colors.text.rgb());
  bytes.push(...colors.background.rgb());

  let bigNumber = 0n;
  for (const byte of bytes) bigNumber = (bigNumber << 8n) + BigInt(byte);

  return bigIntToBase62(bigNumber, CONTRAST_ID_LENGTH);
}


/**
 * Generates an array of contrasting colors based on the provided ID.
 *
 * @param {string} id - A string identifier used to determine the color values.
 *                      Must be restorable and match the expected length for
 *                      the operation.
 * @return {Color[]} An array of contrasting Color objects. The array will
 *                   contain exactly two colors.
 * @throws {Error} If the provided ID is invalid or cannot be used to derive
 *                 the required colors.
 */
export function contrastColorsFromId(id: string): ContrastColors {
  if (!isRestorable(id, CONTRAST_ID_LENGTH)) {
    throw new Error("Invalid contrast ID");
  }

  const bytes = getBytesFromContrastId(id, CONTRAST_ID_LENGTH);
  const text = chroma.rgb(bytes[0], bytes[1], bytes[2]);
  const background = chroma.rgb(bytes[3], bytes[4], bytes[5]);
  const contrast = chroma.contrastAPCA(text, background);

  return {id, text, background, contrast};
}


/**
 * Generates a random pair of contrast colors, consisting of a background color
 * and a text color that harmonizes with the background for optimal readability.
 *
 * @return {ContrastColors} An object containing a text color and a background
 *                          color.
 */
export function generateRandomContrastColors(): ContrastColors {
  const bgColor = chroma.random();
  const textColor = findHarmonicTextColor(bgColor)?.color ?? chroma.random();
  const contrast = chroma.contrastAPCA(textColor, bgColor);
  const id = contrastIdFromColors({text: textColor, background: bgColor});

  return {
    id,
    text: textColor,
    background: bgColor,
    contrast
  };
}


/**
 * Decode a contrast ID into exactly 6 bytes (2 RGB colors).
 *
 * @param id - The contrast ID string (base62).
 * @param expectedLength - Expected string length of the ID.
 */
function getBytesFromContrastId(id: string, expectedLength: number): number[] {
  validateId(id, expectedLength);

  const bigNumber = base62ToBigInt(id);
  const bytes: number[] = [];
  let remaining = bigNumber;

  while (remaining > 0n) {
    bytes.unshift(Number(remaining % 256n));
    remaining = remaining >> 8n;
  }

  // We expect exactly 6 bytes (2 colors × 3 RGB channels).
  // Pad with leading zeros if needed.
  const expectedByteCount = 6;
  while (bytes.length < expectedByteCount) {
    bytes.unshift(0);
  }

  return bytes;
}
