import {afterEach, describe, expect, it, vi} from "vitest";
import chroma from "chroma-js";
import {
  BASE_LT_LIFT,
  COMP_LT_LIFT,
  LIFT_JITTER,
  generateSplitComplementary
} from "@engine/palette/split-complementary-palette.helper";
import {paletteColorFrom} from "@engine/palette/palette-color.model";
import {PALETTE_SLOTS, Palette, PaletteSlot} from "@engine/palette/palette.model";
import {
  MAX_USABLE_LIGHTNESS,
  MIN_USABLE_LIGHTNESS,
  maxChroma
} from "@engine/color/oklch.helper";


/** The base and the two hues flanking its complement. */
const ACCENT_SLOTS: PaletteSlot[] = ["color0", "color1", "color2"];

/** The two lighter members, in the order their lifts put them in. */
const LIFTED_SLOTS: PaletteSlot[] = ["color3", "color4"];

/** The lifts of `LIFTED_SLOTS`, in the same order. */
const LIFTS = [BASE_LT_LIFT, COMP_LT_LIFT];

/** How far the two split accents sit from the complement, in degrees. */
const SPLIT_OFFSET = 30;

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
 * Near-gray lighter members are what `LIGHT_CHROMA_FACTOR` exists to rule
 * out, and a chroma merely below the accents' does not rule it out: a lighter
 * member would pass that on its way to gray.
 */
const TINTED_CHROMA = 0.02;


function eachSeedHue(assertion: (palette: Palette, seedHue: number) => void) {
  for (let seedHue = 0; seedHue < 360; seedHue += 15) {
    assertion(generateSplitComplementary({}, seedHue), seedHue);
  }
}


function lightnessOf(palette: Palette, slots: PaletteSlot[]): number[] {
  return slots.map(slot => palette[slot].color.oklch()[0]);
}


function hueDistance(one: number, other: number): number {
  return Math.abs(((one - other + 540) % 360) - 180);
}


/**
 * Whether two lifts keep their order for every draw, read off the constants:
 * the lower member rises at most by its own jitter and the higher one falls
 * at most by its, and both scale the same room.
 *
 * Derived rather than written out, per #83. A threshold written into the
 * assertion sits somewhere inside the achievable range instead of at its
 * edge, and the suite then fails whenever a draw lands beyond it - on a
 * different seed hue each time, so the failure reads as a real regression.
 */
function keepsOrder(lower: number, higher: number): boolean {
  return lower * (1 + LIFT_JITTER) < higher * (1 - LIFT_JITTER);
}


/**
 * The narrowest gap the generator can leave between the accents and the
 * highest lifted member for a base color clamped to the given lightness, read
 * off its construction: the accents sit at that lightness exactly, and the
 * closest `COMP LT` comes to them is its lift with the jitter drawn all the
 * way down.
 *
 * The clamped lightness is passed in rather than taken from
 * `usableLightness()`: a bound computed through the very function under test
 * collapses to zero along with the gap, and the assertion goes green on the
 * regression it exists to catch.
 */
function narrowestGap(clampedLightness: number): number {
  return (1 - clampedLightness) * COMP_LT_LIFT * (1 - LIFT_JITTER);
}


