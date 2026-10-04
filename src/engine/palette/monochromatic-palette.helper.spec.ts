import {describe, expect, it} from "vitest";
import chroma from "chroma-js";
import {
  DEFAULT_LIGHTNESS,
  RESIDUAL_REACH,
  generateMonochromatic
} from "@engine/palette/monochromatic-palette.helper";
import {paletteColorFrom} from "@engine/palette/palette-color.model";
import {PALETTE_SLOTS, Palette, PaletteSlot} from "@engine/palette/palette.model";
import {
  MAX_USABLE_LIGHTNESS,
  MIN_USABLE_LIGHTNESS,
  maxChroma
} from "@engine/color/oklch.helper";


/**
 * How far two neighbouring gaps of the ramp may differ.
 *
 * Each member is read back off an 8-bit color, and a member clamped to the
 * gamut boundary carries that boundary's own lightness tolerance as well - see
 * `maxChroma()`. A gap sits between two such members and can therefore drift
 * by twice it. The bound stays two orders of magnitude below the ramp's own
 * step, so an unevenness anyone could see fails it.
 */
const STEP_TOLERANCE = 2e-3;

/**
 * How far a step may sit from the hue it was built at. A member clamped to the
 * gamut boundary carries that boundary's hue tolerance of a quarter degree -
 * see `maxChroma()`.
 */
const HUE_TOLERANCE = 0.5;

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
 * A monochromatic palette is one hue or it is nothing, so the topmost step has
 * to keep enough chroma to still show which hue that is. It is the step most at
 * risk: `maxChroma()` falls off toward white, and the reach is what decides how
 * far into that fall the ramp goes.
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
    assertion(generateMonochromatic({}, seedHue), seedHue);
  }
}


function lightnessOf(palette: Palette, slots: PaletteSlot[] = [...PALETTE_SLOTS]): number[] {
  return slots.map(slot => palette[slot].color.oklch()[0]);
}


/** The gaps between neighbouring steps, in OKLch lightness. */
function gapsOf(palette: Palette, slots?: PaletteSlot[]): number[] {
  const lightness = lightnessOf(palette, slots);

  return lightness.slice(1).map((value, index) => value - lightness[index]);
}


/** Shortest distance between two hues, in degrees. */
function hueDistance(one: number, other: number): number {
  return Math.abs(((one - other + 540) % 360) - 180);
}


/**
 * How far the ramp reaches above a base clamped to the given lightness, read
 * off its construction: to the top of the usable band, or a share of the room
 * toward white where that is the larger of the two.
 *
 * Spelled out again rather than imported from the generator. Read through the
 * function under test, both assertions below would follow a ramp that reaches
 * anywhere at all - which is the whole of what they pin.
 */
function roomAbove(baseLightness: number): number {
  return Math.max(MAX_USABLE_LIGHTNESS - baseLightness,
    (1 - baseLightness) * RESIDUAL_REACH);
}


/** The step the generator takes: the four steps divide the reach equally. */
function stepFor(baseLightness: number): number {
  return roomAbove(baseLightness) / (PALETTE_SLOTS.length - 1);
}


