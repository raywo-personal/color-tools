import {findClosestSizeKey} from "@engine/contrast/apca-rating.helper";
import {FontSize} from "@engine/contrast/apca-lookup-table.model";

export const PIXEL_FONT_SIZE_PATTERN = /^\d+(\.\d+)?px$/;

export function fontSizeKeyFrom(rawFontSize: string | number): FontSize {
  const fontSize = typeof rawFontSize === "number"
    ? rawFontSize
    : parsePixelFontSize(rawFontSize);

  return findClosestSizeKey(fontSize);
}

function parsePixelFontSize(rawFontSize: string): number {
  if (!PIXEL_FONT_SIZE_PATTERN.test(rawFontSize)) {
    throw new Error("Invalid font size format");
  }

  return Number.parseFloat(rawFontSize);
}
