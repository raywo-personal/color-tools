import {Palette, PaletteColors, PaletteSlot} from "@palettes/models/palette.model";
import {randomBetween} from "@common/helpers/random.helper";
import {fromHsl} from "@common/helpers/color-from-hsl.helper";
import {colorName} from "@common/helpers/color-name.helper";
import {PaletteColor, paletteColorFrom} from "@palettes/models/palette-color.model";
import {paletteIdFromPalette} from "@palettes/helper/palette-id.helper";
import {styleCaptionFor} from "@palettes/models/palette-style.model";
import {hueWrap} from "@common/helpers/hsl.helper";


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
  const hue = baseColor ? baseColor.hsl()[0] : seedHue ?? randomBetween(0, 360);
  const complementHue = hueWrap(hue + 180);

  const createColor =
    (slot: PaletteSlot, h: number, s: number, l: number): PaletteColor => {
      return paletteColors[slot] ?? paletteColorFrom(fromHsl({h, s, l}), slot);
    };

  const color0 = createColor("color0", hue, 70, 50);
  const color1 = createColor("color1", complementHue, 70, 50);
  const color2 = createColor("color2", hue, 60, 65);
  const color3 = createColor("color3", complementHue, 50, 70);
  const color4 = createColor("color4", hue, 30, 85);

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
