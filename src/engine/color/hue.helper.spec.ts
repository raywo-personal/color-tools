import {describe, expect, it} from "vitest";
import {analogRange} from "@engine/color/hue.helper";


describe("analogRange", () => {

  it("refuses a count that cannot span a range", () => {
    expect(() => analogRange(200, 30, 1)).toThrow();
    expect(() => analogRange(200, 30, 0)).toThrow();
  });


  it("centres the hues on the base and spans the full range", () => {
    expect(analogRange(200, 30, 3)).toEqual([185, 200, 215]);
    expect(analogRange(200, 28, 2)).toEqual([186, 214]);
  });


  it("wraps a hue that runs off either end of the wheel", () => {
    expect(analogRange(5, 30, 3)).toEqual([350, 5, 20]);
    expect(analogRange(355, 30, 3)).toEqual([340, 355, 10]);
  });


  // The two analogs of `analogous` and `muted-analog-split` are
  // `analogRange(h, 28, 2)`, one per palette slot. A hue short of the count
  // left the second slot undefined and the generator threw on it, so the
  // count is asserted over the whole wheel rather than on a hue or two: the
  // shortfall depended on where the sum of two floats landed, and at a
  // hundredth of a degree eight hues of the wheel showed it.
  it("hands back the asked-for count for every hue on the wheel", () => {
    for (let h = 0; h <= 360; h = Math.round((h + 0.01) * 100) / 100) {
      expect(analogRange(h, 28, 2), `hue ${h}`).toHaveLength(2);
      expect(analogRange(h, 30, 3), `hue ${h}`).toHaveLength(3);
    }
  });


  it("spaces the hues evenly", () => {
    const hues = analogRange(100, 40, 5);

    expect(hues).toHaveLength(5);

    for (let i = 1; i < hues.length; i++) {
      expect(hues[i] - hues[i - 1]).toBeCloseTo(10, 9);
    }

    expect(hues[0]).toBeCloseTo(80, 9);
    expect(hues[4]).toBeCloseTo(120, 9);
  });

});
