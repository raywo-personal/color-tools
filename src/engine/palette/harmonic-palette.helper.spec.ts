import {afterEach, describe, expect, it, vi} from "vitest";
import chroma from "chroma-js";
import {
  FAR_ANALOG_DROP,
  NEAR_ANALOG_LIFT,
  TRAVEL_JITTER,
  TRIAD_LIFT,
  generateHarmonic
} from "@engine/palette/harmonic-palette.helper";
import {paletteColorFrom} from "@engine/palette/palette-color.model";
import {PALETTE_SLOTS, Palette, PaletteSlot} from "@engine/palette/palette.model";
import {
  MAX_USABLE_LIGHTNESS,
  MIN_USABLE_LIGHTNESS,
  maxChroma
} from "@engine/color/oklch.helper";


/** The base and its complement; the other three travel from them. */
const ACCENT_SLOTS: PaletteSlot[] = ["color0", "color3"];

/** The two members that rise, in the order their lifts put them in. */
const RISEN_SLOTS: PaletteSlot[] = ["color1", "color4"];

/** The lifts of `RISEN_SLOTS`, in the same order. */
const LIFTS = [NEAR_ANALOG_LIFT, TRIAD_LIFT];

/** The one member that sinks. */
const SUNKEN_SLOT: PaletteSlot = "color2";

/** The hue offset of every slot from the base, in degrees - the captions. */
const HUE_OFFSETS: Record<PaletteSlot, number> = {
  color0: 0,
  color1: 30,
  color2: 60,
  color3: 180,
  color4: 150
};

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
 * Every slot is captioned by a hue offset, so a member that lost its color
 * would leave its caption naming a direction nothing points in.
 */
const TINTED_CHROMA = 0.02;


