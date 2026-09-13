import {vary} from "@engine/palette/variation.helper";
import {complement} from "@engine/color/hue.helper";
import {Palette, PaletteColors} from "@engine/palette/palette.model";
import {paletteColorFrom} from "@engine/palette/palette-color.model";
import {randomBetween} from "@engine/helpers/random.helper";
import {paletteFrom} from "@engine/palette/palette.helper";
import {fromOklch} from "@engine/color/color-from-oklch.helper";
import {usableLightness} from "@engine/color/oklch.helper";


/** OKLch lightness of the two accents when no base color sets one. */
export const DEFAULT_LIGHTNESS = 0.62;

/**
 * Chroma the accents aim for; hues that cannot hold it are clamped down. It
 * sits above what most hues can deliver, which is what the draft asked for
 * with a saturation of 1 - the gamut decides how much of it each hue keeps.
 */
const DEFAULT_CHROMA = 0.22;

/** Hue offsets of the three members that are not accents, in degrees. */
const INK_HUE_OFFSET = 20;
export const DEEP_HUE_OFFSET = 220;
const PALE_HUE_OFFSET = 200;

/**
 * Hue jitter per member, in degrees. Hue is the only coordinate the accents
 * vary in: lightness has to stay shared for the two to read as a pair, and
 * chroma already varies through the per-hue clamp.
 */
export const ACCENT_HUE_JITTER = 5;
export const COMP_HUE_JITTER = 6;
export const DARK_HUE_JITTER = 10;
const PALE_HUE_JITTER = 8;

/**
 * How far the two dark members travel from the accents toward black, as a
 * share of the room below the accent lightness - which in OKLch is the accent
 * lightness itself, because lightness is measured from black.
 *
 * A share rather than a fixed offset: the accents follow a given base color,
 * so a dark base leaves little room below them. A fixed offset runs past 0
 * there and hands back plain black for both, which is neither a deep *tone*
 * nor a dark *accent* and no longer tells the two apart. Both shares
 * reproduce the draft's HSL offsets at the default accent lightness and only
 * diverge from them where those offsets had no room left.
 */
export const INK_DROP = 0.56;
export const DEEP_DROP = 0.28;

/**
 * How far the pale member travels from the accents toward white, as a share
 * of the room above them. A share for the same reason as the drops, mirrored:
 * a light base leaves little room above, and a fixed offset ends on plain
 * white there.
 *
 * Do not raise it to where the share and its jitter multiply out to 1 or
 * more. Below that the pale member stays off plain white for every base color
 * and every draw; at 0.92 it comes back plain `#ffffff` on part of the draws
 * at every seed hue, so the style's light ground changes character from one
 * regenerate to the next - and a white swatch carries no hue for the palette
 * to be a palette of.
 */
export const PALE_LIFT = 0.85;

/**
 * Jitter of a member's travel, as a share of it. Relative for the same reason
 * as the travel itself: an absolute amount survives a base color the travel
 * no longer has room for, and then reaches past the member it was meant to
 * stay clear of. It stays far enough inside every travel that the five
 * members keep their order for each draw - `inkCeiling()`, `deepFloor()` and
 * `paleFloor()` in the spec derive the bounds that follow.
 */
export const TRAVEL_JITTER = 0.10;

/**
 * Share of the accent chroma the two dark members keep.
 *
 * The ink is all but neutral, which is what makes it read as near-black
 * rather than as a third accent. The dark accent keeps enough to still show
 * its hue. The pale member has no factor of its own: it asks for the accent
 * chroma outright and lets `fromOklch()` clamp it, because `maxChroma()` has
 * nearly run out that close to white and what comes back is a tint whatever
 * it asked for.
 */
const INK_CHROMA_FACTOR = 0.05;
const DEEP_CHROMA_FACTOR = 0.45;

/**
 * Jitter of the dark members' chroma, as a share of it. Keep it relative: an
 * absolute amount outgrows the value it varies once the base color is muted,
 * and tints the dark members of an otherwise all-gray palette.
 */
const DARK_CHROMA_JITTER = 0.25;


