import {describe, expect, it} from "vitest";
import chroma, {Color} from "chroma-js";
import {findOptimalTextColor} from "@contrast/helper/optimal-text-color.helper";
import {expectApcaForeground, rgbCube} from "@testing/apca-foreground.expectation";


// Every screen that puts chrome on a visitor color leans on this expectation,
// so it is worth its own negative tests: one that always passed would turn the
// rule green without checking anything.
describe("expectApcaForeground", () => {

  function fromApca(background: Color): string {
    return findOptimalTextColor(background, {fontSize: "16px", fontWeight: "600"})
      .color.hex("rgb");
  }


  it("passes for a foreground the app's own APCA calculation picked", async () => {
    await expectApcaForeground(background => fromApca(background));
  });


  it("reads the foreground in any spelling chroma takes", async () => {
    await expectApcaForeground(background => chroma(fromApca(background)).css());
  });


  it("rejects a foreground that ignores the color underneath", async () => {
    await expect(expectApcaForeground(() => "#000000", {step: 85}))
      .rejects.toThrowError(/foreground on #/);
  });


  it("names the color when the chrome sets no foreground at all", async () => {
    // The token case: a component styling its label `text-text` leaves the
    // inline color empty, and the failure has to say so rather than throwing
    // out of chroma.
    await expect(expectApcaForeground(() => "", {step: 85}))
      .rejects.toThrowError(/is none of the candidates/);
  });


  it("sweeps the cube in a fixed order, so a failure names the same color twice", () => {
    const first = [...rgbCube(85)].map(color => color.hex("rgb"));
    const second = [...rgbCube(85)].map(color => color.hex("rgb"));

    expect(first).toEqual(second);
    expect(first).toHaveLength(64);
    expect(first[0]).toBe("#000000");
    expect(first.at(-1)).toBe("#ffffff");
  });

});
