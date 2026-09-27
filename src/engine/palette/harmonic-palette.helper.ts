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

/** Hue offsets of the three members that are not accents, in degrees. */
const NEAR_ANALOG_HUE_OFFSET = 30;
const FAR_ANALOG_HUE_OFFSET = 60;
const TRIAD_HUE_OFFSET = 150;

/**
 * How far the two rising members travel from the accents toward white, and
 * how far the sinking one travels toward black - each as a share of the room
 * left on that side of the accent lightness, which toward black is the accent
 * lightness itself, because lightness is measured from black.
 *
 * Shares rather than the draft's factors of the HSL lightness. A factor
 * compounds: it moves a light base color far and a dark one hardly at all, so
 * the same style came back as five near-blacks for a dark base and flattened
 * to nothing for a light one. A share of the room keeps the same order at
 * every base lightness and never reaches the extreme it travels toward.
 */
export const NEAR_ANALOG_LIFT = 0.18;
export const TRIAD_LIFT = 0.35;
export const FAR_ANALOG_DROP = 0.12;

/**
 * Jitter of a travel, as a share of it. Relative for the same reason as the
 * travels themselves: an absolute amount survives a base color the travel no
 * longer has room for.
 *
 * Keep it below the gap between the two lifts, or the `+30` and `+150`
 * members swap places from one draw to the next - `keepsOrder()` in the spec
 * derives the bound.
 */
export const TRAVEL_JITTER = 0.10;

/**
 * Share of the accent chroma each of the three non-accents keeps. They fall
 * off with the distance the hue has travelled from the base, which is what
 * makes the base and its complement read as the two the palette is about. The
 * complement has no factor of its own: it is an accent and asks for the
 * accent chroma outright.
 */
const NEAR_ANALOG_CHROMA_FACTOR = 0.90;
const FAR_ANALOG_CHROMA_FACTOR = 0.80;
const TRIAD_CHROMA_FACTOR = 0.70;

/**
 * Jitter of a non-accent's chroma, as a share of it. Keep it relative: an
 * absolute amount outgrows the value it varies once the base color is muted,
 * and tints the members of an otherwise all-gray palette.
 */
const CHROMA_JITTER = 0.25;


/**
 * Generates a harmonic color palette: the base hue and its complement as two
 * accents, two analogous neighbours at `+30` and `+60`, and one triadic
 * member at `+150`. `roleCaptionFor()` names all five by their hue offset -
 * BASE, +30, +60, COMP and +150 - so the hues are what the style promises.
 *
 * The two accents are built in OKLch and share one lightness exactly, and the
 * other three state a lightness of their own relative to them. HSL delivers
 * neither: equal HSL lightness leaves two hues 180 degrees apart up to 0.34
 * OKLch lightness apart, and the draft multiplied that lightness by a factor
 * per member on top, which compounds the error - a dark base color came back
 * as five near-blacks. Chroma follows the sRGB boundary per hue - see
 * `fromOklch()` for why the members are not levelled to a common chroma
 * instead.
 *
 * @param paletteColors - Optional fixed colors to use when generating the
 *                        palette. Each provided color is left untouched, and
 *                        the remaining colors are generated based on the
 *                        provided seed hue. If no colors are provided, a
 *                        random neutral color is generated.
 * @param {number} [seedHue] - Optional seed hue (in degrees) to generate the
 *                             color palette. If not provided, a random hue
 *                             is used.
 * @return {Palette} The generated palette
 */
export function generateHarmonic(paletteColors: Partial<PaletteColors> = {},
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

  const accent = (accentHue: number) =>
    fromOklch({l: baseLight, c: baseChroma, h: accentHue});

  // Jittered while it is still a distance, then applied in the member's own
  // direction. Signing it first would have the jitter deepen the drop where
  // it shortens the lift, and the two would no longer keep their distance
  // from the accents by the same rule.
  const travelled = (travel: number) => vary(travel, travel * TRAVEL_JITTER);

  const colorful = (chromaFactor: number) => {
    const chromacity = baseChroma * chromaFactor;

    return vary(chromacity, chromacity * CHROMA_JITTER);
  };

  const risen = (hueOffset: number, lift: number, chromaFactor: number) =>
    fromOklch({
      l: baseLight + travelled((1 - baseLight) * lift),
      c: colorful(chromaFactor),
      h: hue + hueOffset
    });

  const sunken = (hueOffset: number, drop: number, chromaFactor: number) =>
    fromOklch({
      l: baseLight - travelled(baseLight * drop),
      c: colorful(chromaFactor),
      h: hue + hueOffset
    });

  const pColors: PaletteColors = {
    // accent
    color0: paletteColors.color0 ??
      paletteColorFrom(accent(hue), "color0"),

    // analogous, lighter
    color1: paletteColors.color1 ?? paletteColorFrom(
      risen(NEAR_ANALOG_HUE_OFFSET, NEAR_ANALOG_LIFT, NEAR_ANALOG_CHROMA_FACTOR),
      "color1"),

    // analogous, darker
    color2: paletteColors.color2 ?? paletteColorFrom(
      sunken(FAR_ANALOG_HUE_OFFSET, FAR_ANALOG_DROP, FAR_ANALOG_CHROMA_FACTOR),
      "color2"),

    // complementary accent
    color3: paletteColors.color3 ??
      paletteColorFrom(accent(complement(hue)), "color3"),

    // triadic, lightest
    color4: paletteColors.color4 ?? paletteColorFrom(
      risen(TRIAD_HUE_OFFSET, TRIAD_LIFT, TRIAD_CHROMA_FACTOR),
      "color4")
  };

  return paletteFrom(pColors, "harmonic");
}
