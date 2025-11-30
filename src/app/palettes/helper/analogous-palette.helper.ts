import {Palette, PaletteColors} from "@palettes/models/palette.model";
import {fromHsl} from "@common/helpers/color-from-hsl.helper";
import {styleCaptionFor} from "@palettes/models/palette-style.model";
import {colorName} from "@common/helpers/color-name.helper";
import {paletteColorFrom} from "@palettes/models/palette-color.model";
import {paletteIdFromPalette} from "@palettes/helper/palette-id.helper";
import {clamp01} from "@common/helpers/hsl.helper";
import {vary} from "@palettes/helper/number.helper";
import {analogRange, splitComplement} from "@common/helpers/hue.helper";
import {Color} from "chroma-js";


export function generateAnalogous(paletteColors: Partial<PaletteColors> = {},
                                  seedHue?: number): Palette {
  const existingNeutral = paletteColors.color0;
  const h0 = seedHue ?? Math.random() * 360;

  const color0 = existingNeutral ?? paletteColorFrom(
    fromHsl({
      h: h0,
      s: clamp01(vary(0.6, 0.03)),
      l: clamp01(vary(0.34, 0.05))
    }),
    "color0"
  );

  // Analogs are color1 & color4
  let analogs: Color[] = [];
  if (!paletteColors.color1 || !paletteColors.color4) {
    analogs = analogRange(h0, 28, 2)
      .map(h => fromHsl({
          h: vary(h, 5),
          s: clamp01(vary(0.60, 0.10)),
          l: clamp01(vary(0.50, 0.10))
        })
      );
  }

  const color1 = paletteColors.color1 ?? paletteColorFrom(analogs[0], "color1");
  const color4 = paletteColors.color4 ?? paletteColorFrom(analogs[1], "color4");

  // Pastel
  const color2 = paletteColors.color2 ?? paletteColorFrom(
    fromHsl({
      h: vary(h0 + 20, 6),
      s: clamp01(vary(0.55, 0.10)),
      l: clamp01(vary(0.82, 0.05))
    }),
    "color2"
  );

  // Counter / Split Complement
  const color3 = paletteColors.color3 ?? paletteColorFrom(
    fromHsl({
      h: vary(splitComplement(h0, 28)[0], 6),
      s: clamp01(vary(0.28, 0.08)),
      l: clamp01(vary(0.32, 0.08))
    }),
    "color3"
  );

  const palette: Palette = {
    id: "",
    name: `${styleCaptionFor("analogous")} – ${colorName(color0.color)}`,
    style: "analogous",
    color0,
    color1,
    color2,
    color3,
    color4,
  };
  palette.id = paletteIdFromPalette(palette);

  return palette;
}
