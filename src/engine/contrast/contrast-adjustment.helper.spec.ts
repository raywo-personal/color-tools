import chroma from "chroma-js";

import {fromOklch} from "@engine/color/color-from-oklch.helper";
import {AdjustableColor, adjustColorForContrast} from "./contrast-adjustment.helper";
import {calculateAPCAContrast, getAPCAPolarity} from "./apca-rating.helper";


/** The walk's own step; a move may overshoot a finer walk's by this much. */
const WALK_STEP = 0.005;

/**
 * The smallest passing move in one direction, found by a walk ten times finer
 * than the helper's. It pins which direction wins without the spec knowing how
 * the helper walks.
 */
function firstPassingMove(textColor: string,
                          bgColor: string,
                          adjustable: AdjustableColor,
                          requiredLc: number,
                          direction: 1 | -1): number | null {
  const original = chroma(adjustable === "text" ? textColor : bgColor);
  const [lightness, chromacity, hue] = original.oklch();

  for (let step = 1; ; step++) {
    const target = Math.min(1, Math.max(0, lightness + direction * step * WALK_STEP / 10));
    const candidate = chroma(fromOklch({l: target, c: chromacity, h: hue}).hex());
    const lc = adjustable === "text"
      ? calculateAPCAContrast(candidate, bgColor)
      : calculateAPCAContrast(textColor, candidate);

    if (Math.abs(lc) >= requiredLc) return Math.abs(candidate.oklch()[0] - lightness);
    if (target === 0 || target === 1) return null;
  }
}

/** The angle between two hues, in degrees, across the 0/360 seam. */
function hueDistance(a: number, b: number): number {
  return Math.abs(((a - b + 540) % 360) - 180);
}


describe("adjustColorForContrast", () => {

  describe("a pair that already passes", () => {

    it("should come back unmoved", () => {
      const result = adjustColorForContrast("#000000", "#ffffff", "background", 90);

      expect(result.color.hex()).toBe("#ffffff");
      expect(result.lightnessDelta).toBe(0);
      expect(result.meetsRequirement).toBe(true);
      expect(result.chroma).toBe(result.originalChroma);
    });

  });


  describe("a pair a lightness can fix", () => {

    it("should pass on the hex it hands out", () => {
      // The figure a caller checks is the pasted hex, not the fractional
      // color OKLch produced on the way.
      const result = adjustColorForContrast("#ffffff", "#3b6ea5", "background", 90);

      expect(result.meetsRequirement).toBe(true);
      expect(Math.abs(calculateAPCAContrast("#ffffff", result.color.hex()))).toBeGreaterThanOrEqual(90);
    });

    it("should hand out an 8-bit color", () => {
      const result = adjustColorForContrast("#000000", "#3b6ea5", "background", 90);

      expect(result.color.rgb(false).every(Number.isInteger)).toBe(true);
    });

    it("should keep the moved color's hue", () => {
      const original = chroma("#3b6ea5");
      const background = adjustColorForContrast("#000000", "#3b6ea5", "background", 90);
      const text = adjustColorForContrast("#3b6ea5", "#ffffff", "text", 90);

      expect(hueDistance(background.color.oklch()[2], original.oklch()[2])).toBeLessThan(3);
      expect(hueDistance(text.color.oklch()[2], original.oklch()[2])).toBeLessThan(3);
    });

    it("should keep a gray a gray", () => {
      const [r, g, b] = adjustColorForContrast("#000000", "#777777", "background", 75).color.rgb();

      expect(r).toBe(g);
      expect(g).toBe(b);
    });

    it("should keep the chroma on a short move", () => {
      // The walk asks for the original chroma at every lightness; a share of
      // it, or the chroma of the step before, would dull even a short move.
      const result = adjustColorForContrast("#999999", "#7a5a9a", "background", 30);

      expect(result.chroma).toBeCloseTo(result.originalChroma, 2);
    });

    it("should measure the pair with the other color held", () => {
      const background = adjustColorForContrast("#ffffff", "#3b6ea5", "background", 90);
      const text = adjustColorForContrast("#3b6ea5", "#ffffff", "text", 90);

      expect(background.actualLc).toBe(calculateAPCAContrast("#ffffff", background.color));
      expect(text.actualLc).toBe(calculateAPCAContrast(text.color, "#ffffff"));
    });

    it("should sign the move by the direction it went", () => {
      const lighter = adjustColorForContrast("#000000", "#3b6ea5", "background", 90);
      const darker = adjustColorForContrast("#3b6ea5", "#ffffff", "text", 90);

      expect(lighter.lightnessDelta).toBeGreaterThan(0);
      expect(darker.lightnessDelta).toBeLessThan(0);
    });

  });


  describe("the smaller of two moves", () => {

    it.each([
      ["darkening", "#999999", "#7a5a9a", 30],
      ["lightening", "#777777", "#808080", 30]
    ] as const)("should win where %s is the shorter way", (_way, textColor, bgColor, requiredLc) => {
      const up = firstPassingMove(textColor, bgColor, "background", requiredLc, 1);
      const down = firstPassingMove(textColor, bgColor, "background", requiredLc, -1);

      // Both directions have to pass, or the case tests nothing.
      expect(up).not.toBeNull();
      expect(down).not.toBeNull();

      const result = adjustColorForContrast(textColor, bgColor, "background", requiredLc);
      const shorter = Math.min(up!, down!);

      expect(Math.abs(result.lightnessDelta)).toBeLessThanOrEqual(shorter + WALK_STEP);
      expect(Math.sign(result.lightnessDelta)).toBe(up! < down! ? 1 : -1);
    });

    it("should cross the color held where that is the shorter way", () => {
      const original = calculateAPCAContrast("#999999", "#5f8f5f");
      const result = adjustColorForContrast("#999999", "#5f8f5f", "background", 45);

      expect(result.meetsRequirement).toBe(true);
      expect(result.lcPolarity).not.toBe(getAPCAPolarity(original));
      expect(result.lcPolarity).toBe(getAPCAPolarity(result.actualLc));
    });

  });


  describe("a requirement no lightness meets", () => {

    it("should answer with the pole that comes closest", () => {
      const whiteLc = calculateAPCAContrast("#808080", "#ffffff");
      const blackLc = calculateAPCAContrast("#808080", "#000000");
      const result = adjustColorForContrast("#808080", "#3b6ea5", "background", 90);

      expect(result.meetsRequirement).toBe(false);
      expect(["#000000", "#ffffff"]).toContain(result.color.hex());
      expect(Math.abs(result.actualLc)).toBe(Math.max(Math.abs(whiteLc), Math.abs(blackLc)));
    });

    it("should leave a color that already is the closest pole where it is", () => {
      const result = adjustColorForContrast("#777777", "#ffffff", "background", 90);

      expect(result.meetsRequirement).toBe(false);
      expect(result.color.hex()).toBe("#ffffff");
      expect(result.lightnessDelta).toBe(0);
    });

  });

});
