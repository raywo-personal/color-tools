import {Palette} from "@palettes/models/palette.model";
import {randomBetween} from "@common/helpers/random.helper";
import {fromHsl} from "@common/helpers/color-from-hsl.helper";
import {styleCaptionFor} from "@palettes/models/palette-style.model";
import {colorName} from "@common/helpers/color-name.helper";
import {paletteColorFrom} from "@palettes/models/palette-color.model";
import {paletteIdFromPalette} from "@palettes/helper/palette-id.helper";
import {triad} from "@common/helpers/hue.helper";
import {clamp01} from "@common/helpers/hsl.helper";
import {vary} from "@palettes/helper/number.helper";


export function generateTriadic(seedHue?: number): Palette {
  const hue = seedHue ?? randomBetween(0, 360);
  const triadHues = triad(hue);
  const firstThree = triadHues
    .map(h => fromHsl({h, s: 70, l: 50}));

  const color3 = fromHsl({
    h: triadHues[0],
    s: clamp01(vary(0.05, 0.03)),
    l: clamp01(vary(0.55, 0.05))
  });
  const color4 = fromHsl({
    h: triadHues[1],
    s: clamp01(vary(0.05, 0.03)),
    l: clamp01(vary(0.55, 0.05))
  });

  const palette: Palette = {
    id: "",
    name: `${styleCaptionFor("triadic")} – ${colorName(firstThree[0])}`,
    style: "triadic",
    color0: paletteColorFrom(firstThree[0], "color0"),
    color1: paletteColorFrom(firstThree[1], "color1"),
    color2: paletteColorFrom(firstThree[2], "color2"),
    color3: paletteColorFrom(color3, "color3",),
    color4: paletteColorFrom(color4, "color4",),
  };
  palette.id = paletteIdFromPalette(palette);

  return palette;
}
