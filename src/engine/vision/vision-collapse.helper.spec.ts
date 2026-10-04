import chroma from "chroma-js";
import {describe, expect, it} from "vitest";
import {COLLAPSE_DISTANCE, collapsedGroups} from "@engine/vision/vision-collapse.helper";
import {simulateVision} from "@engine/vision/simulate-vision.helper";


describe("collapsedGroups", () => {

  it("finds nothing under normal vision", () => {
    const palette = [
      chroma.oklch(0.6, 0.15, 20),
      chroma.oklch(0.6, 0.15, 140),
      chroma.oklch(0.6, 0.15, 260)
    ];

    expect(collapsedGroups(palette, "normal")).toEqual([]);
  });


  it("names the members a deficiency can no longer tell apart", () => {
    // A red and a teal, a quarter of the Oklab space apart in normal vision
    // and on one deutan confusion line. This is the finding the block exists
    // for, in its plainest form.
    const palette = [
      chroma.oklch(0.62, 0.12, 0),
      chroma.oklch(0.62, 0.12, 170),
      chroma.oklch(0.62, 0.12, 250)
    ];

    expect(chroma.distance(palette[0], palette[1], "oklab"))
      .toBeGreaterThan(10 * COLLAPSE_DISTANCE);

    expect(collapsedGroups(palette, "deuteranopia")).toEqual([[0, 1]]);
  });


  it("keeps quiet about a band normal vision already showed as one", () => {
    // Three lightness steps, each within the distance of the next and the
    // outer two further apart than it. Under normal vision that is one band
    // already, so no model can be said to have cost it.
    const band = [
      chroma.oklch(0.60, 0.02, 250),
      chroma.oklch(0.61, 0.02, 250),
      chroma.oklch(0.62, 0.02, 250)
    ];

    expect(chroma.distance(band[0], band[2], "oklab")).toBeGreaterThan(COLLAPSE_DISTANCE);
    expect(collapsedGroups(band, "normal")).toEqual([]);
    expect(collapsedGroups(band, "achromatopsia")).toEqual([]);
  });


  it("keeps quiet about members that already looked alike", () => {
    const nearlyTheSame = [chroma("#3366CC"), chroma("#3466CB")];

    expect(chroma.distance(nearlyTheSame[0], nearlyTheSame[1], "oklab"))
      .toBeLessThan(COLLAPSE_DISTANCE);
    // They collapse under every model, but the model is not what cost the
    // difference - there was none to lose.
    expect(collapsedGroups(nearlyTheSame, "deuteranopia")).toEqual([]);
    expect(collapsedGroups(nearlyTheSame, "achromatopsia")).toEqual([]);
  });


  it("reports three that land on one as a single group", () => {
    // Achromatopsia keeps luminance alone, so three hues of one lightness
    // arrive as one grey.
    const sameLightness = [
      chroma.oklch(0.6, 0.1, 30),
      chroma.oklch(0.6, 0.1, 150),
      chroma.oklch(0.6, 0.1, 270)
    ];

    expect(collapsedGroups(sameLightness, "achromatopsia")).toEqual([[0, 1, 2]]);
  });


  it("returns each group sorted and in the order of its first member", () => {
    const palette = [
      chroma.oklch(0.35, 0.1, 30),
      chroma.oklch(0.75, 0.1, 30),
      chroma.oklch(0.35, 0.1, 210),
      chroma.oklch(0.75, 0.1, 210)
    ];

    for (const group of collapsedGroups(palette, "achromatopsia")) {
      expect([...group].sort((a, b) => a - b)).toEqual(group);
    }
  });


  it("agrees with the distance it is defined by", () => {
    const palette = [
      chroma.oklch(0.62, 0.12, 0),
      chroma.oklch(0.62, 0.12, 170),
      chroma.oklch(0.62, 0.12, 250)
    ];

    for (const group of collapsedGroups(palette, "deuteranopia")) {
      const simulated = group.map(index => simulateVision(palette[index], "deuteranopia"));

      // Every member sits within the distance of at least one other, which is
      // what makes the group one block on screen.
      for (let i = 0; i < simulated.length; i++) {
        const closest = simulated
          .filter((_, other) => other !== i)
          .map(other => chroma.distance(simulated[i], other, "oklab"));

        expect(Math.min(...closest)).toBeLessThan(COLLAPSE_DISTANCE);
      }
    }
  });

});
