import {Palette, PALETTE_SLOTS, PaletteColors} from "@palettes/models/palette.model";
import {paletteColorFrom} from "@palettes/models/palette-color.model";
import chroma from "chroma-js";
import {styleCaptionFor} from "@palettes/models/palette-style.model";
import {colorName} from "@common/helpers/color-name.helper";
import {paletteIdFromPalette} from "@palettes/helper/palette-id.helper";
import {randomBetween} from "@common/helpers/random.helper";


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

  const [color0, color1, color2, color3, color4] = PALETTE_SLOTS
    .map(slot => {
      if (slot === "color0") {
        return paletteColorFrom(chroma.hsl(h, s, l), slot);
      }

      return paletteColors[slot] ?? paletteColorFrom(chroma.random(), slot);
    });

  const palette: Palette = {
    id: "",
    name: `${styleCaptionFor("random")} – ${colorName(color0.color)}`,
    style: "random",
    color0,
    color1,
    color2,
    color3,
    color4
  };
  palette.id = paletteIdFromPalette(palette);

  return palette;
}
