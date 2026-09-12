import {afterEach, describe, expect, it, vi} from "vitest";
import chroma from "chroma-js";
import {generatePalette, generatePaletteFrom} from "@engine/palette/palette.helper";
import {PALETTE_ID_BASE62_LENGTH} from "@engine/palette/palette-id.helper";
import {PALETTE_SLOTS, Palette, PaletteSlot} from "@engine/palette/palette.model";
import {paletteColorFrom} from "@engine/palette/palette-color.model";
import {
  ANALOG_HUE_JITTER,
  ANALOG_LIFT,
  ANALOG_LIFT_JITTER,
  ANALOG_SPAN,
  CHROMA_JITTER,
  DEFAULT_CHROMA,
  PASTEL_HUE_JITTER,
  PASTEL_HUE_OFFSET,
  PASTEL_LIFT,
  PASTEL_LIFT_JITTER,
  SPLIT_DEGREES,
  SPLIT_HUE_JITTER
} from "@engine/palette/analogous-based-palette.helper";
import {
  MAX_USABLE_LIGHTNESS,
  MIN_USABLE_LIGHTNESS,
  maxChroma
} from "@engine/color/oklch.helper";


/** The two styles `generateAnalogousBasedPalette()` serves. */
const ANALOGOUS_STYLES = ["analogous", "muted-analog-split"] as const;

/** The four slots the generator derives from the base. */
const DERIVED_SLOTS: PaletteSlot[] = ["color1", "color2", "color3", "color4"];

/** The two analogs, one either side of the base hue. */
const ANALOG_SLOTS: PaletteSlot[] = ["color1", "color4"];

/** Float noise of the OKLch round trip, far below a visible step. */
const TOLERANCE = 1e-3;

/**
 * How far a member may sit from the boundary read back off its own
 * coordinates.
 *
 * `maxChroma()` reports a boundary within tolerances of its own, and a member
 * clamped to it carries them into the lightness and hue the boundary is then
 * read back at. Near a cusp the boundary falls steeply with hue, so a quarter
 * of a degree is worth far more than the search resolution. See `maxChroma()`.
 */
const BOUNDARY_TOLERANCE = 5e-3;

/**
 * How far clamping may move a member's hue off the one it was built at - the
 * hue tolerance `maxChroma()` searches within, rounded up.
 */
const HUE_DRIFT = 1;

/**
 * A gray seed cannot travel through OKLch bit-exact: `chroma("gray")` reports
 * a chroma of 2.3e-5 rather than 0, and chroma-js rounds one channel
 * differently at some lightnesses even at chroma 0 exactly. Both shift a
 * single channel by one step, which is invisible. Neutrality is therefore
 * asserted as a negligible chroma and a channel spread of at most one - not
 * as equal RGB bytes.
 */
const NEUTRAL_CHROMA = 1e-3;
const NEUTRAL_CHANNEL_SPREAD = 1;

/**
 * Base hues whose two analogs the generator once failed to produce.
 *
 * `analogRange(h, 28, 2)` walked from `h - 14` to `h + 14`, and on these the
 * sum of the two floats overshot the end, so the second analog never arrived
 * and `color4` was built on `undefined`. Every one of them is a base hue
 * alone - the seed does not reach the hue arithmetic - which is why the
 * crash followed a colour rather than a roll.
 */
const ONCE_SHORT_HUES = [2.06, 2.31, 2.56, 2.81, 3.06, 3.31, 3.56, 3.81];

/**
 * The hue each derived slot is built at, as a signed distance from the base
 * hue, and how far its jitter may carry it from there.
 *
 * Read off the generator's constants rather than written out: a span of 28
 * degrees puts the analogs 14 either side, and the counter sits `SPLIT_DEGREES`
 * short of the complement. `ROLE_CAPTIONS` claims these same numbers, and
 * `palette-role.helper.spec.ts` holds it to them.
 */
