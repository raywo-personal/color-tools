import {Palette} from "@palettes/models/palette.model";
import {randomBetween} from "@common/helpers/random.helper";
import {fromHsl} from "@common/helpers/color-from-hsl.helper";
import {styleCaptionFor} from "@palettes/models/palette-style.model";
import {colorName} from "@common/helpers/color-name.helper";
import {paletteColorFrom} from "@palettes/models/palette-color.model";
import {paletteIdFromPalette} from "@palettes/helper/palette-id.helper";
import {hueWrap} from "@common/helpers/hsl.helper";


export function generateSplitComplementary(seedHue?: number): Palette {
  const hue = seedHue ?? randomBetween(0, 360);

  const color0 = fromHsl({h: hue, s: 70, l: 50});
  const color1 = fromHsl({h: hueWrap(hue + 150), s: 70, l: 50});
  const color2 = fromHsl({h: hueWrap(hue + 210), s: 70, l: 50});
  const color3 = fromHsl({h: hue, s: 40, l: 70});
  const color4 = fromHsl({h: hueWrap(hue + 180), s: 30, l: 80});

  const palette: Palette = {
    id: "",
    name: `${styleCaptionFor("split-complementary")} – ${colorName(color0)}`,
    style: "split-complementary",
    color0: paletteColorFrom(color0, "color0"),
    color1: paletteColorFrom(color1, "color1"),
    color2: paletteColorFrom(color2, "color2"),
    color3: paletteColorFrom(color3, "color3",),
    color4: paletteColorFrom(color4, "color4",),
  };
  palette.id = paletteIdFromPalette(palette);

  return palette;
}
