import {Palette} from "@palettes/models/palette.model";
import {fromHsl} from "@common/helpers/color-from-hsl.helper";
import {styleCaptionFor} from "@palettes/models/palette-style.model";
import {colorName} from "@common/helpers/color-name.helper";
import {paletteColorFrom} from "@palettes/models/palette-color.model";
import {paletteIdFromPalette} from "@palettes/helper/palette-id.helper";
import {clamp01} from "@common/helpers/hsl.helper";
import {vary} from "@palettes/helper/number.helper";
import {analogRange, splitComplement} from "@common/helpers/hue.helper";


export function generateAnalogous(seedHue?: number): Palette {
  const h0 = seedHue ?? Math.random() * 360;

  const neutral = fromHsl({
    h: h0,
    s: clamp01(vary(0.6, 0.03)),
    l: clamp01(vary(0.34, 0.05))
  });

  const analogs = analogRange(h0, 28, 2)
    .map(h => fromHsl({
        h: vary(h, 5),
        s: clamp01(vary(0.60, 0.10)),
        l: clamp01(vary(0.50, 0.10))
      })
    );

  const pastel = fromHsl({
    h: vary(h0 + 20, 6),
    s: clamp01(vary(0.55, 0.10)),
    l: clamp01(vary(0.82, 0.05))
  });

  const [sc1] = splitComplement(h0, 28);
  const counter = fromHsl({
    h: vary(sc1, 6),
    s: clamp01(vary(0.28, 0.08)),
    l: clamp01(vary(0.32, 0.08))
  });

  const palette: Palette = {
    id: "",
    name: `${styleCaptionFor("analogous")} – ${colorName(neutral)}`,
    style: "analogous",
    color0: paletteColorFrom(neutral, "color0"),
    color1: paletteColorFrom(analogs[0], "color1"),
    color2: paletteColorFrom(pastel, "color2"),
    color3: paletteColorFrom(counter, "color3"),
    color4: paletteColorFrom(analogs[1], "color4"),
  };
  palette.id = paletteIdFromPalette(palette);

  return palette;
}
