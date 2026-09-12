import chroma from "chroma-js";
import {colornames} from "color-name-list/bestof";
import {colorName} from "@engine/color/color-name.helper";
import {CSS_COLOR_KEYWORDS} from "@engine/color/css-color-keywords.model";


const keywordSpellings = new Set(Object.values(CSS_COLOR_KEYWORDS));


/**
 * The search as it was first written, one `chroma.distance()` per candidate.
 * The helper now works on precomputed Lab values because a slider drag asks
 * for six names per frame; this is what it has to keep agreeing with. It skips
 * the entries a keyword already spells for the same reason the helper does.
 */
function referenceName(hex: string): string {
  const keyword = CSS_COLOR_KEYWORDS[hex];

  if (keyword) return keyword;

  let closest: {name: string} | undefined;
  let closestDistance = Infinity;

  for (const candidate of colornames) {
    if (keywordSpellings.has(candidate.name.toLowerCase())) continue;

    const distance = chroma.distance(hex, candidate.hex);

    if (distance < closestDistance) {
      closest = candidate;
      closestDistance = distance;
    }
  }

  return closest!.name;
}


describe("Color Name Helper", () => {

  describe("the name list", () => {

    // The reason the list was swapped in: a name that denotes two colors puts
    // two swatches of a monochromatic palette or a tint ramp under one label,
    // and a screen reader reads the same name twice for colors the eye
    // separates. A version bump that reintroduces a duplicate fails here.
    it("gives every color its own name", () => {
      const names = new Set(colornames.map(entry => entry.name));

      expect(names.size).toBe(colornames.length);
    });

    it("gives every name its own color", () => {
      const hexes = new Set(colornames.map(entry => entry.hex.toLowerCase()));

      expect(hexes.size).toBe(colornames.length);
    });

  });


  describe("CSS color keywords", () => {

    // An exact hex gets the keyword CSS defines for it, because the keyword
    // identifies the color to anyone who can paste it into a stylesheet and
    // the nearest prose name does not.
    it("should name pure red", () => {
      expect(colorName(chroma("#ff0000"))).toBe("red");
    });

    it("should name pure white", () => {
      expect(colorName(chroma("#ffffff"))).toBe("white");
    });

    it("should name pure black", () => {
      expect(colorName(chroma("#000000"))).toBe("black");
    });

    it("should name an exact CSS keyword", () => {
      expect(colorName(chroma("#4682b4"))).toBe("steelblue");
    });

    // chroma parses the keywords itself, so the table is checked against what
    // CSS defines rather than against the code that reads it: a hex typed
    // wrongly into the table would otherwise hand a visitor a keyword CSS
    // gives to another colour, and every assertion here would still pass.
    it("should name every keyword in the table", () => {
      for (const [hex, keyword] of Object.entries(CSS_COLOR_KEYWORDS)) {
        expect(chroma(keyword!).hex(), keyword).toBe(hex);
        expect(colorName(chroma(hex)), hex).toBe(keyword);
      }
    });

    // A name a keyword also spells is one word to a screen reader, which
    // hears no case. Left in the search, "Bisque" would name every neighbour
    // of `bisque`'s own hex, and a tint ramp across the two would read the
    // same name twice - the duplicate #140 was opened about.
    it("should keep a name a keyword already spells out of the search", () => {
      for (const entry of colornames) {
        if (!keywordSpellings.has(entry.name.toLowerCase())) continue;

        const [r, g, b] = chroma(entry.hex).rgb();
        const neighbour = chroma.rgb(r === 255 ? r - 1 : r + 1, g, b);

        expect(colorName(neighbour), entry.hex).not.toBe(entry.name);
      }
    });

    // One step away from the keyword the distance search takes over, so the
    // keyword never spreads over a region of the color space.
    it("should leave a color next to a keyword to the list", () => {
      expect(colorName(chroma("#4682b5"))).not.toBe("steelblue");
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
      expect(colorName(fractional)).toBe("Milk and Cookies");
    });

    it("should name a fractional dark color like its rounded hex", () => {
      const fractional = chroma.hsl(5, 0.4, 0.2);

      expect(fractional.hex()).toBe("#47221f");
      expect(colorName(fractional)).toBe(colorName(chroma("#47221f")));
      expect(colorName(fractional)).toBe("Bitter Chocolate");
    });

    it("should name a fractional mid-tone like its rounded hex", () => {
      const fractional = chroma.hsl(10, 0.3, 0.3);

      expect(fractional.hex()).toBe("#633d36");
      expect(colorName(fractional)).toBe(colorName(chroma("#633d36")));
      expect(colorName(fractional)).toBe("Brunette");
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
