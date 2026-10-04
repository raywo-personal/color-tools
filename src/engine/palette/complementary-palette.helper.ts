import {Palette, PaletteColors} from "@engine/palette/palette.model";
import {paletteColorFrom} from "@engine/palette/palette-color.model";
import {complement} from "@engine/color/hue.helper";
import {vary} from "@engine/palette/variation.helper";
import {paletteFrom} from "@engine/palette/palette.helper";
import {fromOklch} from "@engine/color/color-from-oklch.helper";
import {randomBetween} from "@engine/helpers/random.helper";
import {usableLightness} from "@engine/color/oklch.helper";


/** OKLch lightness of the two accents when no base color sets one. */
const DEFAULT_LIGHTNESS = 0.62;

/** Chroma the accents aim for; hues that cannot hold it are clamped down. */
const DEFAULT_CHROMA = 0.18;

/**
 * How far each of the three lighter members travels from the accents toward
 * white, as a share of the range still available above the accent lightness.
 *
 * A share rather than a fixed offset: the accents follow a given base color,
 * so a light base leaves little room above them. A fixed offset runs past 1
 * there and hands back plain white for all three, which is neither a lighter
 * *color* nor distinguishable from its siblings. The three keep the spacing
 * the draft's HSL offsets of `+0.15`, `+0.20` and `+0.35` had between them;
 * the offsets themselves do not port.
 */
export const BASE_LT_LIFT = 0.27;
export const COMP_LT_LIFT = 0.36;
export const PALE_LIFT = 0.62;

/**
 * Jitter of a lift, as a share of it. Relative for the same reason as the
 * lifts themselves: an absolute amount survives a light base color that the
 * lift no longer has room for.
 *
 * Keep it below the gap between two neighbouring lifts, or `BASE LT` and
 * `COMP LT` swap places from one draw to the next while their captions go on
 * naming a fixed order - `keepsOrder()` in the spec derives the bounds.
 */
export const LIFT_JITTER = 0.10;

/**
 * Share of the accent chroma each lighter member keeps.
 *
 * `BASE LT` and `COMP LT` keep most of it: they are the two accents' lighter
 * halves and are named for their hue, so the hue has to survive the lift.
 * `PALE` is the ground the other four sit on and keeps far less - but not so
 * little that it reads as a gray, which would leave the style without the
 * light tint the draft gives it.
 */
const LT_CHROMA_FACTOR = 0.65;
const PALE_CHROMA_FACTOR = 0.30;

/**
 * Jitter of a lighter member's chroma, as a share of it. Keep it relative: an
 * absolute amount outgrows the value it varies once the base color is muted,
 * and tints the lighter members of an otherwise all-gray palette.
 */
const CHROMA_JITTER = 0.25;


/**
 * Generates a complementary color palette: the base hue and its complement as
 * two accents of equal weight, each with a lighter member of its own hue, and
 * one pale tint of the base hue underneath them. `roleCaptionFor()` calls the
 * five slots BASE, COMP, BASE LT, COMP LT and PALE.
 *
 * The two accents are built in OKLch and share one lightness exactly, so they
 * read as a pair. HSL cannot do that: equal HSL lightness leaves two hues 180
 * degrees apart up to 0.34 OKLch lightness apart, which is most of the usable
 * range - a yellow base and its blue complement then read as a light color
 * and a dark one rather than as two sides of one pairing. Chroma follows the
 * sRGB boundary per hue - see `fromOklch()` for why the members are not
 * levelled to a common chroma instead.
 *
 * The three lighter members rise by a share of the room above the accents, so
 * none of them runs out at a light base color.
 *
 * @param {Partial<PaletteColors>} [paletteColors={}] - Optional fixed colors to use
 *                when generating the palette. Each provided color is left
 *                untouched, and the remaining colors are generated based on
 *                the provided seed hue. If no colors are provided, a random
 *                neutral color is generated.
 * @param {number} [seedHue] - An optional base hue value in degrees (0-360)
 *                             used to generate the color palette. If not
 *                             provided, a random hue is used.
 * @return {Palette} - A complete complementary color palette generated using
 *                     the provided or default colors.
 */
export function generateComplementary(paletteColors: Partial<PaletteColors> = {},
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

  const compHue = complement(hue);

  const accent = (accentHue: number) =>
    fromOklch({l: baseLight, c: baseChroma, h: accentHue});

  const lighter = (lightHue: number, lift: number, chromaFactor: number) => {
    const travel = (1 - baseLight) * lift;
    const chromacity = baseChroma * chromaFactor;

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

    // complementary accent
    color1: paletteColors.color1 ??
      paletteColorFrom(accent(compHue), "color1"),

    // lighter base
    color2: paletteColors.color2 ?? paletteColorFrom(
      lighter(hue, BASE_LT_LIFT, LT_CHROMA_FACTOR), "color2"),

    // lighter complement
    color3: paletteColors.color3 ?? paletteColorFrom(
      lighter(compHue, COMP_LT_LIFT, LT_CHROMA_FACTOR), "color3"),

    // pale tint of the base hue
    color4: paletteColors.color4 ?? paletteColorFrom(
      lighter(hue, PALE_LIFT, PALE_CHROMA_FACTOR), "color4")
  };

  return paletteFrom(pColors, "complementary");
}
