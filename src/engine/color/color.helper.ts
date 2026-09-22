import chroma, {Color} from "chroma-js";


export const WHITE = chroma("#ffffff");
export const BLACK = chroma("#000000");


/**
 * Converts a given input to a Color object. If the input is a string, it is
 * converted to a Color object using the `chroma` function. If the input is
 * already a Color object, it is returned as is.
 *
 * @param color - The input to be converted, which can be either a string
 *                representing a color or an existing Color object.
 * @return A Color object derived from the input.
 */
export function toColor(color: Color | string): Color {
  return typeof color === "string" ? chroma(color) : color;
}


/**
 * Determines whether a given color is considered a "light" color based on its
 * contrast ratio relative to white and black.
 *
 * @param {Color} color - The color to evaluate.
 * @return {boolean} True if the color is light, false otherwise.
 */
export function isLightColor(color: Color): boolean {
  return Math.abs(chroma.contrastAPCA(WHITE, color)) <= Math.abs(chroma.contrastAPCA(BLACK, color));
}


export function sameColor(color1: Color, color2: Color): boolean {
  return color1.hex() === color2.hex();
}
