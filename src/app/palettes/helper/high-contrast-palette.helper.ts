import {fromHsl} from '@common/helpers/color-from-hsl.helper';
import {vary} from '@palettes/helper/variation.helper';
import {clamp01} from '@common/helpers/hsl.helper';
import {complement} from '@common/helpers/hue.helper';
import {Palette, PaletteColors} from "@palettes/models/palette.model";
import {paletteColorFrom} from "@palettes/models/palette-color.model";
import {randomBetween} from "@common/helpers/random.helper";
import {paletteFrom} from "@palettes/helper/palette.helper";


/**
 * Generates a high-contrast color palette based on a seed hue or a
 * randomly selected hue.
 *
 * Accent 1 will be a vibrant color, accent 2 will be a complementary color
 * that is a little bit darker. Deep tones will be near-black, and the dark
 * accent will be a slightly cooler color. The last color will be a
 * near-white color.
 *
 * @param paletteColors - Optional fixed colors to use when generating the
 *                        palette. Each provided color is left untouched, and
 *                        the remaining colors are generated based on the
 *                        provided seed hue. If no colors are provided, a
 *                        random neutral color is generated.
 * @param {number} [seedHue] - An optional base hue value in degrees (0-360)
 *                             used to generate the color palette. If not
 *                             provided, a random hue is used.
 * @return {Palette} The palette with the generated colors, representing colors
 *                   of high contrast, including vibrant accents, deep tones,
 *                   and near-white.
 */
export function generateHighContrast(paletteColors: Partial<PaletteColors> = {},
                                     seedHue?: number): Palette {
  const baseColor = paletteColors.color0?.color;
  const [h, s, l] = baseColor?.hsl() ?? [];
  const h0 = h ?? seedHue ?? randomBetween(0, 360);
  const s0 = s ?? 1.0;
  const l0 = l ?? 0.50;

  const pColors = {} as PaletteColors;

  // accent 1
  pColors.color0 = paletteColors.color0 ?? paletteColorFrom(
    fromHsl({
      h: vary(h0, 5),
      s: clamp01(vary(s0, 0.0)), // maximal
      l: clamp01(vary(l0, 0.04))
    }),
    "color0"
  );

  // accent 2
  pColors.color1 = paletteColors.color1 ?? paletteColorFrom(
    fromHsl({
      h: vary(complement(h0), 6),
      s: clamp01(vary(s0, 0.0)),
      l: clamp01(vary(l0, 0.06))
    }),
    "color1"
  );

  // deep tone
  pColors.color2 = paletteColors.color2 ?? paletteColorFrom(
    fromHsl({
      h: vary(h0 + 20, 10),
      s: clamp01(vary(s0 - 0.92, 0.05)),
      l: clamp01(vary(l0 - 0.35, 0.03))
    }),
    "color2"
  );

  // dark accent
  pColors.color3 = paletteColors.color3 ?? paletteColorFrom(
    fromHsl({
      h: vary(h0 + 220, 10),
      s: clamp01(vary(s0 - 0.55, 0.10)),
      l: clamp01(vary(l0 - 0.18, 0.06))
    }),
    "color3"
  );

  // near white
  pColors.color4 = paletteColors.color4 ?? paletteColorFrom(
    fromHsl({
      h: vary(h0 + 200, 8),
      s: clamp01(vary(s0, 0.0)),
      l: clamp01(vary(l0 + 0.46, 0.02))
    }),
    "color4"
  );

  return paletteFrom(pColors, "high-contrast");
}
