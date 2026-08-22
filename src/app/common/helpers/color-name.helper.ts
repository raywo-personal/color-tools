import chroma, {Color} from "chroma-js";
import basic from "color-namer/lib/colors/basic";
import html from "color-namer/lib/colors/html";
import ntc from "color-namer/lib/colors/ntc";
import pantone from "color-namer/lib/colors/pantone";
import roygbiv from "color-namer/lib/colors/roygbiv";
import x11 from "color-namer/lib/colors/x11";

/**
 * How much further away a Pantone match may be and still win over the closest
 * match from any list. Pantone names read better than the generated ones.
 */
const PANTONE_TOLERANCE = 5;

interface NamedColor {
  name: string;
  hex: string;
}

/**
 * The lists come from `color-namer`, but the distance math does not - see the
 * Color Libraries section in CLAUDE.md for why the package's own entry point is
 * bypassed. Order matters: on equal distance the first list wins, which is what
 * `color-namer` did with its stable sort.
 */
const LISTS: readonly NamedColor[][] = [basic, html, ntc, pantone, roygbiv, x11];


export function colorName(color: Color): string {
  // Quantize to 8-bit RGB first. `color-namer` was fed `color.hex()`, so the
  // distances were measured from the rounded color; a chroma `Color` carries
  // unrounded channels and would name ~5 % of the colors differently.
  const hex = color.hex();

  let closest: NamedColor | undefined;
  let closestDistance = Infinity;
  let closestPantone: NamedColor | undefined;
  let closestPantoneDistance = Infinity;

  for (const list of LISTS) {
    const isPantone = list === pantone;

    for (const candidate of list) {
      const distance = chroma.distance(hex, candidate.hex);

      if (distance < closestDistance) {
        closest = candidate;
        closestDistance = distance;
      }

      if (isPantone && distance < closestPantoneDistance) {
        closestPantone = candidate;
        closestPantoneDistance = distance;
      }
    }
  }

  if (!closest) return "Unknown";

  if (closestPantone && closestPantoneDistance <= closestDistance + PANTONE_TOLERANCE) {
    return closestPantone.name;
  }

  return closest.name;
}
