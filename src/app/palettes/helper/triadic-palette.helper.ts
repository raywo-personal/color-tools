import {Palette, PaletteColors} from "@palettes/models/palette.model";
import {fromHsl} from "@common/helpers/color-from-hsl.helper";
import {paletteColorFrom} from "@palettes/models/palette-color.model";
import {triad} from "@common/helpers/hue.helper";
import {clamp01} from "@common/helpers/hsl.helper";
import {vary} from "@palettes/helper/variation.helper";
import {paletteFrom} from "@palettes/helper/palette.helper";


/**
 * Generates a triadic color palette based on the given seed hue or existing
 * palette colors. Triadic palettes consist of three colors evenly spaced
 * around the color wheel and two additional variations. The first three colors
 * are derived from the given seed hue, and the additional two colors are
 * darker and more desaturated versions of the first two colors.
 *
 * @param {Partial<PaletteColors>} [paletteColors={}] - Optional fixed colors to use
 *                when generating the palette. Each provided color is left
 *                untouched, and the remaining colors are generated based on
 *                the provided seed hue. If no colors are provided, a random
 *                neutral color is generated.
 * @param {number} [seedHue] - An optional base hue value in degrees (0-360)
 *                             used to generate the color palette. If not
 *                             provided, a random hue is used.
 * @return {Palette} The complete triadic color palette containing five colors:
 *                   three calculated from the triad and two additional
 *                   variations.
 */
export function generateTriadic(paletteColors: Partial<PaletteColors> = {},
                                seedHue?: number): Palette {
  const baseColor = paletteColors.color0?.color;
  const [h, s, l] = baseColor?.hsl() ?? [];
  const hue = h ?? seedHue ?? Math.random() * 360;
  const baseSat = s ?? 0.70;
  const baseLight = l ?? 0.50;

  const triadHues = triad(hue);

  const pColors: PaletteColors = {
    color0: paletteColors.color0 ?? paletteColorFrom(
      fromHsl({h: triadHues[0], s: baseSat, l: baseLight}),
      "color0"
    ),

    color1: paletteColors.color1 ?? paletteColorFrom(
      fromHsl({h: triadHues[1], s: baseSat, l: baseLight}),
      "color1"
    ),

    color2: paletteColors.color2 ?? paletteColorFrom(
      fromHsl({h: triadHues[2], s: baseSat, l: baseLight}),
      "color2"
    ),

    color3: paletteColors.color3 ?? paletteColorFrom(
      fromHsl({
        h: triadHues[0],
        s: clamp01(vary(baseSat - 0.65, 0.03)),
        l: clamp01(vary(baseLight + 0.05, 0.05))
      }),
      "color3"
    ),

    color4: paletteColors.color4 ?? paletteColorFrom(
      fromHsl({
        h: triadHues[1],
        s: clamp01(vary(baseSat - 0.65, 0.03)),
        l: clamp01(vary(baseLight + 0.05, 0.05))
      }),
      "color4"
    )
  };

  return paletteFrom(pColors, "triadic");
}
