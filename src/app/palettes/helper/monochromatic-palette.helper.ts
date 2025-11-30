import {Palette, PaletteColors, PaletteSlot} from "@palettes/models/palette.model";
import {colorName} from "@common/helpers/color-name.helper";
import {paletteColorFrom} from "@palettes/models/palette-color.model";
import {paletteIdFromPalette} from "@palettes/helper/palette-id.helper";
import {randomBetween} from "@common/helpers/random.helper";
import {fromHsl} from "@common/helpers/color-from-hsl.helper";
import {styleCaptionFor} from "@palettes/models/palette-style.model";


const VARIANTS = [
  {s: 70, l: 30}, // color0
  {s: 60, l: 45}, // color1
  {s: 50, l: 60}, // color2
  {s: 40, l: 75}, // color3
  {s: 30, l: 85}, // color4
];

export function generateMonochromatic(paletteColors: Partial<PaletteColors> = {},
                                      seedHue?: number): Palette {
  const baseColor = paletteColors.color0?.color;
  const hue = baseColor ? baseColor.hsl()[0] : (seedHue ?? randomBetween(0, 360));

  const colors = VARIANTS
    .map((variant, index) => {
      const slot = `color${index}` as PaletteSlot;

      return paletteColors[slot] ?? paletteColorFrom(
        fromHsl({h: hue, s: variant.s, l: variant.l}),
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
    color4,
  };
  palette.id = paletteIdFromPalette(palette);

  return palette;
}
