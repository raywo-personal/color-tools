import {Palette, PaletteColors, PaletteSlot} from "@palettes/models/palette.model";
import {colorName} from "@common/helpers/color-name.helper";
import {paletteColorFrom} from "@palettes/models/palette-color.model";
import {paletteIdFromPalette} from "@palettes/helper/palette-id.helper";
import {randomBetween} from "@common/helpers/random.helper";
import {styleCaptionFor} from "@palettes/models/palette-style.model";
import chroma from "chroma-js";


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
  const scale = chroma
    .bezier([start.hex(), end.hex()])
    .scale()
    .correctLightness();

  const colors = scale
    .colors(5)
    .map((hexColor, index) => {
      const slot = `color${index}` as PaletteSlot;

      return paletteColors[slot] ?? paletteColorFrom(
        chroma(hexColor),
        slot
      );
    });

  const [color0, color1, color2, color3, color4] = colors;

  const palette: Palette = {
    id: "",
    name: `${styleCaptionFor("monochromatic")} – ${colorName(color0.color)}`,
    style: "monochromatic",
    color0,
    color1,
    color2,
    color3,
    color4
  };
  palette.id = paletteIdFromPalette(palette);

  return palette;
}
