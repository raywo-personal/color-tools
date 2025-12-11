import chroma, {Color} from "chroma-js";
import {bigIntToBase62} from "@common/helpers/base62.helper";
import {isRestorable} from "@common/helpers/validate-string-id.helper";
import {getBytesFromId} from "@common/helpers/get-bytes-from-string.helper";
import {findHarmonicTextColor} from "@contrast/helper/optimal-text-color.helper";
import {ContrastColors} from "@contrast/models/contrast-colors.model";


/**
 * Represents the fixed length for a contrast identifier.
 * This value is calculated as 3 bytes per the two colors.
 */
export const CONTRAST_ID_LENGTH = 6;


/**
 * Generates a contrast ID as a string based on the RGB values of two colors.
 *
 * @param {Color[]} colors - An array containing exactly two Color objects,
 *                           each providing an `rgb` method that returns an
 *                           array of RGB values.
 * @return {string} A base62-encoded string that uniquely represents the
 *                  contrast between the provided colors.
 * @throws {Error} If the `colors` array does not contain exactly two
 *                 Color objects.
 */
export function contrastIdFromColors(colors: Color[]): string {
  if (colors.length !== 2) {
    throw new Error("Contrast ID can only be generated from two colors");
  }

  const bytes: number[] = [];
  colors.forEach(color => bytes.push(...color.rgb()));

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
  const colorCount = 2;
  if (!isRestorable(id, CONTRAST_ID_LENGTH)) {
    throw new Error("Invalid contrast ID");
  }

  const bytes = getBytesFromId(id, CONTRAST_ID_LENGTH);
  const colors: Color[] = [];

  for (let i = 0; i < colorCount; i++) {
    colors.push(chroma.rgb(bytes[0], bytes[1], bytes[2]));
  }

  return {
    text: colors[0],
    background: colors[1]
  };
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

  return {
    text: textColor,
    background: bgColor
  };
}
