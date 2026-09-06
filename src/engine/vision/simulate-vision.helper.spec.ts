import chroma from "chroma-js";
import {describe, expect, it} from "vitest";
import {VISION_MODELS, VisionModel, visionCaption} from "@engine/vision/vision.model";
import {simulateVision} from "@engine/vision/simulate-vision.helper";


const DEFICIENCIES = VISION_MODELS
  .filter((vision): vision is Exclude<VisionModel, "normal"> => vision !== "normal");


describe("simulateVision", () => {

  it("hands back the color itself under normal vision", () => {
    const color = chroma("#3366CC");

    expect(simulateVision(color, "normal")).toBe(color);
  });


  describe("the projections", () => {

    // Row sums of one. A mistyped coefficient shifts a grey off the neutral
    // axis, which is the cheapest way to catch one.
    it.each(DEFICIENCIES)("leaves a neutral color untouched under %s", vision => {
      for (const grey of ["#000000", "#333333", "#808080", "#CCCCCC", "#FFFFFF"]) {
        expect(simulateVision(chroma(grey), vision).hex("rgb")).toBe(chroma(grey).hex("rgb"));
      }
    });


    // The other half of the check on the constants: each matrix squares to
    // itself, so a color already seen through a deficiency does not move
    // again. Colors that clip are left out - the gamut clamp, not the model,
    // is what moves those, and `stays inside the gamut` covers them instead.
    it.each(DEFICIENCIES)("changes nothing on a second pass under %s", vision => {
      for (let hue = 0; hue < 360; hue += 15) {
        const color = chroma.oklch(0.6, 0.08, hue);
        const once = simulateVision(color, vision);
        const twice = simulateVision(once, vision);

        expect(chroma.distance(once, twice, "oklab")).toBeLessThan(0.001);
      }
    });


    it.each(DEFICIENCIES)("stays inside the sRGB gamut under %s", vision => {
      for (let hue = 0; hue < 360; hue += 5) {
        const simulated = simulateVision(chroma.oklch(0.55, 0.2, hue), vision);

        for (const channel of simulated.rgb()) {
          expect(channel).toBeGreaterThanOrEqual(0);
          expect(channel).toBeLessThanOrEqual(255);
        }
      }
    });

  });


  describe("the light it computes in", () => {

    /**
     * The failure the helper exists to prevent. Applying the coefficients to
     * the gamma-encoded bytes - which is what the draft does, and what
     * `chroma.gl()` would hand over despite its name - turns pure red into
     * `#4C4C4C`. In linear light it is a grey around `#7F7F7F`, more than
     * twice the luminance.
     */
    it("gives an achromatopsia grey the luminance of the color it stands for", () => {
      for (const hex of ["#FF0000", "#00FF00", "#0000FF", "#3366CC", "#F2C14E"]) {
        const color = chroma(hex);
        const simulated = simulateVision(color, "achromatopsia");

        expect(simulated.luminance()).toBeCloseTo(color.luminance(), 3);
      }
    });


    it("returns a neutral grey for achromatopsia", () => {
      const [r, g, b] = simulateVision(chroma("#3366CC"), "achromatopsia").rgb();

      expect(g).toBe(r);
      expect(b).toBe(r);
    });


    it("is not the encoded-luma answer the draft gives", () => {
      // 0.299 * 255 rounded, the draft's Rec. 601 luma on the encoded byte.
      expect(simulateVision(chroma("#FF0000"), "achromatopsia").hex("rgb"))
        .not.toBe(chroma(76, 76, 76).hex("rgb"));
    });

  });


  describe("what each model costs", () => {

    it("pulls red and green together for protanopia and deuteranopia", () => {
      const red = chroma.oklch(0.6, 0.15, 29);
      const green = chroma.oklch(0.6, 0.15, 145);
      const apart = chroma.distance(red, green, "oklab");

      for (const vision of ["protanopia", "deuteranopia"] as const) {
        const closer = chroma.distance(
          simulateVision(red, vision),
          simulateVision(green, vision),
          "oklab"
        );

        expect(closer).toBeLessThan(apart / 2);
      }
    });


    /**
     * The other half of the tritan check: the axis it *does* cost. Without it
     * the red-green test above passes for an identity matrix, and so does
     * every other test here.
     */
    it("pulls blue and green together for tritanopia", () => {
      const blue = chroma.oklch(0.6, 0.15, 264);
      const green = chroma.oklch(0.6, 0.15, 145);
      const apart = chroma.distance(blue, green, "oklab");

      const closer = chroma.distance(
        simulateVision(blue, "tritanopia"),
        simulateVision(green, "tritanopia"),
        "oklab"
      );

      expect(closer).toBeLessThan(apart / 2);
    });


    it("leaves the red-green axis alone for tritanopia", () => {
      const red = chroma.oklch(0.6, 0.15, 29);
      const green = chroma.oklch(0.6, 0.15, 145);
      const apart = chroma.distance(red, green, "oklab");

      const kept = chroma.distance(
        simulateVision(red, "tritanopia"),
        simulateVision(green, "tritanopia"),
        "oklab"
      );

      expect(kept).toBeGreaterThan(apart / 2);
    });


    /**
     * Tritanopia is the one model built from two half-planes, and a wrong
     * separation normal would show as a step where the two meet. Walking the
     * hue circle one degree at a time, the largest step has to stay in the
     * order of the step the input itself takes.
     */
    it("crosses the tritan fold without a jump", () => {
      let largest = 0;

      for (let hue = 0; hue < 360; hue++) {
        const here = chroma.oklch(0.6, 0.1, hue);
        const next = chroma.oklch(0.6, 0.1, hue + 1);

        largest = Math.max(largest, chroma.distance(
          simulateVision(here, "tritanopia"),
          simulateVision(next, "tritanopia"),
          "oklab"
        ));
      }

      // One degree at a chroma of 0.1 moves the input about 0.0017.
      expect(largest).toBeLessThan(0.005);
    });

  });


  it("names every model it simulates", () => {
    for (const vision of VISION_MODELS) {
      expect(visionCaption(vision).length).toBeGreaterThan(0);
    }
  });

});
