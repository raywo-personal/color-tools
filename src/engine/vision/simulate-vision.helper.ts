import chroma, {Color} from "chroma-js";
import {VisionModel} from "@engine/vision/vision.model";


/** A 3x3 matrix, row-major. */
type Matrix = readonly [
  number, number, number,
  number, number, number,
  number, number, number
];


/**
 * Protanopia and deuteranopia after Viénot, Brettel & Mollon (1999), "Digital
 * video colourmaps for checking the legibility of displays by dichromats",
 * Color Research & Application 24(4).
 *
 * The paper's single-plane projection is exact for the two red-green
 * dichromacies: their confusion lines meet in one copunctal point, so one
 * plane through the neutral axis holds every colour a dichromat can tell
 * apart. The matrices below are the paper's, collapsed into linear sRGB.
 */
const PROTANOPIA: Matrix = [
  0.11238, 0.88762, 0.00000,
  0.11238, 0.88762, 0.00000,
  0.00401, -0.00401, 1.00000
];

const DEUTERANOPIA: Matrix = [
  0.29275, 0.70725, 0.00000,
  0.29275, 0.70725, 0.00000,
  -0.02234, 0.02234, 1.00000
];

/**
 * Tritanopia after Brettel, Viénot & Mollon (1997), "Computerized simulation
 * of color appearance for dichromats", JOSA A 14(10).
 *
 * Two half-planes, not one. Viénot 1999 says so itself: its single plane
 * holds for protan and deutan but not for tritan, where the projection has to
 * fold at the neutral axis. The sign of `TRITAN_SEPARATION` against the
 * linear colour picks the half.
 *
 * The two matrices agree on the separation plane, so the fold costs no jump -
 * `simulate-vision.helper.spec.ts` walks the hue circle to pin that.
 */
const TRITANOPIA_1: Matrix = [
  1.01277, 0.13548, -0.14826,
  -0.01243, 0.86812, 0.14431,
  0.07589, 0.80500, 0.11911
];

const TRITANOPIA_2: Matrix = [
  0.93678, 0.18979, -0.12657,
  0.06154, 0.81526, 0.12320,
  -0.37562, 1.12767, 0.24796
];

/**
 * The normal of the plane that separates the two tritan half-planes.
 *
 * Its components sum to zero, which is what puts the neutral axis in the
 * plane: grey sits on the fold and both halves return it unchanged.
 */
const TRITAN_SEPARATION: readonly [number, number, number] = [0.03901, -0.02788, -0.01113];

/**
 * Achromatopsia as luminance, with the Rec. 709 coefficients sRGB is defined
 * against.
 *
 * The draft applies the Rec. 601 luma coefficients to the gamma-encoded
 * bytes. That is two errors at once - the wrong coefficients and the wrong
 * light - and both push the result the same way: too light. Here the same
 * coefficients that `chroma.luminance()` uses run on linear values, so a
 * simulated grey carries the luminance of the colour it stands for.
 */
const ACHROMATOPSIA: Matrix = [
  0.2126, 0.7152, 0.0722,
  0.2126, 0.7152, 0.0722,
  0.2126, 0.7152, 0.0722
];


/**
 * The sRGB electro-optical transfer function, IEC 61966-2-1.
 *
 * `chroma.gl()` is **not** this, despite the name: it hands back the sRGB
 * bytes divided by 255, still gamma-encoded. Applying a matrix to those
 * values is the mistake this whole helper exists to avoid - the matrices are
 * defined on linear light, and on encoded values every simulated colour comes
 * out visibly too light.
 */
function toLinear(this: void, channel: number): number {
  return channel <= 0.04045
    ? channel / 12.92
    : Math.pow((channel + 0.055) / 1.055, 2.4);
}


/** The inverse of `toLinear()`. */
function toEncoded(this: void, channel: number): number {
  return channel <= 0.0031308
    ? channel * 12.92
    : 1.055 * Math.pow(channel, 1 / 2.4) - 0.055;
}


function clamp01(this: void, value: number): number {
  return Math.min(Math.max(value, 0), 1);
}


function matrixFor(this: void,
                   vision: Exclude<VisionModel, "normal">,
                   linear: readonly [number, number, number]): Matrix {
  switch (vision) {
    case "protanopia":
      return PROTANOPIA;
    case "deuteranopia":
      return DEUTERANOPIA;
    case "achromatopsia":
      return ACHROMATOPSIA;
    case "tritanopia": {
      const side = TRITAN_SEPARATION[0] * linear[0]
        + TRITAN_SEPARATION[1] * linear[1]
        + TRITAN_SEPARATION[2] * linear[2];

      return side >= 0 ? TRITANOPIA_1 : TRITANOPIA_2;
    }
  }
}


/**
 * The color as it reaches a viewer with the given colour vision.
 *
 * All four models are projections in linear sRGB: each matrix has row sums of
 * one and squares to itself, so grey is returned unchanged and simulating an
 * already simulated colour changes nothing. `simulate-vision.helper.spec.ts`
 * pins both, which is what catches a mistyped coefficient - a wrong digit
 * breaks one of the two.
 *
 * @param {Color} color - The color as a normal trichromat sees it.
 * @param {VisionModel} vision - The vision model to simulate.
 * @return {Color} The simulated color; the input itself for `"normal"`.
 */
export function simulateVision(this: void, color: Color, vision: VisionModel): Color {
  if (vision === "normal") return color;

  const [r, g, b] = color.gl();
  const linear: [number, number, number] = [
    toLinear(clamp01(r)),
    toLinear(clamp01(g)),
    toLinear(clamp01(b))
  ];

  const m = matrixFor(vision, linear);

  // Clamped before the transfer function, not after: a projection can push a
  // channel past the gamut, and `toEncoded()` is only defined on [0, 1].
  return chroma.gl(
    toEncoded(clamp01(m[0] * linear[0] + m[1] * linear[1] + m[2] * linear[2])),
    toEncoded(clamp01(m[3] * linear[0] + m[4] * linear[1] + m[5] * linear[2])),
    toEncoded(clamp01(m[6] * linear[0] + m[7] * linear[1] + m[8] * linear[2]))
  );
}
