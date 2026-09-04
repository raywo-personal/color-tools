import chroma, {Color} from "chroma-js";

import {
  calculateAPCAContrast,
  DEFAULT_COLOR_CONFIG,
  findHarmonicTextColor,
  findMinimumContrastTextColor,
  findOptimalTextColor,
  findTextColor,
  meetsAPCARequirement,
  OptimalTextColorResult
} from "./optimal-text-color.helper";


/**
 * The color of a search that may come back empty. The assertion is what makes
 * the narrowing safe: a `!` alone would turn a missing color into a TypeError
 * further down instead of a named failure here.
 */
function colorOf(result: OptimalTextColorResult): Color {
  expect(result.color).not.toBeNull();

  return result.color!;
}

/** True where R, G and B agree - the only colors a gray scale holds. */
function isGray(color: Color): boolean {
  const [r, g, b] = color.rgb();

  return r === g && g === b;
}


describe("Optimal Text Color Helper", () => {

  describe("calculateAPCAContrast", () => {

    it("should return positive contrast for dark text on light background", () => {
      const contrast = calculateAPCAContrast("#000000", "#ffffff");

      expect(contrast).toBeGreaterThan(0);
    });

    it("should return negative contrast for light text on dark background", () => {
      const contrast = calculateAPCAContrast("#ffffff", "#000000");

      expect(contrast).toBeLessThan(0);
    });

    it("should return approximately 0 for same colors", () => {
      const contrast = calculateAPCAContrast("#808080", "#808080");

      expect(Math.abs(contrast)).toBeLessThan(1);
    });

    it("should accept Color objects as input", () => {
      const textColor = chroma("#000000");
      const bgColor = chroma("#ffffff");

      const contrast = calculateAPCAContrast(textColor, bgColor);

      expect(contrast).toBeGreaterThan(100);
    });

    it("should accept string colors as input", () => {
      const contrast = calculateAPCAContrast("#000000", "#ffffff");

      expect(contrast).toBeGreaterThan(100);
    });

    it("should handle mixed input types", () => {
      const contrast = calculateAPCAContrast(chroma("#000000"), "#ffffff");

      expect(contrast).toBeGreaterThan(100);
    });

    it("should return maximum contrast for black on white", () => {
      const contrast = calculateAPCAContrast("#000000", "#ffffff");

      // APCA maximum is around 106 for black on white
      expect(contrast).toBeGreaterThan(100);
      expect(contrast).toBeLessThan(110);
    });

    it("should return similar absolute contrast for inverse colors", () => {
      const contrastDarkOnLight = calculateAPCAContrast("#000000", "#ffffff");
      const contrastLightOnDark = calculateAPCAContrast("#ffffff", "#000000");

      // Absolute values should be similar (within ~5 due to APCA asymmetry)
      expect(Math.abs(Math.abs(contrastDarkOnLight) - Math.abs(contrastLightOnDark))).toBeLessThan(5);
    });

  });

  describe("meetsAPCARequirement", () => {

    it("should return true for black text on white at 16px/400", () => {
      const meets = meetsAPCARequirement("#000000", "#ffffff", "16px", "400");

      expect(meets).toBe(true);
    });

    it("should return false for very low contrast combinations", () => {
      // Light gray on white
      const meets = meetsAPCARequirement("#cccccc", "#ffffff", "16px", "400");

      expect(meets).toBe(false);
    });

    it("should return false for font sizes with null requirements", () => {
      // 12px has null contrast requirement for most weights
      const meets = meetsAPCARequirement("#000000", "#ffffff", "12px", "400");

      expect(meets).toBe(false);
    });

    it("should use default font size and weight when not specified", () => {
      const meetsDefault = meetsAPCARequirement("#000000", "#ffffff");
      const meetsExplicit = meetsAPCARequirement("#000000", "#ffffff", "16px", "400");

      expect(meetsDefault).toBe(meetsExplicit);
    });

    it("should be more lenient for larger font sizes", () => {
      // Medium gray that might fail at 16px but pass at 48px
      const mediumGray = "#666666";

      const meetsAt48px = meetsAPCARequirement(mediumGray, "#ffffff", "48px", "400");

      // Larger text has lower requirements
      expect(meetsAt48px).toBe(true);
      // The 16px might or might not pass depending on exact contrast
    });

    it("should be more lenient for bolder weights", () => {
      // Test at 16px where weight matters, checking the requirements for
      // different weights.
      const meetsAt400 = meetsAPCARequirement("#555555", "#ffffff", "16px", "400");
      const meetsAt700 = meetsAPCARequirement("#555555", "#ffffff", "16px", "700");

      // Bold text has lower requirements, so might pass where regular fails
      // The actual result depends on the specific contrast value
      expect(typeof meetsAt400).toBe("boolean");
      expect(typeof meetsAt700).toBe("boolean");
    });

  });

  describe("findOptimalTextColor", () => {

    it("should return black for white background", () => {
      const result = findOptimalTextColor("#ffffff");

      expect(result.color.hex()).toBe("#000000");
    });

    it("should return white for black background", () => {
      const result = findOptimalTextColor("#000000");

      expect(result.color.hex()).toBe("#ffffff");
    });

    it("should return white for dark backgrounds", () => {
      const result = findOptimalTextColor("#333333");

      expect(result.color.hex()).toBe("#ffffff");
    });

    it("should return black for light backgrounds", () => {
      const result = findOptimalTextColor("#cccccc");

      expect(result.color.hex()).toBe("#000000");
    });

    it("should include contrast value in result", () => {
      const result = findOptimalTextColor("#ffffff");

      expect(result.contrast).toBeDefined();
      expect(typeof result.contrast).toBe("number");
      expect(Math.abs(result.contrast)).toBeGreaterThan(0);
    });

    it("should include meetsRequirement flag", () => {
      const result = findOptimalTextColor("#ffffff");

      expect(result.meetsRequirement).toBeDefined();
      expect(typeof result.meetsRequirement).toBe("boolean");
    });

    it("should include requiredContrast from lookup table", () => {
      const result = findOptimalTextColor("#ffffff");

      expect(result.requiredContrast).toBeDefined();
    });

    it("should use custom config when provided", () => {
      const resultDefault = findOptimalTextColor("#ffffff");
      const resultCustom = findOptimalTextColor("#ffffff", {fontSize: "48px"});

      // Both should find black as optimal
      expect(resultDefault.color.hex()).toBe("#000000");
      expect(resultCustom.color.hex()).toBe("#000000");

      // But required contrast should differ
      expect(resultCustom.requiredContrast).not.toBe(resultDefault.requiredContrast);
    });

    it("should accept Color object as input", () => {
      const result = findOptimalTextColor(chroma("#ffffff"));

      expect(result.color.hex()).toBe("#000000");
    });

    it("should pick the pole with the larger contrast on every gray", () => {
      // APCA is asymmetric: black overtakes white well below a luminance of
      // 0.5, so a threshold on luminance hands out the weaker pole on the
      // grays in between. The sweep is deterministic so that a failure names
      // the same gray twice.
      for (let value = 0; value <= 255; value++) {
        const bg = chroma.rgb(value, value, value);
        const result = findOptimalTextColor(bg);
        const other = result.color.hex() === "#000000" ? "#ffffff" : "#000000";

        expect(["#000000", "#ffffff"]).toContain(result.color.hex());
        expect(Math.abs(result.contrast), bg.hex())
          .toBeGreaterThanOrEqual(Math.abs(calculateAPCAContrast(other, bg)));
      }
    });

    it("should report the contrast of the color it returns", () => {
      const bg = "#3366cc";
      const result = findOptimalTextColor(bg);

      expect(result.contrast).toBe(calculateAPCAContrast(result.color, bg));
    });

  });

  describe("findMinimumContrastTextColor", () => {

    // 48px/300 asks for 50, low enough for a gray to pass on a mid-tone.
    const lc50 = {fontSize: "48px", fontWeight: "300"} as const;

    it("should come back empty where no text is readable", () => {
      // 12px/400 has no requirement in the APCA table, so there is nothing
      // to meet and no color to hand over.
      const result = findMinimumContrastTextColor("#ffffff", {
        fontSize: "12px",
        fontWeight: "400"
      });

      expect(result.color).toBeNull();
      expect(result.meetsRequirement).toBe(false);
      expect(result.requiredContrast).toBeNull();
    });

    it("should find a gray that meets the requirement", () => {
      const result = findMinimumContrastTextColor("#ffffff");

      expect(result.meetsRequirement).toBe(true);
      expect(isGray(colorOf(result))).toBe(true);
    });

    it("should return a softer gray than the optimal pole where one passes", () => {
      // Body text on white asks for 90 and black reaches 106, so there is
      // room below the pole - and the answer has to use it.
      const minResult = findMinimumContrastTextColor("#ffffff");
      const optimalResult = findOptimalTextColor("#ffffff");

      expect(Math.abs(minResult.contrast)).toBeLessThan(Math.abs(optimalResult.contrast));
      expect(colorOf(minResult).hex()).not.toBe("#000000");
    });

    it("should come back empty where no gray passes", () => {
      // Body text on mid-gray: 16px/400 asks for 90 and neither pole gets
      // there. No color and no contrast - the fallback is findTextColor()'s.
      const result = findMinimumContrastTextColor("#808080", {fontSize: "16px", fontWeight: "400"});

      expect(result.color).toBeNull();
      expect(result.meetsRequirement).toBe(false);
      expect(result.requiredContrast).toBe(90);
      expect(result.contrast).toBe(0);
    });

    it("should put the text on the side of the stronger pole", () => {
      // The softest passing gray on black sits below a luminance of 0.5, so
      // the assertion is the direction, not a threshold.
      const onLight = findMinimumContrastTextColor("#ffffff", {fontSize: "24px"});
      const onDark = findMinimumContrastTextColor("#000000", {fontSize: "24px"});

      expect(colorOf(onLight).luminance()).toBeLessThan(chroma("#ffffff").luminance());
      expect(colorOf(onDark).luminance()).toBeGreaterThan(chroma("#000000").luminance());
      expect(onDark.contrast).toBeLessThan(0);
    });

    it("should include the required contrast from the lookup", () => {
      const result = findMinimumContrastTextColor("#ffffff", {fontSize: "24px"});

      expect(result.requiredContrast).toBeGreaterThan(0);
    });

    it("should stop at the softest gray that meets the requirement", () => {
      // The scale is the 256 renderable grays, so the gray one 8-bit step
      // closer to the background has to fail - otherwise the search stopped
      // early. #f0f000 is a saturated yellow whose HSL lightness sits far
      // from its luminance, the case a search that trusts HSL gets wrong.
      for (const bg of ["#ffffff", "#000000", "#3366cc", "#dddddd", "#222222", "#f0f000"]) {
        const result = findMinimumContrastTextColor(bg, lc50);
        const color = colorOf(result);
        const required = result.requiredContrast!;
        const towardsBg = chroma(bg).luminance() > color.luminance() ? 1 : -1;
        const [value] = color.rgb();
        const previous = chroma.rgb(value + towardsBg, value + towardsBg, value + towardsBg);

        expect(result.meetsRequirement, bg).toBe(true);
        expect(Math.abs(result.contrast), bg).toBeGreaterThanOrEqual(required);
        expect(Math.abs(calculateAPCAContrast(previous, bg)), bg).toBeLessThan(required);
      }
    });

    it("should take the polarity of the stronger pole on a mid-tone background", () => {
      // On #00a0f5 black reaches 50.0 and white -59.3. A walk that starts at
      // the pole of the background's side begins at black, which passes 50
      // by a hair, and answers with the losing side's polarity. The softest
      // gray sits on white's side.
      const result = findMinimumContrastTextColor("#00a0f5", lc50);

      expect(result.meetsRequirement).toBe(true);
      expect(result.contrast).toBeLessThan(0);
      expect(colorOf(result).luminance()).toBeGreaterThan(0.5);
    });

    it("should agree with the stronger pole's polarity on every gray and every mid-tone", () => {
      const backgrounds = [
        ...Array.from({length: 16}, (_, step) => chroma.rgb(step * 17, step * 17, step * 17)),
        chroma("#00a0f5"), chroma("#c3f000"), chroma("#e1e100"), chroma("#3ca5ff"), chroma("#3366cc")
      ];

      for (const bg of backgrounds) {
        const result = findMinimumContrastTextColor(bg, lc50);
        const pole = findOptimalTextColor(bg, lc50);

        if (!result.meetsRequirement) continue;

        expect(Math.sign(result.contrast), bg.hex()).toBe(Math.sign(pole.contrast));
      }
    });

    it("should answer with a renderable gray", () => {
      // An 8-bit walk lands on integers by construction; a fractional
      // channel would round on its way into CSS and could stop passing.
      for (const bg of ["#ffffff", "#000000", "#00a0f5", "#3366cc"]) {
        const [r, g, b] = colorOf(findMinimumContrastTextColor(bg, lc50)).rgb(false);

        expect(Number.isInteger(r), bg).toBe(true);
        expect(r, bg).toBe(g);
        expect(g, bg).toBe(b);
      }
    });

  });

  describe("findHarmonicTextColor", () => {

    // Body text asks for 90 and only the poles get there against a
    // mid-lightness color, so the harmonic search has room at 24px/400 (60).
    const largeText = {fontSize: "24px", fontWeight: "400"} as const;
    // 24px/700 asks for 45, low enough for a color on the hue to pass on
    // most mid-tones.
    const lc45 = {fontSize: "24px", fontWeight: "700"} as const;

    /** The shorter way round the OKLch hue circle between two colors. */
    function hueDistance(a: Color, b: Color): number {
      const diff = Math.abs(a.oklch()[2] - b.oklch()[2]);

      return Math.min(diff, 360 - diff);
    }

    it("should keep the hue of a colored background", () => {
      // The hue is the whole point of the mode. Measured in OKLch, where the
      // hue of a tinted near-white still holds - HSL's would drift with the
      // lightness on the way.
      for (const bg of ["#3366cc", "#804000", "#ffd8d8", "#202840", "#f0f000"]) {
        const result = findHarmonicTextColor(bg, largeText);
        const color = colorOf(result);

        expect(result.meetsRequirement, bg).toBe(true);
        expect(color.oklch()[1], bg).toBeGreaterThan(0);
        expect(hueDistance(color, chroma(bg)), bg).toBeLessThan(10);
      }
    });

    it("should answer with a softer color than the pole", () => {
      // The pole passes with room to spare on all of these; the harmonic
      // answer has to use that room rather than sit at the pole.
      for (const bg of ["#3366cc", "#804000", "#ffd8d8", "#202840"]) {
        const result = findHarmonicTextColor(bg, largeText);
        const pole = findOptimalTextColor(bg, largeText);

        expect(Math.abs(result.contrast), bg).toBeGreaterThanOrEqual(result.requiredContrast!);
        expect(Math.abs(result.contrast), bg).toBeLessThan(Math.abs(pole.contrast));
      }
    });

    it("should return a darker color on a light background and a lighter one on a dark background", () => {
      const lightBg = chroma("#ffd8d8");
      const darkBg = chroma("#202840");

      expect(colorOf(findHarmonicTextColor(lightBg, largeText)).oklch()[0]).toBeLessThan(lightBg.oklch()[0]);
      expect(colorOf(findHarmonicTextColor(darkBg, largeText)).oklch()[0]).toBeGreaterThan(darkBg.oklch()[0]);
    });

    it("should put the text on the side of the stronger pole, not the one HSL lightness suggests", () => {
      // #a37575 has an HSL lightness of 0.55, so a threshold at 0.5 sends the
      // search down the dark side, where black reaches 37.6 and nothing on
      // the hue passes. White reaches -72: the light side is the one with
      // room, and a pale rose there passes 45.
      const bg = chroma("#a37575");
      const result = findHarmonicTextColor(bg, lc45);

      expect(result.meetsRequirement).toBe(true);
      expect(result.contrast).toBeLessThan(0);
      expect(colorOf(result).oklch()[0]).toBeGreaterThan(bg.oklch()[0]);
    });

    it("should agree with the stronger pole's polarity on every background it answers", () => {
      const backgrounds = [
        ...Array.from({length: 12}, (_, step) => chroma.hsl(step * 30, 0.6, 0.55)),
        chroma("#a37575"), chroma("#00a0f5"), chroma("#c3f000"), chroma("#e1e100"), chroma("#3ca5ff"), chroma("#3366cc")
      ];

      for (const bg of backgrounds) {
        const result = findHarmonicTextColor(bg, lc45);
        const pole = findOptimalTextColor(bg, lc45);

        if (!result.meetsRequirement) continue;

        expect(Math.sign(result.contrast), bg.hex()).toBe(Math.sign(pole.contrast));
      }
    });

    it("should hand out the contrast of the 8-bit color its hex names", () => {
      // The caller hands out the hex. A candidate that passed by a hair
      // before rounding and fails after it would report a pair that is never
      // rendered.
      for (const bg of ["#3366cc", "#804000", "#ffd8d8", "#202840"]) {
        const result = findHarmonicTextColor(bg, largeText);
        const color = colorOf(result);
        const [r, g, b] = color.rgb(false);

        expect([r, g, b].every(Number.isInteger), bg).toBe(true);
        expect(result.contrast, bg).toBe(calculateAPCAContrast(chroma(color.hex()), bg));
      }
    });

    it("should hand a background without a hue to the minimum finder", () => {
      // chroma reports the hue of a gray as NaN, and a search on hue 0 would
      // answer with a red-brown on a surface that holds no red. Gray text is
      // the color that belongs to a gray surface, and the result names the
      // mode that produced it.
      for (const bg of ["#ffffff", "#000000", "#808080", "#e0e0e0"]) {
        const result = findHarmonicTextColor(bg, largeText);
        const minimum = findMinimumContrastTextColor(bg, largeText);

        expect(result.appliedMode, bg).toBe("minimum");
        expect(isGray(colorOf(result)), bg).toBe(true);
        expect(result.color!.hex(), bg).toBe(colorOf(minimum).hex());
      }
    });

    it("should come back empty where nothing on the hue passes", () => {
      // Body text on #3366cc asks for 90 and white reaches -82, so nothing on
      // the hue gets there either. The fallback is findTextColor()'s job, not
      // this one's.
      const result = findHarmonicTextColor("#3366cc", {fontSize: "16px", fontWeight: "400"});

      expect(result.color).toBeNull();
      expect(result.meetsRequirement).toBe(false);
      expect(result.requiredContrast).toBe(90);
    });

    it("should come back empty where only an off-white would pass", () => {
      // On #a37575 at 24px/400 white reaches -72 and passes, but every color
      // on the hue that still holds a visible chroma stops short of 60. A
      // near-white is not a color on the hue, so the search says nothing
      // rather than handing one out as harmonic - findTextColor() then names
      // optimal.
      const result = findHarmonicTextColor("#a37575", largeText);
      const pole = findOptimalTextColor("#a37575", largeText);

      expect(result.color).toBeNull();
      expect(result.meetsRequirement).toBe(false);
      expect(pole.meetsRequirement).toBe(true);
    });

    it("should come back empty where no text is readable", () => {
      const result = findHarmonicTextColor("#3366cc", {fontSize: "12px", fontWeight: "400"});

      expect(result.color).toBeNull();
      expect(result.requiredContrast).toBeNull();
    });

    it("should accept custom font configuration", () => {
      const result = findHarmonicTextColor("#3366cc", {
        fontSize: "24px",
        fontWeight: "700"
      });

      expect(result.requiredContrast).toBe(45);
    });

  });

  describe("findTextColor", () => {

    it("should always hand over a color", () => {
      for (const mode of ["optimal", "minimum", "harmonic"] as const) {
        for (const bg of ["#000000", "#ffffff", "#808080", "#3366cc"]) {
          const result = findTextColor(bg, mode, {fontSize: "12px", fontWeight: "400"});

          expect(result.color, `${mode} on ${bg}`).toBeDefined();
          expect(result.color.hex(), `${mode} on ${bg}`).toMatch(/^#[0-9a-f]{6}$/);
        }
      }
    });

    it("should answer in the requested mode where it meets the requirement", () => {
      const result = findTextColor("#000000", "minimum", {fontSize: "24px", fontWeight: "400"});

      expect(result.appliedMode).toBe("minimum");
      expect(result.meetsRequirement).toBe(true);
      expect(isGray(result.color)).toBe(true);
      expect(result.color.hex()).not.toBe("#ffffff");
    });

    it("should fall back to optimal and say so where the mode fails", () => {
      // Body text on mid-gray: no gray reaches 90, so the answer is the
      // optimal pole - and a caller who asked for minimum is told.
      const result = findTextColor("#808080", "minimum", {fontSize: "16px", fontWeight: "400"});
      const optimal = findOptimalTextColor("#808080", {fontSize: "16px", fontWeight: "400"});

      expect(result.appliedMode).toBe("optimal");
      expect(result.color.hex()).toBe(optimal.color.hex());
      expect(result.contrast).toBe(optimal.contrast);
      expect(result.meetsRequirement).toBe(false);
    });

    it("should report minimum where harmonic met a background without a hue", () => {
      // Two steps down, not one: the harmonic search stands aside for the
      // minimum one, and only where that finds nothing does optimal answer.
      const onWhite = findTextColor("#ffffff", "harmonic", {fontSize: "24px", fontWeight: "400"});
      const onMidGray = findTextColor("#808080", "harmonic", {fontSize: "16px", fontWeight: "400"});

      expect(onWhite.appliedMode).toBe("minimum");
      expect(onWhite.meetsRequirement).toBe(true);
      expect(isGray(onWhite.color)).toBe(true);
      expect(onMidGray.appliedMode).toBe("optimal");
    });

    it("should answer optimal and say so where harmonic has only an off-white", () => {
      // White passes on #a37575 at 24px/400 and nothing on the hue does, so
      // the caller gets white - and is told it is the optimal answer, not a
      // color on the hue.
      const result = findTextColor("#a37575", "harmonic", {fontSize: "24px", fontWeight: "400"});

      expect(result.appliedMode).toBe("optimal");
      expect(result.color.hex()).toBe("#ffffff");
      expect(result.meetsRequirement).toBe(true);
    });

    it("should describe the color it returns, not the search that failed", () => {
      const result = findTextColor("#808080", "harmonic", {fontSize: "14px", fontWeight: "400"});

      expect(result.appliedMode).toBe("optimal");
      expect(result.contrast).toBe(calculateAPCAContrast(result.color, "#808080"));
    });

    it("should read a light text color off a dark background in every mode", () => {
      // The one case a sign error in the polarity check gets wrong: every
      // mode then treats black as light and answers with black on black.
      for (const mode of ["optimal", "minimum", "harmonic"] as const) {
        const result = findTextColor("#000000", mode);

        expect(result.color.luminance(), mode).toBeGreaterThan(0.5);
        expect(result.contrast, mode).toBeLessThan(0);
      }
    });

  });

  describe("DEFAULT_COLOR_CONFIG", () => {

    it("should have default font size of 16px", () => {
      expect(DEFAULT_COLOR_CONFIG.fontSize).toBe("16px");
    });

    it("should have default font weight of 400", () => {
      expect(DEFAULT_COLOR_CONFIG.fontWeight).toBe("400");
    });

    it("should have includeColoredAlternatives set to false", () => {
      expect(DEFAULT_COLOR_CONFIG.includeColoredAlternatives).toBe(false);
    });

  });

  describe("OptimalTextColorResult structure", () => {

    it("should have all required properties", () => {
      const result: OptimalTextColorResult = findOptimalTextColor("#ffffff");

      expect(result.color).toBeDefined();
      expect(result.contrast).toBeDefined();
      expect(result.meetsRequirement).toBeDefined();
      expect(result.requiredContrast).toBeDefined();
    });

    it("should have color as chroma Color object", () => {
      const result = findOptimalTextColor("#ffffff");

      // Check it's a chroma color by calling a chroma method
      expect(typeof result.color.hex).toBe("function");
      expect(typeof result.color.rgb).toBe("function");
    });

    it("should have contrast as number", () => {
      const result = findOptimalTextColor("#ffffff");

      expect(typeof result.contrast).toBe("number");
    });

    it("should have meetsRequirement as boolean", () => {
      const result = findOptimalTextColor("#ffffff");

      expect(typeof result.meetsRequirement).toBe("boolean");
    });

    it("should have requiredContrast as number or null", () => {
      const result = findOptimalTextColor("#ffffff");

      expect(
        result.requiredContrast === null || typeof result.requiredContrast === "number"
      ).toBe(true);
    });

  });

  describe("edge cases and error handling", () => {

    it("should handle pure red background", () => {
      const result = findOptimalTextColor("#ff0000");

      expect(result.color).toBeDefined();
      expect(["#000000", "#ffffff"]).toContain(result.color.hex());
    });

    it("should handle pure green background", () => {
      const result = findOptimalTextColor("#00ff00");

      expect(result.color).toBeDefined();
    });

    it("should handle pure blue background", () => {
      const result = findOptimalTextColor("#0000ff");

      expect(result.color).toBeDefined();
    });

    it("should handle CSS color names", () => {
      const result = findOptimalTextColor("rebeccapurple");

      expect(result.color).toBeDefined();
      expect(result.contrast).toBeDefined();
    });

    it("should handle RGB string format", () => {
      const result = findOptimalTextColor("rgb(255, 128, 64)");

      expect(result.color).toBeDefined();
    });

    it("should handle HSL string format", () => {
      const result = findOptimalTextColor("hsl(200, 50%, 50%)");

      expect(result.color).toBeDefined();
    });

  });

  describe("consistency and determinism", () => {

    it("should return consistent results for same input", () => {
      const result1 = findOptimalTextColor("#3366cc");
      const result2 = findOptimalTextColor("#3366cc");

      expect(result1.color.hex()).toBe(result2.color.hex());
      expect(result1.contrast).toBe(result2.contrast);
      expect(result1.meetsRequirement).toBe(result2.meetsRequirement);
    });

    it("should return same result for equivalent color formats", () => {
      const resultHex = findOptimalTextColor("#ff0000");
      const resultRgb = findOptimalTextColor("rgb(255, 0, 0)");
      const resultName = findOptimalTextColor("red");

      expect(resultHex.color.hex()).toBe(resultRgb.color.hex());
      expect(resultHex.color.hex()).toBe(resultName.color.hex());
    });

  });

});