describe("generateSplitComplementary", () => {

  afterEach(() => vi.restoreAllMocks());


  describe("the three accents", () => {

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


    // The split is what the style is: two hues flanking the complement, not
    // the complement itself. A generator that let them drift together would
    // hand back a complementary palette with a spare slot.
    it("flank the complement at equal distance from it", () => {
      eachSeedHue((palette, seedHue) => {
        const [baseHue, splitA, splitB] = ACCENT_SLOTS
          .map(slot => palette[slot].color.oklch()[2]);
        const compHue = (baseHue + 180) % 360;
        const label = `seed hue ${seedHue}`;

        expect(hueDistance(splitA, compHue), label)
          .toBeCloseTo(SPLIT_OFFSET, 0);
        expect(hueDistance(splitB, compHue), label)
          .toBeCloseTo(SPLIT_OFFSET, 0);
        expect(hueDistance(splitA, splitB), label)
          .toBeCloseTo(2 * SPLIT_OFFSET, 0);
      });
    });


    // The decision recorded in `fromOklch()`: clamp per hue rather than pull
    // every member down to the lowest chroma the three hues share.
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


  describe("the two lighter members", () => {

    it("both sit lighter than the accents", () => {
      eachSeedHue((palette, seedHue) => {
        const [accentLightness] = lightnessOf(palette, ACCENT_SLOTS);

        lightnessOf(palette, LIFTED_SLOTS).forEach((lightness, index) => {
          expect(lightness, `${LIFTED_SLOTS[index]} at seed hue ${seedHue}`)
            .toBeGreaterThan(accentLightness);
        });
      });
    });


    // BASE LT and COMP LT name a fixed order, so the lifts have to keep it
    // for every draw, not merely for most of them.
    it("keep the order their captions name", () => {
      expect(keepsOrder(LIFTS[0], LIFTS[1]),
        `${LIFTED_SLOTS[0]} below ${LIFTED_SLOTS[1]}`).toBe(true);

      eachSeedHue((palette, seedHue) => {
        const [baseLt, compLt] = lightnessOf(palette, LIFTED_SLOTS);

        expect(compLt, `seed hue ${seedHue}`).toBeGreaterThan(baseLt);
      });
    });


    // `COMP LT` carries the complement itself, which no accent does - it is
    // how the complement reaches the palette at all.
    it("carry the base hue and the complement", () => {
      eachSeedHue((palette, seedHue) => {
        const baseHue = palette.color0.color.oklch()[2];
        const label = `seed hue ${seedHue}`;

        expect(hueDistance(palette.color3.color.oklch()[2], baseHue), label)
          .toBeLessThan(2);
        expect(hueDistance(palette.color4.color.oklch()[2], baseHue), label)
          .toBeGreaterThan(180 - 2);
      });
    });


    // Only that they stay tinted, not that they hold less color than the
    // accents. They ask for less - `LIGHT_CHROMA_FACTOR` - but they ask for
    // it at a lightness of their own, and `fromOklch()` clamps each member to
    // what its own lightness and hue can hold: around cyan an accent is
    // clamped to 0.106 at the accent lightness while the lighter member above
    // it is not clamped at all. The captions name lightness, not colorfulness.
    it("stay tints rather than neutrals", () => {
      eachSeedHue((palette, seedHue) => {
        LIFTED_SLOTS.forEach(slot => {
          expect(palette[slot].color.oklch()[1],
            `${slot} at seed hue ${seedHue}`).toBeGreaterThan(TINTED_CHROMA);
        });
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

    const palette = generateSplitComplementary({color2: pinned}, 210);

    expect(palette.color2).toBe(pinned);
  });


  it("adopts lightness and hue of a given base color", () => {
    const base = chroma.oklch(0.45, 0.12, 300);

    const palette = generateSplitComplementary(
      {color0: paletteColorFrom(base, "color0")});

    const [baseLightness, , baseHue] = base.oklch();

    expect(palette.color1.color.oklch()[0]).toBeCloseTo(baseLightness, 2);
    expect(palette.color1.color.oklch()[2]).toBeCloseTo((baseHue + 150) % 360, 0);
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
        const palette = generateSplitComplementary(
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

    const palette = generateSplitComplementary(
      {color0: paletteColorFrom(gray, "color0")}, 120
    );

    PALETTE_SLOTS.forEach(slot => {
      const [red, green, blue] = palette[slot].color.rgb();
      const spread = Math.max(red, green, blue) - Math.min(red, green, blue);

      expect(spread, slot).toBeLessThanOrEqual(NEUTRAL_CHANNEL_SPREAD);
      expect(palette[slot].color.oklch()[1], slot).toBeLessThan(NEUTRAL_CHROMA);
    });

    // Neutral is not the same as distinguishable. The three accents differ
    // from one another in hue alone, and a gray leaves no chroma for a hue to
    // sit on - see `fromOklch()` - so they come back on one hex and the
    // palette shows one swatch under three captions. The two lighter members
    // each state a lightness of their own and stay apart.
    const accents = ACCENT_SLOTS.map(slot => palette[slot].color.hex());

    expect(new Set(accents).size, accents.join(" ")).toBe(1);

    // And no further than that: the lighter members are the ones the palette
    // has left, so a lift that stopped lifting would leave a gray base showing
    // one swatch under more captions still.
    const lifted = LIFTED_SLOTS.map(slot => palette[slot].color.hex());
    const distinct = [accents[0], ...lifted];

    expect(new Set(distinct).size, distinct.join(" ")).toBe(distinct.length);
  });


  // Where the collapse above stops. It puts the base on the same hex as its
  // split accents, which holds only while the base's own lightness is one the
  // accents are built at - below the floor `usableLightness()` raises theirs
  // and leaves the base where it is. They still collapse onto one another, so
  // the palette shows two swatches rather than one.
  it("lifts its accents off a gray base below the usable floor", () => {
    const gray = chroma.oklch(MIN_USABLE_LIGHTNESS / 2, 0, 0);
    expect(gray.oklch()[0], "the base sits below the floor")
      .toBeLessThan(MIN_USABLE_LIGHTNESS);

    const palette = generateSplitComplementary(
      {color0: paletteColorFrom(gray, "color0")}, 120
    );
    const [base, ...lifted] = ACCENT_SLOTS.map(slot => palette[slot].color.hex());

    expect(new Set(lifted).size, lifted.join(" ")).toBe(1);
    expect(lifted[0], `base ${base}`).not.toBe(base);
  });

});
