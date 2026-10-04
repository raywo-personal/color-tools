import {isWellFormedId} from "@engine/helpers/validate-string-id.helper";
import {PALETTE_SEGMENT_LENGTH} from "@engine/palette/palette-segment.helper";


/**
 * Whether a path, given as its segments, is the Studio's: the start page, or
 * one segment shaped like a palette segment.
 *
 * The shape and not `isRestorablePaletteSegment()`: a segment of the right
 * shape that does not restore is an address gone bad, and `paletteGuard`
 * rolls a fresh palette for it. Only a path that could never have been an
 * address - `/contrsat` - belongs to the not-found page.
 *
 * @param {readonly string[]} paths - The path's segments, decoded.
 * @return {boolean} True if the Studio answers the path.
 */
export function isStudioPath(paths: readonly string[]): boolean {
  if (paths.length === 0) return true;

  return paths.length === 1 && isWellFormedId(paths[0], PALETTE_SEGMENT_LENGTH);
}
