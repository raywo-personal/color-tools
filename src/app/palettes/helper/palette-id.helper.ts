import chroma, {Color} from "chroma-js";
import {bigIntToBase62} from "@common/helpers/base62.helper";
import {PaletteStyle, PaletteStyles, randomStyle} from "@palettes/models/palette-style.model";
import {Palette, PALETTE_SLOTS, PaletteColors} from "@palettes/models/palette.model";
import {paletteName} from "@palettes/helper/palette-name.helper";
import {paletteColorFrom} from "@palettes/models/palette-color.model";
import {getBytesFromId} from "@common/helpers/get-bytes-from-string.helper";
import {isRestorable, validateId} from "@common/helpers/validate-string-id.helper";


/**
 * Expected length of the base62-encoded part of the palette ID.
 * This represents 31 bytes (30 for RGB values + 1 for pinned mask) encoded in base62.
 * Maximum value: 256^31 - 1 requires 42 characters in base62.
 */
export const PALETTE_ID_BASE62_LENGTH = 42 + 1;


/**
 * Generates a unique palette ID based on the provided colors and style.
 *
 * @param {PaletteColors} paletteColors - The PaletteColors object, the palette
 *                                        is based upon.
 * @param {PaletteStyle} style - The style of the palette.
 * @return {string} A unique identifier for the given palette.
 */
export function paletteIdFrom(paletteColors: PaletteColors,
                              style: PaletteStyle): string {
  const pColors = PALETTE_SLOTS
    .map(slot => paletteColors[slot]);

  const colors: Color[] = [
    ...pColors.map(pc => pc.color),
    ...pColors.map(pc => pc.startingColor),
  ];

  // Create a bitmask for the pinned state
  const pinnedMask = pColors
    .reduce((mask, pc, index) => {
      return pc.isPinned ? mask | (1 << index) : mask;
    }, 0);

  return paletteIdFromColors(colors, style, pinnedMask);
}


/**
 * Generates a palette object from a given palette ID.
 *
 * The function restores color and style details associated with the ID
 * to construct the palette. If the style cannot be derived from the ID,
 * a random style is used instead.
 *
 * @param {string} id - The unique identifier of the palette to restore.
 * @return {Palette} An object containing the restored palette information
 *                   including colors, style, and name.
 * @throws {Error} If the provided palette ID is not restorable.
 */
export function paletteFromId(id: string): Palette {
  if (!isRestorable(id, PALETTE_ID_BASE62_LENGTH)) {
    throw new Error("Palette ID is not restorable");
  }

  const colors = colorsFromId(id);
  const pinnedMask = pinnedMaskFromId(id);
  const style = styleFromPaletteId(id);

  const paletteColors = PALETTE_SLOTS
    .reduce((acc, slot, index) => {
      const isPinned = (pinnedMask & (1 << index)) !== 0;
      // Colors 0-4 are the main colors, 5-9 are the starting colors
      acc[slot] = paletteColorFrom(colors[index], slot, colors[index + 5], isPinned);

      return acc;
    }, {} as any);

  return {
    id,
    name: paletteName(style, colors[0]),
    style,
    ...paletteColors
  } as Palette;
}


/**
 * Generates a unique palette ID based on an array of palette colors and a
 * specified palette style.
 *
 * This ID will start with a style index and then contain a base62-encoded
 * representation of the RGB values representing the colors and starting
 * colors. It ends with a bitmask indicating which colors are pinned.
 *
 * @param {Color[]} colors - An array of 10 Color objects used to define the
 *                           palette. The first five colors represent the actual
 *                           colors, while the last five represent the starting
 *                           colors.
 * @param {PaletteStyle} style - The style of the palette, which must be a
 *                               valid member of the `PaletteStyles` array.
 * @param pinnedMask - A bitmask indicating which colors are pinned.
 * @return {string} A unique string identifier for the palette, constructed
 *                  using the colors and style.
 * @throws {Error} If the number of colors is not exactly 10 or if the
 *                 specified style is invalid.
 */
function paletteIdFromColors(colors: Color[],
                             style: PaletteStyle,
                             pinnedMask: number = 0): string {
  if (colors.length !== 10) {
    throw new Error("Exactly 10 colors required");
  }

  const styleIndex = PaletteStyles.indexOf(style);
  if (styleIndex === -1) {
    throw new Error(`Unknown palette style: ${style}`);
  }

  // Collect all RGB values of all colors. Each rgb value is a byte.
  const bytes: number[] = [];
  colors.forEach(color => bytes.push(...color.rgb()));

  // Append the pinned mask as the last byte
  bytes.push(pinnedMask);

  // Convert all bytes to a single big integer
  let bigNumber = 0n;
  bytes.forEach(byte => {
    bigNumber = bigNumber * 256n + BigInt(byte);
  });

  // Use fixed length to ensure a consistent I D length regardless of color values
  return `${styleIndex}${bigIntToBase62(bigNumber, PALETTE_ID_BASE62_LENGTH - 1)}`;
}


/**
 * Extracts the colors from a palette ID.
 */
function colorsFromId(id: string): Color[] {
  const bytes = getBytesFromId(id, PALETTE_ID_BASE62_LENGTH);
  const colors: Color[] = [];

  // We expect exactly 30 bytes for colors (10 colors * 3 RGB channels)
  for (let i = 0; i < 30; i += 3) {
    const color = chroma.rgb(bytes[i], bytes[i + 1], bytes[i + 2]);
    colors.push(color);
  }

  return colors;
}


/**
 * Extracts the pinned mask from a palette ID.
 */
function pinnedMaskFromId(id: string): number {
  const bytes = getBytesFromId(id, PALETTE_ID_BASE62_LENGTH);

  // If we have 31 bytes, the last one is the pinned mask
  if (bytes.length === 31) {
    return bytes[30];
  }

  return 0;
}


/**
 * Retrieves the style associated with the given palette ID.
 * The palette ID is expected to start with a valid style index. If the style
 * could not be determined, a random style is returned instead.
 *
 * @param {string} id - The unique palette ID used to determine the style. Must
 *                      be exactly 42 characters long.
 * @return {PaletteStyle} The style object corresponding to the provided
 *                        palette ID or a random style if the ID is invalid.
 */
function styleFromPaletteId(id: string): PaletteStyle {
  validateId(id, PALETTE_ID_BASE62_LENGTH);

  // Erste Stelle ist der Style-Index
  const styleIndex = parseInt(id[0], 10);

  if (isNaN(styleIndex) || styleIndex < 0 || styleIndex >= PaletteStyles.length) {
    console.info("Style not found. Using random style.");
    return randomStyle();
  }

  return PaletteStyles[styleIndex];
}
