import {afterEach, describe, expect, it, vi} from "vitest";
import chroma from "chroma-js";
import {
  PALE_LIFT,
  PALE_LIFT_JITTER,
  generateTetradic
} from "@engine/palette/tetradic-palette.helper";
import {paletteColorFrom} from "@engine/palette/palette-color.model";
import {PALETTE_SLOTS, Palette, PaletteSlot} from "@engine/palette/palette.model";
import {
  MAX_USABLE_LIGHTNESS,
  MIN_USABLE_LIGHTNESS,
  maxChroma
} from "@engine/color/oklch.helper";


/** The four accents on the rectangle; the fifth slot is the pale tint. */
const ACCENT_SLOTS: PaletteSlot[] = ["color0", "color1", "color2", "color3"];

/** The pale tint that gives the four accents their light ground. */
const PALE_SLOT: PaletteSlot = "color4";

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
 * Chroma a color needs to read as tinted rather than as a neutral - the same
 * figure `MIN_USABLE_LIGHTNESS` is set by, see `usableLightness()`.
 *
 * A near-gray fifth member is what `PALE_CHROMA_FACTOR` exists to rule out,
 * and a chroma merely below the accents' does not rule it out: the pale
 * member would pass that on its way to gray.
 */
const TINTED_CHROMA = 0.02;


function eachSeedHue(assertion: (palette: Palette, seedHue: number) => void) {
  for (let seedHue = 0; seedHue < 360; seedHue += 15) {
    assertion(generateTetradic({}, seedHue), seedHue);
  }
}


function lightnessOf(palette: Palette, slots: PaletteSlot[]): number[] {
  return slots.map(slot => palette[slot].color.oklch()[0]);
}


/**
 * The narrowest gap the generator can leave between the accents and the pale
 * member for a base color clamped to the given lightness, read off its
 * construction: the accents sit at that lightness exactly, and the closest
 * the pale member comes to them is the lift with its jitter drawn all the way
 * down.
 *
 * Derived rather than written out. A round number written into the assertion
 * lands somewhere inside the achievable range instead of at its floor, and
 * the suite then fails whenever the pale member draws from below it - on a
 * different seed hue each time, so the failure reads as a real regression.
 *
 * The clamped lightness is passed in rather than taken from
 * `usableLightness()`: a bound computed through the very function under test
 * collapses to zero along with the gap, and the assertion goes green on the
 * regression it exists to catch.
 */
function narrowestGap(clampedLightness: number): number {
  return (1 - clampedLightness) * PALE_LIFT * (1 - PALE_LIFT_JITTER);
}