const HUE_OFFSETS: Record<string, { offset: number, jitter: number }> = {
  color1: {offset: -ANALOG_SPAN / 2, jitter: ANALOG_HUE_JITTER},
  color2: {offset: PASTEL_HUE_OFFSET, jitter: PASTEL_HUE_JITTER},
  color3: {offset: 180 - SPLIT_DEGREES, jitter: SPLIT_HUE_JITTER},
  color4: {offset: ANALOG_SPAN / 2, jitter: ANALOG_HUE_JITTER}
};


function eachStyleAndSeedHue(
  assertion: (palette: Palette, style: string, seedHue: number) => void
) {
  for (const style of ANALOGOUS_STYLES) {
    for (let seedHue = 0; seedHue < 360; seedHue += 15) {
      assertion(generatePalette(style, {}, seedHue), style, seedHue);
    }
  }
}


function lightnessOf(palette: Palette, slot: PaletteSlot): number {
  return palette[slot].color.oklch()[0];
}


/** The shortest way round the wheel from `to` to `from`, in [-180, 180). */
function signedHueDistance(from: number, to: number): number {
  return ((from - to + 540) % 360) - 180;
}


/**
 * The smallest lift a member can be drawn at above a base clamped to the
 * given lightness: the share of the room above it, with its jitter drawn all
 * the way down.
 *
 * Derived rather than written out. A round number written into the assertion
 * lands somewhere inside the achievable range instead of at its floor, and
 * the suite then fails whenever a member draws from below it - on a different
 * seed hue each time, so the failure reads as a real regression. See #83 for
 * what that cost the last time.
 *
 * The clamped lightness is passed in rather than taken from
 * `usableLightness()`: a bound computed through the very function under test
 * collapses along with the lift it bounds, and the assertion goes green on
 * the regression it exists to catch.
 */
function narrowestLift(clampedLightness: number,
                       lift: number,
                       liftJitter: number): number {
  return (1 - clampedLightness) * lift * (1 - liftJitter);
}


