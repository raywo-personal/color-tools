import {describe, expect, it} from "vitest";
import chroma from "chroma-js";
import {
  ACCENT_HUE_JITTER,
  COMP_HUE_JITTER,
  DARK_HUE_JITTER,
  DEEP_DROP,
  DEEP_HUE_OFFSET,
  DEFAULT_CHROMA,
  DEFAULT_LIGHTNESS,
  INK_DROP,
  INK_FLOOR,
  PALE_LIFT,
  TRAVEL_JITTER,
  generateHighContrast
} from "@engine/palette/high-contrast-palette.helper";
import {paletteColorFrom} from "@engine/palette/palette-color.model";
import {PALETTE_SLOTS, Palette, PaletteSlot} from "@engine/palette/palette.model";
import {
  MAX_USABLE_LIGHTNESS,
  MIN_USABLE_LIGHTNESS,
  maxChroma
} from "@engine/color/oklch.helper";
import {fromOklch} from "@engine/color/color-from-oklch.helper";
import {withSeed} from "@engine/helpers/random.helper";


/** The base hue and its complement; the other three state a lightness. */
const ACCENT_SLOTS: PaletteSlot[] = ["color0", "color1"];

const INK_SLOT: PaletteSlot = "color2";
const DEEP_SLOT: PaletteSlot = "color3";
const PALE_SLOT: PaletteSlot = "color4";

/** Float noise of the OKLch round trip, far below a visible step. */
const TOLERANCE = 1e-3;

/**
 * How far a member read back off an 8-bit color may sit from a bound derived
 * from the generator's constants. A member clamped to the gamut boundary
 * carries that boundary's own lightness tolerance as well - see `maxChroma()`.
 */
const BOUND_TOLERANCE = 2e-3;

/**
 * How far a member may sit from the boundary read back off its own
 * coordinates - the same figure `tetradic-palette.helper.spec.ts` derives, and
 * for the same reason: `maxChroma()` reports a boundary within tolerances of
 * its own, and a member clamped to it carries them into the lightness and hue
 * the boundary is then read back at.
 */
const BOUNDARY_TOLERANCE = 5e-3;

/**
 * Chroma a color needs to read as tinted rather than as a neutral - the figure
 * `MIN_USABLE_LIGHTNESS` is set by, see `usableLightness()`.
 *
 * It separates the two dark members: the ink reads as near-black and stays
 * below it, the dark accent is an accent and stays above it. A chroma merely
 * lower than the accents' would not say that - the ink passes through it on
 * its way to neutral.
 */
const TINTED_CHROMA = 0.02;

/**
 * A gray seed cannot travel through OKLch bit-exact: `chroma("gray")` reports a
 * chroma of 2.3e-5 rather than 0, and chroma-js rounds one channel differently
 * at some lightnesses even at chroma 0 exactly. Both shift a single channel by
 * one step, which is invisible.
 */
const NEUTRAL_CHROMA = 1e-3;
const NEUTRAL_CHANNEL_SPREAD = 1;


function eachSeedHue(assertion: (palette: Palette, seedHue: number) => void) {
  for (let seedHue = 0; seedHue < 360; seedHue += 15) {
    assertion(generateHighContrast({}, seedHue), seedHue);
  }
}


function lightnessOf(palette: Palette, slot: PaletteSlot): number {
  return palette[slot].color.oklch()[0];
}


function chromaOf(palette: Palette, slot: PaletteSlot): number {
  return palette[slot].color.oklch()[1];
}


/** Shortest distance between two hues, in degrees. */
function hueDistance(one: number, other: number): number {
  return Math.abs(((one - other + 540) % 360) - 180);
}


/**
 * The highest lightness the ink can reach, and the lowest the dark accent and
 * the pale member can, for a base color clamped to the given lightness. Read
 * off the generator's construction: each member travels its share of the room
 * on its side of the accents, and the jitter is drawn all the way toward them.
 *
 * Derived rather than written out. A round number written into an assertion
 * lands somewhere inside the achievable range instead of at its floor, and the
 * suite then fails whenever a member draws from below it - on a different seed
 * hue each time, so the failure reads as a real regression. See #83.
 *
 * The clamped lightness is passed in rather than taken from
 * `usableLightness()`: a bound computed through the very function under test
 * collapses along with the travel it bounds, and the assertions go green on
 * the regression they exist to catch.
 */
