import chroma from "chroma-js";


/** Chroma is unbounded in OKLch; no sRGB color exceeds this. */
const CHROMA_SEARCH_CEILING = 0.4;

/** 20 halvings of the search interval resolve to below 1e-6. */
const SEARCH_ITERATIONS = 20;


/**
 * Determines the highest chroma that still fits into the sRGB gamut for a
 * given lightness and hue.
 *
 * The gamut is contiguous along the chroma axis: below the boundary every
 * value is representable, above it none is. A binary search therefore finds
 * the boundary, using chroma-js' clipping flag as the test - it reports
 * whether the conversion to sRGB had to cap a channel.
 *
 * @param {number} lightness - OKLch lightness in the range [0, 1].
 * @param {number} hue - OKLch hue in degrees.
 * @return {number} The maximum chroma, 0 for black, white and an undefined hue.
 */
export function maxChroma(lightness: number, hue: number): number {
  if (Number.isNaN(hue) || lightness <= 0 || lightness >= 1) return 0;

  let inGamut = 0;
  let outOfGamut = CHROMA_SEARCH_CEILING;

  for (let i = 0; i < SEARCH_ITERATIONS; i++) {
    const candidate = (inGamut + outOfGamut) / 2;

    if (chroma.oklch(lightness, candidate, hue).clipped()) {
      outOfGamut = candidate;
    } else {
      inGamut = candidate;
    }
  }

  return inGamut;
}


/**
 * Determines whether the given hue, lightness, and chromacity values are
 * within the acceptable chromacity range.
 *
 * @param {number} lightness - The lightness value to check. [0, 100]
 * @param {number} chromacity - The chroma value to check.
 * @param {number | null} hue - The hue value to check, or null if not
 *                              applicable. [0, 360]
 * @return {boolean} Returns true if the hue, lightness, and chromacity values
 *                   are within the acceptable range, otherwise false.
 */
export function isValidOklch(this: void,
                             lightness: number,
                             chromacity: number,
                             hue: number | null): boolean {
  if (!inOklchHueRange(hue)) return false;
  if (!inOklchLightnessRange(lightness)) return false;

  return chromacity >= 0 && chromacity <= maxChroma(lightness / 100, hue);
}


export function inOklchHueRange(this: void, hue: number | null): hue is number {
  if (hue === null) return false;

  return hue >= 0 && hue <= 360;
}


export function inOklchLightnessRange(this: void, lightness: number | null): lightness is number {
  if (lightness === null) return false;

  return lightness >= 0 && lightness <= 100;
}


/**
 * Lightness band in which sRGB still offers chroma at every hue.
 *
 * `maxChroma()` returns 0 at a lightness of 0 and 1, so a color built there
 * comes out black or white whatever its hue. A generator that holds lightness
 * and rotates hue then hands back the same color for every member: a pure
 * white base color yields five whites, four of them clipped, and regenerating
 * repeats them unchanged. Both bounds keep the worst hue above the 0.02 chroma
 * a tint needs to read as tinted, and the upper one leaves the lighter members
 * room above the accents.
 */
const MIN_USABLE_LIGHTNESS = 0.12;
const MAX_USABLE_LIGHTNESS = 0.92;


/**
 * Clamps an OKLch lightness into the band where sRGB still offers chroma at
 * every hue.
 *
 * @param {number} lightness - OKLch lightness in the range [0, 1].
 * @return {number} The lightness, moved inward if it sits at either extreme.
 */
export function usableLightness(this: void, lightness: number): number {
  return Math.min(Math.max(lightness, MIN_USABLE_LIGHTNESS),
    MAX_USABLE_LIGHTNESS);
}