describe("the analogous-based generators", () => {

  afterEach(() => vi.restoreAllMocks());


  it("fills all five slots for a base hue whose analogs used to fall short", () => {
    for (const style of ANALOGOUS_STYLES) {
      for (const hue of ONCE_SHORT_HUES) {
        const palette = generatePalette(style, {}, hue);

        for (const slot of PALETTE_SLOTS) {
          expect(palette[slot].color, `${style} at hue ${hue}, ${slot}`).toBeDefined();
        }
      }
    }
  });


  // The colour the crash was first seen on. It reaches the generator the way
  // the Studio sends it - as the base colour, with a seed - and its hue is
  // one the walk fell short on.
  it("builds a palette on the colour the crash was reported for", () => {
    for (const style of ANALOGOUS_STYLES) {
      const palette = generatePaletteFrom(chroma("#8b150f"), style, 1234);

      expect(palette.color0.color.hex(), style).toBe("#8b150f");
      expect(palette.id, style).toHaveLength(PALETTE_ID_BASE62_LENGTH);
    }
  });


  it("rotates every derived member off the base hue", () => {
    eachStyleAndSeedHue((palette, style, seedHue) => {
      const baseHue = palette.color0.color.oklch()[2];

      DERIVED_SLOTS.forEach(slot => {
        const {offset, jitter} = HUE_OFFSETS[slot];
        const distance = signedHueDistance(
          palette[slot].color.oklch()[2], baseHue
        );

        expect(Math.abs(distance - offset),
          `${style} ${slot} at seed hue ${seedHue}`)
          .toBeLessThanOrEqual(jitter + HUE_DRIFT);
      });
    });
  });


  describe("the lightness ramp", () => {

    // What the ramp is for: the pastel reads as the lightest member and the
    // counter as the one that stays with the base, at every hue. In HSL the
    // same offsets landed at a different perceived step per hue, so which
    // member read as the lighter one depended on where the base hue sat.
    it("runs from the counter through the analogs up to the pastel", () => {
      eachStyleAndSeedHue((palette, style, seedHue) => {
        const label = `${style} at seed hue ${seedHue}`;
        const base = lightnessOf(palette, "color0");
        const counter = lightnessOf(palette, "color3");
        const pastel = lightnessOf(palette, "color2");

        expect(counter, `${label}, counter against base`)
          .toBeGreaterThan(base - TOLERANCE);

        ANALOG_SLOTS.forEach(slot => {
          expect(lightnessOf(palette, slot), `${label}, ${slot}`)
            .toBeGreaterThan(counter);
          expect(pastel, `${label}, pastel against ${slot}`)
            .toBeGreaterThan(lightnessOf(palette, slot));
        });
      });
    });


    // A pure black or white base color reaches the generator through the
    // converter and through a contrast background. At those two lightnesses
    // no hue holds any chroma, so without the clamp in `usableLightness()`
    // every slot came out the same black or white - clipped, and unchanged by
    // a regenerate.
    //
    // The jitter is pinned to its floor, so each lift is not a draw from the
    // achievable range but its narrowest point, the same for every seed hue.
    // Left random, the white case sits close enough to the floor that the
    // assertion is a coin toss - see #83.
    it.each([
      ["#000000", MIN_USABLE_LIGHTNESS],
      ["#ffffff", MAX_USABLE_LIGHTNESS]
    ])("keeps the ramp apart for a base color of %s", (hex, clampedLightness) => {
      vi.spyOn(Math, "random").mockReturnValue(0);

      const base = chroma(hex);

      for (const style of ANALOGOUS_STYLES) {
        for (let seedHue = 0; seedHue < 360; seedHue += 15) {
          const palette = generatePalette(
            style, {color0: paletteColorFrom(base, "color0", base, true)}, seedHue
          );
          const label = `${style} at seed hue ${seedHue}`;

          ANALOG_SLOTS.forEach(slot => {
            expect(lightnessOf(palette, slot) - clampedLightness, `${label}, ${slot}`)
              .toBeCloseTo(
                narrowestLift(clampedLightness, ANALOG_LIFT, ANALOG_LIFT_JITTER), 6
              );
          });

          expect(lightnessOf(palette, "color2") - clampedLightness, `${label}, pastel`)
            .toBeCloseTo(
              narrowestLift(clampedLightness, PASTEL_LIFT, PASTEL_LIFT_JITTER), 6
            );

          DERIVED_SLOTS.forEach(slot => {
            expect(palette[slot].color.hex(), `${label}, ${slot}`).not.toBe(hex);
          });
        }
      }
    });


    // Where the two styles part in the ramp: the muted counter lifts off the
    // base, which is what keeps it apart from a base it barely differs from
    // in chroma, while the colourful one leaves it at the base's lightness,
    // answering the analogs from there. A muted counter that stops lifting
    // is a swatch the visitor cannot tell from the base.
    it("lifts the counter off the base for muted-analog-split alone", () => {
      for (let seedHue = 0; seedHue < 360; seedHue += 15) {
        const base = chroma.oklch(0.5, 0.04, seedHue);
        const pinned = {color0: paletteColorFrom(base, "color0")};
        const baseLightness = base.oklch()[0];

        const colourful = generatePalette("analogous", pinned, seedHue);
        const muted = generatePalette("muted-analog-split", pinned, seedHue);

        expect(Math.abs(lightnessOf(colourful, "color3") - baseLightness),
          `analogous at seed hue ${seedHue}`).toBeLessThan(TOLERANCE);
        expect(lightnessOf(muted, "color3"), `muted at seed hue ${seedHue}`)
          .toBeGreaterThan(baseLightness + TOLERANCE);
      }
    });

  });


  describe("the chroma", () => {

    it("keeps every color inside the sRGB gamut", () => {
      eachStyleAndSeedHue((palette, style, seedHue) => {
        PALETTE_SLOTS.forEach(slot => {
          const [lightness, chromacity, hue] = palette[slot].color.oklch();

          // Not chroma-js' `clipped()` flag: the boundary itself can carry
          // it, see `maxChroma()`. What holds is that no member asks for more
          // color than its own lightness and hue can hold.
          expect(chromacity, `${style} ${slot} at seed hue ${seedHue}`)
            .toBeLessThanOrEqual(maxChroma(lightness, hue) + BOUNDARY_TOLERANCE);
        });
      });
    });


    // The base is the palette's colour and the others surround it. Every
    // share is at most whole, so no member is asked for more colour than the
    // base aims at, plus its own jitter.
    //
    // The aim, not the chroma the base came out at: a base hue that cannot
    // hold the aim is clamped below it, while a lifted member at the same hue
    // can sit lighter and hold more - see `fromOklch()`.
    it("asks no member for more colour than the base aims at", () => {
      const ceiling = DEFAULT_CHROMA * (1 + CHROMA_JITTER);

      eachStyleAndSeedHue((palette, style, seedHue) => {

        DERIVED_SLOTS.forEach(slot => {
          expect(palette[slot].color.oklch()[1],
            `${style} ${slot} at seed hue ${seedHue}`)
            .toBeLessThanOrEqual(ceiling + BOUNDARY_TOLERANCE);
        });
      });
    });


    // What the two styles differ in, and the whole of it: the same base, the
    // same hues, the same lightness ramp - and less colour on every member
    // the muted one derives. A base chroma every hue holds at every step of
    // the ramp, so the comparison reads the shares rather than the gamut.
    it("makes muted-analog-split the less colourful of the two", () => {
      // The midpoint of `randomBetween()`, which leaves `vary()` at the value
      // it varies: the two palettes then differ in nothing but their shares.
      vi.spyOn(Math, "random").mockReturnValue(0.5);

      for (let seedHue = 0; seedHue < 360; seedHue += 15) {
        const base = chroma.oklch(0.5, 0.04, seedHue);
        const pinned = {color0: paletteColorFrom(base, "color0")};

        const colourful = generatePalette("analogous", pinned, seedHue);
        const muted = generatePalette("muted-analog-split", pinned, seedHue);

        DERIVED_SLOTS.forEach(slot => {
          expect(muted[slot].color.oklch()[1], `${slot} at seed hue ${seedHue}`)
            .toBeLessThan(colourful[slot].color.oklch()[1]);
        });
      }
    });


    it("stays neutral throughout when the base color is a gray", () => {
      const gray = chroma("gray");
      expect(Number.isNaN(gray.oklch()[2]), "a gray has no hue").toBe(true);

      for (const style of ANALOGOUS_STYLES) {
        const palette = generatePalette(
          style, {color0: paletteColorFrom(gray, "color0")}, 120
        );

        PALETTE_SLOTS.forEach(slot => {
          const [red, green, blue] = palette[slot].color.rgb();
          const spread = Math.max(red, green, blue) - Math.min(red, green, blue);

          expect(spread, `${style} ${slot}`).toBeLessThanOrEqual(NEUTRAL_CHANNEL_SPREAD);
          expect(palette[slot].color.oklch()[1], `${style} ${slot}`)
            .toBeLessThan(NEUTRAL_CHROMA);
        });
      }
    });

  });


  it("leaves pinned colors untouched", () => {
    for (const style of ANALOGOUS_STYLES) {
      const pinned = paletteColorFrom(
        chroma("#123456"), "color2", chroma("#123456"), true
      );

      const palette = generatePalette(style, {color2: pinned}, 210);

      expect(palette.color2, style).toBe(pinned);
    }
  });


  // What lets a palette follow a slider drag: the same seed on the same base
  // has to give the same five colours, or the four derived swatches flicker
  // while the visitor moves the fifth.
  it("repeats itself for one seed", () => {
    for (const style of ANALOGOUS_STYLES) {
      const base = chroma("#3f7ad2");

      const first = generatePaletteFrom(base, style, 4711);
      const second = generatePaletteFrom(base, style, 4711);

      expect(second.id, style).toBe(first.id);
      PALETTE_SLOTS.forEach(slot => {
        expect(second[slot].color.hex(), `${style} ${slot}`)
          .toBe(first[slot].color.hex());
      });
    }
  });

});
