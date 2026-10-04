import chroma, {Color} from "chroma-js";
import {inRgbRange} from "./rgb.helper";
import {inOklchHueRange, inOklchLightnessRange, maxChroma} from "./oklch.helper";


const RGB_PATTERN = /^rgb\((\d{1,3})[,\s+]\s*(\d{1,3})[,\s+]\s*(\d{1,3})\)$/;
const HSL_PATTERN = /^hsl\(\s*(\d+(?:\.\d+)?)(?:\s*deg)?\s*(?:,|\s)\s*(?:(\d+(?:\.\d+)?%)|(\d+(?:\.\d+)?))\s*(?:,|\s)\s*(?:(\d+(?:\.\d+)?%)|(\d+(?:\.\d+)?))\s*\)$/;
const OKLCH_PATTERN = /^oklch\(\s*(?:(\d+(?:\.\d+)?|\.\d+)%|(\d+(?:\.\d+)?|\.\d+))\s+(\d+(?:\.\d+)?|\.\d+)\s+(\d+(?:\.\d+)?|\.\d+)(?:\s*deg)?\s*\)$/;


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


function handleOklch(value: string): Color | null {
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

  // Chroma is unbounded in OKLch, so a pasted value may sit outside sRGB.
  // Pulling it back to the gamut boundary keeps lightness and hue, while
  // chroma-js' per-channel clipping would shift both.
  const chromaValue = Math.min(Number(chromaRaw), maxChroma(lightness / 100, hue));

  return chroma.oklch(lightness / 100, chromaValue, hue);
}
