import {describe, expect, it} from "vitest";
import chroma from "chroma-js";
import {generateVibrantBalanced} from "@palettes/helper/vibrant-palette.helper";
import {paletteColorFrom} from "@palettes/models/palette-color.model";
import {PALETTE_SLOTS, Palette, PaletteSlot} from "@palettes/models/palette.model";
import {maxChroma} from "@common/helpers/oklch.helper";


/** The three accents; the remaining two are the light colors backing them. */
const ACCENT_SLOTS: PaletteSlot[] = ["color0", "color1", "color2"];

/** The two light colors that back the accents. */
const LIGHT_SLOTS: PaletteSlot[] = ["color3", "color4"];

/** Float noise of the OKLch round trip, far below a visible step. */
const TOLERANCE = 1e-3;

/**
 * How far an accent hue may sit from its nominal triad position: the jitter
 * of both endpoints plus the noise of the round trip.
 */
const HUE_JITTER_ALLOWANCE = 13;

/**
 * How far a single color's hue may sit from its nominal position: its own
 * jitter - 6 degrees for an accent, 8 for a light color - plus the noise.
 */
const SINGLE_HUE_ALLOWANCE = 9;

/**
 * A gray seed cannot travel through OKLch bit-exact: `chroma("gray")` reports
 * a chroma of 2.3e-5 rather than 0, and chroma-js rounds one channel
 * differently at some lightnesses even at chroma 0 exactly. Both shift a
 * single channel by one step, which is invisible. Neutrality is therefore
 * asserted as a negligible chroma and a channel spread of at most one - not
 * as equal RGB bytes, which fails for about 5 % of the random jitter.
 */
const NEUTRAL_CHROMA = 1e-3;
const NEUTRAL_CHANNEL_SPREAD = 1;


function eachSeedHue(assertion: (palette: Palette, seedHue: number) => void) {
  for (let seedHue = 0; seedHue < 360; seedHue += 15) {
    assertion(generateVibrantBalanced({}, seedHue), seedHue);
  }
}


function lightnessOf(palette: Palette, slots: PaletteSlot[]): number[] {
  return slots.map(slot => palette[slot].color.oklch()[0]);
}


function chromaOf(palette: Palette, slots: PaletteSlot[]): number[] {
  return slots.map(slot => palette[slot].color.oklch()[1]);
}


/** Shortest angular distance between two hues, in degrees. */
function hueDistance(actual: number, nominal: number): number {
  return Math.abs(((actual - nominal + 540) % 360) - 180);
}


