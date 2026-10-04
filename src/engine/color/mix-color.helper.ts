import chroma, {Color} from "chroma-js";


/**
 * The color `amount` of the way from `from` to `to`, mixed in OKLab.
 *
 * **The space is the point of the function.** chroma-js mixes in sRGB by
 * default, where equal fractions are not equal perceived steps: a 40 % mix
 * towards a light color lands visibly darker than four tenths of the way. The
 * app already builds its palettes in OKLch for the same reason, and a surface
 * derived from the visitor's own pair has to sit where the fraction says it
 * does or the derivation reads as an arbitrary color.
 *
 * OKLab rather than OKLch, because a mix runs between two colors the app did
 * not choose. OKLch rotates the hue while holding the chroma up, so the middle
 * of a mix between two distant hues is a fully saturated color of a third hue:
 * an orange page and a blue text color meet in a vivid magenta. OKLab draws
 * the straight line instead, which passes near the neutral axis, so a partial
 * mix loses chroma the way a blend of two colors is expected to.
 *
 * The helper exists so the space is named once. Written out at the call site,
 * a single forgotten fourth argument is a silent fall back to sRGB.
 */
export function mixColors(from: Color | string,
                          to: Color | string,
                          amount: number): Color {
  return chroma.mix(from, to, amount, "oklab");
}
