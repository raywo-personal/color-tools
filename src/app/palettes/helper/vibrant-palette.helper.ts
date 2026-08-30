import {triad} from "@common/helpers/hue.helper";
import {vary} from "@palettes/helper/variation.helper";
import {paletteColorFrom} from "@palettes/models/palette-color.model";
import {Palette, PaletteColors} from "@palettes/models/palette.model";
import {randomBetween} from "@common/helpers/random.helper";
import {paletteFrom} from "@palettes/helper/palette.helper";
import {fromOklch} from "@common/helpers/color-from-oklch.helper";
import {usableLightness} from "@common/helpers/oklch.helper";


/** OKLch lightness of the three accents when no base color sets one. */
const DEFAULT_LIGHTNESS = 0.65;

/**
 * Chroma the accents aim for; hues that cannot hold it are clamped down. It
 * sits above what most hues can deliver, so the majority of accents come out
 * at the sRGB boundary - that is what makes the style vibrant. It is not set
 * even higher, because then every hue would clamp and the aim would no longer
 * say anything.
 */
const DEFAULT_CHROMA = 0.22;

/** Hue offset of the first light color, in degrees. */
const LIGHT_HUE_OFFSET_1 = 60;

/** Hue offset of the second light color, in degrees. */
const LIGHT_HUE_OFFSET_2 = -20;

/** Jitter of both light colors' hue, in degrees. */
const LIGHT_HUE_JITTER = 8;

/**
 * How far the two light colors travel from the accents toward white, as a
 * share of the range still available above the accent lightness.
 *
 * A share rather than a fixed offset: the accents follow a given base color,
 * so a light base leaves little room above it. A fixed offset would run past
 * 1 there and hand back plain white, which is neither a light *color* nor
 * distinguishable from its sibling. A share keeps both of them below white
 * and above the accents for every base lightness.
 */
const LIGHT_LIFT_1 = 0.55;
const LIGHT_LIFT_2 = 0.39;

/** Jitter of the light colors' lift, as a share of it. */
const LIGHT_LIFT_JITTER = 0.20;

/** Share of the accent chroma the light colors keep - tinted, not neutral. */
const LIGHT_CHROMA_FACTOR = 0.26;

/**
 * Jitter of the light colors' chroma, as a share of it. Keep it relative: an
 * absolute amount outgrows the value it varies once the base color is muted,
 * and tints the light colors of an otherwise all-gray palette.
 */
const LIGHT_CHROMA_JITTER = 0.22;

/**
 * Jitter of the accents' hue, in degrees. Hue is the only accent coordinate
 * that is varied - lightness has to stay shared for the three to read as
 * siblings, and chroma already varies through the per-hue clamp.
 */
const ACCENT_HUE_JITTER = 6;


/**
 * Generates a set of vibrant and balanced colors based on a given hue or
 * a random seed hue.
 *
 * The palette consists of three accent colors and two light colors. The
 * accents form a triad around the seed hue; the light colors sit at their own
 * hues, well above the accents in lightness and much lower in chroma.
 *
 * The accents are built in OKLch and share one lightness exactly, which is
 * what the style's name promises. HSL cannot deliver it: at equal HSL
 * lightness the three members land up to 0.34 OKLch lightness apart, so the
 * yellow-green reads nearly white next to a blue that reads mid-dark. Chroma
 * follows the sRGB boundary per hue - see `fromOklch()` for why the accents
 * are not levelled to a common chroma instead.
 *
 * @param paletteColors - Optional fixed colors to use when generating the
 *                        palette. Each provided color is left untouched, and
 *                        the remaining colors are generated based on the
 *                        provided seed hue. If no colors are provided, a
 *                        random neutral color is generated.
 * @param {number} [seedHue] - The hue value to base the color generation on.
 *                             If omitted, a random value is used.
 * @return {Palette} The palette with the generated colors, with vibrant and
 *                   complementary characteristics.
 */
export function generateVibrantBalanced(paletteColors: Partial<PaletteColors> = {},
                                        seedHue?: number): Palette {
  const baseColor = paletteColors.color0?.color;
  const [l, c, h] = baseColor?.oklch() ?? [];
  // chroma-js reports NaN for the hue of a gray, which carries no direction.
  const h0 = h !== undefined && !Number.isNaN(h)
    ? h
    : seedHue ?? randomBetween(0, 360);
  // Clamped: at a lightness of 0 or 1 no hue holds any chroma, so all three
  // accents would come out the same black or white - see `usableLightness()`.
  const baseLight = usableLightness(l ?? DEFAULT_LIGHTNESS);
  const baseChroma = c ?? DEFAULT_CHROMA;

  const accent = (accentHue: number) => fromOklch({
    l: baseLight,
    c: baseChroma,
    h: vary(accentHue, ACCENT_HUE_JITTER)
  });

  const lightChroma = baseChroma * LIGHT_CHROMA_FACTOR;

  const light = (lightHue: number, lift: number) => {
    const room = (1 - baseLight) * lift;

    return fromOklch({
      l: baseLight + vary(room, room * LIGHT_LIFT_JITTER),
      c: vary(lightChroma, lightChroma * LIGHT_CHROMA_JITTER),
      h: vary(lightHue, LIGHT_HUE_JITTER)
    });
  };

  const [, h1, h2] = triad(h0);
  const pColors: PaletteColors = {
    color0: paletteColors.color0 ??
      paletteColorFrom(accent(h0), "color0"),

    color1: paletteColors.color1 ??
      paletteColorFrom(accent(h1), "color1"),

    color2: paletteColors.color2 ??
      paletteColorFrom(accent(h2), "color2"),

    color3: paletteColors.color3 ??
      paletteColorFrom(light(h0 + LIGHT_HUE_OFFSET_1, LIGHT_LIFT_1), "color3"),

    color4: paletteColors.color4 ??
      paletteColorFrom(light(h0 + LIGHT_HUE_OFFSET_2, LIGHT_LIFT_2), "color4")
  };

  return paletteFrom(pColors, "vibrant-balanced");
}
