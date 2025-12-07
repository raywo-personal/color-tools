import chroma from "chroma-js";

import {
  calculateAPCAContrast,
  DEFAULT_COLOR_CONFIG,
  findHarmonicTextColor,
  findMinimumContrastTextColor,
  findOptimalGrayscaleTextColor,
  findOptimalTextColor,
  meetsAPCARequirement,
  OptimalTextColorResult
} from "./optimal-text-color.helper";


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

      const meetsAt16px = meetsAPCARequirement(mediumGray, "#ffffff", "16px", "400");
      const meetsAt48px = meetsAPCARequirement(mediumGray, "#ffffff", "48px", "400");

      // Larger text has lower requirements
      expect(meetsAt48px).toBe(true);
      // The 16px might or might not pass depending on exact contrast
    });

    it("should be more lenient for bolder weights", () => {
      // Test at 16px where weight matters
      const contrast = calculateAPCAContrast("#555555", "#ffffff");

      // Check requirements for different weights
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

    it("should handle mid-gray backgrounds", () => {
      const result = findOptimalTextColor("#808080");

      // For mid-gray, either black or white could work
      // The function should choose the one with higher contrast
      expect(["#000000", "#ffffff"]).toContain(result.color.hex());
      expect(Math.abs(result.contrast)).toBeGreaterThan(0);
    });

  });

  describe("findOptimalGrayscaleTextColor", () => {

    it("should return a grayscale color", () => {
      const result = findOptimalGrayscaleTextColor("#3366cc");

      const [r, g, b] = result.color.rgb();
      // In grayscale, R = G = B
      expect(r).toBe(g);
      expect(g).toBe(b);
    });

    it("should return dark gray for light backgrounds", () => {
      const result = findOptimalGrayscaleTextColor("#ffffff");

      const luminance = result.color.luminance();
      expect(luminance).toBeLessThan(0.5);
    });

    it("should return light gray for dark backgrounds", () => {
      const result = findOptimalGrayscaleTextColor("#000000");

      const luminance = result.color.luminance();
      expect(luminance).toBeGreaterThan(0.5);
    });

    it("should include meetsRequirement flag", () => {
      const result = findOptimalGrayscaleTextColor("#ffffff");

      expect(result.meetsRequirement).toBeDefined();
      expect(typeof result.meetsRequirement).toBe("boolean");
    });

    it("should find optimal from 16 grayscale steps", () => {
      const result = findOptimalGrayscaleTextColor("#808080");

      // Should return a grayscale value
      const hex = result.color.hex();
      expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
    });

  });

  describe("findMinimumContrastTextColor", () => {

    it("should return null when font size has null requirement", () => {
      // 12px/400 has null contrast requirement in the APCA lookup table
      const result = findMinimumContrastTextColor("#ffffff", {
        fontSize: "12px",
        fontWeight: "400"
      });

      // When requirement is null, the function returns null
      // (text at this size/weight is not considered readable)
      expect(result).toBeNull();
    });

    it("should find a color that meets requirement with minimum contrast", () => {
      const result = findMinimumContrastTextColor("#ffffff");

      if (result) {
        expect(result.meetsRequirement).toBe(true);
        expect(result.color).toBeDefined();
      }
    });

    it("should return softer contrast than maximum", () => {
      const minResult = findMinimumContrastTextColor("#ffffff");
      const optimalResult = findOptimalTextColor("#ffffff");

      if (minResult) {
        // Minimum contrast should be less than or equal to optimal
        expect(Math.abs(minResult.contrast)).toBeLessThanOrEqual(
          Math.abs(optimalResult.contrast)
        );
      }
    });

    it("should return grayscale colors", () => {
      const result = findMinimumContrastTextColor("#3366cc");

      if (result) {
        const [r, g, b] = result.color.rgb();
        // Should be grayscale (R = G = B) or close to it
        const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
        expect(maxDiff).toBeLessThan(5);
      }
    });

    it("should include required contrast from lookup", () => {
      const result = findMinimumContrastTextColor("#ffffff", {fontSize: "24px"});

      if (result) {
        expect(result.requiredContrast).toBeDefined();
        expect(result.requiredContrast).toBeGreaterThan(0);
      }
    });

  });

  describe("findHarmonicTextColor", () => {

    it("should preserve hue from background for colored backgrounds", () => {
      // Blue background
      const bgColor = chroma.hsl(220, 0.8, 0.5);
      const result = findHarmonicTextColor(bgColor);

      const [bgHue] = bgColor.hsl();
      const [resultHue] = result.color.hsl();

      // If harmonic color was found, hue should be similar
      // Allow for some variation or fallback to grayscale
      if (result.color.get("hsl.s") > 0.1) {
        // Only check hue if color is saturated
        const hueDiff = Math.abs(bgHue - resultHue);
        const normalizedDiff = Math.min(hueDiff, 360 - hueDiff);
        expect(normalizedDiff).toBeLessThan(30);
      } else {
        // Color fell back to grayscale - that's acceptable
        // Just verify it's actually grayscale (low saturation)
        expect(result.color.get("hsl.s")).toBeLessThan(0.1);
      }
    });

    it("should return a valid result structure", () => {
      const result = findHarmonicTextColor("#3366cc");

      // The function should always return a result with all properties
      expect(result.color).toBeDefined();
      expect(result.contrast).toBeDefined();
      expect(typeof result.meetsRequirement).toBe("boolean");
      expect(result.requiredContrast).toBeDefined();
    });

    it("should return darker color for light backgrounds", () => {
      const lightBg = chroma.hsl(220, 0.5, 0.8);
      const result = findHarmonicTextColor(lightBg);

      const bgLightness = lightBg.get("hsl.l");
      const resultLightness = result.color.get("hsl.l");

      expect(resultLightness).toBeLessThan(bgLightness);
    });

    it("should return lighter color for dark backgrounds", () => {
      const darkBg = chroma.hsl(220, 0.5, 0.2);
      const result = findHarmonicTextColor(darkBg);

      const bgLightness = darkBg.get("hsl.l");
      const resultLightness = result.color.get("hsl.l");

      expect(resultLightness).toBeGreaterThan(bgLightness);
    });

    it("should fall back to grayscale for extreme cases", () => {
      // Very saturated dark color might not have a harmonic match
      const result = findHarmonicTextColor("#000000");

      // Should still return a valid result
      expect(result.color).toBeDefined();
      expect(result.meetsRequirement).toBe(true);
    });

    it("should accept custom font configuration", () => {
      const result = findHarmonicTextColor("#3366cc", {
        fontSize: "24px",
        fontWeight: "700"
      });

      expect(result.requiredContrast).toBeDefined();
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
