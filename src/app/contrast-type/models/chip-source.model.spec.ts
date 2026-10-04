import {describe, expect, it} from "vitest";
import chroma from "chroma-js";
import {createContrastColors} from "@engine/contrast/contrast-colors.model";
import {PALETTE_SLOTS} from "@engine/palette/palette.model";
import {generatePaletteFrom} from "@engine/palette/palette.helper";
import {
  CHIP_SOURCES,
  chipLabelFor,
  chipSourceName,
  colorOf,
  isPairSource
} from "@contrast-type/models/chip-source.model";


const PAIR = createContrastColors(chroma("#111111"), chroma("#EEEEEE"));
const PALETTE = generatePaletteFrom(chroma("#3366CC"), "triadic", 1);


describe("chip sources", () => {

  it("holds the palette's five and then the pair's own two", () => {
    // The order is the row's, and the chooser on an element's mark walks the
    // same one - the pair comes last so its two chips stand under the two
    // fields that set them.
    expect(CHIP_SOURCES).toEqual([...PALETTE_SLOTS, "text", "background"]);
  });


  it("labels the palette by position and the pair by its two fields' initials", () => {
    // `BG`, not the draft's `G`: "ground" is a word this app never uses, so
    // the letter explained itself nowhere - `chipLabelFor()` says the rest.
    expect(CHIP_SOURCES.map(chipLabelFor)).toEqual(["P1", "P2", "P3", "P4", "P5", "T", "BG"]);
  });


  it("spells the two letters out, because a letter is not a name", () => {
    // A screen reader speaks `T` and `BG` as letters. The palette's five need
    // no gloss: `P3` is a position and reads as one.
    expect(chipSourceName("text")).toBe("the text color");
    expect(chipSourceName("background")).toBe("the background");

    for (const slot of PALETTE_SLOTS) expect(chipSourceName(slot)).toBeNull();
  });


  it("reads a slot off the palette and a pair half off the pair", () => {
    // The one place a source is resolved, which is what makes a placement
    // follow whichever of the two moves.
    expect(colorOf("color2", PAIR, PALETTE)).toBe(PALETTE.color2.color);
    expect(colorOf("text", PAIR, PALETTE)).toBe(PAIR.text);
    expect(colorOf("background", PAIR, PALETTE)).toBe(PAIR.background);
  });


  it("tells a pair half from a slot", () => {
    expect(CHIP_SOURCES.filter(isPairSource)).toEqual(["text", "background"]);
  });

});
