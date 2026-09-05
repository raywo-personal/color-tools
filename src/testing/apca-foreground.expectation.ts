import {expect} from "vitest";
import chroma, {Color} from "chroma-js";
import {calculateAPCAContrast} from "@engine/contrast/optimal-text-color.helper";


/** The two foregrounds the app puts on a color the visitor picked. */
export const BLACK_AND_WHITE = ["#000000", "#ffffff"] as const;

/**
 * The stride through each RGB channel. 51 gives six steps per channel and 216
 * backgrounds - enough to cross the mid-lightness band where the choice flips,
 * and few enough that a component fixture can be driven through all of them.
 */
const DEFAULT_STEP = 51;


export interface ApcaForegroundOptions {
  /** The foregrounds the chrome chooses between. */
  readonly candidates?: readonly string[];
  /** The stride through each RGB channel. */
  readonly step?: number;
}


/**
 * A deterministic sweep of the RGB cube, so a failure names the same color
 * twice. A random draw would report a color that the next run does not visit.
 */
export function* rgbCube(step = DEFAULT_STEP): Generator<Color> {
  for (let red = 0; red < 256; red += step) {
    for (let green = 0; green < 256; green += step) {
      for (let blue = 0; blue < 256; blue += step) {
        yield chroma(red, green, blue);
      }
    }
  }
}


/**
 * Asserts that a piece of chrome takes its foreground from APCA rather than
 * from a neutral token: over the whole sweep, the foreground it returns is one
 * of the candidates, and no other candidate sits further from the background.
 *
 * That maximum is the strongest promise there is, not a weakened one. On a
 * mid-lightness color neither black nor white clears the APCA table's
 * requirement - that is the color the visitor picked, not a fixable defect - so
 * an assertion phrased as "clears the threshold" would fail on correct code.
 * Where a candidate does clear it, the maximum clears it too.
 *
 * `foregroundOn` gets a background and returns the foreground the chrome then
 * shows, in any spelling chroma reads; driving the component and waiting for it
 * is the caller's business.
 */
export async function expectApcaForeground(
  foregroundOn: (background: Color) => string | Promise<string>,
  options: ApcaForegroundOptions = {}
): Promise<void> {
  const {candidates = BLACK_AND_WHITE, step = DEFAULT_STEP} = options;
  const hexes = candidates.map(candidate => chroma(candidate).hex("rgb"));

  for (const background of rgbCube(step)) {
    const where = `foreground on ${background.hex("rgb")}`;
    const foreground = await foregroundOn(background);

    // Chrome that takes its foreground from a token sets no color of its own,
    // so the empty string is the very case this expectation exists to catch.
    // It is compared before chroma sees it: chroma throws on anything it
    // cannot read, and the failure would then name neither the color nor the
    // rule.
    const actual = chroma.valid(foreground)
      ? chroma(foreground).hex("rgb")
      : foreground;

    expect(hexes, `${where} is none of the candidates`).toContain(actual);

    const distances = hexes.map(hex =>
      Math.abs(calculateAPCAContrast(hex, background)));

    expect(Math.abs(calculateAPCAContrast(actual, background)), where)
      .toBeGreaterThanOrEqual(Math.max(...distances));
  }
}
