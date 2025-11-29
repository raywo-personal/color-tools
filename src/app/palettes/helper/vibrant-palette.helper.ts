import {randomBetween} from '@common/helpers/random.helper';
import {triad} from '@common/helpers/hue.helper';
import {fromHsl} from '@common/helpers/color-from-hsl.helper';
import {vary} from '@palettes/helper/number.helper';
import {clamp01} from '@common/helpers/hsl.helper';
import {PaletteColor, paletteColorFrom} from '@palettes/models/palette-color.model';
import {Palette} from "@palettes/models/palette.model";
import {paletteIdFromPalette} from "@palettes/helper/palette-id.helper";
import {colorName} from "@common/helpers/color-name.helper";
import {styleCaptionFor} from "@palettes/models/palette-style.model";


/**
 * Generates a set of vibrant and balanced colors based on a given hue or
 * a random seed hue.
 *
 * The palette consists of three accent colors and two light colors. The
 * accent colors are derived from the given hue, and the light colors are
 * derived from the complementary colors of the accent colors.
 *
 * @param fixedColors - Optional fixed colors to use as the neutral color. If
 *                      provided, the first color in the array must be the
 *                      neutral color. If not provided, a random neutral color
 *                      is generated.
 * @param {number} [seedHue] - The hue value to base the color generation on.
 *                             If omitted, a random value is used.
 * @return {Palette} The palette with the generated colors, with vibrant and
 *                   complementary characteristics.
 */
export function generateVibrantBalanced(fixedColors: PaletteColor[] = [],
                                        seedHue?: number): Palette {
  let h0 = seedHue ?? randomBetween(0, 360);

  if (fixedColors.length > 0 && fixedColors[0].slot === "color0") {
    h0 = fixedColors[0].color.hsl()[0];
  }

  const tri = triad(h0);
  const baseS = 0.75;
  const baseL = 0.52;

  const accents = tri.map(h => fromHsl({
      h: vary(h, 6),
      s: clamp01(vary(baseS, 0.10)),
      l: clamp01(vary(baseL, 0.08))
    })
  );

  if (fixedColors.length > 0 && fixedColors[0].slot === "color0") {
    accents[0] = fixedColors[0].color;
  }

  // Helle, gedämpfte Ergänzungstöne
  const light1 = fromHsl({
    h: vary(h0 + 60, 8),
    s: clamp01(vary(0.35, 0.10)),
    l: clamp01(vary(0.78, 0.06))
  });

  const light2 = fromHsl({
    h: vary(h0 - 20, 8),
    s: clamp01(vary(0.30, 0.08)),
    l: clamp01(vary(0.70, 0.06))
  });

  const palette: Palette = {
    id: "",
    name: `${styleCaptionFor("vibrant-balanced")} – ${colorName(accents[0])}`,
    style: "vibrant-balanced",
    color0: paletteColorFrom(accents[0], "color0"),
    color1: paletteColorFrom(accents[1], "color1"),
    color2: paletteColorFrom(accents[2], "color2"),
    color3: paletteColorFrom(light1, "color3",),
    color4: paletteColorFrom(light2, "color4",),
  };
  palette.id = paletteIdFromPalette(palette);

  return palette;
}
