import {Palette, PaletteColors} from "@palettes/models/palette.model";
import {paletteColorFrom} from "@palettes/models/palette-color.model";
import chroma from "chroma-js";
import {randomBetween} from "@common/helpers/random.helper";
import {paletteFrom} from "@palettes/helper/palette.helper";


/**
 * Generates a random palette of colors based on optional input and a seed.
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
export function generateRandom(paletteColors: Partial<PaletteColors> = {},
                               seedHue?: number): Palette {
  const [h, s, l] = paletteColors.color0?.color.hsl() ?? [
    seedHue ?? randomBetween(0, 360),
    randomBetween(0, 1),
    randomBetween(0, 1)
  ];

  const pColors: PaletteColors = {
    color0: paletteColors.color0 ?? paletteColorFrom(chroma.hsl(h, s, l), "color0"),
    color1: paletteColors.color1 ?? paletteColorFrom(chroma.random(), "color1"),
    color2: paletteColors.color2 ?? paletteColorFrom(chroma.random(), "color2"),
    color3: paletteColors.color3 ?? paletteColorFrom(chroma.random(), "color3"),
    color4: paletteColors.color4 ?? paletteColorFrom(chroma.random(), "color4"),
  };

  return paletteFrom(pColors, "random");
}
