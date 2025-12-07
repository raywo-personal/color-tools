import {APCARating, getAPCARating} from "./apca-rating.helper";
import {APCALookupTable} from "@contrast/models/apca-lookup-table.model";
import {apcaLookup} from "@contrast/helper/apca-look-up-table.helper";


describe("APCA Rating Helper", () => {

  describe("getAPCARating", () => {

    describe("rating calculation based on contrast thresholds", () => {

      it("should return 0 when lookup table entry has null contrast", () => {
        // 12px font at any weight has null contrast (not readable)
        const rating = getAPCARating(100, 12, "400", apcaLookup);

        expect(rating).toBe(0);
      });

      it("should return 0 when contrast is below 70% of required", () => {
        // 16px/400 requires 90 contrast, 70% = 63
        // Contrast of 50 is below 63
        const rating = getAPCARating(50, 16, "400", apcaLookup);

        expect(rating).toBe(0);
      });

      it("should return 1 when contrast is between 70% and 100% of required", () => {
        // 16px/400 requires 90 contrast
        // 70% = 63, contrast of 70 is between 63 and 90
        const rating = getAPCARating(70, 16, "400", apcaLookup);

        expect(rating).toBe(1);
      });

      it("should return 2 when contrast is between 100% and 130% of required", () => {
        // 16px/400 requires 90 contrast
        // 95 is between 90 and 117 (130% of 90)
        const rating = getAPCARating(95, 16, "400", apcaLookup);

        expect(rating).toBe(2);
      });

      it("should return 3 when contrast exceeds 130% of required", () => {
        // 16px/400 requires 90 contrast
        // 130% = 117, contrast of 120 exceeds this
        const rating = getAPCARating(120, 16, "400", apcaLookup);

        expect(rating).toBe(3);
      });

    });

    describe("handling of negative contrast values", () => {

      it("should use absolute value for negative contrast", () => {
        // Negative contrast should be treated the same as positive
        const positiveRating = getAPCARating(100, 16, "400", apcaLookup);
        const negativeRating = getAPCARating(-100, 16, "400", apcaLookup);

        expect(negativeRating).toBe(positiveRating);
      });

      it("should return 0 for negative contrast below threshold", () => {
        const rating = getAPCARating(-50, 16, "400", apcaLookup);

        expect(rating).toBe(0);
      });

      it("should return 3 for high negative contrast", () => {
        const rating = getAPCARating(-120, 16, "400", apcaLookup);

        expect(rating).toBe(3);
      });

    });

    describe("font size interpolation", () => {

      it("should use closest larger size for in-between values", () => {
        // 17px should map to 18px (next larger size)
        // 18px/400 requires 75 contrast
        const rating17px = getAPCARating(80, 17, "400", apcaLookup);
        const rating18px = getAPCARating(80, 18, "400", apcaLookup);

        expect(rating17px).toBe(rating18px);
      });

      it("should use minimum size for values below minimum", () => {
        // 10px should map to 12px (minimum)
        const rating10px = getAPCARating(100, 10, "400", apcaLookup);
        const rating12px = getAPCARating(100, 12, "400", apcaLookup);

        expect(rating10px).toBe(rating12px);
      });

      it("should use maximum size for values above maximum", () => {
        // 100px should map to 96px (maximum)
        const rating100px = getAPCARating(40, 100, "400", apcaLookup);
        const rating96px = getAPCARating(40, 96, "400", apcaLookup);

        expect(rating100px).toBe(rating96px);
      });

      it("should use exact size when it matches a lookup key", () => {
        // 16px is an exact match
        // 16px/400 requires 90 contrast
        const rating = getAPCARating(95, 16, "400", apcaLookup);

        expect(rating).toBe(2);
      });

    });

    describe("font weight variations", () => {

      it("should return different ratings for different weights at same size", () => {
        // 16px/400 requires 90 contrast (with bold requirement)
        // 16px/700 requires 60 contrast
        const contrast = 65;

        const rating400 = getAPCARating(contrast, 16, "400", apcaLookup);
        const rating700 = getAPCARating(contrast, 16, "700", apcaLookup);

        // 65 is below 70% of 90 (63) so rating400 should be higher than expected
        // Actually 65 > 63, so rating400 = 1
        // 65 > 60 * 1.0 and < 60 * 1.3 = 78, so rating700 = 2
        expect(rating400).toBe(1);
        expect(rating700).toBe(2);
      });

      it("should handle weight 100 which often has null contrast", () => {
        // Weight 100 at most sizes has null contrast
        const rating = getAPCARating(100, 16, "100", apcaLookup);

        expect(rating).toBe(0);
      });

      it("should handle weight 900 appropriately", () => {
        // 18px/900 requires 55 contrast
        const rating = getAPCARating(60, 18, "900", apcaLookup);

        // 60 > 55 and < 71.5 (130% of 55)
        expect(rating).toBe(2);
      });

    });

    describe("edge cases", () => {

      it("should return 0 for zero contrast", () => {
        const rating = getAPCARating(0, 16, "400", apcaLookup);

        expect(rating).toBe(0);
      });

      it("should handle maximum possible APCA contrast (~106)", () => {
        // Maximum APCA contrast is around 106
        const rating = getAPCARating(106, 96, "400", apcaLookup);

        // 96px/400 requires 33 contrast, 106 far exceeds 130% of 33
        expect(rating).toBe(3);
      });

      it("should handle exact threshold boundaries", () => {
        // Due to the algorithm rounding up to next size, 24px maps to 28px
        // 28px/400 requires 55 contrast
        // 70% of 55 = 38.5
        // Test values around this boundary
        const ratingAt40 = getAPCARating(40, 24, "400", apcaLookup);
        const ratingAt37 = getAPCARating(37, 24, "400", apcaLookup);

        // 40 is above 70% threshold (38.5), should be 1
        // 37 is below 70% threshold (38.5), should be 0
        expect(ratingAt40).toBe(1);
        expect(ratingAt37).toBe(0);
      });

    });

    describe("with custom lookup table", () => {

      it("should work with a custom lookup table", () => {
        // Create a minimal custom lookup table with all required font sizes
        const defaultWeights = {
          "100": {contrast: null},
          "200": {contrast: null},
          "300": {contrast: null},
          "400": {contrast: 50},
          "500": {contrast: 45},
          "600": {contrast: 40},
          "700": {contrast: 35},
          "800": {contrast: 30},
          "900": {contrast: 30}
        };

        const customLookup: APCALookupTable = {
          "12px": defaultWeights,
          "14px": defaultWeights,
          "15px": defaultWeights,
          "16px": defaultWeights,
          "18px": defaultWeights,
          "21px": defaultWeights,
          "24px": defaultWeights,
          "28px": defaultWeights,
          "32px": defaultWeights,
          "36px": defaultWeights,
          "42px": defaultWeights,
          "48px": defaultWeights,
          "60px": defaultWeights,
          "72px": defaultWeights,
          "96px": defaultWeights
        };

        const rating = getAPCARating(55, 16, "400", customLookup);

        // 55 > 50 and < 65 (130% of 50)
        expect(rating).toBe(2);
      });

    });

    describe("type safety", () => {

      it("should return APCARating type (0, 1, 2, or 3)", () => {
        const ratings: APCARating[] = [
          getAPCARating(10, 16, "400", apcaLookup),
          getAPCARating(70, 16, "400", apcaLookup),
          getAPCARating(100, 16, "400", apcaLookup),
          getAPCARating(120, 16, "400", apcaLookup)
        ];

        ratings.forEach(rating => {
          expect([0, 1, 2, 3]).toContain(rating);
        });
      });

    });

    describe("common use cases", () => {

      it("should rate black text on white background as excellent for body text", () => {
        // Black on white has APCA contrast of approximately 106
        // 16px/400 requires 90, so 106 exceeds 130%
        const rating = getAPCARating(106, 16, "400", apcaLookup);

        expect(rating).toBe(3);
      });

      it("should rate low contrast text as not readable", () => {
        // Light gray on white might have contrast around 30
        const rating = getAPCARating(30, 16, "400", apcaLookup);

        expect(rating).toBe(0);
      });

      it("should be more lenient for large headings", () => {
        // 48px text has lower contrast requirements
        // 48px/400 requires 40 contrast
        const contrastValue = 45;

        const smallTextRating = getAPCARating(contrastValue, 16, "400", apcaLookup);
        const largeTextRating = getAPCARating(contrastValue, 48, "400", apcaLookup);

        // Same contrast should rate better for large text
        expect(largeTextRating).toBeGreaterThan(smallTextRating);
      });

    });

  });

});