function inkCeiling(clampedLightness: number): number {
  return clampedLightness
    - clampedLightness * INK_DROP * (1 - TRAVEL_JITTER);
}


function deepFloor(clampedLightness: number): number {
  return clampedLightness
    - clampedLightness * DEEP_DROP * (1 + TRAVEL_JITTER);
}


function paleFloor(clampedLightness: number): number {
  return clampedLightness
    + (1 - clampedLightness) * PALE_LIFT * (1 - TRAVEL_JITTER);
}


/**
 * The narrowest span the palette can cover, from the ink to the pale member -
 * the spread the style's name is a promise about.
 */
function narrowestSpread(clampedLightness: number): number {
  return paleFloor(clampedLightness) - inkCeiling(clampedLightness);
}


/**
 * Every generated member is a color of its own, not the base color back under
 * another caption - the line the sibling styles carry at a black and a white
 * base. Near either end of the range the travels have the least 8-bit room, so
 * this is where a member collapses onto the base if it is going to.
 */
function expectGeneratedOff(palette: Palette,
                            baseHex: string,
                            label: string): void {
  PALETTE_SLOTS.filter(slot => slot !== "color0").forEach(slot => {
    expect(palette[slot].color.hex(), `${slot} at ${label}`).not.toBe(baseHex);
  });
}


