import {PaletteStyle} from '@palettes/models/palette-style.model';
import {generateVibrantBalanced} from '@palettes/helper/vibrant-palette.helper';
import {generateMutedAnalogSplit} from '@palettes/helper/muted-analog-split-palette.helper';
import {generateHighContrast} from '@palettes/helper/high-contrast-palette.helper';
import {Palette, PaletteColors} from "@palettes/models/palette.model";
import {generateMonochromatic} from "@palettes/helper/monochromatic-palette.helper";
import {generateComplementary} from "@palettes/helper/complementary-palette.helper";
import {generateTriadic} from "@palettes/helper/triadic-palette.helper";
import {generateAnalogous} from "@palettes/helper/analogous-palette.helper";
import {generateSplitComplementary} from "@palettes/helper/split-complementary-palette.helper";
import {generateHarmonic} from "@palettes/helper/harmonic-palette.helper";
import {generateRandom} from "@palettes/helper/random-palette.helper";
import {paletteIdFrom} from "@palettes/helper/palette-id.helper";
import {paletteName} from "@palettes/helper/palette-name.helper";


export function generatePalette(style: PaletteStyle,
                                paletteColors: Partial<PaletteColors> = {},
                                seedHue?: number): Palette {
  switch (style) {
    case "random":
      return generateRandom(paletteColors, seedHue);
    case "analogous":
      return generateAnalogous(paletteColors, seedHue);
    case 'muted-analog-split':
      return generateMutedAnalogSplit(paletteColors, seedHue);
    case "harmonic":
      return generateHarmonic(paletteColors, seedHue);
    case "monochromatic":
      return generateMonochromatic(paletteColors, seedHue);
    case 'vibrant-balanced':
      return generateVibrantBalanced(paletteColors, seedHue);
    case 'high-contrast':
      return generateHighContrast(paletteColors, seedHue);
    case "triadic":
      return generateTriadic(paletteColors, seedHue);
    case "complementary":
      return generateComplementary(paletteColors, seedHue);
    case "split-complementary":
      return generateSplitComplementary(paletteColors, seedHue);
    default:
      return generateRandom(paletteColors, seedHue);
  }
}


/**
 * Generates a palette object based on the provided palette colors and style.
 *
 * @param {PaletteColors} paletteColors - An object containing the colors of
 *                                        the palette.
 * @param {PaletteStyle} style - The style configuration for the palette.
 * @return {Palette} A complete palette object that includes an ID, name,
 *                   style, and color definitions.
 */
export function paletteFrom(paletteColors: PaletteColors,
                            style: PaletteStyle): Palette {
  return {
    id: paletteIdFrom(paletteColors, style),
    name: paletteName(style, paletteColors.color0.color),
    style,
    ...paletteColors
  };
}