describe("generateMonochromatic", () => {

  describe("the ramp", () => {

    it("starts at the default lightness when no base color sets one", () => {
      eachSeedHue((palette, seedHue) => {
        expect(lightnessOf(palette)[0], `seed hue ${seedHue}`)
          .toBeCloseTo(DEFAULT_LIGHTNESS, 3);
      });
    });


    it("steps evenly through perceived lightness", () => {
      eachSeedHue((palette, seedHue) => {
        const gaps = gapsOf(palette);

        gaps.forEach((gap, index) => {
          expect(gap, `step ${index + 1} at seed hue ${seedHue}`)
            .toBeCloseTo(stepFor(DEFAULT_LIGHTNESS), 2);
          expect(Math.abs(gap - gaps[0]),
            `step ${index + 1} at seed hue ${seedHue}`)
            .toBeLessThan(STEP_TOLERANCE);
        });
      });
    });


    it("rises from the base toward white", () => {
      eachSeedHue((palette, seedHue) => {
        gapsOf(palette).forEach((gap, index) => {
          expect(gap, `step ${index + 1} at seed hue ${seedHue}`)
            .toBeGreaterThan(0);
        });
      });
    });


    it("spans the reach above the base", () => {
      eachSeedHue((palette, seedHue) => {
        const lightness = lightnessOf(palette);
        const spread = lightness[lightness.length - 1] - lightness[0];

        expect(spread, `seed hue ${seedHue}`)
          .toBeCloseTo(roomAbove(DEFAULT_LIGHTNESS), 2);
      });
    });


    // The band is what the top step's chroma rides on: above it no hue holds
    // the 0.02 a tint needs, so a ramp that keeps climbing toward white ends
    // on a near-white step whatever hue it was built at.
    it.each([0.24, 0.45, 0.62, 0.80])(
      "ends at the top of the usable band for a base at %s",
      lightness => {
        const base = chroma.oklch(lightness, 0.10, 265);

        const palette = generateMonochromatic(
          {color0: paletteColorFrom(base, "color0")}
        );

        const steps = lightnessOf(palette);

        expect(steps[steps.length - 1]).toBeCloseTo(MAX_USABLE_LIGHTNESS, 2);
      });

  });


  describe("the single hue", () => {

    it("holds the seed hue at every step", () => {
      eachSeedHue((palette, seedHue) => {
        PALETTE_SLOTS.forEach(slot => {
          const hue = palette[slot].color.oklch()[2];

          expect(hueDistance(hue, seedHue), `${slot} at seed hue ${seedHue}`)
            .toBeLessThan(HUE_TOLERANCE);
        });
      });
    });


    it("keeps every step tinted enough to show that hue", () => {
      eachSeedHue((palette, seedHue) => {
        PALETTE_SLOTS.forEach(slot => {
          expect(palette[slot].color.oklch()[1],
            `${slot} at seed hue ${seedHue}`).toBeGreaterThan(TINTED_CHROMA);
        });
      });
    });


    // A light base color is the case that asks for it: it leaves the ramp
    // little room, and the little there is sits at the end of the band where
    // `maxChroma()` has nearly run out. 265 degrees is the hue that runs out
    // first - see `MAX_USABLE_LIGHTNESS`.
    it.each([0.70, 0.80, 0.86])(
      "keeps a light base color's steps tinted too, from a base at %s",
      lightness => {
        const base = chroma.oklch(lightness, 0.10, 265);

        const palette = generateMonochromatic(
          {color0: paletteColorFrom(base, "color0")}
        );

        PALETTE_SLOTS.forEach(slot => {
          expect(palette[slot].color.oklch()[1], slot)
            .toBeGreaterThan(TINTED_CHROMA);
        });
      });

  });


  // The decision recorded in `fromOklch()`: clamp per step rather than pull the
  // whole ramp down to the lowest chroma its lightnesses share.
  it("aims for one chroma and drops only where the lightness cannot hold it", () => {
    eachSeedHue((palette, seedHue) => {
      const measured = PALETTE_SLOTS.map(slot => palette[slot].color.oklch());
      const aimedFor = Math.max(...measured.map(([, c]) => c));

      measured.forEach(([lightness, chromacity, hue], index) => {
        const boundary = maxChroma(lightness, hue);
        const label = `${PALETTE_SLOTS[index]} at seed hue ${seedHue}`;

        expect(chromacity, label)
          .toBeLessThanOrEqual(boundary + BOUNDARY_TOLERANCE);
        expect(Math.min(Math.abs(chromacity - aimedFor),
          Math.abs(chromacity - boundary)), label)
          .toBeLessThan(BOUNDARY_TOLERANCE);
      });
    });
  });


  it("keeps every color inside the sRGB gamut", () => {
    eachSeedHue((palette, seedHue) => {
      PALETTE_SLOTS.forEach(slot => {
        const [lightness, chromacity, hue] = palette[slot].color.oklch();

        // Not chroma-js' `clipped()` flag: the boundary itself can carry it,
        // see `maxChroma()`. What holds is that no step asks for more color
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

    const palette = generateMonochromatic({color2: pinned}, 210);

    expect(palette.color2).toBe(pinned);
  });


  it("starts the ramp at a given base color", () => {
    const base = chroma.oklch(0.45, 0.12, 300);

    // A seed hue beside it: the base color carries a hue of its own, and that
    // is the one the ramp holds.
    const palette = generateMonochromatic(
      {color0: paletteColorFrom(base, "color0")}, 30
    );

    const [baseLightness, baseChroma, baseHue] = base.oklch();

    gapsOf(palette).forEach((gap, index) => {
      expect(gap, `step ${index + 1}`).toBeCloseTo(stepFor(baseLightness), 2);
    });

    PALETTE_SLOTS.forEach(slot => {
      const [, chromacity, hue] = palette[slot].color.oklch();

      expect(hueDistance(hue, baseHue), slot).toBeLessThan(HUE_TOLERANCE);
      expect(chromacity, slot).toBeLessThanOrEqual(baseChroma + BOUNDARY_TOLERANCE);
    });
  });


  // A pure black base color reaches the generator through the converter and
  // through a contrast background. It sits below the floor the ramp starts
  // at, so the ramp the assertions read is the four generated steps - a
  // neutral palette that has simply stopped being one color.
  it("keeps a spread of lightness for a base color of #000000", () => {
    const base = chroma("#000000");

    for (let seedHue = 0; seedHue < 360; seedHue += 15) {
      const palette = generateMonochromatic(
        {color0: paletteColorFrom(base, "color0", base, true)}, seedHue
      );

      const generated = PALETTE_SLOTS.filter(slot => slot !== "color0");

      generated.forEach(slot => {
        expect(palette[slot].color.hex(),
          `${slot} at seed hue ${seedHue}`).not.toBe("#000000");
      });

      gapsOf(palette, generated).forEach((gap, index) => {
        expect(gap, `step ${index + 1} at seed hue ${seedHue}`)
          .toBeCloseTo(stepFor(MIN_USABLE_LIGHTNESS), 3);
      });
    }
  });


  // Nothing sits above white, so the ramp reaches nowhere and every step is
  // the base color again. The alternative is a ramp built somewhere the
  // visitor is not: capped at the band's top the four steps came back between
  // 0.92 and 0.96, all of them darker than the white they were built from.
  it("hands back the base color itself for a base color of #ffffff", () => {
    const base = chroma("#ffffff");

    for (let seedHue = 0; seedHue < 360; seedHue += 15) {
      const palette = generateMonochromatic(
        {color0: paletteColorFrom(base, "color0", base, true)}, seedHue
      );

      PALETTE_SLOTS.forEach(slot => {
        expect(palette[slot].color.hex(),
          `${slot} at seed hue ${seedHue}`).toBe("#ffffff");
      });
    }
  });


  // A base lighter than the band is what the Studio hands over whenever the
  // visitor is on a pastel, and the ramp has to keep rising from it: the slots
  // are called BASE, TINT, LIGHT, PALE and MIST and the description promises a
  // rise. Capping the start at `MAX_USABLE_LIGHTNESS` put all four steps below
  // the base instead - `#fffacd` came back with TINT darker than BASE, and
  // `#ffe9e4` repeated the base exactly at PALE.
  it.each(["#fffacd", "#ffe9e4", "#f0f8ff"])(
    "rises from a base color lighter than the band, from %s",
    hex => {
      const base = chroma(hex);

      const palette = generateMonochromatic(
        {color0: paletteColorFrom(base, "color0", base, true)}, 210
      );

      const steps = lightnessOf(palette);

      expect(steps[0], "the case under test")
        .toBeGreaterThan(MAX_USABLE_LIGHTNESS);

      gapsOf(palette).forEach((gap, index) => {
        expect(gap, `step ${index + 1}`).toBeGreaterThan(0);
      });
    });


  // The unseeded path is the one a regenerate takes: no seed hue reaches the
  // generator and `randomBetween()` draws the hue. The draw is the only thing
  // that varies, and the ramp has to hold whatever it returns.
  it("holds the ramp when the hue comes from the random draw", () => {
    for (let draw = 0; draw < 25; draw++) {
      const palette = generateMonochromatic();
      const hues = PALETTE_SLOTS.map(slot => palette[slot].color.oklch()[2]);

      expect(lightnessOf(palette)[0], `draw ${draw}`)
        .toBeCloseTo(DEFAULT_LIGHTNESS, 3);

      gapsOf(palette).forEach((gap, index) => {
        expect(gap, `step ${index + 1} of draw ${draw}`)
          .toBeCloseTo(stepFor(DEFAULT_LIGHTNESS), 2);
      });

      hues.forEach((hue, index) => {
        expect(hueDistance(hue, hues[0]), `${PALETTE_SLOTS[index]} of draw ${draw}`)
          .toBeLessThan(HUE_TOLERANCE);
      });
    }
  });


  // A base color carries a hue of its own, so the draw decides nothing and the
  // same base has to give the same palette twice over. A draw that reached
  // through would make the palette flicker while a color is dragged.
  it("repeats itself for the same base color without a seed hue", () => {
    const base = chroma.oklch(0.45, 0.12, 300);
    const paletteOf = () => generateMonochromatic(
      {color0: paletteColorFrom(base, "color0")}
    );

    const first = paletteOf();
    const second = paletteOf();

    PALETTE_SLOTS.forEach(slot => {
      expect(second[slot].color.hex(), slot).toBe(first[slot].color.hex());
    });
  });


  it("stays neutral throughout when the base color is a gray", () => {
    const gray = chroma("gray");
    expect(Number.isNaN(gray.oklch()[2]), "a gray has no hue").toBe(true);

    const palette = generateMonochromatic(
      {color0: paletteColorFrom(gray, "color0")}, 120
    );

    PALETTE_SLOTS.forEach(slot => {
      const [red, green, blue] = palette[slot].color.rgb();
      const spread = Math.max(red, green, blue) - Math.min(red, green, blue);

      expect(spread, slot).toBeLessThanOrEqual(NEUTRAL_CHANNEL_SPREAD);
      expect(palette[slot].color.oklch()[1], slot).toBeLessThan(NEUTRAL_CHROMA);
    });

    gapsOf(palette).forEach((gap, index) => {
      expect(gap, `step ${index + 1}`).toBeGreaterThan(0);
    });
  });

});
