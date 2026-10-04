import {describe, expect, it} from "vitest";
import {randomBetween, randomSeed, withSeed} from "@engine/helpers/random.helper";


describe("withSeed", () => {

  function draws(count: number): number[] {
    return Array.from({length: count}, () => randomBetween(0, 1));
  }


  it("gives the same sequence for the same seed", () => {
    expect(withSeed(42, () => draws(5))).toEqual(withSeed(42, () => draws(5)));
  });


  it("gives another sequence for another seed", () => {
    expect(withSeed(1, () => draws(5))).not.toEqual(withSeed(2, () => draws(5)));
  });


  it("stays inside the bounds it is asked for", () => {
    const values = withSeed(7, () => Array.from({length: 1000}, () => randomBetween(10, 20)));

    expect(values.every(value => value >= 10 && value < 20)).toBe(true);
  });


  it("hands the result of the scope back", () => {
    expect(withSeed(3, () => "result")).toBe("result");
  });


  it("goes back to the unseeded source when the scope ends", () => {
    // Two unseeded draws of the same length agreeing is a one in 2^53 event
    // per value; a seeded source left behind would make them agree exactly.
    withSeed(5, () => draws(3));

    expect(draws(3)).not.toEqual(withSeed(5, () => draws(3)));
  });


  it("goes back to the unseeded source when the scope throws", () => {
    expect(() => withSeed(5, () => {
      throw new Error("inside");
    })).toThrow("inside");

    expect(draws(3)).not.toEqual(withSeed(5, () => draws(3)));
  });

});


describe("randomSeed", () => {

  it("draws a 32-bit integer", () => {
    for (let i = 0; i < 100; i++) {
      const seed = randomSeed();

      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThan(2 ** 32);
    }
  });

});
