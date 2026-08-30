import {describe, expect, it} from "vitest";
import chroma from "chroma-js";
import {generateTriadic} from "@palettes/helper/triadic-palette.helper";
import {paletteColorFrom} from "@palettes/models/palette-color.model";
import {PALETTE_SLOTS, Palette, PaletteSlot} from "@palettes/models/palette.model";
import {maxChroma} from "@common/helpers/oklch.helper";


/** The three accents; the remaining two are the near-neutral supports. */
const ACCENT_SLOTS: PaletteSlot[] = ["color0", "color1", "color2"];

/** The two supports that back the accents. */
const SUPPORT_SLOTS: PaletteSlot[] = ["color3", "color4"];

/** Float noise of the OKLch round trip, far below a visible step. */
const TOLERANCE = 1e-3;

/** Any chroma below this reads as a neutral rather than as a color. */
const NEAR_NEUTRAL_CHROMA = 0.05;

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
    assertion(generateTriadic({}, seedHue), seedHue);
  }
}


function lightnessOf(palette: Palette, slots: PaletteSlot[]): number[] {
  return slots.map(slot => palette[slot].color.oklch()[0]);
}


describe("generateTriadic", () => {

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
        expect(palette.color0.color.oklch()[2], `seed hue ${seedHue}`)
          .toBeCloseTo(seedHue, 1);
      });
    });


    it("sit 120 degrees apart", () => {
      eachSeedHue((palette, seedHue) => {
        const [h0, h1, h2] = ACCENT_SLOTS
          .map(slot => palette[slot].color.oklch()[2]);

        expect(Math.abs(((h1 - h0) % 360 + 360) % 360 - 120),
          `seed hue ${seedHue}`).toBeLessThan(2);
        expect(Math.abs(((h2 - h1) % 360 + 360) % 360 - 120),
          `seed hue ${seedHue}`).toBeLessThan(2);
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

  });


  describe("the two supports", () => {

    it("sit lighter than the accents", () => {
      eachSeedHue((palette, seedHue) => {
        const [accentLightness] = lightnessOf(palette, ACCENT_SLOTS);

        lightnessOf(palette, SUPPORT_SLOTS).forEach((lightness, index) => {
          expect(lightness, `${SUPPORT_SLOTS[index]} at seed hue ${seedHue}`)
            .toBeGreaterThan(accentLightness);
        });
      });
    });


    it("stay near-neutral", () => {
      eachSeedHue((palette, seedHue) => {
        SUPPORT_SLOTS.forEach(slot => {
          expect(palette[slot].color.oklch()[1], `${slot} at seed hue ${seedHue}`)
            .toBeLessThan(NEAR_NEUTRAL_CHROMA);
        });
      });
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

    const palette = generateTriadic({color2: pinned}, 210);

    expect(palette.color2).toBe(pinned);
  });


  it("adopts lightness and hue of a given base color", () => {
    const base = chroma.oklch(0.45, 0.12, 300);

    const palette = generateTriadic({color0: paletteColorFrom(base, "color0")});

    const [, , baseHue] = base.oklch();
    expect(palette.color1.color.oklch()[0])
      .toBeCloseTo(base.oklch()[0], 2);
    expect(palette.color1.color.oklch()[2])
      .toBeCloseTo((baseHue + 120) % 360, 0);
  });


  // A pure black or white base color reaches the generator through the
  // converter and through a contrast background. At those two lightnesses no
  // hue holds any chroma, so without the clamp in `usableLightness()` every
  // slot came out the same black or white - clipped, and unchanged by a
  // regenerate. Both remain neutral palettes; they just stop being one color.
  it.each(["#000000", "#ffffff"])(
    "keeps a spread of lightness for a base color of %s", hex => {
      const base = chroma(hex);

      for (let seedHue = 0; seedHue < 360; seedHue += 15) {
        const palette = generateTriadic(
          {color0: paletteColorFrom(base, "color0", base, true)}, seedHue
        );

        const generated = PALETTE_SLOTS.filter(slot => slot !== "color0");

        generated.forEach(slot => {
          expect(palette[slot].color.clipped(),
            `${slot} at seed hue ${seedHue}`).toBe(false);
          expect(palette[slot].color.hex(),
            `${slot} at seed hue ${seedHue}`).not.toBe(hex);
        });

        const lightness = lightnessOf(palette, generated);
        const spread = Math.max(...lightness) - Math.min(...lightness);

        expect(spread, `seed hue ${seedHue}`).toBeGreaterThan(0.005);
      }
    });


  it("stays neutral throughout when the base color is a gray", () => {
    const gray = chroma("gray");
    expect(Number.isNaN(gray.oklch()[2]), "a gray has no hue").toBe(true);

    const palette = generateTriadic(
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
