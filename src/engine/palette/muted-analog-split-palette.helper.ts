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
 * Generates a muted analog split color palette based on a given seed hue or
 * a random hue if no seed is provided.
 *
 * The palette consists of five colors: neutral, analogous, pastel, and
 * complementary.
 *
 * @param paletteColors - Optional fixed colors to use when generating the
 *                        palette. Each provided color is left untouched, and
 *                        the remaining colors are generated based on the
 *                        provided seed hue. If no colors are provided, a
 *                        random neutral color is generated.
 * @param {number} [seedHue] - Optional seed hue (in degrees) to generate the
 *                             color palette. If not provided, a random hue
 *                             is used.
 * @return {Palette} The palette with the generated colors, representing the
 *                   muted analog split palette, including neutral, analogous,
 *                   pastel, and complementary tones.
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
