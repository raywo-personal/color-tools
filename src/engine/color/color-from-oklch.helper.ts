import chroma, {Color} from "chroma-js";
import {OKLCH} from "@engine/color/oklch.model";
import {clamp01, hueWrap} from "./hsl.helper";
import {maxChroma} from "./oklch.helper";


/**
 * Builds a color from OKLch coordinates, clamping chroma per hue to what
 * sRGB can hold at that lightness.
 *
 * Chroma is not equally available across hues: at `L = 0.60` the sRGB
 * boundary sits at 0.104 for cyan and 0.273 for magenta. Palette generators
 * that hold lightness and rotate hue therefore ask for a chroma some hues
 * cannot deliver. Clamping per hue keeps lightness exact and lets
 * colorfulness follow the gamut. Do not instead lower every member to the
 * lowest chroma the triad's hues share - that ties the whole palette's
 * vibrancy to its unluckiest hue and makes the same style look different
 * from one seed to the next.
 *
 * A hue of `NaN` - what chroma-js reports for grays - would otherwise reach
 * `chroma.oklch()` and come back as an arbitrary color, so it is treated as
 * a fully neutral 0.
 *
 * A chroma near zero takes the hue with it, and that is deliberate. chroma-js
 * reads `#808080` back at a chroma of 2.33e-5 and `#1c1c1c` at 8.79e-6; on a
 * circle of that radius every angle sits on the same point. Members that
 * differ from one another in hue alone therefore come back on one hex, and a
 * gray base color shows one swatch under two, three or four captions.
 *
 * Do not lift a near-zero chroma to a default to pull them apart: a gray base
 * color would then yield a colored palette, which the `stays neutral
 * throughout when the base color is a gray` spec of every generator built in
 * OKLch forbids - the styles still built in HSL carry the same degeneracy at
 * a saturation of 0 and take the pin with them when they move. Nor spread
 * them by lightness instead - a shared lightness is what makes accents read as
 * siblings, and in the high-contrast style it is what the two accents *are*.
 *
 * @param {OKLCH} oklch - Lightness in [0, 1], chroma unbounded, hue in degrees.
 * @return {Color} A color inside the sRGB gamut.
 */
export function fromOklch(oklch: OKLCH): Color {
  const lightness = clamp01(oklch.l);

  if (Number.isNaN(oklch.h)) return chroma.oklch(lightness, 0, 0);

  const hue = hueWrap(oklch.h);
  const chromacity = Math.min(Math.max(0, oklch.c), maxChroma(lightness, hue));

  return chroma.oklch(lightness, chromacity, hue);
}
