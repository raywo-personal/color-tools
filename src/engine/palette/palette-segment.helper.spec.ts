import {describe, expect, it} from "vitest";
import chroma from "chroma-js";
import {
  isRestorablePaletteSegment,
  PALETTE_SEED_BASE62_LENGTH,
  PALETTE_SEED_LIMIT,
  PALETTE_SEGMENT_LENGTH,
  paletteFromSegment,
  paletteSegmentFrom
} from "./palette-segment.helper";
import {PALETTE_ID_BASE62_LENGTH} from "@engine/palette/palette-id.helper";
import {bigIntToBase62} from "@engine/helpers/base62.helper";
import {isWellFormedId} from "@engine/helpers/validate-string-id.helper";
import {generatePaletteFrom} from "@engine/palette/palette.helper";
import {PALETTE_SLOTS} from "@engine/palette/palette.model";
import {paletteColorFrom} from "@engine/palette/palette-color.model";


describe("Palette segment helper", () => {

  const palette = generatePaletteFrom(chroma("#3366cc"), "triadic", 11);


  /** A well-formed segment on `palette` whose seed characters spell the value. */
  function segmentWithSeed(value: bigint): string {
    return palette.id + bigIntToBase62(value, PALETTE_SEED_BASE62_LENGTH);
  }


  describe("round trip", () => {

    it("is the palette id followed by the seed, at a fixed length", () => {
      const segment = paletteSegmentFrom(palette, 0);

      expect(segment).toHaveLength(PALETTE_SEGMENT_LENGTH);
      expect(segment.startsWith(palette.id)).toBe(true);
    });

    it("brings the palette back with the seed it was written with", () => {
      const restored = paletteFromSegment(paletteSegmentFrom(palette, 11));

      expect(restored.seed).toBe(11);
      expect(restored.palette.id).toBe(palette.id);
      expect(restored.palette.style).toBe("triadic");
    });

    it("keeps starting colors and pins, so the receiver can keep working", () => {
      const pinned = generatePaletteFrom(chroma("#3366cc"), "analogous", 7, {
        color3: paletteColorFrom(chroma("#ff5733"), "color3", chroma("#123456"), true)
      });

      const {palette: restored} = paletteFromSegment(paletteSegmentFrom(pinned, 7));

      PALETTE_SLOTS.forEach(slot => {
        expect(restored[slot].startingColor.hex("rgb")).toBe(pinned[slot].startingColor.hex("rgb"));
        expect(restored[slot].isPinned).toBe(pinned[slot].isPinned);
      });
    });

    it("carries the smallest and the largest seed a roll can draw", () => {
      const largest = Number(PALETTE_SEED_LIMIT - 1n);

      expect(paletteFromSegment(paletteSegmentFrom(palette, 0)).seed).toBe(0);
      expect(paletteFromSegment(paletteSegmentFrom(palette, largest)).seed).toBe(largest);
    });

    it("writes the id from the palette's style, not from the id it carries", () => {
      // A palette restored from an unknown style index keeps that index in
      // `id` beside the style rolled in its place.
      const stale = {...palette, id: "z" + palette.id.substring(1)};

      const segment = paletteSegmentFrom(stale, 11);

      expect(segment.substring(0, PALETTE_ID_BASE62_LENGTH)).toBe(palette.id);
    });

  });


  describe("the encoder", () => {

    it("refuses a seed no roll can draw", () => {
      expect(() => paletteSegmentFrom(palette, -1)).toThrow();
      expect(() => paletteSegmentFrom(palette, 1.5)).toThrow();
      expect(() => paletteSegmentFrom(palette, Number(PALETTE_SEED_LIMIT))).toThrow();
      expect(() => paletteSegmentFrom(palette, Number.NaN)).toThrow();
    });

  });


  describe("range", () => {

    it("rejects the first seed 32 bits cannot hold, though its shape is right", () => {
      const segment = segmentWithSeed(PALETTE_SEED_LIMIT);

      expect(isWellFormedId(segment, PALETTE_SEGMENT_LENGTH)).toBe(true);
      expect(isRestorablePaletteSegment(segment)).toBe(false);
      expect(() => paletteFromSegment(segment)).toThrow();
    });

    it("rejects the largest value the seed characters spell", () => {
      const segment = palette.id + "z".repeat(PALETTE_SEED_BASE62_LENGTH);

      expect(isRestorablePaletteSegment(segment)).toBe(false);
    });

    it("rejects a palette id the decoder cannot read, whatever the seed", () => {
      const segment = "0" + "z".repeat(PALETTE_ID_BASE62_LENGTH - 1) + bigIntToBase62(11n, PALETTE_SEED_BASE62_LENGTH);

      expect(isRestorablePaletteSegment(segment)).toBe(false);
      expect(() => paletteFromSegment(segment)).toThrow();
    });

    it("rejects what has the wrong shape before it reads a value", () => {
      expect(isRestorablePaletteSegment("")).toBe(false);
      // The bare palette id - an address written before the seed travelled.
      expect(isRestorablePaletteSegment(palette.id)).toBe(false);
      expect(isRestorablePaletteSegment(segmentWithSeed(11n) + "0")).toBe(false);
      expect(isRestorablePaletteSegment(palette.id + "!".repeat(PALETTE_SEED_BASE62_LENGTH))).toBe(false);
    });

  });

});
