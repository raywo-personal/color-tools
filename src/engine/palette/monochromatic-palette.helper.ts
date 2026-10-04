import {Palette, PALETTE_SLOTS, PaletteColors} from "@engine/palette/palette.model";
import {paletteColorFrom} from "@engine/palette/palette-color.model";
import {randomBetween} from "@engine/helpers/random.helper";
import {paletteFrom} from "@engine/palette/palette.helper";
import {fromOklch} from "@engine/color/color-from-oklch.helper";
import {MAX_USABLE_LIGHTNESS, MIN_USABLE_LIGHTNESS} from "@engine/color/oklch.helper";
import {clamp01} from "@engine/color/hsl.helper";


/**
 * OKLch lightness of the base when no base color sets one. It is the floor of
 * the draft's own ramp, and the ramp reaches from there to the top of the band
 * `usableLightness()` allows - so an unseeded palette is the draft's five
 * steps.
 */
export const DEFAULT_LIGHTNESS = 0.24;

/** Chroma the ramp holds; steps whose lightness cannot hold it are clamped down. */
const DEFAULT_CHROMA = 0.16;

/**
 * Share of the room toward white the ramp spends once the usable band no
 * longer separates its five steps.
 *
 * Half, not more: the two measures in `roomAbove()` cross at a base lightness
 * of 0.84, and a larger share would take over while the band still has room
 * worth using. Not less: the steps end up 8-bit, and half the room above a
 * base at the band's top is still three units of gray per step.
 */
export const RESIDUAL_REACH = 0.5;


/**
 * How far the ramp reaches above a base color of the given lightness.
 *
 * Up to the top of the band `usableLightness()` allows, where every hue still
 * holds the chroma a tint needs to read as tinted - see
 * `MIN_USABLE_LIGHTNESS`. Above the band it does not, and a monochromatic
 * palette is one hue or it is nothing: a reach measured against white instead
 * ends a light base color's ramp on steps that read as near-white whatever hue
 * they were built at, and in the Studio the base is whatever color the visitor
 * is on.
 *
 * A base can sit so high in the band that what is left there no longer
 * separates five steps, so the residual reach applies wherever it is the
 * larger of the two. The two measures meet rather than switch, which is what
 * keeps a base just short of the band's top from collapsing the ramp onto one
 * color. Above the band the residual measure is all there is, and at white it
 * reaches zero - nothing sits above white, and the ramp is the base color
 * five times over.
 */
function roomAbove(this: void, baseLightness: number): number {
  return Math.max(MAX_USABLE_LIGHTNESS - baseLightness,
    (1 - baseLightness) * RESIDUAL_REACH);
}


/**
 * Generates a monochromatic color palette: five steps of one hue, evenly
 * spaced in perceived lightness, rising from the base color to the top of the
 * lightness band that hue still holds color in; a base already above the band
 * rises into what is left of the room toward white.
 *
 * Built step by step in OKLch, which is what makes the spacing even. The HSL
 * endpoints this replaces snapped saturation and lightness through two step
 * functions, and `chroma.bezier().scale().correctLightness()` evened the
 * result out in L*ab - closer than raw HSL, but not what the rest of the
 * palette code measures in. A monochromatic palette is the style where that
 * shows most: the five swatches sit side by side and the gaps between them
 * are the whole point.
 *
 * Every step asks for the base's chroma and `fromOklch()` clamps it to what
 * its own lightness can hold. `maxChroma()` falls off toward both ends of the
 * lightness range, so the lightest steps come back paler than the base
 * whatever they ask for - which is what makes them read as tints. Do not
 * level the steps to the lowest chroma they share; see `fromOklch()`. How far
 * the fall is allowed to go is `roomAbove()`.
 *
 * `roleCaptionFor()` calls the five slots BASE, TINT, LIGHT, PALE and MIST.
 * They are lightness words and the ramp rises, so they name the steps in the
 * order the generator builds them.
 *
 * @param {Partial<PaletteColors>} [paletteColors={}] - Optional fixed colors to use
 *                when generating the palette. Each provided color is left
 *                untouched, and the remaining colors are generated from the
 *                OKLch coordinates of `color0`. If no colors are provided, the
 *                defaults above are used at a random hue.
 * @param {number} [seedHue] - An optional base hue value in degrees (0-360)
 *                             used to generate the color palette. If not
 *                             provided, a random hue is used.
 * @return {Palette} The complete monochromatic palette containing five colors:
 *                   one hue in five rising steps of lightness.
 */
export function generateMonochromatic(paletteColors: Partial<PaletteColors> = {},
                                      seedHue?: number): Palette {
  const baseColor = paletteColors.color0?.color;
  const [l, c, h] = baseColor?.oklch() ?? [];
  // chroma-js reports NaN for the hue of a gray, which carries no direction.
  const hue = h !== undefined && !Number.isNaN(h)
    ? h
    : seedHue ?? randomBetween(0, 360);
  // The floor is clamped, the ceiling is not. The ramp rises away from the
  // base, so lifting a near-black start only decides how deep the ramp begins
  // - see `MIN_USABLE_LIGHTNESS`. Capping a light base at the band's top
  // instead puts the whole ramp below the color the visitor is on: a base
  // lighter than the band came back with four steps darker than itself, under
  // captions that read as rising lightness. `clamp01()` because chroma-js
  // reports white a shade above 1, which would leave `roomAbove()` negative.
  const baseLight = Math.max(clamp01(l ?? DEFAULT_LIGHTNESS),
    MIN_USABLE_LIGHTNESS);
  const baseChroma = c ?? DEFAULT_CHROMA;

  const step = roomAbove(baseLight) / (PALETTE_SLOTS.length - 1);

  const pColors = PALETTE_SLOTS
    .reduce((acc, slot, index) => {
      acc[slot] =
        paletteColors[slot] ??
        paletteColorFrom(
          fromOklch({l: baseLight + index * step, c: baseChroma, h: hue}),
          slot
        );

      return acc;
    }, {} as PaletteColors);

  return paletteFrom(pColors, "monochromatic");
}
