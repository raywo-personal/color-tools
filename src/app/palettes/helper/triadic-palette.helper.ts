import {Palette, PaletteColors} from "@palettes/models/palette.model";
import {fromHsl} from "@common/helpers/color-from-hsl.helper";
import {styleCaptionFor} from "@palettes/models/palette-style.model";
import {colorName} from "@common/helpers/color-name.helper";
import {paletteColorFrom} from "@palettes/models/palette-color.model";
import {paletteIdFromPalette} from "@palettes/helper/palette-id.helper";
import {triad} from "@common/helpers/hue.helper";
import {clamp01} from "@common/helpers/hsl.helper";
import {vary} from "@palettes/helper/number.helper";


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
  const hue = baseColor ? baseColor.hsl()[0] : seedHue ?? Math.random() * 360;

  const firstThree = triad(hue)
    .map((h, index) => {
      const slot = `color${index}` as keyof PaletteColors;

      return paletteColors[slot] ?? paletteColorFrom(fromHsl({h, s: 70, l: 50}), slot);
    });

  const [color0, color1, color2] = firstThree;

  const color3 = paletteColors.color3 ?? paletteColorFrom(
    fromHsl({
      h: (triad(hue))[0],
      s: clamp01(vary(0.05, 0.03)),
      l: clamp01(vary(0.55, 0.05))
    }),
    "color3"
  );
  const color4 = paletteColors.color4 ?? paletteColorFrom(
    fromHsl({
      h: (triad(hue))[1],
      s: clamp01(vary(0.05, 0.03)),
      l: clamp01(vary(0.55, 0.05))
    }),
    "color4"
  );

  const palette: Palette = {
    id: "",
    name: `${styleCaptionFor("triadic")} – ${colorName(color0.color)}`,
    style: "triadic",
    color0,
    color1,
    color2,
    color3,
    color4
  };
  palette.id = paletteIdFromPalette(palette);

  return palette;
}
