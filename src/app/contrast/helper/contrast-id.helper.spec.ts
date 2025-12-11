import chroma from "chroma-js";
import {CONTRAST_ID_LENGTH, contrastColorsFromId, contrastIdFromColors, generateRandomContrastColors} from "./contrast-id.helper";
import {ContrastColors} from "@contrast/models/contrast-colors.model";


describe("Contrast ID Helper", () => {

  describe("CONTRAST_ID_LENGTH", () => {

    it("should be defined as 9", () => {
      expect(CONTRAST_ID_LENGTH).toBe(9);
    });

  });

  describe("contrastIdFromColors", () => {

    it("should generate a 9-character ID from two colors", () => {
      const colors: ContrastColors = {
        text: chroma.rgb(255, 0, 0),
        background: chroma.rgb(0, 255, 0),
        contrast: 50
      };

      const id = contrastIdFromColors(colors);

      expect(id).toBeDefined();
      expect(id.length).toBe(CONTRAST_ID_LENGTH);
    });

    it("should generate consistent IDs for the same color pair", () => {
      const colors: ContrastColors = {
        text: chroma.rgb(123, 45, 67),
        background: chroma.rgb(200, 150, 100),
        contrast: 50
      };

      const id1 = contrastIdFromColors(colors);
      const id2 = contrastIdFromColors(colors);

      expect(id1).toBe(id2);
    });

    it("should generate different IDs for different color pairs", () => {
      const colors1: ContrastColors = {
        text: chroma.rgb(255, 0, 0),
        background: chroma.rgb(0, 255, 0),
        contrast: 50
      };

      const colors2: ContrastColors = {
        text: chroma.rgb(0, 255, 0),
        background: chroma.rgb(255, 0, 0),
        contrast: 50
      };

      const id1 = contrastIdFromColors(colors1);
      const id2 = contrastIdFromColors(colors2);

      expect(id1).not.toBe(id2);
    });

    describe("edge cases with dark colors", () => {

      it("should handle black text on white background", () => {
        const colors: ContrastColors = {
          text: chroma.rgb(0, 0, 0),
          background: chroma.rgb(255, 255, 255),
          contrast: 106
        };

        const id = contrastIdFromColors(colors);

        expect(id).toBeDefined();
        expect(id.length).toBe(CONTRAST_ID_LENGTH);
      });

      it("should handle white text on black background", () => {
        const colors: ContrastColors = {
          text: chroma.rgb(255, 255, 255),
          background: chroma.rgb(0, 0, 0),
          contrast: -106
        };

        const id = contrastIdFromColors(colors);

        expect(id).toBeDefined();
        expect(id.length).toBe(CONTRAST_ID_LENGTH);
      });

      it("should handle both colors being black", () => {
        const colors: ContrastColors = {
          text: chroma.rgb(0, 0, 0),
          background: chroma.rgb(0, 0, 0),
          contrast: 0
        };

        const id = contrastIdFromColors(colors);

        expect(id).toBeDefined();
        expect(id.length).toBe(CONTRAST_ID_LENGTH);
      });

      it("should handle very dark colors (RGB < 10)", () => {
        const colors: ContrastColors = {
          text: chroma.rgb(5, 2, 1),
          background: chroma.rgb(3, 7, 4),
          contrast: 10
        };

        const id = contrastIdFromColors(colors);

        expect(id).toBeDefined();
        expect(id.length).toBe(CONTRAST_ID_LENGTH);
      });

    });

    describe("edge cases with bright colors", () => {

      it("should handle both colors being white", () => {
        const colors: ContrastColors = {
          text: chroma.rgb(255, 255, 255),
          background: chroma.rgb(255, 255, 255),
          contrast: 0
        };

        const id = contrastIdFromColors(colors);

        expect(id).toBeDefined();
        expect(id.length).toBe(CONTRAST_ID_LENGTH);
      });

      it("should handle very bright colors (RGB > 245)", () => {
        const colors: ContrastColors = {
          text: chroma.rgb(250, 252, 254),
          background: chroma.rgb(248, 251, 253),
          contrast: 5
        };

        const id = contrastIdFromColors(colors);

        expect(id).toBeDefined();
        expect(id.length).toBe(CONTRAST_ID_LENGTH);
      });

    });

    describe("mixed color scenarios", () => {

      it("should handle one channel at 0 and others at 255", () => {
        const colors: ContrastColors = {
          text: chroma.rgb(255, 0, 255),
          background: chroma.rgb(0, 255, 0),
          contrast: 50
        };

        const id = contrastIdFromColors(colors);

        expect(id).toBeDefined();
        expect(id.length).toBe(CONTRAST_ID_LENGTH);
      });

      it("should handle gradual color values", () => {
        const colors: ContrastColors = {
          text: chroma.rgb(1, 2, 3),
          background: chroma.rgb(4, 5, 6),
          contrast: 10
        };

        const id = contrastIdFromColors(colors);

        expect(id).toBeDefined();
        expect(id.length).toBe(CONTRAST_ID_LENGTH);
      });

    });

  });

  describe("contrastColorsFromId", () => {

    it("should restore colors from a valid ID", () => {
      const originalColors: ContrastColors = {
        text: chroma.rgb(123, 45, 67),
        background: chroma.rgb(200, 150, 100),
        contrast: 50
      };

      const id = contrastIdFromColors(originalColors);
      const restoredColors = contrastColorsFromId(id);

      expect(restoredColors).toBeDefined();
      expect(restoredColors.text).toBeDefined();
      expect(restoredColors.background).toBeDefined();
    });

    it("should throw error for ID with wrong length", () => {
      expect(() => contrastColorsFromId("abc")).toThrowError("Invalid contrast ID");
      expect(() => contrastColorsFromId("abcdefgh")).toThrowError("Invalid contrast ID");
      expect(() => contrastColorsFromId("")).toThrowError("Invalid contrast ID");
    });

    it("should throw error for ID with exactly 6 chars but shorter than expected", () => {
      // Create an ID that's too short
      expect(() => contrastColorsFromId("12345")).toThrowError("Invalid contrast ID");
    });

    it("should throw error for ID with exactly 7 chars (too long)", () => {
      expect(() => contrastColorsFromId("1234567")).toThrowError("Invalid contrast ID");
    });

    describe("restored color accuracy", () => {

      it("should restore exact RGB values for typical colors", () => {
        const originalColors: ContrastColors = {
          text: chroma.rgb(123, 45, 67),
          background: chroma.rgb(200, 150, 100),
          contrast: 50
        };

        const id = contrastIdFromColors(originalColors);
        const restoredColors = contrastColorsFromId(id);

        const [r1, g1, b1] = restoredColors.text.rgb();
        const [r2, g2, b2] = restoredColors.background.rgb();

        expect(Math.round(r1)).toBe(123);
        expect(Math.round(g1)).toBe(45);
        expect(Math.round(b1)).toBe(67);
        expect(Math.round(r2)).toBe(200);
        expect(Math.round(g2)).toBe(150);
        expect(Math.round(b2)).toBe(100);
      });

      it("should restore black color correctly", () => {
        const originalColors: ContrastColors = {
          text: chroma.rgb(0, 0, 0),
          background: chroma.rgb(128, 128, 128),
          contrast: 50
        };

        const id = contrastIdFromColors(originalColors);
        const restoredColors = contrastColorsFromId(id);

        const [r, g, b] = restoredColors.text.rgb();

        expect(Math.round(r)).toBe(0);
        expect(Math.round(g)).toBe(0);
        expect(Math.round(b)).toBe(0);
      });

      it("should restore white color correctly", () => {
        const originalColors: ContrastColors = {
          text: chroma.rgb(255, 255, 255),
          background: chroma.rgb(128, 128, 128),
          contrast: 50
        };

        const id = contrastIdFromColors(originalColors);
        const restoredColors = contrastColorsFromId(id);

        const [r, g, b] = restoredColors.text.rgb();

        expect(Math.round(r)).toBe(255);
        expect(Math.round(g)).toBe(255);
        expect(Math.round(b)).toBe(255);
      });

      it("should restore very dark colors correctly", () => {
        const originalColors: ContrastColors = {
          text: chroma.rgb(5, 2, 1),
          background: chroma.rgb(3, 7, 4),
          contrast: 10
        };

        const id = contrastIdFromColors(originalColors);
        const restoredColors = contrastColorsFromId(id);

        const [r1, g1, b1] = restoredColors.text.rgb();
        const [r2, g2, b2] = restoredColors.background.rgb();

        expect(Math.round(r1)).toBe(5);
        expect(Math.round(g1)).toBe(2);
        expect(Math.round(b1)).toBe(1);
        expect(Math.round(r2)).toBe(3);
        expect(Math.round(g2)).toBe(7);
        expect(Math.round(b2)).toBe(4);
      });

    });

    it("should calculate contrast value correctly", () => {
      const originalColors: ContrastColors = {
        text: chroma.rgb(0, 0, 0),
        background: chroma.rgb(255, 255, 255),
        contrast: 106
      };

      const id = contrastIdFromColors(originalColors);
      const restoredColors = contrastColorsFromId(id);

      expect(restoredColors.contrast).toBeDefined();
      expect(typeof restoredColors.contrast).toBe("number");
      // APCA contrast for black on white should be around 106
      expect(Math.abs(restoredColors.contrast)).toBeGreaterThan(100);
    });

  });

  describe("roundtrip encoding/decoding", () => {

    it("should preserve colors through encode -> decode cycle", () => {
      const testCases = [
        {text: [0, 0, 0], background: [255, 255, 255]},
        {text: [255, 255, 255], background: [0, 0, 0]},
        {text: [128, 128, 128], background: [64, 64, 64]},
        {text: [255, 0, 0], background: [0, 255, 0]},
        {text: [123, 45, 67], background: [200, 150, 100]},
        {text: [1, 2, 3], background: [4, 5, 6]},
        {text: [250, 251, 252], background: [253, 254, 255]}
      ];

      testCases.forEach(testCase => {
        const originalColors: ContrastColors = {
          text: chroma.rgb(testCase.text[0], testCase.text[1], testCase.text[2]),
          background: chroma.rgb(testCase.background[0], testCase.background[1], testCase.background[2]),
          contrast: 50
        };

        const id = contrastIdFromColors(originalColors);
        const restoredColors = contrastColorsFromId(id);

        const [r1, g1, b1] = restoredColors.text.rgb();
        const [r2, g2, b2] = restoredColors.background.rgb();

        expect(Math.round(r1)).toBe(testCase.text[0]);
        expect(Math.round(g1)).toBe(testCase.text[1]);
        expect(Math.round(b1)).toBe(testCase.text[2]);
        expect(Math.round(r2)).toBe(testCase.background[0]);
        expect(Math.round(g2)).toBe(testCase.background[1]);
        expect(Math.round(b2)).toBe(testCase.background[2]);
      });
    });

    it("should preserve all 256 possible values in each channel", () => {
      // Test a representative sample of values
      const sampleValues = [0, 1, 2, 5, 10, 50, 100, 127, 128, 200, 250, 253, 254, 255];

      sampleValues.forEach(value => {
        const originalColors: ContrastColors = {
          text: chroma.rgb(value, 128, 200),
          background: chroma.rgb(100, value, 50),
          contrast: 50
        };

        const id = contrastIdFromColors(originalColors);
        const restoredColors = contrastColorsFromId(id);

        const [r1, g1, b1] = restoredColors.text.rgb();
        const [r2, g2, b2] = restoredColors.background.rgb();

        expect(Math.round(r1)).toBe(value);
        expect(Math.round(g1)).toBe(128);
        expect(Math.round(b1)).toBe(200);
        expect(Math.round(r2)).toBe(100);
        expect(Math.round(g2)).toBe(value);
        expect(Math.round(b2)).toBe(50);
      });
    });

    it("should produce the same ID when encoded twice", () => {
      const colors: ContrastColors = {
        text: chroma.rgb(123, 45, 67),
        background: chroma.rgb(200, 150, 100),
        contrast: 50
      };

      const id1 = contrastIdFromColors(colors);
      const restored = contrastColorsFromId(id1);
      const id2 = contrastIdFromColors(restored);

      expect(id1).toBe(id2);
    });

  });

  describe("generateRandomContrastColors", () => {

    it("should generate a valid ContrastColors object", () => {
      const colors = generateRandomContrastColors();

      expect(colors).toBeDefined();
      expect(colors.text).toBeDefined();
      expect(colors.background).toBeDefined();
      expect(colors.contrast).toBeDefined();
    });

    it("should generate colors with valid RGB values", () => {
      const colors = generateRandomContrastColors();

      const [r1, g1, b1] = colors.text.rgb();
      const [r2, g2, b2] = colors.background.rgb();

      // RGB values should be between 0 and 255
      expect(r1).toBeGreaterThanOrEqual(0);
      expect(r1).toBeLessThanOrEqual(255);
      expect(g1).toBeGreaterThanOrEqual(0);
      expect(g1).toBeLessThanOrEqual(255);
      expect(b1).toBeGreaterThanOrEqual(0);
      expect(b1).toBeLessThanOrEqual(255);

      expect(r2).toBeGreaterThanOrEqual(0);
      expect(r2).toBeLessThanOrEqual(255);
      expect(g2).toBeGreaterThanOrEqual(0);
      expect(g2).toBeLessThanOrEqual(255);
      expect(b2).toBeGreaterThanOrEqual(0);
      expect(b2).toBeLessThanOrEqual(255);
    });

    it("should generate different colors on multiple calls", () => {
      const colors1 = generateRandomContrastColors();
      const colors2 = generateRandomContrastColors();
      const colors3 = generateRandomContrastColors();

      const id1 = contrastIdFromColors(colors1);
      const id2 = contrastIdFromColors(colors2);
      const id3 = contrastIdFromColors(colors3);

      // At least one should be different (highly likely with random generation)
      const allSame = id1 === id2 && id2 === id3;
      expect(allSame).toBe(false);
    });

    it("should generate colors that can be encoded to valid IDs", () => {
      // Generate multiple random color pairs and verify they all encode properly
      for (let i = 0; i < 10; i++) {
        const colors = generateRandomContrastColors();
        const id = contrastIdFromColors(colors);

        expect(id.length).toBe(CONTRAST_ID_LENGTH);
      }
    });

    it("should generate colors that survive roundtrip encoding", () => {
      const originalColors = generateRandomContrastColors();
      const id = contrastIdFromColors(originalColors);
      const restoredColors = contrastColorsFromId(id);

      const [r1, g1, b1] = originalColors.text.rgb();
      const [r2, g2, b2] = originalColors.background.rgb();

      const [r1r, g1r, b1r] = restoredColors.text.rgb();
      const [r2r, g2r, b2r] = restoredColors.background.rgb();

      expect(Math.round(r1r)).toBe(Math.round(r1));
      expect(Math.round(g1r)).toBe(Math.round(g1));
      expect(Math.round(b1r)).toBe(Math.round(b1));
      expect(Math.round(r2r)).toBe(Math.round(r2));
      expect(Math.round(g2r)).toBe(Math.round(g2));
      expect(Math.round(b2r)).toBe(Math.round(b2));
    });

    it("should calculate a valid contrast value", () => {
      const colors = generateRandomContrastColors();

      expect(typeof colors.contrast).toBe("number");
      expect(isFinite(colors.contrast)).toBe(true);
      // APCA contrast range is approximately -108 to +108
      expect(colors.contrast).toBeGreaterThanOrEqual(-110);
      expect(colors.contrast).toBeLessThanOrEqual(110);
    });

  });

  describe("integration scenarios", () => {

    it("should handle typical web color combinations", () => {
      const testCases = [
        {name: "Black on White", text: "#000000", background: "#FFFFFF"},
        {name: "White on Black", text: "#FFFFFF", background: "#000000"},
        {name: "Dark Gray on Light Gray", text: "#333333", background: "#CCCCCC"},
        {name: "Blue on Yellow", text: "#0000FF", background: "#FFFF00"},
        {name: "Red on White", text: "#FF0000", background: "#FFFFFF"}
      ];

      testCases.forEach(testCase => {
        const colors: ContrastColors = {
          text: chroma(testCase.text),
          background: chroma(testCase.background),
          contrast: chroma.contrastAPCA(chroma(testCase.text), chroma(testCase.background))
        };

        const id = contrastIdFromColors(colors);
        const restored = contrastColorsFromId(id);

        // Verify the ID is valid
        expect(id.length).toBe(CONTRAST_ID_LENGTH);

        // Verify colors are restored
        expect(restored.text.hex()).toBe(chroma(testCase.text).hex());
        expect(restored.background.hex()).toBe(chroma(testCase.background).hex());
      });
    });

    it("should handle Bootstrap primary colors", () => {
      const bootstrapColors = [
        "#0d6efd", // primary
        "#6c757d", // secondary
        "#198754", // success
        "#dc3545", // danger
        "#ffc107", // warning
        "#0dcaf0", // info
      ];

      bootstrapColors.forEach(color => {
        const colors: ContrastColors = {
          text: chroma(color),
          background: chroma("#FFFFFF"),
          contrast: 50
        };

        const id = contrastIdFromColors(colors);
        const restored = contrastColorsFromId(id);

        expect(restored.text.hex()).toBe(chroma(color).hex());
      });
    });

  });

});
