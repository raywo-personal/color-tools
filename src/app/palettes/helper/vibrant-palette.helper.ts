import {triad} from '@common/helpers/hue.helper';
import {fromHsl} from '@common/helpers/color-from-hsl.helper';
import {vary} from '@palettes/helper/variation.helper';
import {clamp01} from '@common/helpers/hsl.helper';
import {paletteColorFrom} from '@palettes/models/palette-color.model';
import {Palette, PaletteColors} from "@palettes/models/palette.model";
import {randomBetween} from "@common/helpers/random.helper";
import {paletteFrom} from "@palettes/helper/palette.helper";


/**
 * Generates a set of vibrant and balanced colors based on a given hue or
 * a random seed hue.
 *
 * The palette consists of three accent colors and two light colors. The
 * accent colors are derived from the given hue, and the light colors are
 * derived from the complementary colors of the accent colors.
 *
 * @param paletteColors - Optional fixed colors to use when generating the
 *                        palette. Each provided color is left untouched, and
 *                        the remaining colors are generated based on the
 *                        provided seed hue. If no colors are provided, a
 *                        random neutral color is generated.
 * @param {number} [seedHue] - The hue value to base the color generation on.
 *                             If omitted, a random value is used.
 * @return {Palette} The palette with the generated colors, with vibrant and
 *                   complementary characteristics.
 */
export function generateVibrantBalanced(paletteColors: Partial<PaletteColors> = {},
                                        seedHue?: number): Palette {
  const baseColor = paletteColors.color0?.color;
  const [h, s, l] = baseColor?.hsl() ?? [];
  const h0 = h ?? seedHue ?? randomBetween(0, 360);
  const s0 = s ?? 0.75;
  const l0 = l ?? 0.52;

  const createAccent = (hue: number) => fromHsl({
    h: vary(hue, 6),
    s: clamp01(vary(s0, 0.10)),
    l: clamp01(vary(l0, 0.08))
  })

  const [_, h1, h2] = triad(h0);
  const pColors: PaletteColors = {
    color0: paletteColors.color0 ??
      paletteColorFrom(createAccent(h0), "color0"),
    color1: paletteColors.color1 ??
      paletteColorFrom(createAccent(h1), "color1"),
    color2: paletteColors.color2 ??
      paletteColorFrom(createAccent(h2), "color2"),
    color3: paletteColors.color3 ?? paletteColorFrom(
      fromHsl({
        h: vary(h0 + 60, 8),
        s: clamp01(vary(s0 - 0.40, 0.10)),
        l: clamp01(vary(l0 + 0.26, 0.06))
      }),
      "color3"
    ),
    color4: paletteColors.color4 ?? paletteColorFrom(
      fromHsl({
        h: vary(h0 - 20, 8),
        s: clamp01(vary(s0 - 0.45, 0.08)),
        l: clamp01(vary(l0 + 0.18, 0.06))
      }),
      "color4"
    )
  };

  return paletteFrom(pColors, "vibrant-balanced");
}