/**
 * Generates a high-contrast color palette based on a seed hue or a randomly
 * selected hue.
 *
 * Two accents - the base hue and its complement - share one lightness, and
 * three members state a lightness of their own: a near-black ink, a dark
 * accent between it and the accents, and a near-white pale. `roleCaptionFor()`
 * calls the five slots BASE, COMP, INK, DEEP and PALE.
 *
 * Built in OKLch, which is what makes those statements true. Four of the five
 * captions are lightness words, and equal HSL lightness is not equal perceived
 * lightness: at a saturation of 1 the draft's accents landed anywhere between
 * 0.45 and 0.97 in OKLch lightness depending on the hue, so a yellow base came
 * out lighter than the near-white it was supposed to contrast with, and a blue
 * one darker than its own dark accent. The style is *about* contrast, so this
 * is the generator where constant HSL lightness costs the most - and it costs
 * it at exactly the hues a visitor would be checking.
 *
 * The dark members drop by a share of the room below the accents and the pale
 * member rises by a share of the room above, so none of them runs out at a
 * light or a dark base color. Saturation does not port as a number: it becomes
 * a share of the accent chroma, and `fromOklch()` clamps every member to what
 * its own lightness and hue can hold - see there for why the members are not
 * levelled to a common chroma instead.
 *
 * @param paletteColors - Optional fixed colors to use when generating the
 *                        palette. Each provided color is left untouched, and
 *                        the remaining colors are generated based on the
 *                        provided seed hue. If no colors are provided, a
 *                        random neutral color is generated.
 * @param {number} [seedHue] - An optional base hue value in degrees (0-360)
 *                             used to generate the color palette. If not
 *                             provided, a random hue is used.
 * @return {Palette} The palette with the generated colors, representing colors
 *                   of high contrast, including vibrant accents, deep tones,
 *                   and near-white.
 */
export function generateHighContrast(paletteColors: Partial<PaletteColors> = {},
                                     seedHue?: number): Palette {
  const baseColor = paletteColors.color0?.color;
  const [l, c, h] = baseColor?.oklch() ?? [];
  // chroma-js reports NaN for the hue of a gray, which carries no direction.
  const hue = h !== undefined && !Number.isNaN(h)
    ? h
    : seedHue ?? randomBetween(0, 360);
  // Clamped: at a lightness of 0 or 1 no hue holds any chroma, so both accents
  // would come out the same black or white - see `usableLightness()`.
  const baseLight = usableLightness(l ?? DEFAULT_LIGHTNESS);
  const baseChroma = c ?? DEFAULT_CHROMA;

  const accent = (accentHue: number, hueJitter: number) =>
    fromOklch({l: baseLight, c: baseChroma, h: vary(accentHue, hueJitter)});

  const darkMember = (hueOffset: number,
                      drop: number,
                      chromaFactor: number) => {
    const travel = baseLight * drop;
    const chromacity = baseChroma * chromaFactor;

    return fromOklch({
      l: baseLight - vary(travel, travel * TRAVEL_JITTER),
      c: vary(chromacity, chromacity * DARK_CHROMA_JITTER),
      h: vary(hue + hueOffset, DARK_HUE_JITTER)
    });
  };

  const pale = () => {
    const travel = (1 - baseLight) * PALE_LIFT;

    return fromOklch({
      l: baseLight + vary(travel, travel * TRAVEL_JITTER),
      c: baseChroma,
      h: vary(hue + PALE_HUE_OFFSET, PALE_HUE_JITTER)
    });
  };

  const pColors: PaletteColors = {
    // accent
    color0: paletteColors.color0 ??
      paletteColorFrom(accent(hue, ACCENT_HUE_JITTER), "color0"),

    // complementary accent
    color1: paletteColors.color1 ??
      paletteColorFrom(accent(complement(hue), COMP_HUE_JITTER), "color1"),

    // near-black ink
    color2: paletteColors.color2 ?? paletteColorFrom(
      darkMember(INK_HUE_OFFSET, INK_DROP, INK_CHROMA_FACTOR), "color2"),

    // dark accent
    color3: paletteColors.color3 ?? paletteColorFrom(
      darkMember(DEEP_HUE_OFFSET, DEEP_DROP, DEEP_CHROMA_FACTOR), "color3"),

    // near-white
    color4: paletteColors.color4 ?? paletteColorFrom(pale(), "color4")
  };

  return paletteFrom(pColors, "high-contrast");
}
