import {
  APCA_RATING_LABELS,
  APCARating,
  findClosestSizeKey,
  getAPCAPolarity,
  getAPCARating,
  getAPCARatingLabel,
  getRequiredLc,
  NEGATIVE_MAX_APCA_CONTRAST
} from "./apca-rating.helper";
import {
  APCALookupTable,
  FONT_SIZES,
  FONT_WEIGHTS
} from "@contrast/models/apca-lookup-table.model";
import {apcaLookup} from "@contrast/helper/apca-look-up-table.helper";
import {
  calculateAPCAContrast,
  meetsAPCARequirement
} from "@contrast/helper/optimal-text-color.helper";


describe("APCA Rating Helper", () => {

  describe("getAPCARating", () => {

    describe("rating calculation based on contrast thresholds", () => {

      it("should return 0 when lookup table entry has null contrast", () => {
        // 12px font at any weight has null contrast (not readable)
        const rating = getAPCARating(100, "12px", "400", apcaLookup);

        expect(rating).toBe(0);
      });

      it("should return 0 when contrast is below 70% of required", () => {
        // 16px/400 requires 90 contrast, 70% = 63
        // Contrast of 50 is below 63
        const rating = getAPCARating(50, "16px", "400", apcaLookup);

        expect(rating).toBe(0);
      });

      it("should return 1 when contrast is between 70% and 100% of required", () => {
        // 16px/400 requires 90 contrast
        // 70% = 63, contrast of 70 is between 63 and 90
        const rating = getAPCARating(70, "16px", "400", apcaLookup);

        expect(rating).toBe(1);
      });

      it("should return 2 when contrast is between 100% and 130% of required", () => {
        // 16px/400 requires 90 contrast
        // 95 is between 90 and 117 (130% of 90)
        const rating = getAPCARating(95, "16px", "400", apcaLookup);

        expect(rating).toBe(2);
      });

      it("should return 3 when contrast exceeds 130% of required", () => {
        // 16px/400 requires 90 contrast
        // 130% = 117, contrast of 120 exceeds this
        const rating = getAPCARating(120, "16px", "400", apcaLookup);

        expect(rating).toBe(3);
      });

    });

    describe("handling of negative contrast values", () => {

      it("should use absolute value for negative contrast", () => {
        // Negative contrast should be treated the same as positive
        const positiveRating = getAPCARating(100, "16px", "400", apcaLookup);
        const negativeRating = getAPCARating(-100, "16px", "400", apcaLookup);

        expect(negativeRating).toBe(positiveRating);
      });

      it("should return 0 for negative contrast below threshold", () => {
        const rating = getAPCARating(-50, "16px", "400", apcaLookup);

        expect(rating).toBe(0);
      });

      it("should return 3 for high negative contrast", () => {
        const rating = getAPCARating(-120, "16px", "400", apcaLookup);

        expect(rating).toBe(3);
      });

    });

    describe("the row", () => {

      it("should read the row of the key it is handed", () => {
        // 16px asks for 90; the next larger row, 18px, asks for 75. Lc 80
        // stays below its own row and clears the larger one, so this fails
        // if the lookup ever reads a neighbouring row again. Snapping a
        // number of pixels to a key is fontSizeKeyFrom()'s job, and the
        // parameter type keeps a raw number out of here.
        const rating = getAPCARating(80, "16px", "400", apcaLookup);

        expect(rating).toBe(1);
      });

    });

    describe("font weight variations", () => {

      it("should return different ratings for different weights at same size", () => {
        // 16px/400 requires 90 contrast (with bold requirement)
        // 16px/700 requires 60 contrast
        const contrast = 65;

        const rating400 = getAPCARating(contrast, "16px", "400", apcaLookup);
        const rating700 = getAPCARating(contrast, "16px", "700", apcaLookup);

        // 65 is below 70% of 90 (63) so rating400 should be higher than expected
        // Actually 65 > 63, so rating400 = 1
        // 65 > 60 * 1.0 and < 60 * 1.3 = 78, so rating700 = 2
        expect(rating400).toBe(1);
        expect(rating700).toBe(2);
      });

      it("should handle weight 100 which often has null contrast", () => {
        // Weight 100 at most sizes has null contrast
        const rating = getAPCARating(100, "16px", "100", apcaLookup);

        expect(rating).toBe(0);
      });

      it("should handle weight 900 appropriately", () => {
        // 18px/900 requires 55 contrast
        const rating = getAPCARating(60, "18px", "900", apcaLookup);

        // 60 > 55 and < 71.5 (130% of 55)
        expect(rating).toBe(2);
      });

    });

    describe("edge cases", () => {

      it("should return 0 for zero contrast", () => {
        const rating = getAPCARating(0, "16px", "400", apcaLookup);

        expect(rating).toBe(0);
      });

      it("should handle maximum possible APCA contrast (~106)", () => {
        // Maximum APCA contrast is around 106
        const rating = getAPCARating(106, "96px", "400", apcaLookup);

        // 96px/400 requires 33 contrast, 106 far exceeds 130% of 33
        expect(rating).toBe(3);
      });

      it("should handle exact threshold boundaries", () => {
        // 24px/400 requires 60 contrast, so the 70% boundary sits at 42.
        const ratingAt43 = getAPCARating(43, "24px", "400", apcaLookup);
        const ratingAt41 = getAPCARating(41, "24px", "400", apcaLookup);

        expect(ratingAt43).toBe(1);
        expect(ratingAt41).toBe(0);
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

        const rating = getAPCARating(55, "16px", "400", customLookup);

        // 55 > 50 and < 65 (130% of 50)
        expect(rating).toBe(2);
      });

    });

    describe("type safety", () => {

      it("should return APCARating type (0, 1, 2, or 3)", () => {
        const ratings: APCARating[] = [
          getAPCARating(10, "16px", "400", apcaLookup),
          getAPCARating(70, "16px", "400", apcaLookup),
          getAPCARating(100, "16px", "400", apcaLookup),
          getAPCARating(120, "16px", "400", apcaLookup)
        ];

        ratings.forEach(rating => {
          expect([0, 1, 2, 3]).toContain(rating);
        });
      });

    });

    describe("common use cases", () => {

      it("should rate black text on white background as good for body text", () => {
        // Black on white reaches an APCA contrast of about 106. 16px/400
        // requires 90, and 106 stays below 130% of that.
        const rating = getAPCARating(106, "16px", "400", apcaLookup);

        expect(rating).toBe(2);
      });

      it("should not offer rating 3 for body text at all", () => {
        // 130% of the 90 that 16px/400 requires is 117, above the maximum
        // APCA contrast any pair can reach. A rating of 3 is therefore
        // unreachable at body size, and an expectation of 3 there is a
        // symptom of the size lookup reading the next larger row.
        const rating = getAPCARating(NEGATIVE_MAX_APCA_CONTRAST, "16px", "400", apcaLookup);

        expect(90 * 1.3).toBeGreaterThan(NEGATIVE_MAX_APCA_CONTRAST);
        expect(rating).toBe(2);
      });

      it("should rate low contrast text as not readable", () => {
        // Light gray on white might have contrast around 30
        const rating = getAPCARating(30, "16px", "400", apcaLookup);

        expect(rating).toBe(0);
      });

      it("should be more lenient for large headings", () => {
        // 48px text has lower contrast requirements
        // 48px/400 requires 40 contrast
        const contrastValue = 45;

        const smallTextRating = getAPCARating(contrastValue, "16px", "400", apcaLookup);
        const largeTextRating = getAPCARating(contrastValue, "48px", "400", apcaLookup);

        // Same contrast should rate better for large text
        expect(largeTextRating).toBeGreaterThan(smallTextRating);
      });

    });

  });


  describe("getRequiredLc", () => {

    it("should read the row of every key of the table", () => {
      // The one statement the rating rests on: a key is answered from its
      // own row, not from a neighbour. Every size but the last would come
      // back too lenient if the lookup skipped ahead.
      const wrongRows = FONT_SIZES.flatMap(size => FONT_WEIGHTS
        .filter(weight =>
          getRequiredLc(size, weight, apcaLookup)
          !== apcaLookup[size][weight].contrast)
        .map(weight => `${size}/${weight}`));

      expect(wrongRows).toEqual([]);
    });

    it("should agree with meetsAPCARequirement for every size and weight", () => {
      // The two answer the same question through different code: this one
      // rates against the row's requirement, meetsAPCARequirement() reads
      // the row itself. A pair that satisfies one has to satisfy the other,
      // or check_contrast hands an assistant a rating and a verdict that
      // contradict each other.
      const greys = Array.from({length: 64}, (_, step) => step * 4);
      const pairs = greys.flatMap(grey => {
        const text = `rgb(${grey}, ${grey}, ${grey})`;

        return [
          {text, background: "#ffffff"},
          {text, background: "#000000"}
        ];
      });

      const disagreements = FONT_SIZES.flatMap(size => FONT_WEIGHTS
        .flatMap(weight => pairs
          .filter(({text, background}) => {
            const lc = calculateAPCAContrast(text, background);
            const rating = getAPCARating(lc, size, weight, apcaLookup);

            return meetsAPCARequirement(text, background, size, weight)
              !== (rating >= 2);
          })
          .map(({text, background}) => `${size}/${weight} ${text} on ${background}`)));

      expect(disagreements).toEqual([]);
    });

    it("should report no requirement where the table has none", () => {
      // Not a missing value: at 12px, and at the thin weights above it, no
      // text is readable whatever the colors are.
      expect(getRequiredLc("12px", "400", apcaLookup)).toBeNull();
      expect(getRequiredLc("16px", "100", apcaLookup)).toBeNull();
    });

  });


  describe("findClosestSizeKey", () => {

    it("should return a size that is a key of the table unchanged", () => {
      expect(findClosestSizeKey(16, FONT_SIZES)).toBe("16px");
    });

    it("should snap against the app's own table by default", () => {
      expect(findClosestSizeKey(17)).toBe(findClosestSizeKey(17, FONT_SIZES));
    });

    it("should round a size between two keys up to the larger one", () => {
      // Conservative on purpose: the larger row asks for less contrast, so
      // rounding down would rate a pair better than the text deserves.
      expect(findClosestSizeKey(17, FONT_SIZES)).toBe("18px");
    });

    it("should clamp a size outside the table to its ends", () => {
      expect(findClosestSizeKey(4, FONT_SIZES)).toBe("12px");
      expect(findClosestSizeKey(400, FONT_SIZES)).toBe("96px");
    });

    it("should reject an empty list of sizes", () => {
      expect(() => findClosestSizeKey(16, [])).toThrow();
    });

    it("should reject a size that is not a finite number", () => {
      // NaN compares false against both ends, so without the guard the
      // search finds no row and answers with the key "undefinedpx".
      expect(() => findClosestSizeKey(NaN)).toThrow();
      expect(() => findClosestSizeKey(Infinity)).toThrow();
    });

  });


  describe("getAPCAPolarity", () => {

    it("should call a positive contrast dark text on a light background", () => {
      expect(getAPCAPolarity(106)).toBe("dark-on-light");
    });

    it("should call a negative contrast light text on a dark background", () => {
      expect(getAPCAPolarity(-108)).toBe("light-on-dark");
    });

    it("should call two identical colors dark on light", () => {
      // There is no polarity at zero, and inventing a third word for it
      // would make every caller handle a case that says nothing.
      expect(getAPCAPolarity(0)).toBe("dark-on-light");
    });

  });


  describe("getAPCARatingLabel", () => {

    it("should name every rating the scale offers", () => {
      const labels = ([0, 1, 2, 3] as APCARating[]).map(getAPCARatingLabel);

      expect(labels).toEqual([...APCA_RATING_LABELS]);
    });

    it("should say that the lowest rating is not readable", () => {
      // The wording is what an assistant quotes, so it is part of the
      // contract rather than an implementation detail.
      expect(getAPCARatingLabel(0)).toBe("Not readable");
    });

  });

});
