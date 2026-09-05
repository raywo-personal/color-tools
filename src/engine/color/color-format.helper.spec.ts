import {describe, expect, it} from "vitest";
import chroma from "chroma-js";
import {COLOR_SPACES} from "@engine/color/color-space.model";
import {colorFrom} from "@engine/color/color-format-parser.helper";
import {formatColor} from "@engine/color/color-format.helper";


/**
 * A deterministic sweep of the RGB cube, so a failure is reproducible - a
 * random draw would report a different color on every run.
 */
function rgbCube(step = 17): number[][] {
  const values: number[][] = [];

  for (let red = 0; red < 256; red += step) {
    for (let green = 0; green < 256; green += step) {
      for (let blue = 0; blue < 256; blue += step) {
        values.push([red, green, blue]);
      }
    }
  }

  return values;
}


/** The shorter way round the circle between two hues, in degrees. */
function hueDistance(one: number, other: number): number {
  const difference = Math.abs(one - other) % 360;

  return Math.min(difference, 360 - difference);
}


describe("formatColor", () => {

  it("writes hex with six digits in upper case", () => {
    expect(formatColor(chroma("#ff5733"), "hex")).toBe("#FF5733");
  });


  it("writes the modern space-separated syntax the draft shows", () => {
    const color = chroma("#ff5733");

    expect(formatColor(color, "rgb")).toBe("rgb(255 87 51)");
    expect(formatColor(color, "hsl")).toBe("hsl(11 100% 60%)");
    expect(formatColor(color, "oklch")).toBe("oklch(68.0% 0.210 34)");
  });


  it("writes 0 for the hue of a color that has none", () => {
    // chroma-js reports NaN there, and its own css() writes CSS Color 4's
    // `none`. Both would come back out of the conversion list as a value the
    // hex field then refuses.
    expect(formatColor(chroma("#808080"), "hsl")).toBe("hsl(0 0% 50%)");
    expect(formatColor(chroma("#808080"), "oklch")).toBe("oklch(60.0% 0.000 0)");
  });


  it("never writes NaN or none, whatever the color", () => {
    const written = rgbCube()
      .flatMap(([red, green, blue]) =>
        COLOR_SPACES.map(space => formatColor(chroma(red, green, blue), space)));

    expect(written.filter(value => /NaN|none/.test(value))).toEqual([]);
  });


  it("writes what colorFrom() reads back", () => {
    // The conversion list puts these strings on the clipboard and the value
    // field parses them, so the two helpers have to stay a pair. This is the
    // half that must hold for every color and every space: whatever is
    // written, the parser takes it.
    for (const [red, green, blue] of rgbCube()) {
      const color = chroma(red, green, blue);

      for (const space of COLOR_SPACES) {
        const value = formatColor(color, space);

        expect(colorFrom(value), `${value} did not parse`).not.toBeNull();
      }
    }
  });


  it("round-trips hex and rgb without losing a bit, because neither rounds", () => {
    for (const [red, green, blue] of rgbCube()) {
      const color = chroma(red, green, blue);

      expect(colorFrom(formatColor(color, "hex"))?.hex("rgb")).toBe(color.hex("rgb"));
      expect(colorFrom(formatColor(color, "rgb"))?.hex("rgb")).toBe(color.hex("rgb"));
    }
  });


  it("round-trips hsl within a just-noticeable difference", () => {
    // Whole degrees and whole percent, the precision the draft displays. The
    // worst case over the sweep is a little above 1.
    for (const [red, green, blue] of rgbCube()) {
      const color = chroma(red, green, blue);
      const value = formatColor(color, "hsl");

      expect(chroma.deltaE(color, colorFrom(value)!), `${value}`).toBeLessThan(2);
    }
  });


  it("keeps lightness and hue through an OKLch round trip, and never gains chroma", () => {
    // Not a deltaE assertion, because chroma is the one component colorFrom()
    // does not promise to return: it clamps a pasted value to what maxChroma()
    // reports as the sRGB boundary, and that search is conservative where the
    // boundary comes to a point. Pure blue is the extreme - it comes back as
    // #0032e3 - and no rounding here would change that.
    //
    // Lightness and hue are what the parser does promise, so they are what
    // this pins.
    for (const [red, green, blue] of rgbCube()) {
      const color = chroma(red, green, blue);
      const value = formatColor(color, "oklch");
      const [lightness, chromaticity, hue] = colorFrom(value)!.oklch();

      const written = value.match(/^oklch\((.+)% (.+) (.+)\)$/)!;
      const writtenLightness = Number(written[1]) / 100;
      const writtenChroma = Number(written[2]);
      const writtenHue = Number(written[3]);

      expect(lightness, `lightness of ${value}`).toBeCloseTo(writtenLightness, 3);
      // The tolerance is half of the last digit written. Chroma is displayed
      // to three decimals, so white - whose residual chroma is 3e-5 - is
      // written as 0.000 and comes back holding that residual. That is the
      // rounding, not a gain.
      expect(chromaticity, `chroma of ${value}`)
        .toBeLessThanOrEqual(writtenChroma + 0.0005);

      // A grey has no hue to keep: chroma-js reports NaN for it, which is why
      // formatColor writes 0 in the first place.
      //
      // Compared as an angle rather than as a number: chroma-js answers a
      // written 0 with 359.999…, which is the same hue and would fail a plain
      // subtraction by a full turn.
      if (writtenChroma > 0) {
        expect(hueDistance(hue, writtenHue), `hue of ${value}`).toBeLessThan(0.5);
      }
    }
  });

});
