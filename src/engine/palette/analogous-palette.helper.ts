import {Palette, PaletteColors} from "@engine/palette/palette.model";
import {generateAnalogousBasedPalette} from "@engine/palette/analogous-based-palette.helper";


/**
 * The colourful half of the family: the analogs keep the base's chroma whole,
 * so the three of them read as one colour turned slightly. The counter keeps
 * half of it and stays at the base's lightness, where it answers the analogs
 * rather than joining them.
 */
const ANALOGOUS_CONFIG = {
  analogsChromaFactor: 1,
  pastelChromaFactor: 0.40,
  splitChromaFactor: 0.50,
  splitLift: 0
};

/**
 * Generates an analogous color palette based on the provided paletteColors and
 * an optional seed hue.
 *
 * @param {Partial<PaletteColors>} paletteColors - Optional fixed colors to use
 *                when generating the palette. Each provided color is left
 *                untouched, and the remaining colors are generated from the
 *                OKLch coordinates of the base color. If no colors are
 *                provided, a random hue is used.
 * @param {number} [seedHue] - An optional base hue value in degrees (0-360)
 *                             used to generate the color palette. If not
 *                             provided, a random hue is used.
 * @return {Palette} A complete analogous palette containing five colors.
 */
export function generateAnalogous(paletteColors: Partial<PaletteColors> = {},
                                  seedHue?: number): Palette {
  return generateAnalogousBasedPalette(
    paletteColors,
    seedHue,
    ANALOGOUS_CONFIG,
    "analogous"
  );
}
