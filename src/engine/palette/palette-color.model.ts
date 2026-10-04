import chroma, {Color} from "chroma-js";
import {PaletteSlot} from "@engine/palette/palette.model";


export interface PaletteColor {

  color: Color;
  startingColor: Color;
  slot: PaletteSlot;
  isPinned: boolean;

}


export function paletteColorFrom(color: Color,
                                 slot: PaletteSlot,
                                 startingColor: Color = color,
                                 isPinned = false): PaletteColor {
  return {
    color,
    startingColor,
    slot,
    isPinned
  };
}


export function genericPaletteColor(slot: PaletteSlot): PaletteColor {
  return {
    color: chroma("gray"),
    startingColor: chroma("gray"),
    slot,
    isPinned: false
  } as PaletteColor;
}
