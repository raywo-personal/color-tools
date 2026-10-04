import chroma, {Color} from "chroma-js";


/**
 * Creates an array of tints transitioning from the provided color to white.
 *
 * @param {Color} color - The base color from which tints will be generated.
 * @param {boolean} [useBezier=true] - Determines whether to use Bezier
 *                                     interpolation for smoothing the gradient.
 * @param {boolean} [correctLightness=true] - Indicates whether to adjust the
 *                                            lightness of colors for perceptual
 *                                            uniformity.
 * @param {number} [count=11] - The number of tints to generate, including the
 *                              base color and white.
 * @return {Color[]} An array of colors representing the generated tints.
 */
export function createTints(color: Color,
                            useBezier = true,
                            correctLightness = true,
                            count = 11): Color[] {
  const colorToWhite = [color.hex(), "white"];
  return createScale(colorToWhite, useBezier, correctLightness, count);
}


/**
 * Generates an array of shades transitioning from the provided color to black.
 *
 * @param {Color} color - The base color used to generate shades.
 * @param {boolean} [useBezier=true] - Determines whether to use Bezier
 *                                     interpolation for smoothing the gradient.
 * @param {boolean} [correctLightness=true] - Indicates whether to adjust the
 *                                            lightness of colors for perceptual
 *                                            uniformity.
 * @param {number} [count=11] - The number of tints to generate, including the
 *                              base color and white.
 * @return {Color[]} An array of colors representing the generated shades.
 */
export function createShades(color: Color,
                            useBezier = true,
                            correctLightness = true,
                            count = 11): Color[] {
  const colorToWhite = [color.hex(), "black"];
  return createScale(colorToWhite, useBezier, correctLightness, count);
}


function createScale(colors: string[],
                     useBezier: boolean,
                     correctLightness: boolean,
                     count: number) {
  let scale = chroma.scale(colors);

  if (useBezier) {
    scale = chroma.bezier(colors).scale();
  }

  if (correctLightness) {
    scale = scale.correctLightness();
  }

  return scale.colors(count, null);
}
