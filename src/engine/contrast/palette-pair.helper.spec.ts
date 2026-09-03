import {describe, expect, it} from "vitest";
import chroma, {Color} from "chroma-js";
import {generatePaletteFrom} from "@engine/palette/palette.helper";
import {Palette, PALETTE_SLOTS} from "@engine/palette/palette.model";
import {paletteColorFrom} from "@engine/palette/palette-color.model";
import {contrastPairFromPalette, mostReadablePair} from "@engine/contrast/palette-pair.helper";


function colors(...hexes: string[]): Color[] {
  return hexes.map(hex => chroma(hex));
}


describe("mostReadablePair", () => {

  it("has nothing to choose from below two colors", () => {
    expect(mostReadablePair([])).toBeNull();
    expect(mostReadablePair(colors("#3366CC"))).toBeNull();
  });


  it("has nothing to choose from where every color is the same", () => {
    // A palette can collapse: `maxChroma()` is 0 at a lightness of 0 and 1, so
    // a pure black or white base gives every member the same color. A pair of
    // one color twice is invisible text on a blank page.
    expect(mostReadablePair(colors("#000000", "#000000", "#000000"))).toBeNull();
  });


  it("counts colors as one where they round to the same three bytes", () => {
    // 8-bit RGB is what the contrast id carries and what the preview renders,
    // so two members that paint alike are one color for a pair.
    const almostBlack = chroma("#000000").set("oklch.l", 0.001);

    expect(almostBlack.hex("rgb")).toBe("#000000");
    expect(mostReadablePair([chroma("#000000"), almostBlack])).toBeNull();
  });


  it("puts the lighter color on the ground", () => {
    const pair = mostReadablePair(colors("#111111", "#EEEEEE"));

    expect(pair?.background.hex("rgb")).toBe("#eeeeee");
    expect(pair?.text.hex("rgb")).toBe("#111111");
  });


  it("takes the two that separate furthest, not the first that reads", () => {
    const pair = mostReadablePair(colors("#767676", "#000000", "#8A8A8A", "#FFFFFF"));

    expect(pair?.text.hex("rgb")).toBe("#000000");
    expect(pair?.background.hex("rgb")).toBe("#ffffff");
  });


  it("measures a candidate in the orientation it hands back", () => {
    // APCA is not symmetric: #9D3A06 on #E3E053 is Lc 61.6, the same two the
    // other way round Lc -64.6. Measuring one order and returning the other
    // picks a pair by a number the rating never shows - and lets a pair that
    // only wins in the reverse polarity beat the one that is handed over.
    const one = "#E3E053";
    const other = "#9D3A06";

    expect(Math.abs(chroma.contrastAPCA(one, other)))
      .toBeGreaterThan(Math.abs(chroma.contrastAPCA(other, one)));

    const pair = mostReadablePair(colors(one, other));

    // The ground is still the lighter one, so the Lc that came out of the
    // search is the one the pair actually has.
    expect(pair?.background.hex("rgb")).toBe("#e3e053");
    expect(pair?.text.hex("rgb")).toBe("#9d3a06");
  });


  it("gives the same answer whatever order the colors arrive in", () => {
    const forwards = mostReadablePair(colors("#111111", "#8A8A8A", "#EEEEEE"));
    const backwards = mostReadablePair(colors("#EEEEEE", "#8A8A8A", "#111111"));

    expect(forwards?.text.hex("rgb")).toBe(backwards?.text.hex("rgb"));
    expect(forwards?.background.hex("rgb")).toBe(backwards?.background.hex("rgb"));
  });

});


describe("contrastPairFromPalette", () => {

  it("takes both halves out of the palette and recomputes the Lc", () => {
    const palette = generatePaletteFrom(chroma("#3366CC"), "complementary", 11);
    const members = PALETTE_SLOTS.map(slot => palette[slot].color.hex("rgb"));

    const pair = contrastPairFromPalette(palette);

    expect(members).toContain(pair.text.hex("rgb"));
    expect(members).toContain(pair.background.hex("rgb"));

    // Through `createContrastColors()` like every other change to the pair, so
    // the id is encoded and the Lc is the pair's own.
    expect(pair.contrast).toBeCloseTo(chroma.contrastAPCA(pair.text, pair.background), 6);
    expect(pair.id).not.toBe("");
  });


  it("still answers with a pair where the palette has collapsed to one color", () => {
    // Both extremes are reachable: a pure black or white base arrives as a
    // pinned color0 from the converter. Returning that color twice would be a
    // blank page, which reads as a broken app rather than as a bad palette.
    const black = chroma("#000000");
    const collapsed: Palette = {
      ...generatePaletteFrom(black, "monochromatic", 7),
      color0: paletteColorFrom(black, "color0"),
      color1: paletteColorFrom(black, "color1"),
      color2: paletteColorFrom(black, "color2"),
      color3: paletteColorFrom(black, "color3"),
      color4: paletteColorFrom(black, "color4")
    };

    const pair = contrastPairFromPalette(collapsed);

    expect(pair.background.hex("rgb")).toBe("#000000");
    expect(Math.abs(pair.contrast)).toBeGreaterThan(0);
  });

});
