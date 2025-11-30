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


export function generatePalette(style: PaletteStyle,
                                paletteColors: Partial<PaletteColors> = {},
                                seedHue?: number): Palette {
  switch (style) {
    case "analogous":
      return generateAnalogous(paletteColors, seedHue);
    case 'muted-analog-split':
      return generateMutedAnalogSplit(paletteColors, seedHue);
    case "monochromatic":
      return generateMonochromatic(paletteColors, seedHue);
    case 'vibrant-balanced':
      return generateVibrantBalanced(paletteColors, seedHue);
    case 'high-contrast':
      return generateHighContrast(paletteColors, seedHue);
    case "triadic":
      return generateTriadic(seedHue);
    case "complementary":
      return generateComplementary(seedHue);
    case "split-complementary":
      return generateSplitComplementary(seedHue);
    default:
      return generateAnalogous(paletteColors, seedHue);
  }
}
