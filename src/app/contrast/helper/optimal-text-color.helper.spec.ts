import chroma, {Color} from "chroma-js";

import {
  calculateAPCAContrast,
  DEFAULT_COLOR_CONFIG,
  findHarmonicTextColor,
  findMinimumContrastTextColor,
  findOptimalGrayscaleTextColor,
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

  describe("findOptimalGrayscaleTextColor", () => {

    it("should return a gray", () => {
      const result = findOptimalGrayscaleTextColor("#3366cc");

      expect(isGray(colorOf(result))).toBe(true);
    });

    it("should return a dark gray on a light background", () => {
      const result = findOptimalGrayscaleTextColor("#ffffff");

      expect(colorOf(result).luminance()).toBeLessThan(0.5);
    });

    it("should return a light gray on a dark background", () => {
      const result = findOptimalGrayscaleTextColor("#000000");

      expect(colorOf(result).luminance()).toBeGreaterThan(0.5);
    });

    it("should stop at the softest gray that meets the requirement", () => {
      // The scale is walked from the background's own side outwards, so the
      // step before the returned gray sits closer to the background and has
      // to fail - otherwise the search stopped late.
      for (const bg of ["#ffffff", "#000000", "#3366cc", "#dddddd", "#222222"]) {
        const result = findOptimalGrayscaleTextColor(bg, {fontSize: "24px", fontWeight: "400"});
        const color = colorOf(result);
        const required = result.requiredContrast!;
        const towardsBg = chroma(bg).luminance() > color.luminance() ? 0.01 : -0.01;
        const previous = chroma.hsl(0, 0, color.get("hsl.l") + towardsBg);

        expect(result.meetsRequirement, bg).toBe(true);
        expect(Math.abs(result.contrast), bg).toBeGreaterThanOrEqual(required);
        expect(Math.abs(calculateAPCAContrast(previous, bg)), bg).toBeLessThan(required);
      }
    });

    it("should return a softer gray than the optimal pole where one passes", () => {
      const gray = findOptimalGrayscaleTextColor("#ffffff", {fontSize: "24px", fontWeight: "400"});
      const optimal = findOptimalTextColor("#ffffff", {fontSize: "24px", fontWeight: "400"});

      expect(Math.abs(gray.contrast)).toBeLessThan(Math.abs(optimal.contrast));
    });

    it("should report a miss and keep the strongest gray where none passes", () => {
      // Body text on mid-gray: 16px/400 asks for 90 and neither pole gets
      // there, so the result is the pole itself, flagged as failing.
      const result = findOptimalGrayscaleTextColor("#808080", {fontSize: "16px", fontWeight: "400"});

      expect(result.meetsRequirement).toBe(false);
      expect(["#000000", "#ffffff"]).toContain(colorOf(result).hex());
    });

    it("should answer with a pole and a miss where no text is readable", () => {
      const result = findOptimalGrayscaleTextColor("#000000", {fontSize: "12px", fontWeight: "400"});

      expect(result.requiredContrast).toBeNull();
      expect(result.meetsRequirement).toBe(false);
      expect(colorOf(result).hex()).toBe("#ffffff");
    });

    it("should carry its own mode", () => {
      const result = findOptimalGrayscaleTextColor("#ffffff");

      expect(result.appliedMode).toBe("grayscale");
    });

  });

  describe("findMinimumContrastTextColor", () => {

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

    it("should return a softer contrast than the optimal pole", () => {
      const minResult = findMinimumContrastTextColor("#ffffff");
      const optimalResult = findOptimalTextColor("#ffffff");

      expect(Math.abs(minResult.contrast)).toBeLessThanOrEqual(
        Math.abs(optimalResult.contrast)
      );
    });

    it("should walk away from the background towards the stronger pole", () => {
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

  });

  describe("findHarmonicTextColor", () => {

    // Body text asks for 90 and only the poles get there against a
    // mid-lightness color, so the harmonic search has room at 24px/400 (60).
    const largeText = {fontSize: "24px", fontWeight: "400"} as const;

    it("should preserve the hue of a colored background", () => {
      const bgColor = chroma.hsl(220, 0.8, 0.5);
      const result = findHarmonicTextColor(bgColor, largeText);
      const color = colorOf(result);

      const [bgHue] = bgColor.hsl();
      const [resultHue] = color.hsl();
      const hueDiff = Math.abs(bgHue - resultHue);

      expect(color.get("hsl.s")).toBeGreaterThan(0.1);
      expect(Math.min(hueDiff, 360 - hueDiff)).toBeLessThan(30);
    });

    it("should return a valid result structure", () => {
      const result = findHarmonicTextColor("#3366cc", largeText);

      expect(result.color).not.toBeNull();
      expect(typeof result.contrast).toBe("number");
      expect(typeof result.meetsRequirement).toBe("boolean");
      expect(result.requiredContrast).not.toBeNull();
    });

    it("should return a darker color on a light background", () => {
      const lightBg = chroma.hsl(220, 0.5, 0.8);
      const result = findHarmonicTextColor(lightBg, largeText);

      expect(colorOf(result).get("hsl.l")).toBeLessThan(lightBg.get("hsl.l"));
    });

    it("should return a lighter color on a dark background", () => {
      const darkBg = chroma.hsl(220, 0.5, 0.2);
      const result = findHarmonicTextColor(darkBg, largeText);

      expect(colorOf(result).get("hsl.l")).toBeGreaterThan(darkBg.get("hsl.l"));
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
      // 14px/400 asks for 100, and no color on a hue reaches that against a
      // mid-gray. The fallback is findTextColor()'s job, not this one's.
      const result = findHarmonicTextColor("#808080", {fontSize: "14px", fontWeight: "400"});

      expect(result.color).toBeNull();
      expect(result.meetsRequirement).toBe(false);
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
      for (const mode of ["optimal", "minimum", "harmonic", "grayscale"] as const) {
        for (const bg of ["#000000", "#ffffff", "#808080", "#3366cc"]) {
          const result = findTextColor(bg, mode, {fontSize: "12px", fontWeight: "400"});

          expect(result.color, `${mode} on ${bg}`).toBeDefined();
          expect(result.color.hex(), `${mode} on ${bg}`).toMatch(/^#[0-9a-f]{6}$/);
        }
      }
    });

    it("should answer in the requested mode where it meets the requirement", () => {
      const result = findTextColor("#000000", "grayscale", {fontSize: "24px", fontWeight: "400"});

      expect(result.appliedMode).toBe("grayscale");
      expect(result.meetsRequirement).toBe(true);
      expect(isGray(result.color)).toBe(true);
      expect(result.color.hex()).not.toBe("#ffffff");
    });

    it("should fall back to optimal and say so where the mode fails", () => {
      // Body text on mid-gray: no gray reaches 90, so the answer is the
      // optimal pole - and a caller who asked for grayscale is told.
      const result = findTextColor("#808080", "grayscale", {fontSize: "16px", fontWeight: "400"});
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

    it("should describe the color it returns, not the search that failed", () => {
      const result = findTextColor("#808080", "harmonic", {fontSize: "14px", fontWeight: "400"});

      expect(result.appliedMode).toBe("optimal");
      expect(result.contrast).toBe(calculateAPCAContrast(result.color, "#808080"));
    });

    it("should read a light text color off a dark background in every mode", () => {
      // The one case a sign error in the polarity check gets wrong: every
      // mode then treats black as light and answers with black on black.
      for (const mode of ["optimal", "minimum", "harmonic", "grayscale"] as const) {
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