describe("generateVibrantBalanced", () => {

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
        expect(hueDistance(palette.color0.color.oklch()[2], seedHue),
          `seed hue ${seedHue}`).toBeLessThan(SINGLE_HUE_ALLOWANCE);
      });
    });


    it("sit 120 degrees apart, up to their hue jitter", () => {
      eachSeedHue((palette, seedHue) => {
        const [h0, h1, h2] = ACCENT_SLOTS
          .map(slot => palette[slot].color.oklch()[2]);

        expect(Math.abs(((h1 - h0) % 360 + 360) % 360 - 120),
          `seed hue ${seedHue}`).toBeLessThan(HUE_JITTER_ALLOWANCE);
        expect(Math.abs(((h2 - h1) % 360 + 360) % 360 - 120),
          `seed hue ${seedHue}`).toBeLessThan(HUE_JITTER_ALLOWANCE);
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

          expect(c, label).toBeLessThanOrEqual(boundary + TOLERANCE);
          expect(Math.min(Math.abs(c - aimedFor), Math.abs(c - boundary)),
            label).toBeLessThan(TOLERANCE);
        });
      });
    });


    // What the style is called: the accents give up chroma only to the gamut,
    // so most of them land on the sRGB boundary rather than below it.
    it("stay more colorful than the light colors", () => {
      eachSeedHue((palette, seedHue) => {
        const leastColorfulAccent = Math.min(...chromaOf(palette, ACCENT_SLOTS));

        chromaOf(palette, LIGHT_SLOTS).forEach((chromacity, index) => {
          expect(chromacity, `${LIGHT_SLOTS[index]} at seed hue ${seedHue}`)
            .toBeLessThan(leastColorfulAccent);
        });
      });
    });

  });


  describe("the two light colors", () => {

    it("sit lighter than the accents", () => {
      eachSeedHue((palette, seedHue) => {
        const [accentLightness] = lightnessOf(palette, ACCENT_SLOTS);

        lightnessOf(palette, LIGHT_SLOTS).forEach((lightness, index) => {
          expect(lightness, `${LIGHT_SLOTS[index]} at seed hue ${seedHue}`)
            .toBeGreaterThan(accentLightness);
        });
      });
    });


    // The light colors are not a fourth and fifth triad member: they carry
    // their own offsets from the seed hue, so they read as a backdrop.
    it("sit at their own hues off the triad", () => {
      eachSeedHue((palette, seedHue) => {
        expect(hueDistance(palette.color3.color.oklch()[2], seedHue + 60),
          `color3 at seed hue ${seedHue}`).toBeLessThan(SINGLE_HUE_ALLOWANCE);
        expect(hueDistance(palette.color4.color.oklch()[2], seedHue - 20),
          `color4 at seed hue ${seedHue}`).toBeLessThan(SINGLE_HUE_ALLOWANCE);
      });
    });


    it("keep a visible tint rather than turning gray", () => {
      eachSeedHue((palette, seedHue) => {
        chromaOf(palette, LIGHT_SLOTS).forEach((chromacity, index) => {
          expect(chromacity, `${LIGHT_SLOTS[index]} at seed hue ${seedHue}`)
            .toBeGreaterThan(0.02);
        });
      });
    });


    // The lift is a share of the room above the accents, not a fixed offset,
    // so a light base color cannot push either of them into plain white.
    it("stay below white even for a nearly white base color", () => {
      const base = chroma.oklch(0.97, 0.02, 60);

      for (let seedHue = 0; seedHue < 360; seedHue += 15) {
        const palette = generateVibrantBalanced(
          {color0: paletteColorFrom(base, "color0")}, seedHue
        );

        LIGHT_SLOTS.forEach(slot => {
          const label = `${slot} at seed hue ${seedHue}`;

          expect(palette[slot].color.oklch()[0], label).toBeLessThan(1);
          expect(palette[slot].color.hex(), label).not.toBe("#ffffff");
        });
      }
    });

  });


  it("keeps every color inside the sRGB gamut", () => {
    eachSeedHue((palette, seedHue) => {
      PALETTE_SLOTS.forEach(slot => {
        expect(palette[slot].color.clipped(), `${slot} at seed hue ${seedHue}`)
          .toBe(false);
      });
    });
  });


  it("leaves pinned colors untouched", () => {
    const pinned = paletteColorFrom(
      chroma("#123456"), "color2", chroma("#123456"), true
    );

    const palette = generateVibrantBalanced({color2: pinned}, 210);

    expect(palette.color2).toBe(pinned);
  });


  it("adopts lightness and hue of a given base color", () => {
    const base = chroma.oklch(0.45, 0.12, 300);

    const palette = generateVibrantBalanced(
      {color0: paletteColorFrom(base, "color0")}
    );

    const [baseLightness, , baseHue] = base.oklch();

    expect(palette.color1.color.oklch()[0]).toBeCloseTo(baseLightness, 2);
    expect(hueDistance(palette.color1.color.oklch()[2], baseHue + 120))
      .toBeLessThan(SINGLE_HUE_ALLOWANCE);
  });


  it("stays neutral throughout when the base color is a gray", () => {
    const gray = chroma("gray");
    expect(Number.isNaN(gray.oklch()[2]), "a gray has no hue").toBe(true);

    const palette = generateVibrantBalanced(
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
