import chroma, {Color} from "chroma-js";
import {APCAPolarity, calculateAPCAContrast, getAPCAPolarity, meetsRequiredLc} from "@engine/contrast/apca-rating.helper";
import {fromOklch} from "@engine/color/color-from-oklch.helper";
import {BLACK, toColor, WHITE} from "@engine/color/color.helper";


export const ADJUSTABLE_COLORS = ["background", "text"] as const;
export type AdjustableColor = typeof ADJUSTABLE_COLORS[number];

export interface ContrastAdjustment {
  /**
   * The moved color, as the 8-bit color its hex names; every figure in this
   * result is measured on it. The input itself where the pair already
   * passed, and the pole that comes closest where no lightness passes.
   */
  color: Color;

  /**
   * Whether the pair with `color` reaches `requiredLc`. Where `false`,
   * `color` is the closest the walk came, not a fix.
   */
  meetsRequirement: boolean;

  /**
   * Signed OKLch lightness move on a 0 to 1 scale: positive is lighter,
   * negative darker. 0 where the pair already passed.
   */
  lightnessDelta: number;
  /**
   * OKLch chroma of the result. Lower than originalChroma where sRGB cannot
   * carry the original saturation at the new lightness – the color then
   * looks duller.
   */
  chroma: number;
  /**
   * OKLch chroma of the original adjusted color.
   */
  originalChroma: number;

  /**
   * APCA Lc of the resulting pair. Positive where the text is darker than the
   * background, negative where it is lighter.
   */
  actualLc: number;
  /**
   * The Lc the search aimed at, as it was passed in.
   */
  requiredLc: number;
  /**
   * dark-on-light where the text is darker than the background, light-on-dark
   * where it is lighter. It can differ from the original pair where the
   * smaller move crossed the lightness of the color held.
   */
  lcPolarity: APCAPolarity;
}


/**
 * OKLch lightness between two candidates of the walk.
 *
 * At most 200 candidates per direction, so a binary search buys nothing.
 * It would also need Lc to rise evenly along the walk, and it does not:
 * every candidate is rounded to 8 bits, and Lc steps with the rounding.
 */
const LIGHTNESS_STEP = 0.005;


/** A color the walk measured, with the Lc of the pair it makes. */
interface Candidate {
  color: Color;
  lc: number;
}


/**
 * Shifts one color of a pair in OKLch lightness until the pair meets the
 * required Lc, and holds the other exactly.
 *
 * The walk keeps the moved color's hue and asks for its original chroma at
 * every lightness; `fromOklch()` lowers only what sRGB cannot carry there.
 * Asking for the chroma the previous step came back with instead would let
 * every clamp ratchet the color duller, even where the gamut widens again.
 *
 * Both directions are walked, and the smaller move wins: on a color of
 * middling lightness darkening and lightening can both pass, and the smaller
 * move is the one that still looks like the color the caller started with.
 * The winner can cross the lightness of the color held, so the polarity can
 * flip.
 *
 * The walk runs from pole to pole, not through `usableLightness()`. That
 * clamp keeps palette members tinted; here the passing lightness often sits
 * close to black or white, and the clamp would stop the walk short of
 * contrast that is there.
 *
 * Every candidate is the 8-bit color its hex names, not the fractional one
 * OKLch produced: the caller hands out the hex, and a candidate that passed by
 * a hair before rounding would fail after it.
 *
 * The poles are measured before any walk. Nothing is lighter than white or
 * darker than black, and Lc grows as the moved color draws away from the one
 * held, so each pole carries the largest |Lc| of its polarity: where a
 * candidate passes, the pole on its side does too. Where neither passes,
 * nothing on the walk can, and the pole with the larger |Lc| is the closest
 * answer. The shortcut is what keeps an impossible request from walking both
 * directions to the end.
 *
 * The two directions are walked in step, so the first to pass is the smaller
 * move and the other stops there.
 *
 * @param textColor - The text color, held where the background moves
 * @param bgColor - The background color, held where the text moves
 * @param adjustable - Which of the two colors may move
 * @param requiredLc - The Lc the pair has to reach
 * @returns The moved color and the figures of the pair it makes
 */
