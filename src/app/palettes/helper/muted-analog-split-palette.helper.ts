import {Palette, PaletteColors} from "@palettes/models/palette.model";
import {generateAnalogousBasedPalette} from "@palettes/helper/analogous-based-palette.helper";


const MUTED_ANALOG_SPLIT_CONFIG = {
  analogsSaturationBase: -0.40,
  pastelSaturationOffset: -0.15,
  complementSaturationOffset: -0.42,
  complementLightnessOffset: 0.08
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
