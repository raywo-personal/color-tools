import {Palette, PaletteColors} from "@engine/palette/palette.model";
import {generateAnalogousBasedPalette} from "@engine/palette/analogous-based-palette.helper";


/**
 * The muted half of the family: every member keeps well under half of the
 * base's chroma, so the base is the one colour that carries and the rest
 * surround it. The counter lifts a little off the base as well, which is what
 * keeps it apart from a base it barely differs from in chroma.
 */
const MUTED_ANALOG_SPLIT_CONFIG = {
  analogsChromaFactor: 0.45,
  pastelChromaFactor: 0.28,
  splitChromaFactor: 0.32,
  splitLift: 0.10
};


/**
 * Generates a muted analog split color palette based on the provided
 * paletteColors and an optional seed hue.
 *
 * @param {Partial<PaletteColors>} paletteColors - Optional fixed colors to use
 *                when generating the palette. Each provided color is left
 *                untouched, and the remaining colors are generated from the
 *                OKLch coordinates of the base color. If no colors are
 *                provided, a random hue is used.
 * @param {number} [seedHue] - An optional base hue value in degrees (0-360)
 *                             used to generate the color palette. If not
 *                             provided, a random hue is used.
 * @return {Palette} A complete muted analog split palette containing five
 *                   colors.
 */
export function generateMutedAnalogSplit(paletteColors: Partial<PaletteColors> = {},
                                         seedHue?: number): Palette {
  return generateAnalogousBasedPalette(
    paletteColors,
    seedHue,
    MUTED_ANALOG_SPLIT_CONFIG,
    "muted-analog-split"
  );
}
