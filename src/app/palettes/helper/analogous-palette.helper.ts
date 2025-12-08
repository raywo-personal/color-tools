import {Palette, PaletteColors} from "@palettes/models/palette.model";
import {generateAnalogousBasedPalette} from "@palettes/helper/analogous-based-palette.helper";


const ANALOGOUS_CONFIG = {
  analogsSaturationBase: 0,
  pastelSaturationOffset: -0.05,
  complementSaturationOffset: -0.32,
  complementLightnessOffset: -0.02
};

/**
 * Generates an analogous color palette based on the provided paletteColors and
 * an optional seed hue.
 *
 * @param {Partial<PaletteColors>} paletteColors - Optional fixed colors to use
 *                when generating the palette. Each provided color is left
 *                untouched, and the remaining colors are generated based on
 *                the full HSL values of the pinned color. If no colors are
 *                provided, a random neutral color is generated.
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
