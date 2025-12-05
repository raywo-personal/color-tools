import {Palette, PaletteColors, PaletteSlot} from "@palettes/models/palette.model";
import {randomBetween} from "@common/helpers/random.helper";
import {fromHsl} from "@common/helpers/color-from-hsl.helper";
import {PaletteColor, paletteColorFrom} from "@palettes/models/palette-color.model";
import {hueWrap} from "@common/helpers/hsl.helper";
import {vary} from "@palettes/helper/variation.helper";
import {paletteFrom} from "@palettes/helper/palette.helper";


/**
 * Generates a complementary color palette based on the provided palette colors
 * and optional seed hue.
 *
 * @param {Partial<PaletteColors>} [paletteColors={}] - Optional fixed colors to use
 *                when generating the palette. Each provided color is left
 *                untouched, and the remaining colors are generated based on
 *                the provided seed hue. If no colors are provided, a random
 *                neutral color is generated.
 * @param {number} [seedHue] - An optional base hue value in degrees (0-360)
 *                             used to generate the color palette. If not
 *                             provided, a random hue is used.
 * @return {Palette} - A complete complementary color palette generated using
 *                     the provided or default colors.
 */
export function generateComplementary(paletteColors: Partial<PaletteColors> = {},
                                      seedHue?: number): Palette {
  const baseColor = paletteColors.color0?.color;
  const [h, s, l] = baseColor?.hsl() ?? [];
  const h0 = h ?? seedHue ?? randomBetween(0, 360);
  const s0 = s ?? 0.70;
  const l0 = l ?? 0.50;
  const h0Complement = hueWrap(h0 + 180);

  const s2 = vary(s0 - 0.1, 0.05);
  const s3 = vary(s0 - 0.2, 0.05);
  const s4 = vary(s0 - 0.4, 0.05);

  const l2 = vary(l0 + 0.15, 0.05);
  const l3 = vary(l0 + 0.20, 0.05);
  const l4 = vary(l0 + 0.35, 0.05);

  const createColor =
    (slot: PaletteSlot, h: number, s: number, l: number): PaletteColor => {
      return paletteColors[slot] ?? paletteColorFrom(fromHsl({h, s, l}), slot);
    };

  const pColors = {} as PaletteColors;

  pColors.color0 = createColor("color0", h0, s0, l0);
  pColors.color1 = createColor("color1", h0Complement, s0, l0);
  pColors.color2 = createColor("color2", h0, s2, l2);
  pColors.color3 = createColor("color3", h0Complement, s3, l3);
  pColors.color4 = createColor("color4", h0, s4, l4);

  return paletteFrom(pColors, "complementary");
}
