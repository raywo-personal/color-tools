import {describe, expect, it} from "vitest";
import chroma from "chroma-js";
import {
  inOklchHueRange,
  inOklchLightnessRange,
  isValidOklch,
  maxChroma
} from "@common/helpers/oklch.helper";


/** Well above the search resolution of 0.4 / 2^20, well below a visible step. */
const BEYOND_THE_BOUNDARY = 1e-4;


function eachGridPoint(assertion: (lightness: number, hue: number) => void) {
  for (let lightness = 0.05; lightness < 1; lightness += 0.05) {
    for (let hue = 0; hue < 360; hue += 15) {
      assertion(lightness, hue);
    }
  }
}


describe("maxChroma", () => {

  describe("the gamut boundary", () => {

    it("returns a chroma that sRGB can still represent", () => {
      eachGridPoint((lightness, hue) => {
        const color = chroma.oklch(lightness, maxChroma(lightness, hue), hue);

        expect(color.clipped(), `L ${lightness}, h ${hue}`).toBe(false);
      });
    });


    it("returns the boundary itself, not a value below it", () => {
      eachGridPoint((lightness, hue) => {
        const beyond = maxChroma(lightness, hue) + BEYOND_THE_BOUNDARY;
        const color = chroma.oklch(lightness, beyond, hue);

        expect(color.clipped(), `L ${lightness}, h ${hue}`).toBe(true);
      });
    });


    it("stays below the search ceiling", () => {
      eachGridPoint((lightness, hue) => {
        expect(maxChroma(lightness, hue)).toBeLessThan(0.4);
      });
    });

  });


  describe("known boundaries", () => {

    it("reports the sRGB maximum per hue", () => {
      expect(maxChroma(0.5, 145)).toBeCloseTo(0.1573, 3);
      expect(maxChroma(0.7, 265)).toBeCloseTo(0.1563, 3);
      expect(maxChroma(0.3, 320)).toBeCloseTo(0.1440, 3);
      expect(maxChroma(0.9, 110)).toBeCloseTo(0.1965, 3);
    });


    it("returns absolute chroma, not a percentage", () => {
      // Both callers scale lightness but not chroma. A result around 15
      // instead of 0.15 means someone reintroduced a percent conversion.
      expect(maxChroma(0.5, 145)).toBeLessThan(1);
      expect(maxChroma(0.5, 145)).toBeGreaterThan(0.1);
    });


    it("reads hue as degrees, not as a percentage", () => {
      // Dividing the hue by 100 used to pass unnoticed because it merely
      // shifted the boundary instead of breaking anything visibly.
      expect(maxChroma(0.5, 145)).not.toBeCloseTo(maxChroma(0.5, 1.45), 2);
    });


    it("treats a full turn as the same hue", () => {
      expect(maxChroma(0.5, 360)).toBe(maxChroma(0.5, 0));
    });

  });


  describe("degenerate input", () => {

    it("leaves black and white without chroma", () => {
      // The lightness guards merely short-circuit. Without them the search
      // still returns 0, because chroma-js clips at these ends even at
      // chroma 0.
      expect(maxChroma(0, 145)).toBe(0);
      expect(maxChroma(1, 145)).toBe(0);
    });


    it("rejects a lightness outside [0, 1]", () => {
      expect(maxChroma(-0.5, 145)).toBe(0);
      expect(maxChroma(1.5, 145)).toBe(0);
    });


    it("rejects the undefined hue of an achromatic color", () => {
      // This guard does carry weight: chroma-js turns a NaN hue into an
      // actual color rather than clipping, so the search would happily
      // report a boundary for a hue that does not exist.
      expect(maxChroma(0.5, NaN)).toBe(0);
    });

  });

});


