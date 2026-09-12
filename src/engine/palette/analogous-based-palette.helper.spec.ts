import {describe, expect, it} from "vitest";
import chroma from "chroma-js";
import {generatePalette, generatePaletteFrom} from "@engine/palette/palette.helper";
import {PALETTE_ID_BASE62_LENGTH} from "@engine/palette/palette-id.helper";
import {PALETTE_SLOTS} from "@engine/palette/palette.model";


/** The two styles `generateAnalogousBasedPalette()` serves. */
const ANALOGOUS_STYLES = ["analogous", "muted-analog-split"] as const;

/**
 * Base hues whose two analogs the generator once failed to produce.
 *
 * `analogRange(h, 28, 2)` walked from `h - 14` to `h + 14`, and on these the
 * sum of the two floats overshot the end, so the second analog never arrived
 * and `color4` was built on `undefined`. Every one of them is a base hue
 * alone - the seed does not reach the hue arithmetic - which is why the
 * crash followed a colour rather than a roll.
 */
const ONCE_SHORT_HUES = [2.06, 2.31, 2.56, 2.81, 3.06, 3.31, 3.56, 3.81];


describe("the analogous-based generators", () => {

  it("fills all five slots for a base hue whose analogs used to fall short", () => {
    for (const style of ANALOGOUS_STYLES) {
      for (const hue of ONCE_SHORT_HUES) {
        const palette = generatePalette(style, {}, hue);

        for (const slot of PALETTE_SLOTS) {
          expect(palette[slot].color, `${style} at hue ${hue}, ${slot}`).toBeDefined();
        }
      }
    }
  });


  // The colour the crash was first seen on. It reaches the generator the way
  // the Studio sends it - as the base colour, with a seed - and its hue is
  // one the walk fell short on.
  it("builds a palette on the colour the crash was reported for", () => {
    for (const style of ANALOGOUS_STYLES) {
      const palette = generatePaletteFrom(chroma("#8b150f"), style, 1234);

      expect(palette.color0.color.hex(), style).toBe("#8b150f");
      expect(palette.id, style).toHaveLength(PALETTE_ID_BASE62_LENGTH);
    }
  });

});
