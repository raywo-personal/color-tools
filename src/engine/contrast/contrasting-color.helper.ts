import chroma, {Color} from "chroma-js";


const LIGHT_TEXT_COLOR = "#fff";
const DARK_TEXT_COLOR = "#000";

/**
 * Determines and returns a contrasting text color that ensures readability
 * against the provided background color.
 *
 * @see https://www.w3.org/TR/WCAG20-TECHS/G18.html
 *
 * @param {Color | string} color - The background color for which to determine
 *                                 a contrasting text color. Can be provided as
 *                                 a Color object or a string representation of
 *                                 a color (e.g., hex code, color name).
 * @return {string} The contrasting text color, either a light or dark color,
 *                  selected to maintain sufficient contrast for readability.
 */
export function contrastingColor(color: Color | string): Color {
  const contrast = chroma.contrast(color, LIGHT_TEXT_COLOR);

  return (contrast > 4.5) ? chroma(LIGHT_TEXT_COLOR) : chroma(DARK_TEXT_COLOR);
}


/**
 * Generates a contrasting muted color based on the input color.
 *
 * The function ensures the resulting color adheres to a specific contrast
 * ratio for better readability, adjusting brightness or darkness as needed.
 *
 * On light backgrounds the resulting color starts with white and is muted to a
 * darker shade, while on dark backgrounds it is muted to a lighter shade.
 *
 * @see https://www.w3.org/TR/WCAG20-TECHS/G18.html
 *
 * @param {Color|string} color - The input color, which can either be a `Color`
 *                               object or a string representing a color in a
 *                               compatible format.
 * @return {string} The hexadecimal representation of the muted contrasting color.
 */
export function contrastingMutedColor(color: Color | string): Color {
  const step = 0.1;
  const maxIterations = 250;

  const startColor = isLightColor(color)
    ? chroma(LIGHT_TEXT_COLOR)
    : chroma(DARK_TEXT_COLOR);
  const direction = isLightColor(color) ? "darker" : "brighter";
  let iteration = 0;
  let result: Color = startColor;

  while (chroma.contrast(result, color) > 4.5 && iteration++ < maxIterations) {
    result = direction === "brighter"
      ? result.brighten(step)
      : result.darken(step);
  }

  return result;
}


function isLightColor(color: Color | string): boolean {
  return chroma.contrast(color, "white") > 4.5;
}
