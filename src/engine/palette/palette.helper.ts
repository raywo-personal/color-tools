import {PaletteStyle} from "@engine/palette/palette-style.model";
import {generateVibrantBalanced} from "@engine/palette/vibrant-palette.helper";
import {generateMutedAnalogSplit} from "@engine/palette/muted-analog-split-palette.helper";
import {generateHighContrast} from "@engine/palette/high-contrast-palette.helper";
import {Palette, PaletteColors} from "@engine/palette/palette.model";
import {generateMonochromatic} from "@engine/palette/monochromatic-palette.helper";
import {generateComplementary} from "@engine/palette/complementary-palette.helper";
import {generateTriadic} from "@engine/palette/triadic-palette.helper";
import {generateAnalogous} from "@engine/palette/analogous-palette.helper";
import {generateSplitComplementary} from "@engine/palette/split-complementary-palette.helper";
import {generateHarmonic} from "@engine/palette/harmonic-palette.helper";
import {generateRandom} from "@engine/palette/random-palette.helper";
import {paletteIdFrom} from "@engine/palette/palette-id.helper";
import {paletteName} from "@engine/palette/palette-name.helper";
import {Color} from "chroma-js";
import {paletteColorFrom} from "@engine/palette/palette-color.model";
import {withSeed} from "@engine/helpers/random.helper";


export function generatePalette(style: PaletteStyle,
                                paletteColors: Partial<PaletteColors> = {},
                                seedHue?: number): Palette {
  switch (style) {
    case "random":
      return generateRandom(paletteColors, seedHue);
    case "analogous":
      return generateAnalogous(paletteColors, seedHue);
    case "muted-analog-split":
      return generateMutedAnalogSplit(paletteColors, seedHue);
    case "harmonic":
      return generateHarmonic(paletteColors, seedHue);
    case "monochromatic":
      return generateMonochromatic(paletteColors, seedHue);
    case "vibrant-balanced":
      return generateVibrantBalanced(paletteColors, seedHue);
    case "high-contrast":
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
 * A palette built on a given color: the color is `color0`, and the generator
 * derives the other four from it, with its jitter drawn from `seed`.
 *
 * This is how every palette on the Studio comes about - the base color is the
 * one the visitor is working on, so the palette says what goes with *that*
 * color rather than with a hue rolled beside it. The seed is what lets the
 * palette follow a slider drag: the same seed on every frame keeps the
 * generator's variations still while the base moves, so the four derived
 * swatches glide with it instead of flickering. A new seed is a new roll.
 *
 * The base arrives unpinned: pinning is a gesture of its own, and the base
 * needs none, because the next palette is built on the current color anyway.
 */
export function generatePaletteFrom(base: Color,
                                    style: PaletteStyle,
                                    seed: number,
                                    paletteColors: Partial<PaletteColors> = {}): Palette {
  return withSeed(seed, () => generatePalette(style, {
    ...paletteColors,
    color0: paletteColorFrom(base, "color0")
  }));
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
    ...paletteColors,
    id: paletteIdFrom(paletteColors, style),
    name: paletteName(style, paletteColors.color0.color),
    style
  };
}