function eachSeedHue(assertion: (palette: Palette, seedHue: number) => void) {
  for (let seedHue = 0; seedHue < 360; seedHue += 15) {
    assertion(generateHarmonic({}, seedHue), seedHue);
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
  return lower * (1 + TRAVEL_JITTER) < higher * (1 - TRAVEL_JITTER);
}


/**
 * The narrowest lightness spread the generator can produce for a base color
 * clamped to the given lightness, read off its construction: the accents sit
 * at that lightness exactly, and the closest the highest and the lowest
 * member come to them is their travel with the jitter drawn all the way down.
 *
 * The clamped lightness is passed in rather than taken from
 * `usableLightness()`: a bound computed through the very function under test
 * collapses to zero along with the spread, and the assertion goes green on
 * the regression it exists to catch.
 */
function narrowestSpread(clampedLightness: number): number {
  const risen = (1 - clampedLightness) * TRIAD_LIFT * (1 - TRAVEL_JITTER);
  const sunken = clampedLightness * FAR_ANALOG_DROP * (1 - TRAVEL_JITTER);

  return risen + sunken;
}


describe("generateHarmonic", () => {

  afterEach(() => vi.restoreAllMocks());


  describe("the two accents", () => {

    it("share one perceived lightness", () => {
      eachSeedHue((palette, seedHue) => {
        const [base, comp] = lightnessOf(palette, ACCENT_SLOTS);

        expect(Math.abs(base - comp), `seed hue ${seedHue}`)
          .toBeLessThan(TOLERANCE);
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


    // The decision recorded in `fromOklch()`: clamp per hue rather than pull
    // both members down to the lower chroma of the two hues.
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


  // Every caption is a hue offset, so the hues are the whole of what the
  // style promises. Nothing else about a member is named.
  it("puts every member at the hue offset its caption names", () => {
    eachSeedHue((palette, seedHue) => {
      const baseHue = palette.color0.color.oklch()[2];

      PALETTE_SLOTS.forEach(slot => {
        const hue = palette[slot].color.oklch()[2];
        const offset = (baseHue + HUE_OFFSETS[slot]) % 360;

        expect(hueDistance(hue, offset), `${slot} at seed hue ${seedHue}`)
          .toBeLessThan(2);
      });
    });
  });


  describe("the members that travel", () => {

    it("rise above and sink below the accents", () => {
      eachSeedHue((palette, seedHue) => {
        const [accentLightness] = lightnessOf(palette, ACCENT_SLOTS);

        lightnessOf(palette, RISEN_SLOTS).forEach((lightness, index) => {
          expect(lightness, `${RISEN_SLOTS[index]} at seed hue ${seedHue}`)
            .toBeGreaterThan(accentLightness);
        });

        expect(lightnessOf(palette, [SUNKEN_SLOT])[0],
          `${SUNKEN_SLOT} at seed hue ${seedHue}`)
          .toBeLessThan(accentLightness);
      });
    });


    // The two rise by different shares, so the order has to hold for every
    // draw rather than for most of them - otherwise the same style shows a
    // different ladder from one regenerate to the next.
    it("keep the order their lifts put them in", () => {
      expect(keepsOrder(LIFTS[0], LIFTS[1]),
        `${RISEN_SLOTS[0]} below ${RISEN_SLOTS[1]}`).toBe(true);

      eachSeedHue((palette, seedHue) => {
        const [near, far] = lightnessOf(palette, RISEN_SLOTS);

        expect(far, `seed hue ${seedHue}`).toBeGreaterThan(near);
      });
    });


    it("stay tinted rather than turning neutral", () => {
      eachSeedHue((palette, seedHue) => {
        [...RISEN_SLOTS, SUNKEN_SLOT].forEach(slot => {
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

    const palette = generateHarmonic({color2: pinned}, 210);

    expect(palette.color2).toBe(pinned);
  });


  it("adopts lightness and hue of a given base color", () => {
    const base = chroma.oklch(0.45, 0.12, 300);

    const palette = generateHarmonic({color0: paletteColorFrom(base, "color0")});

    const [baseLightness, , baseHue] = base.oklch();

    expect(palette.color3.color.oklch()[0]).toBeCloseTo(baseLightness, 2);
    expect(palette.color3.color.oklch()[2]).toBeCloseTo((baseHue + 180) % 360, 0);
  });


  // A pure black or white base color reaches the generator through the
  // converter and through a contrast background. At those two lightnesses no
  // hue holds any chroma, so without the clamp in `usableLightness()` every
  // slot came out the same black or white - clipped, and unchanged by a
  // regenerate. Both remain neutral palettes; they just stop being one color.
  //
  // This is where the draft's factors of the HSL lightness failed worst: a
  // factor of 1.1 on a near-black base moves nothing, so the whole palette
  // came back as one near-black. The travels are shares of the room on their
  // own side, which is why the spread below is the same shape at both ends.
  //
  // The jitter is pinned to its floor, so the spread is not a draw from the
  // achievable range but its narrowest point, the same for every seed hue.
  it.each([
    ["#000000", MIN_USABLE_LIGHTNESS],
    ["#ffffff", MAX_USABLE_LIGHTNESS]
  ])("keeps a spread of lightness for a base color of %s",
    (hex, clampedLightness) => {
      vi.spyOn(Math, "random").mockReturnValue(0);

      const base = chroma(hex);

      for (let seedHue = 0; seedHue < 360; seedHue += 15) {
        const palette = generateHarmonic(
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
          .toBeCloseTo(narrowestSpread(clampedLightness), 6);
      }
    });


  it("stays neutral throughout when the base color is a gray", () => {
    const gray = chroma("gray");
    expect(Number.isNaN(gray.oklch()[2]), "a gray has no hue").toBe(true);

    const palette = generateHarmonic(
      {color0: paletteColorFrom(gray, "color0")}, 120
    );

    PALETTE_SLOTS.forEach(slot => {
      const [red, green, blue] = palette[slot].color.rgb();
      const spread = Math.max(red, green, blue) - Math.min(red, green, blue);

      expect(spread, slot).toBeLessThanOrEqual(NEUTRAL_CHANNEL_SPREAD);
      expect(palette[slot].color.oklch()[1], slot).toBeLessThan(NEUTRAL_CHROMA);
    });

    // Neutral is not the same as distinguishable. The two accents differ from
    // one another in hue alone, and a gray leaves no chroma for a hue to sit
    // on - see `fromOklch()` - so they come back on one hex and the palette
    // shows one swatch under BASE and COMP both. The other three state a
    // lightness of their own and stay apart.
    const accents = ACCENT_SLOTS.map(slot => palette[slot].color.hex());

    expect(new Set(accents).size, accents.join(" ")).toBe(1);

    // And no further than that: the three that travel are the ones the palette
    // has left, so a travel that stopped travelling would leave a gray base
    // showing one swatch under more captions still.
    const travelled = [...RISEN_SLOTS, SUNKEN_SLOT]
      .map(slot => palette[slot].color.hex());
    const distinct = [accents[0], ...travelled];

    expect(new Set(distinct).size, distinct.join(" ")).toBe(distinct.length);
  });


  // Where the collapse above stops. It puts the base on the same hex as its
  // complement, which holds only while the base's own lightness is one the
  // accents are built at - below the floor `usableLightness()` raises theirs
  // and leaves the base where it is.
  it("lifts its accents off a gray base below the usable floor", () => {
    const gray = chroma.oklch(MIN_USABLE_LIGHTNESS / 2, 0, 0);
    expect(gray.oklch()[0], "the base sits below the floor")
      .toBeLessThan(MIN_USABLE_LIGHTNESS);

    const palette = generateHarmonic(
      {color0: paletteColorFrom(gray, "color0")}, 120
    );
    const [base, comp] = ACCENT_SLOTS.map(slot => palette[slot].color.hex());

    expect(comp, `base ${base}`).not.toBe(base);
  });

});
