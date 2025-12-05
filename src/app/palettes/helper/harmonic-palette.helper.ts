import {Palette, PaletteColors} from "@palettes/models/palette.model";
import {paletteColorFrom} from "@palettes/models/palette-color.model";
import {fromHsl} from "@common/helpers/color-from-hsl.helper";
import {randomBetween} from "@common/helpers/random.helper";
import {clamp01, hueWrap} from "@common/helpers/hsl.helper";
import {styleCaptionFor} from "@palettes/models/palette-style.model";
import {colorName} from "@common/helpers/color-name.helper";
import {paletteIdFromPalette} from "@palettes/helper/palette-id.helper";
import {vary} from "@palettes/helper/number.helper";


/**
 * Generates a harmonic color palette based on the provided colors and an
 * optional seed hue.
 *
 * @param paletteColors - Optional fixed colors to use when generating the
 *                        palette. Each provided color is left untouched, and
 *                        the remaining colors are generated based on the
 *                        provided seed hue. If no colors are provided, a
 *                        random neutral color is generated.
 * @param {number} [seedHue] - Optional seed hue (in degrees) to generate the
 *                             color palette. If not provided, a random hue
 *                             is used.
 * @return {Palette} The generated palette
 */
export function generateHarmonic(paletteColors: Partial<PaletteColors> = {},
                                 seedHue?: number): Palette {
  const existingNeutral = paletteColors.color0;
  const [h, s, l] = existingNeutral?.color.hsl() ?? [
    seedHue ?? randomBetween(0, 360),
    randomBetween(0, 1),
    randomBetween(0, 1)
  ];

  const variation = 0.05;

  const color0 = existingNeutral ?? paletteColorFrom(
    fromHsl({h, s, l}),
    "color0"
  );

  // Analogous
  const color1 = paletteColors.color1 ?? paletteColorFrom(
    fromHsl({
      h: hueWrap(h + 30),
      s: clamp01(vary(s * 0.9, variation)),
      l: clamp01(vary(l * 1.1, variation))
    }),
    "color1"
  );

  // Analogous
  const color2 = paletteColors.color2 ?? paletteColorFrom(
    fromHsl({
      h: hueWrap(h + 60),
      s: clamp01(vary(s * 0.8, variation)),
      l: clamp01(vary(l * 0.9, variation))
    }),
    "color2"
  );

  // Complementary
  const color3 = paletteColors.color3 ?? paletteColorFrom(
    fromHsl({
      h: hueWrap(h + 180),
      s: clamp01(vary(s, variation)),
      l: clamp01(vary(l, variation))
    }),
    "color3"
  );

  // Triadic
  const color4 = paletteColors.color4 ?? paletteColorFrom(
    fromHsl({
      h: hueWrap(h + 150),
      s: clamp01(vary(s * 0.7, variation)),
      l: clamp01(vary(l * 1.2, variation))
    }),
    "color4"
  );

  const palette: Palette = {
    id: "",
    name: `${styleCaptionFor("harmonic")} – ${colorName(color0.color)}`,
    style: "harmonic",
    color0,
    color1,
    color2,
    color3,
    color4,
  };
  palette.id = paletteIdFromPalette(palette);

  return palette;
}
