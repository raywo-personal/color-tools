import {describe, expect, it} from "vitest";
import {fontSizeKeyFrom} from "@engine/helpers/font-size.helper";
import {FONT_SIZES} from "@engine/contrast/apca-lookup-table.model";


describe("fontSizeKeyFrom", () => {

  it("returns a size that is a key of the table as that key", () => {
    expect(fontSizeKeyFrom(16)).toBe("16px");
    expect(fontSizeKeyFrom("16px")).toBe("16px");
  });

  it("reads the number out of a CSS pixel string", () => {
    // The MCP tools take '17px', the components take 17; both have to
    // land on the same row or the two would rate one pair differently.
    expect(fontSizeKeyFrom("17px")).toBe(fontSizeKeyFrom(17));
  });

  it("rounds a size between two keys up to the larger one", () => {
    // Conservative on purpose: the larger row asks for less contrast, so
    // rounding down would rate a pair better than the text deserves.
    expect(fontSizeKeyFrom(17)).toBe("18px");
    expect(fontSizeKeyFrom("17px")).toBe("18px");
  });

  it("reads a fractional pixel size and rounds it up like any other", () => {
    // An assistant converting from rem lands on 16.5px now and then; a
    // pattern that only knew integers refused the call.
    expect(fontSizeKeyFrom("16.5px")).toBe("18px");
    expect(fontSizeKeyFrom("16.0px")).toBe("16px");
    expect(fontSizeKeyFrom("16.5px")).toBe(fontSizeKeyFrom(16.5));
  });

  it("clamps a size outside the table to its ends", () => {
    expect(fontSizeKeyFrom(4)).toBe(FONT_SIZES[0]);
    expect(fontSizeKeyFrom("400px")).toBe(FONT_SIZES[FONT_SIZES.length - 1]);
  });

  it("throws where no number of pixels can be read", () => {
    // A unit other than px would parse to a number and be taken for
    // pixels; no number at all would snap to an impossible key. Neither
    // is a font size, so neither gets a row.
    expect(() => fontSizeKeyFrom("1rem")).toThrow();
    expect(() => fontSizeKeyFrom("rem")).toThrow();
    expect(() => fontSizeKeyFrom(".5px")).toThrow();
    expect(() => fontSizeKeyFrom("16.px")).toThrow();
    expect(() => fontSizeKeyFrom("")).toThrow();
    expect(() => fontSizeKeyFrom(NaN)).toThrow();
  });

  it("always answers with a key of the table", () => {
    for (let size = 1; size <= 120; size++) {
      expect(FONT_SIZES, `${size}px`).toContain(fontSizeKeyFrom(size));
    }
  });

});
