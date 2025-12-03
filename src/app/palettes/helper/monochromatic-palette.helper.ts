import {Palette, PaletteColors, PaletteSlot} from "@palettes/models/palette.model";
import {colorName} from "@common/helpers/color-name.helper";
import {paletteColorFrom} from "@palettes/models/palette-color.model";
import {paletteIdFromPalette} from "@palettes/helper/palette-id.helper";
import {randomBetween} from "@common/helpers/random.helper";
import {fromHsl} from "@common/helpers/color-from-hsl.helper";
import {styleCaptionFor} from "@palettes/models/palette-style.model";


const VARIANTS = [
  {s: 0, l: 0},    // color0 (base)
  {s: -10, l: 15}, // color1
  {s: -20, l: 30}, // color2
  {s: -30, l: 45}, // color3
  {s: -40, l: 55}, // color4
];

export function generateMonochromatic(paletteColors: Partial<PaletteColors> = {},
                                      seedHue?: number): Palette {
  const baseColor = paletteColors.color0?.color;
  const [h, s, l] = baseColor?.hsl() ?? [];
  const hue = h ?? seedHue ?? randomBetween(0, 360);
  const baseSat = s ?? 0.70;
  const baseLight = l ?? 0.30;

  const colors = VARIANTS
    .map((variant, index) => {
      const slot = `color${index}` as PaletteSlot;

      return paletteColors[slot] ?? paletteColorFrom(
        fromHsl({
          h: hue,
          s: baseSat + variant.s / 100,
          l: baseLight + variant.l / 100
        }),
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
