import {describe, expect, it} from "vitest";
import chroma from "chroma-js";
import {
  ADDRESS_SEPARATOR,
  ContrastTypePage,
  contrastTypeAddressFrom,
  contrastTypePageFromAddress,
  ELEMENT_BITS,
  isRestorableContrastTypeAddress,
  MAX_PLACEMENTS,
  SOURCE_BITS,
  stepCountOf,
  typeAxesOf
} from "./contrast-type-address.model";
import {generatePaletteFrom} from "@engine/palette/palette.helper";
import {paletteSegmentFrom} from "@engine/palette/palette-segment.helper";
import {TYPE_ROLES} from "@engine/contrast/type-role.model";
import {base62LengthFor, BitField, packBits} from "@engine/helpers/bit-fields.helper";
import {bigIntToBase62} from "@engine/helpers/base62.helper";
import {CHIP_SOURCES} from "@contrast-type/models/chip-source.model";
import {ElementPlacements, SAMPLE_ELEMENTS, SAMPLE_PLACEMENTS} from "@contrast-type/models/sample-page.model";


describe("Contrast & Type address", () => {

  const palette = generatePaletteFrom(chroma("#3366cc"), "triadic", 11);

  const page: ContrastTypePage = {
    palette,
    seed: 11,
    text: chroma("#1a2b3c"),
    background: chroma("#fafaf0"),
    type: {
      display: {family: "Playfair Display", settings: {fontSize: 96, fontWeight: 700, lineHeight: 1.1}},
      body: {family: null, settings: {fontSize: 11, fontWeight: 300, lineHeight: 1.35}},
      mono: {family: "IBM Plex Mono", settings: {fontSize: 34, fontWeight: 400, lineHeight: 2}},
      ui: {family: "Noto Sans JP", settings: {fontSize: 15, fontWeight: 600, lineHeight: 1}}
    },
    placements: {
      headline: {ink: "color2"},
      filledButton: {ink: "text", ground: "background"}
    }
  };


  function withPlacements(placements: ElementPlacements): ContrastTypePage {
    return {...page, placements};
  }


  /** Every side of every element, each from a source of the row. */
  function everyPlacement(): ElementPlacements {
    return Object.fromEntries(SAMPLE_ELEMENTS.map((element, index) => [
      element.key,
      {ink: CHIP_SOURCES[index % CHIP_SOURCES.length], ground: CHIP_SOURCES[(index + 3) % CHIP_SOURCES.length]}
    ]));
  }


  function segmentsOf(address: string): string[] {
    return address.split(ADDRESS_SEPARATOR);
  }


  /**
   * A view segment spelled from raw field values: the pair, the twelve type
   * indices, then element, side and source per placement - so a spec can
   * write values the encoder never would.
   */
  function rawView(typeIndices: readonly number[], placements: readonly (readonly [number, number, number])[]): string {
    const fields: BitField[] = [
      {value: 0x1a2b3c, bits: 24},
      {value: 0xfafaf0, bits: 24},
      ...TYPE_ROLES.flatMap(role => typeAxesOf(role))
        .map((axis, index) => ({value: typeIndices[index], bits: axis.bits})),
      ...placements.flatMap(([element, side, source]) => [
        {value: element, bits: ELEMENT_BITS},
        {value: side, bits: 1},
        {value: source, bits: SOURCE_BITS}
      ])
    ];
    const bits = fields.reduce((sum, field) => sum + field.bits, 0);

    return bigIntToBase62(BigInt(placements.length), 1) + bigIntToBase62(packBits(fields), base62LengthFor(bits));
  }


  /** Type indices every axis can stand on. */
  const validTypeIndices = Array.from({length: 12}, () => 0);


  function addressWithView(view: string): string {
    return [paletteSegmentFrom(palette, 11), view, ",,,"].join(ADDRESS_SEPARATOR);
  }


  describe("round trip", () => {

    it("brings back the pair, the palette with its seed, the type and the placements", () => {
      const restored = contrastTypePageFromAddress(contrastTypeAddressFrom(page));

      expect(restored.text.hex()).toBe(page.text.hex());
      expect(restored.background.hex()).toBe(page.background.hex());
      expect(restored.palette.id).toBe(palette.id);
      expect(restored.seed).toBe(11);
      expect(restored.type).toEqual(page.type);
      expect(restored.placements).toEqual(page.placements);
    });

    it("carries every placement a page can hold", () => {
      const full = withPlacements(everyPlacement());
      const restored = contrastTypePageFromAddress(contrastTypeAddressFrom(full));

      expect(restored.placements).toEqual(full.placements);
    });

    it("carries every value each type axis can stand on", () => {
      for (const role of TYPE_ROLES) {
        for (const axis of typeAxesOf(role)) {
          for (let step = 0; step < stepCountOf(axis.range); step++) {
            const value = Number((axis.range.min + step * axis.range.step).toFixed(2));
            const settings = {...page.type[role].settings, [axis.name]: value};
            const typed = {...page, type: {...page.type, [role]: {...page.type[role], settings}}};

            expect(contrastTypePageFromAddress(contrastTypeAddressFrom(typed)).type[role].settings[axis.name])
              .toBe(value);
          }
        }
      }
    });

    it("carries family names with the characters that separate the address", () => {
      const awkward = {
        ...page,
        type: {...page.type, display: {...page.type.display, family: "A, B/C %D é"}}
      };

      const address = contrastTypeAddressFrom(awkward);

      expect(segmentsOf(address)).toHaveLength(3);
      expect(contrastTypePageFromAddress(address).type.display.family).toBe("A, B/C %D é");
    });

    it("writes the same address for the same page, whatever order the placements were made in", () => {
      const reordered = withPlacements({
        filledButton: {ground: "background", ink: "text"},
        headline: {ink: "color2"}
      });

      expect(contrastTypeAddressFrom(reordered)).toBe(contrastTypeAddressFrom(page));
    });

  });


  describe("the frame", () => {

    it("is three segments, the palette segment first", () => {
      const [first] = segmentsOf(contrastTypeAddressFrom(page));

      expect(first).toBe(paletteSegmentFrom(palette, 11));
    });

    it("spells the encoded segments in base62 alone", () => {
      const [first, second] = segmentsOf(contrastTypeAddressFrom(withPlacements(everyPlacement())));

      expect(first).toMatch(/^[0-9A-Za-z]+$/);
      expect(second).toMatch(/^[0-9A-Za-z]+$/);
    });

    it("takes 23 characters for the view of three placements and 85 for all of them", () => {
      const three = withPlacements({headline: {ink: "color2"}, lead: {ground: "color1"}, quote: {ink: "text"}});

      expect(segmentsOf(contrastTypeAddressFrom(three))[1]).toHaveLength(23);
      expect(segmentsOf(contrastTypeAddressFrom(withPlacements(everyPlacement())))[1]).toHaveLength(85);
    });

    it("leaves a family field empty for the app's own type", () => {
      const own = {
        ...page,
        type: Object.fromEntries(TYPE_ROLES.map(role => [role, {...page.type[role], family: null}]))
      } as ContrastTypePage;

      expect(segmentsOf(contrastTypeAddressFrom(own))[2]).toBe(",,,");
    });

  });


  describe("what the encoder refuses", () => {

    it("a type setting off its grid", () => {
      const off = {...page, type: {...page.type, body: {...page.type.body, settings: {fontSize: 18, fontWeight: 450, lineHeight: 1.6}}}};

      expect(() => contrastTypeAddressFrom(off)).toThrow();
    });

    it("a display size outside the display range", () => {
      const off = {...page, type: {...page.type, display: {...page.type.display, settings: {fontSize: 20, fontWeight: 500, lineHeight: 1.1}}}};

      expect(() => contrastTypeAddressFrom(off)).toThrow();
    });

  });


  describe("what the decoder rejects", () => {

    const valid = contrastTypeAddressFrom(page);
    const [paletteSegment, viewSegment, facesSegment] = segmentsOf(valid);


    it("accepts the address the encoder wrote and a hand-spelled one with valid fields", () => {
      expect(isRestorableContrastTypeAddress(valid)).toBe(true);
      expect(isRestorableContrastTypeAddress(addressWithView(rawView(validTypeIndices, [[0, 0, 0]])))).toBe(true);
    });

    it("an address with a segment too few or too many", () => {
      expect(isRestorableContrastTypeAddress([paletteSegment, viewSegment].join("/"))).toBe(false);
      expect(isRestorableContrastTypeAddress([valid, "x"].join("/"))).toBe(false);
    });

    it("a palette segment the palette decoder rejects", () => {
      expect(isRestorableContrastTypeAddress([paletteSegment.slice(0, -1), viewSegment, facesSegment].join("/")))
        .toBe(false);
    });

    it("a view segment of the wrong length for its count", () => {
      expect(isRestorableContrastTypeAddress([paletteSegment, viewSegment + "0", facesSegment].join("/"))).toBe(false);
      expect(isRestorableContrastTypeAddress([paletteSegment, viewSegment.slice(0, -1), facesSegment].join("/"))).toBe(false);
    });

    it("a count beyond the placements a page can hold", () => {
      const tooMany = bigIntToBase62(BigInt(MAX_PLACEMENTS + 1), 1) + viewSegment.substring(1);

      expect(isRestorableContrastTypeAddress([paletteSegment, tooMany, facesSegment].join("/"))).toBe(false);
    });

    it("a view whose value reaches past its bits", () => {
      const view = rawView(validTypeIndices, []);
      const largest = "0" + "z".repeat(view.length - 1);

      expect(isRestorableContrastTypeAddress(addressWithView(largest))).toBe(false);
    });

    it("a character outside base62", () => {
      const view = viewSegment.slice(0, -1) + "-";

      expect(isRestorableContrastTypeAddress([paletteSegment, view, facesSegment].join("/"))).toBe(false);
    });

    it("a type index beyond its axis", () => {
      const displaySize = stepCountOf(typeAxesOf("display")[0].range);
      const weight = stepCountOf(typeAxesOf("body")[1].range);

      const sizeTooLarge = [...validTypeIndices];
      sizeTooLarge[0] = displaySize;
      const weightTooLarge = [...validTypeIndices];
      weightTooLarge[4] = weight;

      expect(isRestorableContrastTypeAddress(addressWithView(rawView(sizeTooLarge, [])))).toBe(false);
      expect(isRestorableContrastTypeAddress(addressWithView(rawView(weightTooLarge, [])))).toBe(false);
    });

    it("an element or a source the lists do not have", () => {
      expect(isRestorableContrastTypeAddress(addressWithView(rawView(validTypeIndices, [[SAMPLE_ELEMENTS.length, 0, 0]]))))
        .toBe(false);
      expect(isRestorableContrastTypeAddress(addressWithView(rawView(validTypeIndices, [[0, 0, CHIP_SOURCES.length]]))))
        .toBe(false);
    });

    it("a placement out of page order or written twice", () => {
      expect(isRestorableContrastTypeAddress(addressWithView(rawView(validTypeIndices, [[3, 0, 0], [1, 0, 0]]))))
        .toBe(false);
      expect(isRestorableContrastTypeAddress(addressWithView(rawView(validTypeIndices, [[2, 1, 0], [2, 0, 0]]))))
        .toBe(false);
      expect(isRestorableContrastTypeAddress(addressWithView(rawView(validTypeIndices, [[2, 0, 0], [2, 0, 1]]))))
        .toBe(false);
    });

    it("a typeface segment with a field too few or too many", () => {
      expect(isRestorableContrastTypeAddress(addressWithView(rawView(validTypeIndices, [])).replace(/,,,$/, ",,"))).toBe(false);
      expect(isRestorableContrastTypeAddress(addressWithView(rawView(validTypeIndices, [])).replace(/,,,$/, ",,,,"))).toBe(false);
    });

    it("a family name that does not decode or names nothing", () => {
      const view = rawView(validTypeIndices, []);
      const withFaces = (faces: string) => [paletteSegmentFrom(palette, 11), view, faces].join("/");

      expect(isRestorableContrastTypeAddress(withFaces("%E0%A4%A,,,"))).toBe(false);
      expect(isRestorableContrastTypeAddress(withFaces("%20,,,"))).toBe(false);
      expect(isRestorableContrastTypeAddress(withFaces("A%0AB,,,"))).toBe(false);
    });

    it("throws where it cannot read rather than handing back a page", () => {
      expect(() => contrastTypePageFromAddress("")).toThrow();
    });

  });


  describe("the lists the address indexes", () => {

    // The address names an element, a source and a role by its index. A list
    // reordered or extended mid-way changes what every address already written
    // means - a new entry goes at the end, and the literal here moves with it.

    it("keeps the elements in the order addresses were written in", () => {
      expect(SAMPLE_ELEMENTS.map(element => element.key)).toEqual([
        "navActive", "navItems", "signIn", "eyebrow", "headline", "lead",
        "filledButton", "ghostButton", "disabledButton", "bodyText", "bodyLink",
        "fieldLabel", "fieldText", "errorLine", "imageLabel", "imageCaption",
        "tableHeader", "tableCell", "tableNumber", "cardLabel", "quote", "smallPrint"
      ]);
    });

    it("keeps the sources, the sides and the roles in their order", () => {
      expect(CHIP_SOURCES).toEqual(["color0", "color1", "color2", "color3", "color4", "text", "background"]);
      expect(SAMPLE_PLACEMENTS).toEqual(["ink", "ground"]);
      expect(TYPE_ROLES).toEqual(["display", "body", "mono", "ui"]);
    });

    it("fits every list and every axis into the width its field has", () => {
      expect(SAMPLE_ELEMENTS.length).toBeLessThanOrEqual(2 ** ELEMENT_BITS);
      expect(CHIP_SOURCES.length).toBeLessThanOrEqual(2 ** SOURCE_BITS);
      expect(MAX_PLACEMENTS).toBeLessThan(62);

      for (const role of TYPE_ROLES) {
        for (const axis of typeAxesOf(role)) {
          expect(stepCountOf(axis.range)).toBeLessThanOrEqual(2 ** axis.bits);
        }
      }
    });

  });

});
