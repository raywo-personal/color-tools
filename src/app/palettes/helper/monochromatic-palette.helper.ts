import {Palette, PALETTE_SLOTS, PaletteColors} from "@palettes/models/palette.model";
import {paletteColorFrom} from "@palettes/models/palette-color.model";
import {randomBetween} from "@common/helpers/random.helper";
import chroma from "chroma-js";
import {paletteFrom} from "@palettes/helper/palette.helper";


export function generateMonochromatic(paletteColors: Partial<PaletteColors> = {},
                                      seedHue?: number): Palette {
  const baseColor = paletteColors.color0?.color;
  const [h, s, l] = baseColor?.hsl() ?? [];
  const hue = h ?? seedHue ?? randomBetween(0, 360);
  const sat = s ?? 0.70;
  const lum = l ?? 0.30;

  const start = chroma.hsl(hue, sat, lum);
  const end = chroma.hsl(
    hue,
    sat < 0.30 ? 0 : 0.30,
    lum > 0.85 ? 1.0 : 0.85
  );

  const scaleColors = chroma
    .bezier([start.hex(), end.hex()])
    .scale()
    .correctLightness()
    .colors(PALETTE_SLOTS.length);

  const pColors = PALETTE_SLOTS
    .reduce((acc, slot, index) => {
      acc[slot] =
        paletteColors[slot] ??
        paletteColorFrom(chroma(scaleColors[index]), slot);

      return acc;
    }, {} as PaletteColors);

  return paletteFrom(pColors, "monochromatic");
}
