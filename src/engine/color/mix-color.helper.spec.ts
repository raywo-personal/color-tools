import {describe, expect, it} from "vitest";
import chroma from "chroma-js";
import {mixColors} from "@engine/color/mix-color.helper";


describe("mixColors", () => {

  it("returns the ends untouched", () => {
    expect(mixColors("#3366CC", "#FAF8F4", 0).hex("rgb")).toBe("#3366cc");
    expect(mixColors("#3366CC", "#FAF8F4", 1).hex("rgb")).toBe("#faf8f4");
  });


  it("puts a half mix halfway in perceived lightness, which sRGB does not", () => {
    // The reason the helper exists. Black to white in sRGB comes back at an
    // OKLch lightness around 0.6 - a mid grey that reads as far lighter than
    // half - because the channel values are gamma-encoded.
    const perceptual = mixColors("#000000", "#FFFFFF", 0.5).oklch()[0];
    const naive = chroma.mix("#000000", "#FFFFFF", 0.5).oklch()[0];

    expect(perceptual).toBeCloseTo(0.5, 2);
    expect(naive).toBeGreaterThan(perceptual + 0.05);
  });


  it("loses chroma between two distant hues rather than turning vivid in a third", () => {
    // The reason it is OKLab rather than OKLch. Both cross hues neither end
    // has - a straight line and a rotation both have to get from 53° to 264°
    // somehow - but OKLch holds the chroma up while it turns, so the middle is
    // a saturated magenta. OKLab passes near the neutral axis instead.
    const orange = "#E2761B";
    const blue = "#1B4FE2";
    const ends = [orange, blue].map(color => chroma(color).oklch()[1]);

    const perceptual = mixColors(orange, blue, 0.5).oklch()[1];
    const rotated = chroma.mix(orange, blue, 0.5, "oklch").oklch()[1];

    expect(perceptual).toBeLessThan(Math.min(...ends));
    expect(rotated).toBeGreaterThan(Math.max(...ends) * 0.8);
  });

});
