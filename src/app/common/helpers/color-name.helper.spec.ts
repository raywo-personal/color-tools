import chroma from "chroma-js";
import basic from "color-namer/lib/colors/basic";
import html from "color-namer/lib/colors/html";
import ntc from "color-namer/lib/colors/ntc";
import pantone from "color-namer/lib/colors/pantone";
import roygbiv from "color-namer/lib/colors/roygbiv";
import x11 from "color-namer/lib/colors/x11";
import {colorName} from "@common/helpers/color-name.helper";


/**
 * The search as it was first written, one `chroma.distance()` per candidate.
 * The helper now works on precomputed Lab values because a slider drag asks
 * for six names per frame; this is what it has to keep agreeing with.
 */
function referenceName(hex: string): string {
  const lists = [basic, html, ntc, pantone, roygbiv, x11];
  let closest: {name: string} | undefined;
  let closestDistance = Infinity;
  let closestPantone: {name: string} | undefined;
  let closestPantoneDistance = Infinity;

  for (const list of lists) {
    for (const candidate of list) {
      const distance = chroma.distance(hex, candidate.hex);

      if (distance < closestDistance) {
        closest = candidate;
        closestDistance = distance;
      }

      if (list === pantone && distance < closestPantoneDistance) {
        closestPantone = candidate;
        closestPantoneDistance = distance;
      }
    }
  }

  return closestPantone && closestPantoneDistance <= closestDistance + 5
    ? closestPantone.name
    : closest!.name;
}


describe("Color Name Helper", () => {

  describe("colorName", () => {

    describe("exact matches from the color lists", () => {

      it("should name pure red", () => {
        expect(colorName(chroma("#ff0000"))).toBe("red");
      });

      it("should name pure white", () => {
        expect(colorName(chroma("#ffffff"))).toBe("white");
      });

      it("should name pure black", () => {
        expect(colorName(chroma("#000000"))).toBe("black");
      });

      it("should name an exact x11 color", () => {
        expect(colorName(chroma("#4682b4"))).toBe("steelblue");
      });

    });


    describe("Pantone preference", () => {

      it("should prefer a Pantone name that is within the tolerance", () => {
        // Closest overall is "True V" at 2.75; the closest Pantone entry
        // "Blue Violet" is at 7.40, still within 2.75 + 5.
        expect(colorName(chroma("#8474d4"))).toBe("Blue Violet");
      });

      it("should keep the closest name when Pantone is beyond the tolerance", () => {
        // Closest overall "Prussian Blue" at 2.40, closest Pantone
        // "Midnight Blue" at 11.05 - far outside 2.40 + 5.
        expect(colorName(chroma("#123456"))).toBe("Prussian Blue");
      });

    });


    describe("channel quantization", () => {

      // `chroma.hsl()` and the Bezier interpolation used for tints, shades and
      // palettes produce colors with fractional RGB channels. The name must be
      // derived from the 8-bit color the user actually sees, not from the
      // unrounded channels - otherwise a color and its shared-palette-ID
      // round-trip (which goes through 8-bit RGB) get different names.
      it("should name a fractional color like its rounded hex", () => {
        const fractional = chroma.hsl(0, 0.2, 0.9);

        expect(fractional.hex()).toBe("#ebe0e0");
        expect(colorName(fractional)).toBe(colorName(chroma("#ebe0e0")));
        expect(colorName(fractional)).toBe("Timberwolf");
      });

      it("should name a fractional dark color like its rounded hex", () => {
        const fractional = chroma.hsl(5, 0.4, 0.2);

        expect(fractional.hex()).toBe("#47221f");
        expect(colorName(fractional)).toBe(colorName(chroma("#47221f")));
        expect(colorName(fractional)).toBe("Crater Brown");
      });

      it("should name a fractional mid-tone like its rounded hex", () => {
        const fractional = chroma.hsl(10, 0.3, 0.3);

        expect(fractional.hex()).toBe("#633d36");
        expect(colorName(fractional)).toBe(colorName(chroma("#633d36")));
        expect(colorName(fractional)).toBe("Congo Brown");
      });

    });


    describe("the precomputed search", () => {

      it("names every color the way one chroma.distance() per candidate did", () => {
        // A deterministic sweep, so a disagreement names the same color twice.
        // Steps of 51 visit every corner and face of the cube plus its centre.
        for (let r = 0; r < 256; r += 51) {
          for (let g = 0; g < 256; g += 51) {
            for (let b = 0; b < 256; b += 51) {
              const hex = chroma.rgb(r, g, b).hex();

              expect(colorName(chroma(hex)), hex).toBe(referenceName(hex));
            }
          }
        }
      });

    });


    describe("stability across the palette-ID round trip", () => {

      // A shared palette URL stores 8-bit RGB. A color and its restored twin
      // must therefore always carry the same name.
      it("should survive an 8-bit RGB round trip", () => {
        const original = chroma.hsl(210, 0.55, 0.45);
        const [r, g, b] = original.rgb();
        const restored = chroma.rgb(r, g, b);

        expect(colorName(original)).toBe(colorName(restored));
      });

      it("should never return the Unknown fallback for a valid color", () => {
        expect(colorName(chroma.hsl(137, 0.42, 0.63))).not.toBe("Unknown");
      });

    });

  });

});
