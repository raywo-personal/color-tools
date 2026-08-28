import {Palette, PaletteColors} from "@palettes/models/palette.model";
import {paletteColorFrom} from "@palettes/models/palette-color.model";
import {triad} from "@common/helpers/hue.helper";
import {vary} from "@palettes/helper/variation.helper";
import {paletteFrom} from "@palettes/helper/palette.helper";
import {fromOklch} from "@common/helpers/color-from-oklch.helper";
import {randomBetween} from "@common/helpers/random.helper";


/** OKLch lightness of the three accents when no base color sets one. */
const DEFAULT_LIGHTNESS = 0.62;

/** Chroma the accents aim for; hues that cannot hold it are clamped down. */
const DEFAULT_CHROMA = 0.18;

/** How much lighter the two supporting colors sit above the accents. */
const SUPPORT_LIGHTNESS_OFFSET = 0.06;

/** Share of the accent chroma the supporting colors keep - near-neutral. */
const SUPPORT_CHROMA_FACTOR = 0.12;

/**
 * Jitter of the supporting chroma, as a share of it. Keep it relative: an
 * absolute amount outgrows the value it varies once the base color is muted,
 * and tints the supports of an otherwise all-gray palette.
 */
const SUPPORT_CHROMA_JITTER = 0.25;

/** Jitter of the supporting lightness, in OKLch lightness. */
const SUPPORT_LIGHTNESS_JITTER = 0.04;


/**
 * Generates a triadic color palette based on the given seed hue or existing
 * palette colors. Triadic palettes consist of three colors evenly spaced
 * around the color wheel and two additional variations. The first three
 * colors are derived from the given seed hue, and the additional two colors
 * are lighter, near-neutral versions of the first two.
 *
 * The three accents are built in OKLch and share one lightness exactly, so
 * they read as siblings. HSL cannot do that: equal HSL lightness leaves the
 * members up to 0.34 OKLch lightness apart, which is most of the usable
 * range. Chroma follows the sRGB boundary per hue - see `fromOklch()` for
 * why the members are not levelled to a common chroma instead.
 *
 * @param {Partial<PaletteColors>} [paletteColors={}] - Optional fixed colors to use
 *                when generating the palette. Each provided color is left
 *                untouched, and the remaining colors are generated based on
 *                the provided seed hue. If no colors are provided, a random
 *                neutral color is generated.
 * @param {number} [seedHue] - An optional base hue value in degrees (0-360)
 *                             used to generate the color palette. If not
 *                             provided, a random hue is used.
 * @return {Palette} The complete triadic color palette containing five colors:
 *                   three calculated from the triad and two additional
 *                   variations.
 */
export function generateTriadic(paletteColors: Partial<PaletteColors> = {},
                                seedHue?: number): Palette {
  const baseColor = paletteColors.color0?.color;
  const [l, c, h] = baseColor?.oklch() ?? [];
  // chroma-js reports NaN for the hue of a gray, which carries no direction.
  const hue = h !== undefined && !Number.isNaN(h)
    ? h
    : seedHue ?? randomBetween(0, 360);
  const baseLight = l ?? DEFAULT_LIGHTNESS;
  const baseChroma = c ?? DEFAULT_CHROMA;

  const triadHues = triad(hue);

  const accent = (accentHue: number) =>
    fromOklch({l: baseLight, c: baseChroma, h: accentHue});

  const supportChroma = baseChroma * SUPPORT_CHROMA_FACTOR;

  const support = (supportHue: number) => fromOklch({
    l: vary(baseLight + SUPPORT_LIGHTNESS_OFFSET, SUPPORT_LIGHTNESS_JITTER),
    c: vary(supportChroma, supportChroma * SUPPORT_CHROMA_JITTER),
    h: supportHue
  });

  const pColors: PaletteColors = {
    color0: paletteColors.color0 ??
      paletteColorFrom(accent(triadHues[0]), "color0"),

    color1: paletteColors.color1 ??
      paletteColorFrom(accent(triadHues[1]), "color1"),

    color2: paletteColors.color2 ??
      paletteColorFrom(accent(triadHues[2]), "color2"),

    color3: paletteColors.color3 ??
      paletteColorFrom(support(triadHues[0]), "color3"),

    color4: paletteColors.color4 ??
      paletteColorFrom(support(triadHues[1]), "color4")
  };

  return paletteFrom(pColors, "triadic");
}
