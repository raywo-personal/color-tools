import chroma from "chroma-js";


/** Chroma is unbounded in OKLch; no sRGB color exceeds this. */
const CHROMA_SEARCH_CEILING = 0.4;

/** 20 halvings of the search interval resolve to below 1e-6. */
const SEARCH_ITERATIONS = 20;

/**
 * How far clipping may move a coordinate before the color counts as one sRGB
 * cannot hold.
 *
 * All three sit above what the gamut's dent costs - see `maxChroma()` - and
 * below the 0.1 %, the whole degree and the thousandth `formatColor()` writes
 * out, so a color clamped to the boundary keeps the coordinates it was asked
 * for as far as anything in the app can tell.
 *
 * Chroma is held to half the step that row writes, not to twice it: the
 * ceiling and the row then differ by the rounding of the last digit and no
 * more. At 2e-3 the ceiling names a chroma the color does not hold by two
 * written steps - the slider reads 0.269 for `#14E100` where the row under it
 * reads 0.267.
 */
const LIGHTNESS_TOLERANCE = 4e-4;
const HUE_TOLERANCE = 0.25;
const CHROMA_TOLERANCE = 5e-4;


/**
 * Determines whether sRGB holds a set of OKLch coordinates well enough to
 * leave them standing.
 *
 * chroma-js caps every channel it cannot represent, and a cap on one channel
 * moves the color along all three axes. Reading the coordinates back off the
 * color it builds therefore says what the cap cost, where its `clipped()` flag
 * only says that one happened.
 *
 * All three axes are read, not just lightness and hue. At a high lightness
 * around cyan a cap leaves both of those where they were and takes the chroma
 * alone, so a test that watched lightness and hue would follow the search to
 * its ceiling and report a boundary two and a half times too high.
 *
 * @param {number} lightness - OKLch lightness in the range [0, 1].
 * @param {number} chromacity - OKLch chroma, unbounded.
 * @param {number} hue - OKLch hue in degrees.
 * @return {boolean} True while the coordinates survive the conversion.
 */
function survivesClipping(this: void,
                          lightness: number,
                          chromacity: number,
                          hue: number): boolean {
  const [builtLightness, builtChroma, builtHue] = chroma
    .oklch(lightness, chromacity, hue)
    .oklch();

  // A gray has no hue to lose; chroma-js reports `NaN` for it.
  const hueDrift = Number.isNaN(builtHue)
    ? 0
    : Math.abs(((builtHue - hue + 540) % 360) - 180);

  return Math.abs(builtLightness - lightness) <= LIGHTNESS_TOLERANCE
    && hueDrift <= HUE_TOLERANCE
    && Math.abs(builtChroma - chromacity) <= CHROMA_TOLERANCE;
}


/**
 * Determines the highest chroma that still fits into the sRGB gamut for a
 * given lightness and hue.
 *
 * A binary search along the chroma axis, asking at each step what clipping
 * costs the color rather than whether it clips at all.
 *
 * Do not go back to chroma-js' `clipped()` flag as the test. sRGB is not
 * convex in OKLab: along blue's own lightness and hue the chroma axis leaves
 * the gamut at 85 % of pure blue's chroma and touches it again at the corner
 * itself. Across that dent a channel is capped by two of 255, which moves
 * lightness by 3e-4 and hue by a sixth of a degree - but the flag reads the
 * cap as out of gamut and the search stops there. An 8-bit color near a
 * corner of the cube then sits above the boundary reported at its own
 * lightness and hue - `#0000FF` by 18 % of it: `fromOklch()` clamps a palette
 * member below what its hue can hold, and `colorFrom()` hands `#0000FF` back
 * as `#0032E3`.
 *
 * The boundary is therefore the chroma up to which clipping stays within the
 * tolerances, not the one at which it starts; a color built there can report
 * `clipped()`, and its coordinates can sit that far from the ones asked for.
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

    if (survivesClipping(lightness, candidate, hue)) {
      inGamut = candidate;
    } else {
      outOfGamut = candidate;
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
export const MIN_USABLE_LIGHTNESS = 0.12;
export const MAX_USABLE_LIGHTNESS = 0.92;


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
