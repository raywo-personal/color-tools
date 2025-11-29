import {fromHsl} from '@common/helpers/color-from-hsl.helper';
import {vary} from '@palettes/helper/number.helper';
import {clamp01} from '@common/helpers/hsl.helper';
import {complement} from '@common/helpers/hue.helper';
import {Palette} from "@palettes/models/palette.model";
import {PaletteColor, paletteColorFrom} from "@palettes/models/palette-color.model";
import {paletteIdFromPalette} from "@palettes/helper/palette-id.helper";
import {colorName} from "@common/helpers/color-name.helper";
import {styleCaptionFor} from "@palettes/models/palette-style.model";


/**
 * Generates a high-contrast color palette based on a seed hue or a
 * randomly selected hue.
 *
 * Accent 1 will be a vibrant color, accent 2 will be a complementary color
 * that is a little bit darker. Deep tones will be near-black, and the dark
 * accent will be a slightly cooler color. The last color will be a
 * near-white color.
 *
 * @param {number} [seedHue] - An optional base hue value in degrees (0-360)
 *                             used to generate the color palette. If not
 *                             provided, a random hue is used.
 * @return {Palette} The palette with the generated colors, representing colors
 *                   of high contrast, including vibrant accents, deep tones,
 *                   and near-white.
 */
export function generateHighContrast(fixedColors: PaletteColor[] = [],
                                     seedHue?: number): Palette {
  let h0 = seedHue ?? Math.random() * 360;

  let accent1 = fromHsl({
    h: vary(h0, 5),
    s: clamp01(vary(1.0, 0.0)), // maximal
    l: clamp01(vary(0.50, 0.04))
  });

  if (fixedColors.length > 0 && fixedColors[0].slot === "color0") {
    h0 = fixedColors[0].color.hsl()[0];
    accent1 = fixedColors[0].color;
  }

  const accent2 = fromHsl({
    h: vary(complement(h0), 6),
    s: clamp01(vary(1.0, 0.0)),
    l: clamp01(vary(0.50, 0.06))
  });

  const deep = fromHsl({
    h: vary(h0 + 20, 10),
    s: clamp01(vary(0.08, 0.05)),
    l: clamp01(vary(0.15, 0.03))
  });

  const darkAccent = fromHsl({
    h: vary(h0 + 220, 10),
    s: clamp01(vary(0.45, 0.10)),
    l: clamp01(vary(0.32, 0.06))
  });

  const nearWhite = fromHsl({
    h: vary(h0 + 200, 8),
    s: clamp01(vary(1.0, 0.0)),
    l: clamp01(vary(0.96, 0.02))
  });

  const palette: Palette = {
    id: "",
    name: `${styleCaptionFor("high-contrast")} – ${colorName(accent1)}`,
    style: "high-contrast",
    color0: paletteColorFrom(accent1, "color0"),
    color1: paletteColorFrom(accent2, "color1"),
    color2: paletteColorFrom(darkAccent, "color2"),
    color3: paletteColorFrom(deep, "color3"),
    color4: paletteColorFrom(nearWhite, "color4"),
  };
  palette.id = paletteIdFromPalette(palette);

  return palette;
}
