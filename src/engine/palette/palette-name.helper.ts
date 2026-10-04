import {PaletteStyle} from "@engine/palette/palette-style.model";
import {Color} from "chroma-js";
import {colorName} from "@engine/color/color-name.helper";


export function paletteName(style: PaletteStyle,
                            firstColor: Color): string {
  const styleName = style
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return `${styleName} – ${colorName(firstColor)}`
}
