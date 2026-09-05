import {Palette, PaletteColors} from "@engine/palette/palette.model";
import {PaletteStyle} from "@engine/palette/palette-style.model";
import {fromHsl} from "@engine/color/color-from-hsl.helper";
import {paletteColorFrom} from "@engine/palette/palette-color.model";
import {clamp01} from "@engine/color/hsl.helper";
import {vary} from "@engine/palette/variation.helper";
import {analogRange, splitComplement} from "@engine/color/hue.helper";
import {Color} from "chroma-js";
import {randomBetween} from "@engine/helpers/random.helper";
import {paletteFrom} from "@engine/palette/palette.helper";


/**
 * Configuration for generating analogous-based palettes with different
 * saturation and lightness variations.
 */
interface AnalogousBasedPaletteConfig {
  /** Base saturation offset for analog colors (color1 & color4). */
  analogsSaturationBase: number;

  /** Saturation offset for pastel color (color2). */
  pastelSaturationOffset: number;

  /** Saturation offset for complement color (color3). */
  complementSaturationOffset: number;

  /** Lightness offset for complement color (color3). */
  complementLightnessOffset: number;
}


/**
 * Generates an analogous-based color palette with configurable variations.
 * This is a shared helper function used by both analogous and muted-analog-split
 * palette generators.
 *
 * @param {Partial<PaletteColors>} paletteColors - Optional fixed colors to use
 *                when generating the palette. Each provided color is left
 *                untouched, and the remaining colors are generated based on
 *                the full HSL values of the pinned color. If no colors are
 *                provided, a random neutral color is generated.
 * @param {number} [seedHue] - An optional base hue value in degrees (0-360)
 *                             used to generate the color palette. If not
 *                             provided, a random hue is used.
 * @param {AnalogousBasedPaletteConfig} config - Configuration object that
 *                                               defines the saturation and
 *                                               lightness variations for
 *                                               different color roles.
 * @param {PaletteStyle} style - The palette style name for the returned palette.
 * @return {Palette} A complete analogous-based palette containing five colors.
 */
export function generateAnalogousBasedPalette(
  paletteColors: Partial<PaletteColors> = {},
  seedHue: number | undefined,
  config: AnalogousBasedPaletteConfig,
  style: PaletteStyle
): Palette {
  const existingNeutral = paletteColors.color0;

  const [h, s, l] = existingNeutral?.color.hsl() ?? [];
  const h0 = h ?? seedHue ?? randomBetween(0, 360);
  const s0 = s ?? 0.6;
  const l0 = l ?? 0.34;

  const pColors = {} as PaletteColors;

  pColors.color0 = existingNeutral ?? paletteColorFrom(
    fromHsl({
      h: h0,
      s: clamp01(vary(s0, 0.03)),
      l: clamp01(vary(l0, 0.05))
    }),
    "color0"
  );

  // Analogs are color1 & color4
  let analogs: Color[] = [];
  if (!paletteColors.color1 || !paletteColors.color4) {
    analogs = analogRange(h0, 28, 2)
      .map(h => fromHsl({
          h: vary(h, 5),
          s: clamp01(vary(s0 + config.analogsSaturationBase, 0.10)),
          l: clamp01(vary(l0 + 0.16, 0.10))
        })
      );
  }

  pColors.color1 = paletteColors.color1 ?? paletteColorFrom(analogs[0], "color1");
  pColors.color4 = paletteColors.color4 ?? paletteColorFrom(analogs[1], "color4");

  // Pastel
  pColors.color2 = paletteColors.color2 ?? paletteColorFrom(
    fromHsl({
      h: vary(h0 + 20, 6),
      s: clamp01(vary(s0 + config.pastelSaturationOffset, 0.10)),
      l: clamp01(vary(l0 + 0.48, 0.05))
    }),
    "color2"
  );

  // Counter / Split Complement
  pColors.color3 = paletteColors.color3 ?? paletteColorFrom(
    fromHsl({
      h: vary(splitComplement(h0, 28)[0], 6),
      s: clamp01(vary(s0 + config.complementSaturationOffset, 0.08)),
      l: clamp01(vary(l0 + config.complementLightnessOffset, 0.08))
    }),
    "color3"
  );

  return paletteFrom(pColors, style);
}
