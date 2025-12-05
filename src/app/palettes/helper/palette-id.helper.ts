import chroma, {Color} from "chroma-js";
import {base62ToBigInt, bigIntToBase62} from "@common/helpers/base62.helper";
import {PaletteStyle, PaletteStyles, randomStyle} from "@palettes/models/palette-style.model";
import {Palette, PALETTE_SLOTS, PaletteColors} from "@palettes/models/palette.model";
import {paletteName} from "@palettes/helper/palette-name.helper";
import {paletteColorFrom} from "@palettes/models/palette-color.model";


/**
 * Expected length of the base62-encoded part of the palette ID.
 * This represents 31 bytes (30 for RGB values + 1 for pinned mask) encoded in base62.
 * Maximum value: 256^31 - 1 requires 42 characters in base62.
 */
const PALETTE_ID_BASE62_LENGTH = 42;


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
 * @deprecated Use `paletteIdFrom` instead.
 * Generates a unique palette ID based on the colors and style of the
 * provided palette.
 *
 * @param {Palette} palette - The palette object containing color and style data.
 * @return {string} A unique identifier for the given palette.
 */
export function paletteIdFromPalette(palette: Palette): string {
  const paletteColors = PALETTE_SLOTS.map(slot => palette[slot]);

  const colors: Color[] = [
    ...paletteColors.map(pc => pc.color),
    ...paletteColors.map(pc => pc.startingColor),
  ];

  // Create a bitmask for the pinned state
  const pinnedMask = paletteColors
    .reduce((mask, pc, index) => {
      return pc.isPinned ? mask | (1 << index) : mask;
    }, 0);

  return paletteIdFromColors(colors, palette.style, pinnedMask);
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
  if (!isRestorable(id)) {
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
 * Determines if a palette with the given ID can be restored.
 *
 * @param {string} id - The unique identifier of the palette.
 * @return {boolean} True if the palette is restorable, otherwise false.
 */
export function isRestorable(id: string): boolean {
  try {
    validatePaletteId(id);
    return true;
  } catch (err) {
    return false;
  }
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
    throw new Error('Exactly 10 colors required');
  }

  const styleIndex = PaletteStyles.indexOf(style);
  if (styleIndex === -1) {
    throw new Error(`Unknown palette style: ${style}`);
  }

  // Collect all RGB values of all colors. Each rgb value is a byte.
  const bytes: number[] = [];
  colors.forEach(color => {
    const [r, g, b] = color.rgb();
    bytes.push(Math.round(r), Math.round(g), Math.round(b));
  });

  // Append the pinned mask as the last byte
  bytes.push(pinnedMask);

  // Convert all bytes to a single big integer
  let bigNumber = 0n;
  bytes.forEach(byte => {
    bigNumber = bigNumber * 256n + BigInt(byte);
  });

  // Use fixed length to ensure a consistent I D length regardless of color values
  return `${styleIndex}${bigIntToBase62(bigNumber, PALETTE_ID_BASE62_LENGTH)}`;
}


/**
 * Extracts the colors from a palette ID.
 */
function colorsFromId(id: string): Color[] {
  const bytes = getBytesFromId(id);
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
  const bytes = getBytesFromId(id);

  // If we have 31 bytes, the last one is the pinned mask
  if (bytes.length === 31) {
    return bytes[30];
  }

  return 0;
}

/**
 * Decodes the ID into a raw byte array.
 */
function getBytesFromId(id: string): number[] {
  validatePaletteId(id);

  // Omit style index
  const colorData = id.substring(1);
  const bigNumber = base62ToBigInt(colorData);

  const bytes: number[] = [];
  let remaining = bigNumber;

  // Extract all bytes
  while (remaining > 0n) {
    bytes.unshift(Number(remaining % 256n));
    remaining = remaining / 256n;
  }

  // Ensure we have exactly 31 bytes (30 for RGB values + 1 for pinned mask)
  // Pad with leading zeros if necessary
  while (bytes.length < 31) {
    bytes.unshift(0);
  }

  return bytes;
}


/**
 * Validates the given palette ID to ensure it has the correct length.
 *
 * @param {string} id - The palette ID to be validated.
 * @return {void} Throws an error if the palette ID does not meet the required
 *                length criteria.
 */
function validatePaletteId(id: string): void {
  // Expected length: 1 (style index) + 42 (base62-encoded 31 bytes) = 43 characters
  const expectedLength = 1 + PALETTE_ID_BASE62_LENGTH;

  if (id.length !== expectedLength) {
    throw new Error(`Palette ID has invalid length! Expected: ${expectedLength}, Actual: ${id.length}`);
  }
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
  validatePaletteId(id);

  // Erste Stelle ist der Style-Index
  const styleIndex = parseInt(id[0], 10);

  if (isNaN(styleIndex) || styleIndex < 0 || styleIndex >= PaletteStyles.length) {
    console.info("Style not found. Using random style.");
    return randomStyle();
  }

  return PaletteStyles[styleIndex];
}
