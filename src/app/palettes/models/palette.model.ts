import {genericPaletteColor, PaletteColor} from "@palettes/models/palette-color.model";
import {PaletteStyle} from "@palettes/models/palette-style.model";


export const PALETTE_SLOTS = ["color0", "color1", "color2", "color3", "color4"] as const;

export type PaletteSlot = typeof PALETTE_SLOTS[number];


interface PaletteBasics {

  id: string;
  name: string;
  style: PaletteStyle;

}

export type PaletteColors = Record<PaletteSlot, PaletteColor>;
export type Palette = PaletteBasics & PaletteColors;


export const EMPTY_PALETTE: Palette = {
  id: crypto.randomUUID(),
  name: "Empty palette",
  style: "muted-analog-split",
  color0: genericPaletteColor("color0"),
  color1: genericPaletteColor("color1"),
  color2: genericPaletteColor("color2"),
  color3: genericPaletteColor("color3"),
  color4: genericPaletteColor("color4"),
};
