import {describe, expect, it} from "vitest";
import chroma from "chroma-js";
import {fromOklch} from "@common/helpers/color-from-oklch.helper";
import {maxChroma} from "@common/helpers/oklch.helper";


/** Shortest angular distance, so hue 0 and hue 359.999 count as the same. */
function hueDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return Math.min(diff, 360 - diff);
}


function eachGridPoint(assertion: (lightness: number, hue: number) => void) {
  for (let lightness = 0.05; lightness < 1; lightness += 0.05) {
    for (let hue = 0; hue < 360; hue += 15) {
      assertion(lightness, hue);
    }
  }
}


describe("fromOklch", () => {

  it("holds the requested lightness and hue", () => {
    eachGridPoint((lightness, hue) => {
      const [l, , h] = fromOklch({l: lightness, c: 0.15, h: hue}).oklch();

      expect(l, `L ${lightness}, h ${hue}`).toBeCloseTo(lightness, 2);
      expect(hueDistance(h, hue), `L ${lightness}, h ${hue}`).toBeLessThan(0.5);
    });
  });


  it("clamps chroma to the sRGB boundary instead of clipping a channel", () => {
    eachGridPoint((lightness, hue) => {
      const color = fromOklch({l: lightness, c: 0.4, h: hue});

      expect(color.clipped(), `L ${lightness}, h ${hue}`).toBe(false);
      expect(color.oklch()[1], `L ${lightness}, h ${hue}`)
        .toBeLessThanOrEqual(maxChroma(lightness, hue) + 0.01);
    });
  });


  it("leaves a chroma the hue can hold as it is", () => {
    const color = fromOklch({l: 0.62, c: 0.05, h: 30});

    expect(color.oklch()[1]).toBeCloseTo(0.05, 2);
  });


  it("floors a negative chroma at zero instead of flipping the hue", () => {
    const color = fromOklch({l: 0.62, c: -0.1, h: 30});

    const [red, green, blue] = color.rgb();
    expect(red).toBe(green);
    expect(green).toBe(blue);
    expect(color.oklch()[1]).toBeCloseTo(0, 3);
  });


  it("returns a neutral for the NaN hue of a gray", () => {
    const hue = chroma("gray").oklch()[2];

    const color = fromOklch({l: 0.6, c: 0.15, h: hue});

    const [r, g, b] = color.rgb();
    expect(r).toBe(g);
    expect(g).toBe(b);
  });


  it("wraps hues outside 0-360 and clamps lightness", () => {
    expect(fromOklch({l: 0.6, c: 0.1, h: 400}).hex())
      .toBe(fromOklch({l: 0.6, c: 0.1, h: 40}).hex());
    expect(fromOklch({l: 1.4, c: 0.1, h: 40}).hex()).toBe("#ffffff");
    expect(fromOklch({l: -0.4, c: 0.1, h: 40}).hex()).toBe("#000000");
  });

});