describe("isValidOklch", () => {

  describe("scale contract", () => {

    it("expects lightness in percent and chroma in absolute terms", () => {
      // #01791e is L 50.08 %, C 0.157, h 145.
      expect(isValidOklch(50, 0.157, 145)).toBe(true);

      // The same chroma on a percent scale is a hundred times too large.
      expect(isValidOklch(50, 15.7, 145)).toBe(false);

      // The same lightness as a fraction is a hundred times too small, which
      // leaves almost no room for chroma.
      expect(isValidOklch(0.5, 0.157, 145)).toBe(false);
    });

  });


  describe("chroma against the boundary", () => {

    it("accepts a color inside the gamut", () => {
      expect(isValidOklch(50, 0.1, 145)).toBe(true);
      expect(isValidOklch(50, 0, 145)).toBe(true);
    });


    it("accepts chroma exactly at the boundary", () => {
      expect(isValidOklch(50, maxChroma(0.5, 145), 145)).toBe(true);
    });


    it("rejects chroma beyond the boundary", () => {
      const beyond = maxChroma(0.5, 145) + BEYOND_THE_BOUNDARY;

      expect(isValidOklch(50, beyond, 145)).toBe(false);
    });


    it("judges the same chroma per hue", () => {
      // sRGB reaches much further into red than into blue at this lightness,
      // so one and the same chroma falls on either side of the boundary.
      expect(isValidOklch(50, 0.15, 0)).toBe(true);
      expect(isValidOklch(50, 0.15, 225)).toBe(false);
    });


    it("rejects negative chroma", () => {
      expect(isValidOklch(50, -0.01, 145)).toBe(false);
    });


    it("allows nothing but zero chroma at the ends of the lightness axis", () => {
      expect(isValidOklch(0, 0, 145)).toBe(true);
      expect(isValidOklch(100, 0, 145)).toBe(true);
      expect(isValidOklch(0, 0.01, 145)).toBe(false);
      expect(isValidOklch(100, 0.01, 145)).toBe(false);
    });

  });


  describe("rejected channels", () => {

    it("rejects a missing hue", () => {
      expect(isValidOklch(50, 0.1, null)).toBe(false);
    });


    it("rejects a hue outside [0, 360]", () => {
      expect(isValidOklch(50, 0.1, -1)).toBe(false);
      expect(isValidOklch(50, 0.1, 361)).toBe(false);
    });


    it("rejects a lightness outside [0, 100]", () => {
      expect(isValidOklch(-1, 0.1, 145)).toBe(false);
      expect(isValidOklch(101, 0.1, 145)).toBe(false);
    });


    it("rejects NaN in any channel", () => {
      expect(isValidOklch(NaN, 0.1, 145)).toBe(false);
      expect(isValidOklch(50, NaN, 145)).toBe(false);
      expect(isValidOklch(50, 0.1, NaN)).toBe(false);
    });

  });

});


describe("inOklchHueRange", () => {

  it("accepts the full turn including both ends", () => {
    expect(inOklchHueRange(0)).toBe(true);
    expect(inOklchHueRange(180)).toBe(true);
    expect(inOklchHueRange(360)).toBe(true);
  });


  it("rejects an angle outside the turn", () => {
    expect(inOklchHueRange(-1)).toBe(false);
    expect(inOklchHueRange(361)).toBe(false);
  });


  it("rejects null and NaN", () => {
    expect(inOklchHueRange(null)).toBe(false);
    expect(inOklchHueRange(NaN)).toBe(false);
  });

});


describe("inOklchLightnessRange", () => {

  it("accepts a percentage including both ends", () => {
    expect(inOklchLightnessRange(0)).toBe(true);
    expect(inOklchLightnessRange(50)).toBe(true);
    expect(inOklchLightnessRange(100)).toBe(true);
  });


  it("rejects a percentage outside [0, 100]", () => {
    expect(inOklchLightnessRange(-1)).toBe(false);
    expect(inOklchLightnessRange(101)).toBe(false);
  });


  it("rejects null and NaN", () => {
    expect(inOklchLightnessRange(null)).toBe(false);
    expect(inOklchLightnessRange(NaN)).toBe(false);
  });

});
