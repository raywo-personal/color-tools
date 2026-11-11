import chroma, {Color} from "chroma-js";
import {inRgbRange} from "./rgb.helper";
import {inOklchHueRange, inOklchLightnessRange, maxChroma} from "./oklch.helper";


const RGB_PATTERN = /^rgb\((\d{1,3})[,\s+]\s*(\d{1,3})[,\s+]\s*(\d{1,3})\)$/;
const HSL_PATTERN = /^hsl\(\s*(\d+(?:\.\d+)?)(?:\s*deg)?\s*(?:,|\s)\s*(?:(\d+(?:\.\d+)?%)|(\d+(?:\.\d+)?))\s*(?:,|\s)\s*(?:(\d+(?:\.\d+)?%)|(\d+(?:\.\d+)?))\s*\)$/;
const OKLCH_PATTERN = /^oklch\(\s*(?:(\d+(?:\.\d+)?|\.\d+)%|(\d+(?:\.\d+)?|\.\d+))\s+(\d+(?:\.\d+)?|\.\d+)\s+(\d+(?:\.\d+)?|\.\d+)(?:\s*deg)?\s*\)$/;


/** One step of the thousandths `formatColor()` writes chroma in. */
const VISIBLE_CHROMA_REDUCTION = 1e-3;

/**
 * Half a step of the lightness, as a fraction, and of the hue, in degrees,
 * that `formatColor()` writes: how far a row may sit from the color it was
 * written for.
 */
const ROW_LIGHTNESS_ROUNDING = 5e-4;
const ROW_HUE_ROUNDING = 0.5;


export function isTranslucent(this: void, color: Color): boolean {
  return color.alpha() !== 1;
}


export function isHex(this: void, value: string): boolean {
  const hex = value.startsWith("#") ? value.slice(1) : value;
  const validLengths = [3, 6, 8];
  const hexPattern = /^[0-9A-Fa-f]+$/;

  return validLengths.includes(hex.length) && hexPattern.test(hex);
}

export function isRgb(this: void, value: string): boolean {
  return RGB_PATTERN.test(value);
}

export function isHsl(this: void, value: string): boolean {
  return HSL_PATTERN.test(value);
}

export function isOklch(this: void, value: string): boolean {
  return OKLCH_PATTERN.test(value);
}


export function colorFrom(this: void, value: string | null): Color | null {
  if (!value) return null;

  if (isHex(value)) {
    return chroma(value);
  }

  if (isRgb(value)) {
    return handleRgb(value);
  }

  if (isHsl(value)) {
    return handleHsl(value);
  }

  if (isOklch(value)) {
    return handleOklch(value);
  }

  return null;
}


function handleRgb(value: string): Color | null {
  const matches = value.match(RGB_PATTERN);

  if (!matches) return null;

  const [_, redS, greenS, blueS] = matches;
  const red = Number(redS);
  const green = Number(greenS);
  const blue = Number(blueS);

  if (!inRgbRange(red) || !inRgbRange(green) || !inRgbRange(blue)) return null;

  return chroma([red, green, blue]);
}


function handleHsl(value: string): Color | null {
  const matches = value.match(HSL_PATTERN);

  if (!matches) return null;

  const [_, angle, saturationPercent, saturationDec, luminancePercent, luminanceDec] = matches;

  const hue = Number(angle);
  let saturation = 0;
  let luminance = 0;

  if (saturationPercent) {
    saturation = Number(saturationPercent.replace("%", "")) / 100;
  } else if (saturationDec) {
    saturation = Number(saturationDec);
  }

  if (luminancePercent) {
    luminance = Number(luminancePercent.replace("%", "")) / 100;
  } else if (luminanceDec) {
    luminance = Number(luminanceDec);
  }

  return chroma.hsl(hue, saturation, luminance);
}


/**
 * Determines whether reading a value as a color pulls its OKLch chroma back to
 * the sRGB boundary.
 *
 * A separate question rather than a second result of `colorFrom()`: that
 * returns `Color | null` to every caller in the app and the MCP server, and
 * only the field a visitor types into has anybody to tell. The answer is
 * about the value, not the screen - the app holds sRGB colors only, so the
 * same link says the same thing on any display.
 *
 * The value is measured against the most chroma sRGB holds anywhere within
 * the rounding of a conversion row, not at the coordinates as written. The
 * row writes lightness to a tenth of a percent and hue to the degree, and
 * near a cusp of the gamut either moves `maxChroma()` by more than the chroma
 * step; a row pasted back - `#00FF00`'s among them - would otherwise be
 * called out of gamut by its own rounding. A reduction smaller than
 * `VISIBLE_CHROMA_REDUCTION` does not count either, for the rounding of the
 * chroma itself.
 *
 * @param {string | null} value - What the visitor entered.
 * @return {boolean} True for a readable OKLch value whose chroma sRGB cannot
 *                   hold; false for any other value, including one that is no
 *                   color at all.
 */
export function reducesOklchChroma(this: void, value: string | null): boolean {
  const coordinates = value ? oklchCoordinates(value) : null;

  if (!coordinates) return false;

  const {lightness, chromacity, hue} = coordinates;

  return chromacity - maxChromaWithinRowRounding(lightness, hue) >= VISIBLE_CHROMA_REDUCTION;
}


/**
 * The most chroma sRGB holds at any lightness and hue a conversion row could
 * have rounded to these.
 */
function maxChromaWithinRowRounding(lightness: number, hue: number): number {
  let most = 0;

  for (const lightnessStep of [-1, 0, 1]) {
    for (const hueStep of [-1, 0, 1]) {
      most = Math.max(most, maxChroma(
        lightness + lightnessStep * ROW_LIGHTNESS_ROUNDING,
        hue + hueStep * ROW_HUE_ROUNDING
      ));
    }
  }

  return most;
}


function handleOklch(value: string): Color | null {
  const coordinates = oklchCoordinates(value);

  if (!coordinates) return null;

  const {lightness, chromacity, hue} = coordinates;

  // Chroma is unbounded in OKLch, so a pasted value may sit outside sRGB.
  // Pulling it back to the gamut boundary keeps lightness and hue, while
  // chroma-js' per-channel clipping would shift both. `reducesOklchChroma()`
  // answers whether this happened.
  const chromaValue = Math.min(chromacity, maxChroma(lightness, hue));

  return chroma.oklch(lightness, chromaValue, hue);
}


/**
 * Reads an OKLch value into its coordinates, lightness as a fraction.
 *
 * @return The coordinates, or null where the value is no OKLch color or a
 *         coordinate lies outside its range. Chroma is left as written.
 */
function oklchCoordinates(value: string): {lightness: number; chromacity: number; hue: number} | null {
  const matches = value.match(OKLCH_PATTERN);

  if (!matches) return null;

  const [_, lightnessPercent, lightnessDec, chromaRaw, angle] = matches;

  // A bare number carries lightness in [0, 1], a percentage in [0, 100].
  const lightness = lightnessPercent
    ? Number(lightnessPercent)
    : Number(lightnessDec) * 100;
  const hue = Number(angle);

  if (!inOklchLightnessRange(lightness)) return null;
  if (!inOklchHueRange(hue)) return null;

  return {lightness: lightness / 100, chromacity: Number(chromaRaw), hue};
}
