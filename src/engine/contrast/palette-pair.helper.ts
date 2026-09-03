import chroma, {Color} from "chroma-js";
import {Palette, PALETTE_SLOTS} from "@engine/palette/palette.model";
import {ContrastColors, createContrastColors} from "@engine/contrast/contrast-colors.model";
import {findTextColor} from "@engine/contrast/optimal-text-color.helper";


/** Text on background, before either is measured. */
export interface ReadablePair {

  readonly text: Color;
  readonly background: Color;

}


/**
 * The most readable pair the given colors contain: the two whose APCA
 * separation is largest, the lighter of them as the background.
 *
 * Deterministic, and that is half the point - it is the answer to "what does
 * my palette hold", so pressing for it twice has to give the same pair. The
 * random roll beside it is the control for a different question.
 *
 * The lighter color becomes the background rather than the polarity being
 * preserved from wherever the pair stood before. Dark text on a light ground
 * is what a page of running text usually is, and a rule that reads off the
 * previous pair would make the same palette answer two different ways.
 *
 * **Each candidate is measured in the orientation it would be used in.** APCA
 * is not symmetric - `#9D3A06` on `#E3E053` is Lc 61.6 and the same two the
 * other way round are Lc -64.6 - so measuring one order and returning the
 * other picks a pair by a number the rating will never show. The winner's Lc
 * is the Lc of the pair that comes back.
 *
 * `null` when there is nothing to choose between: fewer than two distinct
 * colors. A palette can collapse to one - `maxChroma()` is 0 at a lightness
 * of 0 and 1, so a pure black or white base gives every member the same black
 * or white - and a "pair" of one color twice is invisible text on a blank
 * page, which reads as a broken app rather than as a bad palette.
 */
export function mostReadablePair(colors: readonly Color[]): ReadablePair | null {
  const distinct = distinctColors(colors);

  if (distinct.length < 2) return null;

  let best: ReadablePair | null = null;
  let bestSeparation = -1;

  for (let i = 0; i < distinct.length; i++) {
    for (let j = i + 1; j < distinct.length; j++) {
      const candidate = asPair(distinct[i], distinct[j]);
      const separation =
        Math.abs(chroma.contrastAPCA(candidate.text, candidate.background));

      // Strictly greater, so the first pair of an equally separated set wins
      // and the iteration order decides - the caller gets the same answer for
      // the same colors.
      if (separation > bestSeparation) {
        bestSeparation = separation;
        best = candidate;
      }
    }
  }

  return best;
}


/**
 * The pair to judge for a given palette.
 *
 * This is the whole of the palette-to-pair direction: the `PALETTE PAIR`
 * gesture uses it, and so does the pair a visitor starts with, in
 * `initialState` and in the fallback of `loadAppStateReducer`. A first-time
 * visitor otherwise gets a rolled pair that has nothing to do with the color
 * they are working on, and no palette change ever brings the two together.
 *
 * **It is never applied reactively.** A reducer on the palette events would
 * overwrite a pair the visitor set - and `paletteFollowsColorReducer` runs on
 * `colorAdjusted`, so a slider drag in the Studio would rewrite the pair once
 * per frame, `contrastId` with it. The pair is the one thing this screen
 * passes judgement on, so replacing it is a gesture.
 *
 * Where the palette has collapsed to a single color, the base keeps the
 * background and `findTextColor()` supplies text that reads on it. The
 * result is then not a pair out of the palette, but it is a pair - see
 * `mostReadablePair()`.
 */
export function contrastPairFromPalette(palette: Palette): ContrastColors {
  const colors = PALETTE_SLOTS.map(slot => palette[slot].color);
  const pair = mostReadablePair(colors);

  if (pair) return createContrastColors(pair.text, pair.background);

  const background = palette.color0.color;

  return createContrastColors(findTextColor(background, "harmonic").color, background);
}


/** The lighter color as the background, as `mostReadablePair()` describes. */
function asPair(one: Color, other: Color): ReadablePair {
  return one.luminance() >= other.luminance()
    ? {text: other, background: one}
    : {text: one, background: other};
}


/**
 * The colors as the app can tell them apart: 8-bit RGB, because that is what
 * the swatch paints, what the contrast id carries and what the preview
 * renders. Two members that round to the same three bytes are one color as far
 * as a pair is concerned.
 */
function distinctColors(colors: readonly Color[]): Color[] {
  const seen = new Set<string>();

  return colors.filter(color => {
    const hex = color.hex("rgb");

    if (seen.has(hex)) return false;

    seen.add(hex);

    return true;
  });
}
