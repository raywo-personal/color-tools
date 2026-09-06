import {describe, expect, it} from "vitest";
import chroma from "chroma-js";
import {createContrastColors} from "@engine/contrast/contrast-colors.model";
import {TYPE_ROLES} from "@engine/contrast/type-role.model";
import {generatePalette} from "@engine/palette/palette.helper";
import {
  elementsOf,
  figureElementOf,
  groundOf,
  inkOf,
  roleOf,
  SAMPLE_ELEMENTS,
  sampleElement,
  samplePageColors
} from "@contrast-type/models/sample-page.model";


describe("sample page", () => {

  it("gives every element exactly one role, and every role at least one element", () => {
    // A role without an element would leave the rating with nothing to
    // measure and the segment with nothing to set.
    for (const role of TYPE_ROLES) {
      expect(elementsOf(role).length, role).toBeGreaterThan(0);
    }

    const covered = TYPE_ROLES.flatMap(role => elementsOf(role).map(element => element.key));

    expect(covered.sort()).toEqual(SAMPLE_ELEMENTS.map(element => element.key).sort());
  });


  it("assigns the elements the way the issue reads the page", () => {
    // Display for the headline, body for the reading content, mono for the
    // labels, UI for what a visitor would press.
    expect(roleOf("headline")).toBe("display");
    expect(["lead", "bodyText", "quote", "smallPrint"].map(roleOf)).toEqual(["body", "body", "body", "body"]);
    expect(["eyebrow", "cardLabel"].map(roleOf)).toEqual(["mono", "mono"]);
    expect(["filledButton", "ghostButton", "navItems", "signIn"].map(roleOf)).toEqual(["ui", "ui", "ui", "ui"]);
  });


  it("hands the figure exactly one element per role, the one the visitor is setting", () => {
    // The weakest element answered nothing: the small print in the dim ink
    // fails at Lc 100 whatever the pair is.
    expect(figureElementOf("display").key).toBe("headline");
    expect(figureElementOf("body").key).toBe("bodyText");
    expect(figureElementOf("mono").key).toBe("eyebrow");
    expect(figureElementOf("ui").key).toBe("filledButton");

    for (const role of TYPE_ROLES) {
      expect(elementsOf(role).filter(element => element.figure), role).toHaveLength(1);
    }
  });


  it("keeps the keys unique, since the rating tracks rows by them", () => {
    const keys = SAMPLE_ELEMENTS.map(element => element.key);

    expect(new Set(keys).size).toBe(keys.length);
  });


  it("refuses a key nobody defined rather than answering undefined", () => {
    expect(() => sampleElement("footnote")).toThrow(/footnote/);
  });


  it("paints the pair as it is and measures the inks it derives", () => {
    const pair = createContrastColors(chroma("#111111"), chroma("#EEEEEE"));
    const colors = samplePageColors(pair, generatePalette("triadic"));

    expect(colors.page.hex("rgb")).toBe("#eeeeee");
    expect(colors.text.hex("rgb")).toBe("#111111");

    // The body text is the pair; the small print is the dim ink on the page,
    // which is where the figure usually lands.
    expect(inkOf(sampleElement("bodyText"), colors)).toBe(colors.text);
    expect(groundOf(sampleElement("bodyText"), colors)).toBe(colors.page);
    expect(inkOf(sampleElement("smallPrint"), colors)).toBe(colors.dim);
    expect(groundOf(sampleElement("filledButton"), colors)).toBe(colors.accent);
  });


  it("keeps a role off the pair's ground", () => {
    // `color0` is the accent and a candidate for the ground once a pair is
    // taken from the palette; the roles read the remaining slots instead.
    const palette = generatePalette("triadic");
    const ground = palette.color0.color;
    const colors = samplePageColors(createContrastColors(chroma("#111111"), ground), palette);

    expect(colors.accent.hex("rgb")).toBe(palette.color1.color.hex("rgb"));
  });

});
