import {Color} from "chroma-js";
import {ColorSpace} from "@engine/color/color-space.model";
import {hueWrap} from "@engine/color/hsl.helper";


/**
 * Writes a color in one of the four spaces the app can edit in.
 *
 * The counterpart of `colorFrom()` in `color-format-parser.helper.ts`, and it
 * has to stay one: the conversion list puts these strings on the clipboard and
 * the hex field reads them back, so a value the app writes must be a value the
 * app parses.
 *
 * **chroma-js' own `css()` is deliberately not used.** For a color without a
 * hue - every grey, black and white - it writes CSS Color 4's `none` for the
 * missing component (`oklch(59.99% 0 none)`), and the parser's pattern rejects
 * that. It also appends `deg` to the angle, which the draft does not show.
 *
 * @param {Color} color - The color to write.
 * @param {ColorSpace} space - The space to write it in.
 * @return {string} The color as CSS, in the modern space-separated syntax.
 */
export function formatColor(this: void, color: Color, space: ColorSpace): string {
  switch (space) {
    case "rgb":
      return `rgb(${color.rgb().join(" ")})`;

    case "hsl": {
      const [hue, saturation, lightness] = color.hsl();

      return `hsl(${angle(hue)} ${percent(saturation)}% ${percent(lightness)}%)`;
    }

    case "oklch": {
      const [lightness, chromaticity, hue] = color.oklch();

      return `oklch(${(lightness * 100).toFixed(1)}% ${chromaticity.toFixed(3)} ${angle(hue)})`;
    }

    case "hex":
    default:
      // `"rgb"` drops the alpha byte: `.hex()` writes eight digits as soon as a
      // color is not fully opaque, and no field in the app edits alpha.
      return color.hex("rgb").toUpperCase();
  }
}


/**
 * Rounds a hue for display, answering an undefined one with 0.
 *
 * chroma-js reports `NaN` for the hue of a grey, where the angle carries no
 * information. Writing that out would produce `hsl(NaN 0% 50%)`, which no
 * parser takes.
 *
 * Wrapped after rounding, not before: a hue of 359.7 rounds to 360, and 360 is
 * the same angle written a second way - one that chroma-js itself never hands
 * back, so it would be the app's own output disagreeing with the app.
 */
function angle(hue: number): number {
  return Number.isNaN(hue) ? 0 : hueWrap(Math.round(hue));
}


function percent(fraction: number): number {
  return Math.round(fraction * 100);
}
