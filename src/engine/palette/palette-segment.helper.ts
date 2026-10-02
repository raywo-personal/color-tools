import {base62ToBigInt, bigIntToBase62} from "@engine/helpers/base62.helper";
import {Palette} from "@engine/palette/palette.model";
import {isRestorablePaletteId, PALETTE_ID_BASE62_LENGTH, paletteFromId, paletteIdFrom} from "@engine/palette/palette-id.helper";
import {isWellFormedId} from "@engine/helpers/validate-string-id.helper";


/**
 * Characters the seed takes behind the palette id. Six base62 characters
 * reach about 13 times past `PALETTE_SEED_LIMIT`; five would fall short of it.
 */
export const PALETTE_SEED_BASE62_LENGTH = 6;


/**
 * Length of the palette segment: the palette id followed by its seed. The
 * Studio's address and segment 1 of the Contrast & Type address are this
 * segment, so both views share one encoder.
 */
export const PALETTE_SEGMENT_LENGTH = PALETTE_ID_BASE62_LENGTH + PALETTE_SEED_BASE62_LENGTH;


/**
 * What the seed field may carry: a 32-bit seed, as `randomSeed()` draws it.
 *
 * Checked against this, not against the field's width. The narrow ranges are
 * the segment's integrity check - there is no check digit - so a field that
 * accepted whatever its characters spell would let a corrupted segment
 * through as a different roll.
 */
export const PALETTE_SEED_LIMIT = 2n ** 32n;


/** A palette together with the roll it follows a moving color with. */
export interface PaletteWithSeed {

  palette: Palette;
  seed: number;

}


/**
 * Encodes a palette and its seed into the palette segment.
 *
 * The id is written anew from the palette's colors and style rather than taken
 * from `palette.id`: a palette restored from an id with a style index this
 * version does not know carries that id beside a style rolled in its place.
 *
 * @param {Palette} palette - The palette to encode.
 * @param {number} seed - The roll the palette was built with.
 * @return {string} The palette segment, `PALETTE_SEGMENT_LENGTH` characters.
 * @throws {Error} If the seed is not an integer below `PALETTE_SEED_LIMIT`.
 */
export function paletteSegmentFrom(palette: Palette, seed: number): string {
  if (!Number.isInteger(seed) || seed < 0 || BigInt(seed) >= PALETTE_SEED_LIMIT) {
    throw new Error(`Palette seed out of range: ${seed}`);
  }

  return paletteIdFrom(palette, palette.style)
    + bigIntToBase62(BigInt(seed), PALETTE_SEED_BASE62_LENGTH);
}


/**
 * Whether `paletteFromSegment()` can restore the given segment: the right
 * length, the base62 alphabet, a palette id `isRestorablePaletteId()` accepts
 * and a seed below `PALETTE_SEED_LIMIT`.
 *
 * @param {string} segment - The palette segment to check.
 * @return {boolean} True if `paletteFromSegment()` restores the segment
 *                   without throwing.
 */
export function isRestorablePaletteSegment(segment: string): boolean {
  return isWellFormedId(segment, PALETTE_SEGMENT_LENGTH)
    && isRestorablePaletteId(paletteIdOf(segment))
    && seedValueOf(segment) < PALETTE_SEED_LIMIT;
}


/**
 * Restores a palette and its seed from a palette segment.
 *
 * @param {string} segment - The palette segment to restore.
 * @return {PaletteWithSeed} The palette and the seed it was written with.
 * @throws {Error} If the segment is not restorable - see
 *                 `isRestorablePaletteSegment()`.
 */
export function paletteFromSegment(segment: string): PaletteWithSeed {
  if (!isRestorablePaletteSegment(segment)) {
    throw new Error("Palette segment is not restorable");
  }

  return {
    palette: paletteFromId(paletteIdOf(segment)),
    seed: Number(seedValueOf(segment))
  };
}


function paletteIdOf(segment: string): string {
  return segment.substring(0, PALETTE_ID_BASE62_LENGTH);
}


function seedValueOf(segment: string): bigint {
  return base62ToBigInt(segment.substring(PALETTE_ID_BASE62_LENGTH));
}