describe("generateHighContrast", () => {

  describe("the two accents", () => {

    it("share one perceived lightness", () => {
      eachSeedHue((palette, seedHue) => {
        const [base, comp] = ACCENT_SLOTS.map(slot => lightnessOf(palette, slot));

        expect(Math.abs(base - comp), `seed hue ${seedHue}`)
          .toBeLessThan(TOLERANCE);
      });
    });


    // The lightness every bound below is derived from: with no base color the
    // accents are what the three others travel away from, so a pair that
    // drifted off it would have the bounds measured from a lightness the
    // palette no longer sits at.
    it("sit at the default lightness when no base color sets one", () => {
      eachSeedHue((palette, seedHue) => {
        ACCENT_SLOTS.forEach(slot => {
          expect(Math.abs(lightnessOf(palette, slot) - DEFAULT_LIGHTNESS),
            `${slot} at seed hue ${seedHue}`).toBeLessThan(TOLERANCE);
        });
      });
    });


    it("start at the given seed hue", () => {
      eachSeedHue((palette, seedHue) => {
        // The jitter plus the quarter degree an accent clamped to the gamut
        // boundary carries, see `maxChroma()`.
        expect(hueDistance(palette.color0.color.oklch()[2], seedHue),
          `seed hue ${seedHue}`).toBeLessThan(ACCENT_HUE_JITTER + 0.5);
      });
    });


    it("sit opposite each other on the wheel", () => {
      eachSeedHue((palette, seedHue) => {
        const [base, comp] = ACCENT_SLOTS.map(
          slot => palette[slot].color.oklch()[2]);

        expect(hueDistance(base, comp + 180), `seed hue ${seedHue}`)
          .toBeLessThan(ACCENT_HUE_JITTER + COMP_HUE_JITTER + 0.5);
      });
    });


    // The decision recorded in `fromOklch()`: clamp per hue rather than pull
    // both accents down to the lowest chroma their two hues share.
    //
    // Each accent is measured against what its own hue can hold, not against
    // the pair's highest chroma: levelled, both accents carry that highest
    // value and every distance to it is 0, so an assertion written that way
    // passes the very implementation this one forbids - at seed hue 0 the base
    // accent falls from 0.220 to 0.113 and nothing reads it.
    it("aim for one chroma and drop only where the hue cannot hold it", () => {
      eachSeedHue((palette, seedHue) => {
        ACCENT_SLOTS.forEach(slot => {
          const [lightness, chromacity, hue] = palette[slot].color.oklch();
          const aimedFor = Math.min(DEFAULT_CHROMA, maxChroma(lightness, hue));

          expect(Math.abs(chromacity - aimedFor),
            `${slot} at seed hue ${seedHue}`).toBeLessThan(BOUNDARY_TOLERANCE);
        });
      });
    });

  });


  describe("the lightness the captions promise", () => {

    // What the port to OKLch is for: in HSL the same offsets left the order to
    // the base hue - `generateHighContrast()` says what that cost.
    it("rises INK, DEEP, accents, PALE at every base hue", () => {
      eachSeedHue((palette, seedHue) => {
        const accents = ACCENT_SLOTS.map(slot => lightnessOf(palette, slot));
        const label = `seed hue ${seedHue}`;

        expect(lightnessOf(palette, INK_SLOT), label)
          .toBeLessThan(lightnessOf(palette, DEEP_SLOT));
        expect(lightnessOf(palette, DEEP_SLOT), label)
          .toBeLessThan(Math.min(...accents));
        expect(lightnessOf(palette, PALE_SLOT), label)
          .toBeGreaterThan(Math.max(...accents));
      });
    });


    it("keeps every member clear of its neighbour by the bound it guarantees", () => {
      eachSeedHue((palette, seedHue) => {
        const label = `seed hue ${seedHue}`;

        expect(lightnessOf(palette, INK_SLOT), label)
          .toBeLessThan(inkCeiling(DEFAULT_LIGHTNESS) + BOUND_TOLERANCE);
        expect(lightnessOf(palette, DEEP_SLOT), label)
          .toBeGreaterThan(deepFloor(DEFAULT_LIGHTNESS) - BOUND_TOLERANCE);
        expect(lightnessOf(palette, PALE_SLOT), label)
          .toBeGreaterThan(paleFloor(DEFAULT_LIGHTNESS) - BOUND_TOLERANCE);
      });
    });


    it("spans the minimum spread the constants guarantee", () => {
      eachSeedHue((palette, seedHue) => {
        const spread = lightnessOf(palette, PALE_SLOT)
          - lightnessOf(palette, INK_SLOT);

        expect(spread, `seed hue ${seedHue}`)
          .toBeGreaterThan(narrowestSpread(DEFAULT_LIGHTNESS)
            - BOUND_TOLERANCE);
      });
    });


    // The base color the Studio hands over is whatever the visitor is on, and
    // the order is a promise the captions make at all of them. Both travels
    // are shares of the room on their own side, so neither runs out.
    it.each([0.15, 0.30, 0.45, 0.62, 0.80, 0.90])(
      "rises the same way from a base color at %s",
      lightness => {
        // Through `fromOklch()`, so the chroma is clamped to what the
        // lightness holds and the lightness itself survives into the base
        // color the bounds below are computed from.
        const base = fromOklch({l: lightness, c: 0.12, h: 265});

        const palette = generateHighContrast(
          {color0: paletteColorFrom(base, "color0")}
        );

        const accents = ACCENT_SLOTS.map(slot => lightnessOf(palette, slot));

        expect(lightnessOf(palette, INK_SLOT))
          .toBeLessThan(lightnessOf(palette, DEEP_SLOT));
        expect(lightnessOf(palette, DEEP_SLOT))
          .toBeLessThan(Math.min(...accents));
        expect(lightnessOf(palette, PALE_SLOT))
          .toBeGreaterThan(Math.max(...accents));

        expect(lightnessOf(palette, PALE_SLOT) - lightnessOf(palette, INK_SLOT))
          .toBeGreaterThan(narrowestSpread(lightness) - BOUND_TOLERANCE);
      });

  });


  describe("the three members that are not accents", () => {

    it("keeps the ink near-black and all but neutral", () => {
      eachSeedHue((palette, seedHue) => {
        expect(chromaOf(palette, INK_SLOT), `seed hue ${seedHue}`)
          .toBeLessThan(TINTED_CHROMA);
      });
    });


    it("keeps the dark accent tinted enough to show its hue", () => {
      eachSeedHue((palette, seedHue) => {
        expect(chromaOf(palette, DEEP_SLOT), `seed hue ${seedHue}`)
          .toBeGreaterThan(TINTED_CHROMA);
      });
    });


    // The dark accent is the only one of the three carrying chroma a visitor
    // can see a hue in, so it is the one the offset shows on: dropped, it
    // comes back on the base hue and the palette's dark half stops being a
    // direction of its own. The other two are near-neutral by design and have
    // no hue to pin.
    it("sets the dark accent off the base hue", () => {
      eachSeedHue((palette, seedHue) => {
        expect(hueDistance(palette[DEEP_SLOT].color.oklch()[2],
          seedHue + DEEP_HUE_OFFSET), `seed hue ${seedHue}`)
          .toBeLessThan(DARK_HUE_JITTER + 0.5);
      });
    });


    // What `PALE_LIFT` is set by, stated as the constants rather than as the
    // colors that come out of them: the lift and its jitter multiply out to
    // below the whole room above the accents, so the pale member lands short
    // of white for every base color and every draw. Raise the lift past this
    // and the style's light ground clips to `#ffffff` on part of the draws.
    it("never lifts the pale member onto plain white", () => {
      expect(PALE_LIFT * (1 + TRAVEL_JITTER)).toBeLessThan(1);

      eachSeedHue((palette, seedHue) => {
        expect(palette[PALE_SLOT].color.hex(), `seed hue ${seedHue}`)
          .not.toBe("#ffffff");
      });

      for (let draw = 0; draw < 200; draw++) {
        expect(generateHighContrast()[PALE_SLOT].color.hex(), `draw ${draw}`)
          .not.toBe("#ffffff");
      }
    });


    // The mirror of the pale member's case, and the one the constants cannot
    // settle on their own: near black one 8-bit step of gray spans more
    // lightness than the ink's whole travel, so a base color at the bottom of
    // the band leaves the ink on the hex that base already carries - BASE and
    // INK then show one swatch twice. Walked over draws rather than seed hues
    // because the jitter is what decides it; the base color carries the hue.
    it("never leaves the ink on the base color's own hex", () => {
      expect(fromOklch({l: INK_FLOOR, c: 0, h: 0}).hex()).not.toBe("#000000");

      ["#000000", "#010101", "#020202"].forEach(hex => {
        const base = chroma(hex);

        for (let draw = 0; draw < 50; draw++) {
          const palette = generateHighContrast(
            {color0: paletteColorFrom(base, "color0", base, true)}
          );
          const label = `${hex}, draw ${draw}`;

          expect(palette[INK_SLOT].color.hex(), label).not.toBe(hex);
          // The step off the base is taken below the dark accent, which is
          // where the captions put the ink whatever the base color is.
          expect(lightnessOf(palette, INK_SLOT), label)
            .toBeLessThan(lightnessOf(palette, DEEP_SLOT));
        }
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

    const palette = generateHighContrast({color2: pinned}, 210);

    expect(palette.color2).toBe(pinned);
  });


  it("takes hue, lightness and chroma from a given base color", () => {
    const base = chroma.oklch(0.45, 0.12, 300);

    // A seed hue beside it: the base color carries a hue of its own, and that
    // is the one the accents are built on.
    const palette = generateHighContrast(
      {color0: paletteColorFrom(base, "color0")}, 30
    );

    const [baseLightness, baseChroma, baseHue] = base.oklch();
    const [compLightness, compChroma, compHue] = palette.color1.color.oklch();

    expect(compLightness).toBeCloseTo(baseLightness, 2);
    expect(compChroma).toBeLessThanOrEqual(baseChroma + BOUNDARY_TOLERANCE);
    expect(hueDistance(compHue, baseHue + 180))
      .toBeLessThan(COMP_HUE_JITTER + 0.5);
  });


  // A pure black base color reaches the generator through the converter and
  // through a contrast background. There is no room below it, so the two dark
  // members bunch up under the accents - but the palette still spans from
  // there to a near-white, which is the whole of what the style promises.
  it("keeps a spread of lightness for a base color of #000000", () => {
    const base = chroma("#000000");

    for (let seedHue = 0; seedHue < 360; seedHue += 15) {
      const palette = generateHighContrast(
        {color0: paletteColorFrom(base, "color0", base, true)}, seedHue
      );

      const label = `seed hue ${seedHue}`;

      expect(lightnessOf(palette, INK_SLOT), label)
        .toBeLessThan(lightnessOf(palette, DEEP_SLOT));
      expect(lightnessOf(palette, PALE_SLOT) - lightnessOf(palette, INK_SLOT),
        label).toBeGreaterThan(narrowestSpread(MIN_USABLE_LIGHTNESS)
        - BOUND_TOLERANCE);

      expectGeneratedOff(palette, "#000000", label);
    }
  });


  // A white base color leaves no room above, so the pale member is the one
  // that bunches up - against the base rather than against the accents, which
  // sit at the top of the usable band. The dark members have the whole range
  // below them, so the spread is the widest the style ever reaches.
  it("keeps a spread of lightness for a base color of #ffffff", () => {
    const base = chroma("#ffffff");

    for (let seedHue = 0; seedHue < 360; seedHue += 15) {
      const palette = generateHighContrast(
        {color0: paletteColorFrom(base, "color0", base, true)}, seedHue
      );

      const label = `seed hue ${seedHue}`;

      expect(lightnessOf(palette, INK_SLOT), label)
        .toBeLessThan(lightnessOf(palette, DEEP_SLOT));
      expect(lightnessOf(palette, DEEP_SLOT), label)
        .toBeLessThan(MAX_USABLE_LIGHTNESS);
      expect(lightnessOf(palette, PALE_SLOT) - lightnessOf(palette, INK_SLOT),
        label).toBeGreaterThan(narrowestSpread(MAX_USABLE_LIGHTNESS)
        - BOUND_TOLERANCE);

      expectGeneratedOff(palette, "#ffffff", label);
    }
  });


  // The unseeded path is the one a regenerate takes: no seed hue reaches the
  // generator and `randomBetween()` draws the hue. The draw is the only thing
  // that varies, and the order has to hold whatever it returns.
  it("holds the order when the hue comes from the random draw", () => {
    for (let draw = 0; draw < 50; draw++) {
      const palette = generateHighContrast();
      const accents = ACCENT_SLOTS.map(slot => lightnessOf(palette, slot));
      const label = `draw ${draw}`;

      expect(lightnessOf(palette, INK_SLOT), label)
        .toBeLessThan(lightnessOf(palette, DEEP_SLOT));
      expect(lightnessOf(palette, DEEP_SLOT), label)
        .toBeLessThan(Math.min(...accents));
      expect(lightnessOf(palette, PALE_SLOT), label)
        .toBeGreaterThan(Math.max(...accents));
    }
  });


  // A base color carries a hue of its own, so the draw decides nothing about
  // it - but the jitter still does, and a fresh draw per call would make the
  // palette flicker while a color is dragged. The seed is what holds it, so
  // two calls under one seed have to agree.
  it("repeats itself for the same base color under one seed", () => {
    const base = chroma.oklch(0.45, 0.12, 300);
    const paletteOf = () => withSeed(4711, () => generateHighContrast(
      {color0: paletteColorFrom(base, "color0")}
    ));

    const first = paletteOf();
    const second = paletteOf();

    PALETTE_SLOTS.forEach(slot => {
      expect(second[slot].color.hex(), slot).toBe(first[slot].color.hex());
    });
  });


  it("stays neutral throughout when the base color is a gray", () => {
    const gray = chroma("gray");
    expect(Number.isNaN(gray.oklch()[2]), "a gray has no hue").toBe(true);

    const palette = generateHighContrast(
      {color0: paletteColorFrom(gray, "color0")}, 120
    );

    PALETTE_SLOTS.forEach(slot => {
      const [red, green, blue] = palette[slot].color.rgb();
      const spread = Math.max(red, green, blue) - Math.min(red, green, blue);

      expect(spread, slot).toBeLessThanOrEqual(NEUTRAL_CHANNEL_SPREAD);
      expect(chromaOf(palette, slot), slot).toBeLessThan(NEUTRAL_CHROMA);
    });

    const accents = ACCENT_SLOTS.map(slot => lightnessOf(palette, slot));

    expect(lightnessOf(palette, INK_SLOT))
      .toBeLessThan(lightnessOf(palette, DEEP_SLOT));
    expect(lightnessOf(palette, DEEP_SLOT)).toBeLessThan(Math.min(...accents));
    expect(lightnessOf(palette, PALE_SLOT)).toBeGreaterThan(Math.max(...accents));

    // Neutral is not the same as distinguishable. The two accents differ from
    // one another in hue alone, and a gray leaves no chroma for a hue to sit
    // on - see `fromOklch()` - so they come back on one hex and the palette
    // shows one swatch under both BASE and COMP. The other three state a
    // lightness of their own and stay apart, which the order above says.
    const accentHexes = ACCENT_SLOTS.map(slot => palette[slot].color.hex());

    expect(new Set(accentHexes).size, accentHexes.join(" ")).toBe(1);
  });

});
