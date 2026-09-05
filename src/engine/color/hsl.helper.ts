/**
 * Clamps a given hue value to the range of 0 to 360 degrees.
 *
 * @param {number} h - The hue value to be clamped.
 * @return {number} The clamped hue value within the range [0, 360).
 */
export function clampHue(h: number): number {
  return (h % 360 + 360) % 360;
}


/**
 * Normalizes a hue angle to ensure it falls within the range of 0 to 359
 * degrees.
 *
 * @param {number} h - The input hue angle in degrees, which can be any
 *                     integer, positive or negative.
 * @return {number} The normalized hue angle, guaranteed to be in the range
 *                  of 0 to 359 degrees.
 */
export function hueWrap(h: number): number {
  const mod = clampHue(h);
  return mod === 360 ? 0 : mod;
}


/**
 * Clamps a given number to the range [0, 1].
 *
 * Every caller passes a fraction that chroma-js produced or a generator
 * offset it, so a value above 1 is an overshoot to be capped - not a
 * percentage to be rescaled.
 *
 * @param {number} x - The number to clamp.
 * @return {number} The clamped value, guaranteed to be between 0 and 1 (inclusive).
 */
export function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export function inHslAngleRange(this: void, value: number | null): value is number {
  if (value === null) return false;

  return value >= 0 && value <= 360;
}

export function inHslPercentRange(this: void, value: number | null): value is number {
  if (value === null) return false;

  return value >= 0 && value <= 100;
}

