import {Palette, PaletteColors} from "@engine/palette/palette.model";
import {paletteColorFrom} from "@engine/palette/palette-color.model";
import {tetrad} from "@engine/color/hue.helper";
import {vary} from "@engine/palette/variation.helper";
import {paletteFrom} from "@engine/palette/palette.helper";
import {fromOklch} from "@engine/color/color-from-oklch.helper";
import {randomBetween} from "@engine/helpers/random.helper";
import {usableLightness} from "@engine/color/oklch.helper";


/** OKLch lightness of the four accents when no base color sets one. */
const DEFAULT_LIGHTNESS = 0.62;

/** Chroma the accents aim for; hues that cannot hold it are clamped down. */
const DEFAULT_CHROMA = 0.18;

/**
 * How far the pale member travels from the accents toward white, as a share
 * of the range still available above the accent lightness.
 *
 * A share rather than a fixed offset: the accents follow a given base color,
 * so a light base leaves little room above them. A fixed offset runs past 1
 * there and hands back plain white, which is no longer a pale *tint* of the
 * base hue. The draft's `+40` of HSL lightness does not port at all - equal
 * HSL lightness is not equal perceived lightness, so across the rectangle's
 * rotation the same offset landed at a different perceived step.
 */
export const PALE_LIFT = 0.62;

/**
 * Share of the accent chroma the pale member keeps. It stays a tint of the
 * base hue rather than a neutral: the rectangle already carries four accents,
 * and a fifth near-gray would leave the style without the light ground the
 * draft gives it.
 */
const PALE_CHROMA_FACTOR = 0.30;

/**
 * Jitter of the pale chroma, as a share of it. Keep it relative: an absolute
 * amount outgrows the value it varies once the base color is muted, and tints
 * the pale member of an otherwise all-gray palette.
 */
const PALE_CHROMA_JITTER = 0.25;

/**
 * Jitter of the pale lightness, as a share of the lift. Relative for the same
 * reason as the lift itself: an absolute amount survives a light base color
 * that the lift no longer has room for. It stays far enough inside the lift
 * that the pale member sits above the accents for every draw.
 */
export const PALE_LIFT_JITTER = 0.15;


/**
 * Generates a tetradic color palette based on the given seed hue or existing
 * palette colors. A tetradic palette is four hues on a rectangle - the base
 * and its +90, +180 and +270 rotations - plus one pale tint of the base hue
 * that gives the four accents a light ground to sit on.
 *
 * The four accents are built in OKLch and share one lightness exactly, so
 * they read as siblings. HSL cannot do that: equal HSL lightness leaves the
 * members far apart in perceived lightness, and with four hues a quarter of
 * the wheel apart the spread covers most of the usable range. Chroma follows
 * the sRGB boundary per hue - see `fromOklch()` for why the members are not
 * levelled to a common chroma instead.
 *
 * Four accents of equal weight need one clear dominant color to lead them,
 * which is what the base color is: the pale member carries the base hue, so
 * the palette leans the way the visitor's color does.
 *
 * @param {Partial<PaletteColors>} [paletteColors={}] - Optional fixed colors to use
 *                when generating the palette. Each provided color is left
 *                untouched, and the remaining colors are generated based on
 *                the provided seed hue. If no colors are provided, a random
 *                neutral color is generated.
 * @param {number} [seedHue] - An optional base hue value in degrees (0-360)
 *                             used to generate the color palette. If not
 *                             provided, a random hue is used.
 * @return {Palette} The complete tetradic color palette containing five
 *                   colors: four accents on a rectangle and one pale tint.
 */
export function generateTetradic(paletteColors: Partial<PaletteColors> = {},
                                 seedHue?: number): Palette {
  const baseColor = paletteColors.color0?.color;
  const [l, c, h] = baseColor?.oklch() ?? [];
  // chroma-js reports NaN for the hue of a gray, which carries no direction.
  const hue = h !== undefined && !Number.isNaN(h)
    ? h
    : seedHue ?? randomBetween(0, 360);
  // Clamped: at a lightness of 0 or 1 no hue holds any chroma, so all four
  // accents would come out the same black or white - see `usableLightness()`.
  const baseLight = usableLightness(l ?? DEFAULT_LIGHTNESS);
  const baseChroma = c ?? DEFAULT_CHROMA;

  const rectangleHues = tetrad(hue);

  const accent = (accentHue: number) =>
    fromOklch({l: baseLight, c: baseChroma, h: accentHue});

  const pale = () => {
    const travel = (1 - baseLight) * PALE_LIFT;
    const chromacity = baseChroma * PALE_CHROMA_FACTOR;

    return fromOklch({
      l: baseLight + vary(travel, travel * PALE_LIFT_JITTER),
      c: vary(chromacity, chromacity * PALE_CHROMA_JITTER),
      h: hue
    });
  };

  const pColors: PaletteColors = {
    color0: paletteColors.color0 ??
      paletteColorFrom(accent(rectangleHues[0]), "color0"),

    color1: paletteColors.color1 ??
      paletteColorFrom(accent(rectangleHues[1]), "color1"),

    color2: paletteColors.color2 ??
      paletteColorFrom(accent(rectangleHues[2]), "color2"),

    color3: paletteColors.color3 ??
      paletteColorFrom(accent(rectangleHues[3]), "color3"),

    color4: paletteColors.color4 ??
      paletteColorFrom(pale(), "color4")
  };

  return paletteFrom(pColors, "tetradic");
}
