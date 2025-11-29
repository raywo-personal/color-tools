import {Palette} from "@palettes/models/palette.model";
import {randomBetween} from "@common/helpers/random.helper";
import {fromHsl} from "@common/helpers/color-from-hsl.helper";
import {colorName} from "@common/helpers/color-name.helper";
import {paletteColorFrom} from "@palettes/models/palette-color.model";
import {paletteIdFromPalette} from "@palettes/helper/palette-id.helper";
import {styleCaptionFor} from "@palettes/models/palette-style.model";


export function generateComplementary(seedHue?: number): Palette {
  const hue = seedHue ?? randomBetween(0, 360);
  const complementHue = hue + 180;

  const color0 = fromHsl({h: hue, s: 70, l: 50});
  const color1 = fromHsl({h: complementHue, s: 70, l: 50});
  const color2 = fromHsl({h: hue, s: 60, l: 65});
  const color3 = fromHsl({h: complementHue, s: 50, l: 70});
  const color4 = fromHsl({h: hue, s: 30, l: 85});

  const palette: Palette = {
    id: "",
    name: `${styleCaptionFor("complementary")} – ${colorName(color0)}`,
    style: "complementary",
    color0: paletteColorFrom(color0, "color0"),
    color1: paletteColorFrom(color1, "color1"),
    color2: paletteColorFrom(color2, "color2"),
    color3: paletteColorFrom(color3, "color3",),
    color4: paletteColorFrom(color4, "color4",),
  };
  palette.id = paletteIdFromPalette(palette);

  return palette;
}
