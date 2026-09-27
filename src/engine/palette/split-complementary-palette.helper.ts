import {Palette, PaletteColors} from "@engine/palette/palette.model";
import {paletteColorFrom} from "@engine/palette/palette-color.model";
import {complement, splitComplement} from "@engine/color/hue.helper";
import {vary} from "@engine/palette/variation.helper";
import {paletteFrom} from "@engine/palette/palette.helper";
import {fromOklch} from "@engine/color/color-from-oklch.helper";
import {randomBetween} from "@engine/helpers/random.helper";
import {usableLightness} from "@engine/color/oklch.helper";


/** OKLch lightness of the three accents when no base color sets one. */
const DEFAULT_LIGHTNESS = 0.62;

/** Chroma the accents aim for; hues that cannot hold it are clamped down. */
const DEFAULT_CHROMA = 0.18;

/**
 * How far the two lighter members travel from the accents toward white, as a
 * share of the range still available above the accent lightness.
 *
 * A share rather than a fixed offset: the accents follow a given base color,
 * so a light base leaves little room above them. A fixed offset runs past 1
 * there and hands back plain white for both, which is neither a lighter
 * *color* nor distinguishable from its sibling. The two keep the spacing the
 * draft's HSL offsets of `+0.20` and `+0.30` had between them; the offsets
 * themselves do not port.
 */
export const BASE_LT_LIFT = 0.35;
export const COMP_LT_LIFT = 0.53;

/**
 * Jitter of a lift, as a share of it. Relative for the same reason as the
 * lifts themselves: an absolute amount survives a light base color that the
 * lift no longer has room for.
 *
 * Keep it below the gap between the two lifts, or `BASE LT` and `COMP LT`
 * swap places from one draw to the next while their captions go on naming a
 * fixed order - `keepsOrder()` in the spec derives the bound.
 */
export const LIFT_JITTER = 0.10;

/**
 * Share of the accent chroma the two lighter members keep. One factor for
 * both: they are lighter members of the same kind and differ in hue and in
 * how far they rise, not in how much color they hold. It stays high enough
 * for each to show the hue its caption names.
 */
const LIGHT_CHROMA_FACTOR = 0.50;

/**
 * Jitter of a lighter member's chroma, as a share of it. Keep it relative: an
 * absolute amount outgrows the value it varies once the base color is muted,
 * and tints the lighter members of an otherwise all-gray palette.
 */
const CHROMA_JITTER = 0.25;


/**
 * Generates a split-complementary color palette: the base hue and the two
 * hues flanking its complement as three accents, plus a lighter member of the
 * base hue and one of the complement itself. `roleCaptionFor()` calls the
 * five slots BASE, SPLIT A, SPLIT B, BASE LT and COMP LT.
 *
 * The three accents are built in OKLch and share one lightness exactly, so
 * they read as siblings. HSL cannot do that: equal HSL lightness leaves the
 * members up to 0.34 OKLch lightness apart, which is most of the usable
 * range, and the tension the style is built on - one color against two near
 * its opposite - turns into a difference in lightness instead. Chroma follows
 * the sRGB boundary per hue - see `fromOklch()` for why the members are not
 * levelled to a common chroma instead.
 *
 * The complement itself carries no accent; it appears only as the lighter
 * `COMP LT`, which is what keeps the split a split rather than a
 * complementary pairing with two extra hues.
 *
 * @param {Partial<PaletteColors>} paletteColors - Optional fixed colors to use
 *                when generating the palette. Each provided color is left
 *                untouched, and the remaining colors are generated based on
 *                the provided seed hue. If no colors are provided, a random
 *                neutral color is generated.
 * @param {number} [seedHue] - An optional base hue value in degrees (0-360)
 *                             used to generate the color palette. If not
 *                             provided, a random hue is used.
 * @return {Palette} A palette object containing five colors adhering to the
 *                   split-complementary scheme.
 */
export function generateSplitComplementary(paletteColors: Partial<PaletteColors> = {},
                                           seedHue?: number): Palette {
  const baseColor = paletteColors.color0?.color;
  const [l, c, h] = baseColor?.oklch() ?? [];
  // chroma-js reports NaN for the hue of a gray, which carries no direction.
  const hue = h !== undefined && !Number.isNaN(h)
    ? h
    : seedHue ?? randomBetween(0, 360);
  // Clamped: at a lightness of 0 or 1 no hue holds any chroma, so all three
  // accents would come out the same black or white - see `usableLightness()`.
  const baseLight = usableLightness(l ?? DEFAULT_LIGHTNESS);
  const baseChroma = c ?? DEFAULT_CHROMA;

  const [splitA, splitB] = splitComplement(hue);

  const accent = (accentHue: number) =>
    fromOklch({l: baseLight, c: baseChroma, h: accentHue});

  const lighter = (lightHue: number, lift: number) => {
    const travel = (1 - baseLight) * lift;
    const chromacity = baseChroma * LIGHT_CHROMA_FACTOR;

    return fromOklch({
      l: baseLight + vary(travel, travel * LIFT_JITTER),
      c: vary(chromacity, chromacity * CHROMA_JITTER),
      h: lightHue
    });
  };

  const pColors: PaletteColors = {
    // accent
    color0: paletteColors.color0 ??
      paletteColorFrom(accent(hue), "color0"),

    // accent below the complement
    color1: paletteColors.color1 ??
      paletteColorFrom(accent(splitA), "color1"),

    // accent above the complement
    color2: paletteColors.color2 ??
      paletteColorFrom(accent(splitB), "color2"),

    // lighter base
    color3: paletteColors.color3 ??
      paletteColorFrom(lighter(hue, BASE_LT_LIFT), "color3"),

    // lighter complement
    color4: paletteColors.color4 ??
      paletteColorFrom(lighter(complement(hue), COMP_LT_LIFT), "color4")
  };

  return paletteFrom(pColors, "split-complementary");
}