export function adjustColorForContrast(textColor: Color | string,
                                       bgColor: Color | string,
                                       adjustable: AdjustableColor,
                                       requiredLc: number): ContrastAdjustment {
  const text = toColor(textColor);
  const bg = toColor(bgColor);
  const original = adjustable === "text" ? text : bg;

  const measure = (color: Color): Candidate => ({
    color,
    lc: adjustable === "text" ? calculateAPCAContrast(color, bg) : calculateAPCAContrast(text, color)
  });
  const passes = (candidate: Candidate): boolean => meetsRequiredLc(candidate.lc, requiredLc);

  const unmoved = measure(original);

  if (passes(unmoved)) return adjustmentOf(original, unmoved, requiredLc, true);

  const [white, black] = [WHITE, BLACK].map(measure);

  if (!passes(white) && !passes(black)) {
    const closest = Math.abs(white.lc) >= Math.abs(black.lc) ? white : black;

    return adjustmentOf(original, closest, requiredLc, false);
  }

  const walks = [walkTowards(1, original), walkTowards(0, original)];

  let steps = walks.map(walk => walk.next());

  while (steps.some(step => !step.done)) {
    const passing = steps
      .filter((step): step is IteratorYieldResult<Color> => !step.done)
      .map(step => measure(step.value))
      .filter(passes);

    if (passing.length > 0) {
      const smallest = passing.reduce((best, candidate) =>
        lightnessMove(original, candidate) < lightnessMove(original, best) ? candidate : best);

      return adjustmentOf(original, smallest, requiredLc, true);
    }

    steps = walks.map(walk => walk.next());
  }

  // Each walk ends on its pole, so the one towards the passing pole returns
  // above. This only keeps a rounding surprise from ending the loop silently.
  return adjustmentOf(original, passes(white) ? white : black, requiredLc, true);
}


/**
 * The candidates from a color's own lightness towards one pole, one step
 * apart and ending on the pole itself.
 *
 * The color's lightness sits on no lattice the pole shares, so the last step
 * falls short of the pole and the pole is measured on its own. Without it a
 * pair whose only passing lightness is black or white would come back as
 * failing.
 *
 * @param pole - 0 for black, 1 for white
 * @param color - The color to move
 */
function* walkTowards(pole: number, color: Color): Generator<Color> {
  const [lightness, chromacity, hue] = color.oklch();
  const direction = Math.sign(pole - lightness);
  const steps = Math.ceil(Math.abs(pole - lightness) / LIGHTNESS_STEP);

  for (let step = 1; step < steps; step++) {
    yield candidateAt(lightness + direction * step * LIGHTNESS_STEP, chromacity, hue);
  }

  if (steps > 0) yield candidateAt(pole, chromacity, hue);
}


/**
 * The 8-bit color at a lightness, on the given hue and at as much of the given
 * chroma as sRGB holds there.
 */
function candidateAt(lightness: number, chromacity: number, hue: number): Color {
  return chroma(fromOklch({l: lightness, c: chromacity, h: hue}).hex());
}


/** How far a candidate moved from the original, in OKLch lightness. */
function lightnessMove(original: Color, candidate: Candidate): number {
  return Math.abs(candidate.color.oklch()[0] - original.oklch()[0]);
}


function adjustmentOf(original: Color,
                      candidate: Candidate,
                      requiredLc: number,
                      meetsRequirement: boolean): ContrastAdjustment {
  return {
    color: candidate.color,
    meetsRequirement,
    lightnessDelta: candidate.color.oklch()[0] - original.oklch()[0],
    chroma: candidate.color.oklch()[1],
    originalChroma: original.oklch()[1],
    actualLc: candidate.lc,
    requiredLc,
    lcPolarity: getAPCAPolarity(candidate.lc)
  };
}
