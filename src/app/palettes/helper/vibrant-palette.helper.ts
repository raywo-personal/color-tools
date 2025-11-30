import {triad} from '@common/helpers/hue.helper';
import {fromHsl} from '@common/helpers/color-from-hsl.helper';
import {vary} from '@palettes/helper/number.helper';
import {clamp01} from '@common/helpers/hsl.helper';
import {paletteColorFrom} from '@palettes/models/palette-color.model';
import {Palette, PaletteColors, PaletteSlot} from "@palettes/models/palette.model";
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
  const h0 = baseColor ? baseColor.hsl()[0] : seedHue ?? Math.random() * 360;

  const createAccent = (hue: number) => fromHsl({
    h: vary(hue, 6),
    s: clamp01(vary(0.75, 0.10)),
    l: clamp01(vary(0.52, 0.08))
  })

  const accents = triad(h0)
    .map((h, index) => {
        const slot = `color${index}` as PaletteSlot;

        return paletteColors[slot] ?? paletteColorFrom(createAccent(h), slot);
      }
    );

  const [color0, color1, color2] = accents;

  // Helle, gedämpfte Ergänzungstöne
  const color3 = paletteColors.color3 ?? paletteColorFrom(
    fromHsl({
      h: vary(h0 + 60, 8),
      s: clamp01(vary(0.35, 0.10)),
      l: clamp01(vary(0.78, 0.06))
    }),
    "color3"
  );

  const color4 = paletteColors.color4 ?? paletteColorFrom(
    fromHsl({
      h: vary(h0 - 20, 8),
      s: clamp01(vary(0.30, 0.08)),
      l: clamp01(vary(0.70, 0.06))
    }),
    "color4"
  );

  const palette: Palette = {
    id: "",
    name: `${styleCaptionFor("vibrant-balanced")} – ${colorName(color0.color)}`,
    style: "vibrant-balanced",
    color0,
    color1,
    color2,
    color3,
    color4
  };
  palette.id = paletteIdFromPalette(palette);

  return palette;
}
