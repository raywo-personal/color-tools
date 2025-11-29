import {PaletteStyle} from '@palettes/models/palette-style.model';
import {generateVibrantBalanced} from '@palettes/helper/vibrant-palette.helper';
import {generateMutedAnalogSplit} from '@palettes/helper/muted-analog-split-palette.helper';
import {generateHighContrast} from '@palettes/helper/high-contrast-palette.helper';
import {Palette} from "@palettes/models/palette.model";
import {generateMonochromatic} from "@palettes/helper/monochromatic-palette.helper";
import {generateComplementary} from "@palettes/helper/complementary-palette.helper";
import {generateTriadic} from "@palettes/helper/triadic-palette.helper";
import {generateAnalogous} from "@palettes/helper/analogous-palette.helper";
import {generateSplitComplementary} from "@palettes/helper/split-complementary-palette.helper";
import {PaletteColor} from "@palettes/models/palette-color.model";


export function generatePalette(style: PaletteStyle,
                                fixedColors: PaletteColor[] = [],
                                seedHue?: number): Palette {
  switch (style) {
    case "analogous":
      return generateAnalogous(fixedColors, seedHue);
    case 'muted-analog-split':
      return generateMutedAnalogSplit(fixedColors, seedHue);
    case "monochromatic":
      return generateMonochromatic(fixedColors, seedHue);
    case 'vibrant-balanced':
      return generateVibrantBalanced(fixedColors, seedHue);
    case 'high-contrast':
      return generateHighContrast(fixedColors, seedHue);
    case "triadic":
      return generateTriadic(seedHue);
    case "complementary":
      return generateComplementary(seedHue);
    case "split-complementary":
      return generateSplitComplementary(seedHue);
    default:
      return generateAnalogous(fixedColors, seedHue);
  }
}
