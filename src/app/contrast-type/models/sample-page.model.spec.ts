import {describe, expect, it} from "vitest";
import chroma, {Color} from "chroma-js";
import {createContrastColors} from "@engine/contrast/contrast-colors.model";
import {TYPE_ROLES} from "@engine/contrast/type-role.model";
import {generatePalette} from "@engine/palette/palette.helper";
import {PaletteStyle} from "@engine/palette/palette-style.model";
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


  it("takes the roles the issue names for the elements where a palette fails", () => {
    // #146 assigns these four against the draft, which sets the table's
    // figures and the field's label in the mono face: a number a visitor
    // reads off a UI is UI type, and so is the label on a control.
    expect(["disabledButton", "navActive", "fieldLabel", "tableNumber"].map(roleOf))
      .toEqual(["ui", "ui", "ui", "ui"]);
    expect(["bodyLink", "fieldText", "errorLine", "imageCaption", "tableCell"].map(roleOf))
      .toEqual(["body", "body", "body", "body", "body"]);
    expect(["imageLabel", "tableHeader"].map(roleOf)).toEqual(["mono", "mono"]);
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


  it("writes the disabled label weaker than the dim ink, which is the point of it", () => {
    // A control nobody can press is the one place a page is meant to be hard
    // to read, and the first thing a thin pairing loses. A disabled label at
    // or above the dim ink would make the button look merely quiet.
    const pair = createContrastColors(chroma("#111111"), chroma("#EEEEEE"));
    const colors = samplePageColors(pair, generatePalette("triadic"));

    const disabled = Math.abs(chroma.contrastAPCA(colors.onMuted, colors.muted));
    const dim = Math.abs(chroma.contrastAPCA(colors.dim, colors.page));

    expect(disabled).toBeLessThan(dim);
  });


  it("sinks the form field the same way the nav bar lifts, on either kind of page", () => {
    // One direction leaves the field invisible on one of the two pages a
    // visitor can build - the same reason the nav bar picks its target.
    const lightness = (color: Color) => color.oklch()[0];

    for (const background of ["#FAF8F4", "#1B1917"]) {
      const pair = createContrastColors(chroma("#808080"), chroma(background));
      const {page, nav, field} = samplePageColors(pair, generatePalette("triadic"));

      expect(Math.sign(lightness(field) - lightness(page)), background)
        .toBe(Math.sign(lightness(nav) - lightness(page)));
      expect(Math.abs(lightness(field) - lightness(page)), background)
        .toBeGreaterThan(Math.abs(lightness(nav) - lightness(page)));
    }
  });


  it("takes the error line from neither the palette nor the pair, and turns it with the page", () => {
    // A red means what it means before the visitor picks anything: a slot
    // would read it as decoration, and a mix out of the pair would stop it
    // being red. What it does follow is the direction of the page, the way a
    // real design system ships one red for light surfaces and one for dark.
    const danger = (text: string, background: string, style: PaletteStyle) =>
      samplePageColors(createContrastColors(chroma(text), chroma(background)), generatePalette(style))
        .danger.hex("rgb");

    const onLight = danger("#111111", "#FAF8F4", "triadic");

    expect(danger("#3D5A8C", "#FAF8F4", "complementary"), "the pair or the palette moved it").toBe(onLight);
    expect(danger("#F1EDE6", "#1B1917", "triadic"), "the page's direction did not").not.toBe(onLight);
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
