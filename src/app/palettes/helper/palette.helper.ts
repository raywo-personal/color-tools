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


export function generatePalette(style: PaletteStyle, seedHue?: number): Palette {
  switch (style) {
    case 'vibrant-balanced':
      return generateVibrantBalanced(seedHue);
    case 'muted-analog-split':
      return generateMutedAnalogSplit(seedHue);
    case 'high-contrast':
      return generateHighContrast(seedHue);
    case "monochromatic":
      return generateMonochromatic(seedHue);
    case "complementary":
      return generateComplementary(seedHue);
    case "triadic":
      return generateTriadic(seedHue);
    case "analogous":
      return generateAnalogous(seedHue);
    case "split-complementary":
      return generateSplitComplementary(seedHue);
    default:
      return generateAnalogous(seedHue);
  }
}
