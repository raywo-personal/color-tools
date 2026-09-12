import {Palette, PaletteColors} from "@engine/palette/palette.model";
import {PaletteStyle} from "@engine/palette/palette-style.model";
import {paletteColorFrom} from "@engine/palette/palette-color.model";
import {vary} from "@engine/palette/variation.helper";
import {analogRange, splitComplement} from "@engine/color/hue.helper";
import {Color} from "chroma-js";
import {randomBetween} from "@engine/helpers/random.helper";
import {paletteFrom} from "@engine/palette/palette.helper";
import {fromOklch} from "@engine/color/color-from-oklch.helper";
import {usableLightness} from "@engine/color/oklch.helper";


/** OKLch lightness of the base when no base color sets one. */
const DEFAULT_LIGHTNESS = 0.45;

/** Chroma the members aim for; hues that cannot hold it are clamped down. */
export const DEFAULT_CHROMA = 0.16;

/**
 * Total hue span the two analogs are spread over, in degrees. They sit half
 * of it either side of the base - which is what `ROLE_CAPTIONS` calls
 * "−14" and "+14".
 */
export const ANALOG_SPAN = 28;

/** Jitter of the analogs' hue, in degrees. */
export const ANALOG_HUE_JITTER = 5;

/** Hue offset of the pastel from the base, in degrees. */
export const PASTEL_HUE_OFFSET = 20;

/** Jitter of the pastel's hue, in degrees. */
export const PASTEL_HUE_JITTER = 6;

/** How far the counter hue sits from the base's complement, in degrees. */
export const SPLIT_DEGREES = 28;

/** Jitter of the counter's hue, in degrees. */
export const SPLIT_HUE_JITTER = 6;

/**
 * How far the analogs and the pastel travel from the base toward white, as a
 * share of the range still available above the base lightness.
 *
 * A share rather than a fixed offset: the members follow a given base color,
 * so a light base leaves little room above it. A fixed offset runs past 1
 * there and hands back plain white, which is neither a pastel *color* nor
 * distinguishable from the analogs. The HSL offsets these replace - `+0.16`
 * for the analogs and `+0.48` for the pastel - do not port at all: equal HSL
 * lightness is not equal perceived lightness, so across a hue rotation the
 * same offset landed at a different perceived step and the pastel read as a
 * different amount of "lighter" depending on where the base hue sat.
 */
export const ANALOG_LIFT = 0.22;
export const PASTEL_LIFT = 0.62;

/**
 * Jitter of each lift, as a share of it. Relative for the same reason as the
 * lift itself: an absolute amount survives a light base color that the lift
 * no longer has room for.
 *
 * All three stay far enough inside their lift that the lifted members keep
 * their order for every draw - the counter below the analogs, the analogs
 * below the pastel. `analogous-based-palette.helper.spec.ts` derives that
 * bound from these constants rather than writing it out.
 */
export const ANALOG_LIFT_JITTER = 0.25;
export const PASTEL_LIFT_JITTER = 0.15;
export const SPLIT_LIFT_JITTER = 0.30;

/**
 * Jitter of a member's chroma, as a share of it. Keep it relative: an
 * absolute amount outgrows the value it varies once the base color is muted,
 * and tints the members of an otherwise all-gray palette.
 */
export const CHROMA_JITTER = 0.12;


/**
 * What one style makes of the shared shape: how much of the base's chroma
 * each member keeps, and how far the counter sits above the base.
 *
 * Chroma as a share of the base's rather than as an offset - the base color
 * is the visitor's, and a fixed amount subtracted from it turns a muted base
 * gray while leaving a vivid one vivid. The HSL saturation offsets these
 * replace were read against a fixed default saturation and do not port.
 */
interface AnalogousBasedPaletteConfig {
  /** Share of the base chroma the two analogs keep. */
  analogsChromaFactor: number;

  /** Share of the base chroma the pastel keeps. */
  pastelChromaFactor: number;

  /** Share of the base chroma the counter keeps. */
  splitChromaFactor: number;

  /**
   * How far the counter travels toward white, as a share of the room above
   * the base. Zero leaves it at the base's lightness exactly, where it reads
   * as the base's sibling in the opposite direction rather than as a lighter
   * member.
   */
  splitLift: number;
}


