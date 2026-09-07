import {describe, expect, it} from "vitest";
import chroma, {Color} from "chroma-js";
import {Palette, PALETTE_SLOTS} from "@engine/palette/palette.model";
import {paletteColorFrom} from "@engine/palette/palette-color.model";
import {generatePaletteFrom} from "@engine/palette/palette.helper";
import {nearestPassingPaletteColor} from "@engine/contrast/passing-palette-color.helper";


/** A palette of five given colors, so a case names its own members. */
function paletteOf(...hexes: readonly string[]): Palette {
  const colors = hexes.map(hex => chroma(hex));
  const members = Object.fromEntries(
    PALETTE_SLOTS.map((slot, index) => [slot, paletteColorFrom(colors[index], slot)])
  );

  return {...generatePaletteFrom(colors[0], "random", 3), ...members} as Palette;
}


function lcAgainst(ground: string): (color: Color) => number {
  return color => Math.abs(chroma.contrastAPCA(color, ground));
}


describe("nearestPassingPaletteColor", () => {

  it("has nothing to suggest where the table asks for nothing", () => {
    // A size APCA declines to rate has no bar, so there is no colour that
    // would clear it - a suggestion here would sit under a verdict that never
    // said anything failed.
    const palette = paletteOf("#000000", "#111111", "#222222", "#333333", "#444444");

    expect(nearestPassingPaletteColor(chroma("#888888"), chroma("#ffffff"), null, palette))
      .toBeNull();
  });


  it("has nothing to suggest where no member clears the requirement", () => {
    const palette = paletteOf("#f0f0f0", "#eeeeee", "#ececec", "#eaeaea", "#e8e8e8");

    expect(nearestPassingPaletteColor(chroma("#f4f4f4"), chroma("#ffffff"), 60, palette))
      .toBeNull();
  });


  it("takes the passing member nearest the ink, not the strongest one", () => {
    // #6E6E6E fails on white; #3A5FA8 and #000000 both carry it. Black is the
    // stronger of the two by a wide margin and the further from the ink - a
    // suggestion that abandons the hue being tried rather than saving it.
    const palette = paletteOf("#000000", "#3A5FA8", "#f5f5f5", "#fafafa", "#ffffff");
    const lc = lcAgainst("#ffffff");

    expect(lc(chroma("#000000"))).toBeGreaterThan(lc(chroma("#3A5FA8")));

    const nearest = nearestPassingPaletteColor(chroma("#6E6E6E"), chroma("#ffffff"), 60, palette);

    expect(nearest?.slot).toBe("color1");
    expect(nearest?.color.hex("rgb")).toBe("#3a5fa8");
  });


  it("reports the contrast it measured against the ground", () => {
    const palette = paletteOf("#123456", "#ffffff", "#fefefe", "#fdfdfd", "#fcfcfc");

    const nearest = nearestPassingPaletteColor(chroma("#999999"), chroma("#ffffff"), 45, palette);

    expect(nearest?.contrast)
      .toBeCloseTo(Math.abs(chroma.contrastAPCA("#123456", "#ffffff")), 6);
  });


  it("answers the same way twice where two members sit at the same distance", () => {
    // A generator that mirrors a hue leaves two members equally far from the
    // ink. Slot order decides, so the same palette does not suggest a
    // different colour on the next render.
    const ink = chroma("#808080");
    const palette = paletteOf("#ffffff", "#606060", "#a0a0a0", "#fefefe", "#fdfdfd");

    expect(chroma.distance(chroma("#606060"), ink, "oklab"))
      .toBeCloseTo(chroma.distance(chroma("#a0a0a0"), ink, "oklab"), 1);

    const first = nearestPassingPaletteColor(ink, chroma("#ffffff"), 30, palette);
    const second = nearestPassingPaletteColor(ink, chroma("#ffffff"), 30, palette);

    expect(first?.slot).toBe(second?.slot);
  });

});
