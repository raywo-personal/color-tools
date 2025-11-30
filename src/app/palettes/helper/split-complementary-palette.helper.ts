import {Palette, PaletteColors, PaletteSlot} from "@palettes/models/palette.model";
import {randomBetween} from "@common/helpers/random.helper";
import {fromHsl} from "@common/helpers/color-from-hsl.helper";
import {styleCaptionFor} from "@palettes/models/palette-style.model";
import {colorName} from "@common/helpers/color-name.helper";
import {PaletteColor, paletteColorFrom} from "@palettes/models/palette-color.model";
import {paletteIdFromPalette} from "@palettes/helper/palette-id.helper";
import {hueWrap} from "@common/helpers/hsl.helper";


/**
 * Generates a split-complementary color palette based on the provided input
 * colors or a seed hue. The split-complementary scheme takes one base color
 * and pairs it with two colors adjacent to its complementary color, adding
 * balance and contrast to designs.
 *
 * @param {Partial<PaletteColors>} paletteColors - Optional fixed colors to use
 *                when generating the palette. Each provided color is left
 *                untouched, and the remaining colors are generated based on
 *                the provided seed hue. If no colors are provided, a random
 *                neutral color is generated.
 * @param {number} [seedHue] - An optional base hue value in degrees (0-360)
 *                             used to generate the color palette. If not
 *                             provided, a random hue is used.
 * @return {Palette} A palette object containing five colors adhering to the
 *                   split-complementary scheme.
 */
export function generateSplitComplementary(paletteColors: Partial<PaletteColors> = {},
                                           seedHue?: number): Palette {
  const baseColor = paletteColors.color0?.color;
  const hue = baseColor ? baseColor.hsl()[0] : seedHue ?? randomBetween(0, 360);

  const createColor =
    (slot: PaletteSlot, h: number, s: number, l: number): PaletteColor => {
      return paletteColors[slot] ?? paletteColorFrom(fromHsl({h, s, l}), slot);
    };

  const color0 = createColor("color0", hue, 70, 50);
  const color1 = createColor("color1", hueWrap(hue + 150), 70, 50);
  const color2 = createColor("color2", hueWrap(hue + 210), 70, 50);
  const color3 = createColor("color3", hue, 40, 70);
  const color4 = createColor("color4", hueWrap(hue + 180), 30, 80);

  const palette: Palette = {
    id: "",
    name: `${styleCaptionFor("split-complementary")} – ${colorName(color0.color)}`,
    style: "split-complementary",
    color0,
    color1,
    color2,
    color3,
    color4
  };
  palette.id = paletteIdFromPalette(palette);

  return palette;
}
