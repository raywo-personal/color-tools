import {describe, expect, it} from "vitest";
import {rangeToArray} from "@engine/helpers/iterables.helper";


describe("rangeToArray", () => {

  it("refuses a step that cannot advance", () => {
    expect(() => rangeToArray(0, 10, 0)).toThrow();
    expect(() => rangeToArray(0, 10, -1)).toThrow();
  });


  it("walks upwards and downwards", () => {
    expect(rangeToArray(1, 5, 1)).toEqual([1, 2, 3, 4, 5]);
    expect(rangeToArray(5, 1, 1)).toEqual([5, 4, 3, 2, 1]);
  });


  it("yields the start alone where start and end meet", () => {
    expect(rangeToArray(3, 3, 1)).toEqual([3]);
  });


  it("stops short of an end the step does not reach", () => {
    expect(rangeToArray(0, 1, 0.3)).toEqual([0, 0.3, 0.6, 0.9]);
    expect(rangeToArray(1, 10, 4)).toEqual([1, 5, 9]);
  });


  // The walk used to add the step to a running value and compare that value
  // against the end. Both spans below are whole multiples of their step, and
  // both sums land a few units in the last place above the end, so the last
  // value fell out of the range: 0.12 to 0.92 in hundredths is the harmonic
  // text search, which then never measured the lightest colour it was allowed
  // to offer.
  it("reaches an end the step meets exactly, whatever the floats do", () => {
    const hundredths = rangeToArray(0.12, 0.92, 0.01);

    expect(hundredths).toHaveLength(81);
    expect(hundredths[hundredths.length - 1]).toBe(0.92);

    const fifths = rangeToArray(0, 1, 0.2);

    expect(fifths).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1]);
  });


  it("keeps the step exact over a long walk instead of drifting", () => {
    const walk = rangeToArray(0, 100, 0.1);

    expect(walk).toHaveLength(1001);
    expect(walk[500]).toBe(50);
    expect(walk[1000]).toBe(100);
  });

});