/** One generated member: a hue, a lift off the base, a share of its chroma. */
interface MemberSpec {
  hue: number;
  hueJitter: number;
  lift: number;
  liftJitter: number;
  chromaFactor: number;
}


/**
 * Generates an analogous-based color palette with configurable variations.
 * This is a shared helper function used by both analogous and muted-analog-split
 * palette generators.
 *
 * All five members are built in OKLch: the base sets lightness, chroma and
 * hue, the other four rotate off its hue and lift off its lightness by a
 * share of the room still above it. Chroma follows the sRGB boundary per hue
 * - see `fromOklch()` for why the members are not levelled to a common
 * chroma instead.
 *
 * @param {Partial<PaletteColors>} paletteColors - Optional fixed colors to use
 *                when generating the palette. Each provided color is left
 *                untouched, and the remaining colors are generated from the
 *                OKLch coordinates of `color0`. If no colors are provided, the
 *                defaults above are used at a random hue.
 * @param {number} [seedHue] - An optional base hue value in degrees (0-360)
 *                             used to generate the color palette. If not
 *                             provided, a random hue is used.
 * @param {AnalogousBasedPaletteConfig} config - Configuration object that
 *                                               defines the chroma shares and
 *                                               the counter's lift for the
 *                                               different color roles.
 * @param {PaletteStyle} style - The palette style name for the returned palette.
 * @return {Palette} A complete analogous-based palette containing five colors.
 */
export function generateAnalogousBasedPalette(
  paletteColors: Partial<PaletteColors> = {},
  seedHue: number | undefined,
  config: AnalogousBasedPaletteConfig,
  style: PaletteStyle
): Palette {
  const baseColor = paletteColors.color0?.color;
  const [l, c, h] = baseColor?.oklch() ?? [];
  // chroma-js reports NaN for the hue of a gray, which carries no direction.
  const h0 = h !== undefined && !Number.isNaN(h)
    ? h
    : seedHue ?? randomBetween(0, 360);
  // Clamped: at a lightness of 0 or 1 no hue holds any chroma, so every
  // member would come out the same black or white - see `usableLightness()`.
  const baseLight = usableLightness(l ?? DEFAULT_LIGHTNESS);
  const baseChroma = c ?? DEFAULT_CHROMA;

  const room = 1 - baseLight;

  const member = (spec: MemberSpec): Color => {
    const travel = room * spec.lift;
    const chromacity = baseChroma * spec.chromaFactor;

    return fromOklch({
      l: baseLight + vary(travel, travel * spec.liftJitter),
      c: vary(chromacity, chromacity * CHROMA_JITTER),
      h: vary(spec.hue, spec.hueJitter)
    });
  };

  const analog = (hue: number): Color => member({
    hue,
    hueJitter: ANALOG_HUE_JITTER,
    lift: ANALOG_LIFT,
    liftJitter: ANALOG_LIFT_JITTER,
    chromaFactor: config.analogsChromaFactor
  });

  // Counted out rather than walked to - see `analogRange()`. The two analogs
  // are color1 and color4.
  const analogHues = analogRange(h0, ANALOG_SPAN, 2);

  const pColors: PaletteColors = {
    color0: paletteColors.color0 ??
      paletteColorFrom(fromOklch({l: baseLight, c: baseChroma, h: h0}), "color0"),

    color1: paletteColors.color1 ??
      paletteColorFrom(analog(analogHues[0]), "color1"),

    color2: paletteColors.color2 ??
      paletteColorFrom(member({
        hue: h0 + PASTEL_HUE_OFFSET,
        hueJitter: PASTEL_HUE_JITTER,
        lift: PASTEL_LIFT,
        liftJitter: PASTEL_LIFT_JITTER,
        chromaFactor: config.pastelChromaFactor
      }), "color2"),

    color3: paletteColors.color3 ??
      paletteColorFrom(member({
        hue: splitComplement(h0, SPLIT_DEGREES)[0],
        hueJitter: SPLIT_HUE_JITTER,
        lift: config.splitLift,
        liftJitter: SPLIT_LIFT_JITTER,
        chromaFactor: config.splitChromaFactor
      }), "color3"),

    color4: paletteColors.color4 ??
      paletteColorFrom(analog(analogHues[1]), "color4")
  };

  return paletteFrom(pColors, style);
}
