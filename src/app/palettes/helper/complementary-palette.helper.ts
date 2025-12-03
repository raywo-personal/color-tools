import {Palette, PaletteColors, PaletteSlot} from "@palettes/models/palette.model";
import {randomBetween} from "@common/helpers/random.helper";
import {fromHsl} from "@common/helpers/color-from-hsl.helper";
import {colorName} from "@common/helpers/color-name.helper";
import {PaletteColor, paletteColorFrom} from "@palettes/models/palette-color.model";
import {paletteIdFromPalette} from "@palettes/helper/palette-id.helper";
import {styleCaptionFor} from "@palettes/models/palette-style.model";
import {hueWrap} from "@common/helpers/hsl.helper";
import {vary} from "@palettes/helper/number.helper";


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

  const color0 = createColor("color0", h0, s0, l0);
  const color1 = createColor("color1", h0Complement, s0, l0);
  const color2 = createColor("color2", h0, s2, l2);
  const color3 = createColor("color3", h0Complement, s3, l3);
  const color4 = createColor("color4", h0, s4, l4);

  const palette: Palette = {
    id: "",
    name: `${styleCaptionFor("complementary")} – ${colorName(color0.color)}`,
    style: "complementary",
    color0,
    color1,
    color2,
    color3,
    color4
  };
  palette.id = paletteIdFromPalette(palette);

  return palette;
}