describe("generateTetradic", () => {

  afterEach(() => vi.restoreAllMocks());


  describe("the four accents", () => {

    it("share one perceived lightness", () => {
      eachSeedHue((palette, seedHue) => {
        const lightness = lightnessOf(palette, ACCENT_SLOTS);
        const spread = Math.max(...lightness) - Math.min(...lightness);

        expect(spread, `seed hue ${seedHue}`).toBeLessThan(TOLERANCE);
      });
    });


    it("start at the given seed hue", () => {
      eachSeedHue((palette, seedHue) => {
        // Half a degree, not a twentieth: an accent clamped to the gamut
        // boundary carries that boundary's own hue tolerance, see
        // `maxChroma()`.
        expect(palette.color0.color.oklch()[2], `seed hue ${seedHue}`)
          .toBeCloseTo(seedHue, 0);
      });
    });


    it("sit 90 degrees apart on a rectangle", () => {
      eachSeedHue((palette, seedHue) => {
        const hues = ACCENT_SLOTS.map(slot => palette[slot].color.oklch()[2]);

        hues.slice(1).forEach((hue, index) => {
          const step = ((hue - hues[index]) % 360 + 360) % 360;

          expect(Math.abs(step - 90),
            `${ACCENT_SLOTS[index + 1]} at seed hue ${seedHue}`)
            .toBeLessThan(2);
        });
      });
    });


    // The decision recorded in `fromOklch()`: clamp per hue rather than pull
    // every member down to the lowest chroma the four hues share.
    it("aim for one chroma and drop only where the hue cannot hold it", () => {
      eachSeedHue((palette, seedHue) => {
        const measured = ACCENT_SLOTS.map(slot => palette[slot].color.oklch());
        const aimedFor = Math.max(...measured.map(([, c]) => c));

        measured.forEach(([l, c, h], index) => {
          const boundary = maxChroma(l, h);
          const label = `${ACCENT_SLOTS[index]} at seed hue ${seedHue}`;

          expect(c, label).toBeLessThanOrEqual(boundary + BOUNDARY_TOLERANCE);
          expect(Math.min(Math.abs(c - aimedFor), Math.abs(c - boundary)),
            label).toBeLessThan(BOUNDARY_TOLERANCE);
        });
      });
    });

  });


  describe("the pale member", () => {

    it("sits lighter than the accents", () => {
      eachSeedHue((palette, seedHue) => {
        const [accentLightness] = lightnessOf(palette, ACCENT_SLOTS);
        const [paleLightness] = lightnessOf(palette, [PALE_SLOT]);

        expect(paleLightness, `seed hue ${seedHue}`)
          .toBeGreaterThan(accentLightness);
      });
    });


    it("keeps the base hue and a share of its chroma", () => {
      eachSeedHue((palette, seedHue) => {
        const [, baseChroma, baseHue] = palette.color0.color.oklch();
        const [, paleChroma, paleHue] = palette[PALE_SLOT].color.oklch();
        const label = `seed hue ${seedHue}`;

        expect(Math.abs(((paleHue - baseHue + 540) % 360) - 180), label)
          .toBeLessThan(2);
        expect(paleChroma, label).toBeLessThan(baseChroma);
        expect(paleChroma, label).toBeGreaterThan(TINTED_CHROMA);
      });
    });

  });


  it("keeps every color inside the sRGB gamut", () => {
    eachSeedHue((palette, seedHue) => {
      PALETTE_SLOTS.forEach(slot => {
        const [lightness, chromacity, hue] = palette[slot].color.oklch();

        // Not chroma-js' `clipped()` flag: the boundary itself can carry it,
        // see `maxChroma()`. What holds is that no member asks for more color
        // than its own lightness and hue can hold.
        expect(chromacity, `${slot} at seed hue ${seedHue}`)
          .toBeLessThanOrEqual(maxChroma(lightness, hue) + BOUNDARY_TOLERANCE);
      });
    });
  });


  it("leaves pinned colors untouched", () => {
    const pinned = paletteColorFrom(
      chroma("#123456"), "color2", chroma("#123456"), true
    );

    const palette = generateTetradic({color2: pinned}, 210);

    expect(palette.color2).toBe(pinned);
  });


  it("adopts lightness and hue of a given base color", () => {
    const base = chroma.oklch(0.45, 0.12, 300);

    const palette = generateTetradic({color0: paletteColorFrom(base, "color0")});

    const [baseLightness, , baseHue] = base.oklch();

    expect(palette.color1.color.oklch()[0]).toBeCloseTo(baseLightness, 2);
    expect(palette.color1.color.oklch()[2]).toBeCloseTo((baseHue + 90) % 360, 0);
  });


  // A pure black or white base color reaches the generator through the
  // converter and through a contrast background. At those two lightnesses no
  // hue holds any chroma, so without the clamp in `usableLightness()` every
  // slot came out the same black or white - clipped, and unchanged by a
  // regenerate. Both remain neutral palettes; they just stop being one color.
  //
  // The lightness jitter is pinned to its floor, so the spread is not a draw
  // from the achievable range but its narrowest point, the same for every
  // seed hue. Left random, the white case sits close enough to the floor that
  // the assertion is a coin toss.
  it.each([
    ["#000000", MIN_USABLE_LIGHTNESS],
    ["#ffffff", MAX_USABLE_LIGHTNESS]
  ])("keeps a spread of lightness for a base color of %s",
    (hex, clampedLightness) => {
      vi.spyOn(Math, "random").mockReturnValue(0);

      const base = chroma(hex);

      for (let seedHue = 0; seedHue < 360; seedHue += 15) {
        const palette = generateTetradic(
          {color0: paletteColorFrom(base, "color0", base, true)}, seedHue
        );

        const generated = PALETTE_SLOTS.filter(slot => slot !== "color0");

        generated.forEach(slot => {
          const [lightness, chromacity, hue] = palette[slot].color.oklch();

          // Not chroma-js' `clipped()` flag: at these lightnesses the members
          // sit on the boundary itself, which can carry it - see
          // `maxChroma()`.
          expect(chromacity, `${slot} at seed hue ${seedHue}`)
            .toBeLessThanOrEqual(maxChroma(lightness, hue) + BOUNDARY_TOLERANCE);
          expect(palette[slot].color.hex(),
            `${slot} at seed hue ${seedHue}`).not.toBe(hex);
        });

        const lightness = lightnessOf(palette, generated);
        const spread = Math.max(...lightness) - Math.min(...lightness);

        expect(spread, `seed hue ${seedHue}`)
          .toBeCloseTo(narrowestGap(clampedLightness), 6);
      }
    });


  it("stays neutral throughout when the base color is a gray", () => {
    const gray = chroma("gray");
    expect(Number.isNaN(gray.oklch()[2]), "a gray has no hue").toBe(true);

    const palette = generateTetradic(
      {color0: paletteColorFrom(gray, "color0")}, 120
    );

    PALETTE_SLOTS.forEach(slot => {
      const [red, green, blue] = palette[slot].color.rgb();
      const spread = Math.max(red, green, blue) - Math.min(red, green, blue);

      expect(spread, slot).toBeLessThanOrEqual(NEUTRAL_CHANNEL_SPREAD);
      expect(palette[slot].color.oklch()[1], slot).toBeLessThan(NEUTRAL_CHROMA);
    });
  });

});
