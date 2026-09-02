import {describe, expect, it} from "vitest";
import chroma from "chroma-js";
import {PaletteStyles} from "@palettes/models/palette-style.model";
import {PALETTE_SLOTS} from "@palettes/models/palette.model";
import {paletteColorFrom} from "@palettes/models/palette-color.model";
import {generatePalette} from "@palettes/helper/palette.helper";
import {roleCaptionFor} from "@palettes/helper/palette-role.helper";


describe("roleCaptionFor", () => {

  function captionsOf(style: typeof PaletteStyles[number]) {
    return PALETTE_SLOTS.map(slot => roleCaptionFor(style, slot));
  }


  it("captions every slot of every style", () => {
    for (const style of PaletteStyles) {
      expect(captionsOf(style).every(caption => caption.trim().length > 0), style).toBe(true);
    }
  });


  it("tells the five members of a structured style apart", () => {
    // A random palette is the one style whose members have no relation to
    // each other, so its draws share one caption on purpose.
    for (const style of PaletteStyles.filter(candidate => candidate !== "random")) {
      expect(new Set(captionsOf(style)).size, style).toBe(PALETTE_SLOTS.length);
    }
  });


  it("never captions a member with its slot number", () => {
    // "COLOR 2" carries less than no caption at all - the issue's own words.
    for (const style of PaletteStyles) {
      for (const caption of captionsOf(style)) {
        expect(caption, style).not.toMatch(/^(?:COLOR|SLOT)?\s*[0-4]$/i);
      }
    }
  });


  it("starts every structured style from the base", () => {
    for (const style of PaletteStyles.filter(candidate => candidate !== "random")) {
      expect(roleCaptionFor(style, "color0"), style).toBe("BASE");
    }
  });


  it("claims the hue distance the analogous generators actually keep", () => {
    // The caption is a number the visitor can check against the HSL row of
    // the conversion list, so it has to be the generator's number: the analogs
    // come from `analogRange(h, 28, 2)`, a span of 28 degrees in total, and
    // each is then jittered by up to 5 degrees.
    const baseHue = 200;
    const base = paletteColorFrom(chroma.hsl(baseHue, 0.6, 0.4), "color0");

    for (const style of ["analogous", "muted-analog-split"] as const) {
      const palette = generatePalette(style, {color0: base});

      for (const slot of ["color1", "color4"] as const) {
        const claimed = Number(roleCaptionFor(style, slot).replace("−", "-"));
        const actual = signedHueDistance(palette[slot].color.hsl()[0], baseHue);

        expect(Number.isNaN(claimed), `${style} ${slot} carries no number`).toBe(false);
        expect(Math.abs(actual - claimed), `${style} ${slot}`).toBeLessThanOrEqual(6);
      }
    }
  });

});


/** The shortest way round the wheel from `to` to `from`, in [-180, 180). */
function signedHueDistance(from: number, to: number): number {
  return ((from - to + 540) % 360) - 180;
}
