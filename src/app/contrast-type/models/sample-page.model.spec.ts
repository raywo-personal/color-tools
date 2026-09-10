import {describe, expect, it} from "vitest";
import chroma, {Color} from "chroma-js";
import {createContrastColors} from "@engine/contrast/contrast-colors.model";
import {TYPE_ROLES} from "@engine/contrast/type-role.model";
import {generatePalette} from "@engine/palette/palette.helper";
import {findOptimalTextColor} from "@engine/contrast/optimal-text-color.helper";
import {PALETTE_SLOTS} from "@engine/palette/palette.model";
import {PaletteStyle} from "@engine/palette/palette-style.model";
import {
  elementsOf,
  figureElementOf,
  groundOf,
  inkOf,
  roleOf,
  SAMPLE_ELEMENTS,
  sampleElement,
  samplePage,
  samplePageColors,
  sideCaption,
  sideName
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
    const page = samplePage(pair, generatePalette("triadic"), {});
    const colors = page.colors;

    expect(colors.page.hex("rgb")).toBe("#eeeeee");
    expect(colors.text.hex("rgb")).toBe("#111111");

    // The body text is the pair; the small print is the dim ink on the page,
    // which is where the figure usually lands.
    expect(inkOf(sampleElement("bodyText"), page)).toBe(colors.text);
    expect(groundOf(sampleElement("bodyText"), page)).toBe(colors.page);
    expect(inkOf(sampleElement("smallPrint"), page)).toBe(colors.dim);
    expect(groundOf(sampleElement("filledButton"), page)).toBe(colors.accent);
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


  it("offers the same two sides on every element, and names the ground for what it is", () => {
    // A ground lands in a box the element already draws, or it is a band drawn
    // behind that one element - which is a highlight, and the word is what
    // stops `background` promising a repainted page. `SampleElement.boxed` is
    // the one field that decides it, and these two functions the only readers.
    for (const element of SAMPLE_ELEMENTS) {
      expect(sideCaption(element, "ink"), element.key).toBe("TEXT");
      expect(sideName(element, "ink"), element.key).toBe("text color");
      expect(sideCaption(element, "ground"), element.key)
        .toBe(element.boxed ? "BACKGROUND" : "HIGHLIGHT");
      expect(sideName(element, "ground"), element.key)
        .toBe(element.boxed ? "background" : "highlight");
    }

    // Both kinds are on the page, or one of the two words would be dead: the
    // filled button has a box of its own and the running text has not.
    expect(sampleElement("filledButton").boxed).toBe(true);
    expect(sampleElement("bodyText").boxed).toBe(false);
  });


  it("puts a placed colour on the side the placement names, on either side of any element", () => {
    // Both sides belong to the visitor now: the headline takes a palette
    // colour as its type, the filled button one as its fill, and the running
    // text one of each at the same time.
    const palette = generatePalette("triadic");
    const pair = createContrastColors(chroma("#111111"), chroma("#EEEEEE"));
    const page = samplePage(pair, palette, {
      headline: {ink: "color2"},
      filledButton: {ground: "color3"},
      bodyText: {ink: "color1", ground: "color4"}
    });

    const headline = sampleElement("headline");
    const button = sampleElement("filledButton");
    const bodyText = sampleElement("bodyText");

    expect(inkOf(headline, page)).toBe(palette.color2.color);
    // The side that was not placed is the surface that was already there, so
    // an element nobody touched on that side paints what is behind it.
    expect(groundOf(headline, page)).toBe(page.colors.page);

    expect(groundOf(button, page)).toBe(palette.color3.color);
    // The label is not the placed colour: `onAccent` is a foreground, and it
    // is measured against the fill the button ended up with.
    expect(inkOf(button, page).hex("rgb"))
      .toBe(findOptimalTextColor(palette.color3.color).color.hex("rgb"));

    expect(inkOf(bodyText, page)).toBe(palette.color1.color);
    expect(groundOf(bodyText, page)).toBe(palette.color4.color);
  });


  it("leaves the page's own colour alone when a ground is placed on text that sits on it", () => {
    // The band is behind that one element and nowhere else. `page` is a
    // surface most of the elements share, and a placement may not move one -
    // so the headline beside the recoloured paragraph is untouched, and so is
    // the page the two of them sit on.
    const palette = generatePalette("triadic");
    const pair = createContrastColors(chroma("#111111"), chroma("#EEEEEE"));
    const page = samplePage(pair, palette, {bodyText: {ground: "color4"}});

    expect(groundOf(sampleElement("bodyText"), page)).toBe(palette.color4.color);
    expect(groundOf(sampleElement("headline"), page)).toBe(page.colors.page);
    expect(page.colors.page).toBe(pair.background);
  });


  it("hands the band to the word inside the paragraph, because that is what is behind it", () => {
    // `bodyLink` is a word inside `bodyText`, not a piece of text on a
    // surface - `SampleElement.inside`. Without that step the link paints the
    // page's own colour over the band, punching a hole through it, and its
    // verdict measures against a colour the link is no longer on.
    const palette = generatePalette("triadic");
    const pair = createContrastColors(chroma("#111111"), chroma("#EEEEEE"));
    const link = sampleElement("bodyLink");

    expect(groundOf(link, samplePage(pair, palette, {}))).toBe(pair.background);
    expect(groundOf(link, samplePage(pair, palette, {bodyText: {ground: "color4"}})))
      .toBe(palette.color4.color);

    // A ground placed on the link itself wins over the paragraph's, and the
    // paragraph keeps its own.
    const both = samplePage(pair, palette, {
      bodyText: {ground: "color4"},
      bodyLink: {ground: "color1"}
    });

    expect(groundOf(link, both)).toBe(palette.color1.color);
    expect(groundOf(sampleElement("bodyText"), both)).toBe(palette.color4.color);
  });


  it("measures the filled button's label against the fill it ended up with", () => {
    // The guarantee `onAccent` exists for: black or white, whichever APCA
    // puts further from what the button is actually filled with. Read off the
    // accent surface it would keep the colour that suited a fill the visitor
    // has replaced.
    const palette = generatePalette("harmonic");
    const pair = createContrastColors(chroma("#111111"), chroma("#EEEEEE"));
    const button = sampleElement("filledButton");

    for (const slot of PALETTE_SLOTS) {
      const page = samplePage(pair, palette, {filledButton: {ground: slot}});
      const ink = inkOf(button, page);
      const ground = groundOf(button, page);
      const other = ink.hex("rgb") === "#000000" ? chroma("#ffffff") : chroma("#000000");

      expect(ground).toBe(palette[slot].color);
      expect(["#000000", "#ffffff"], slot).toContain(ink.hex("rgb"));
      expect(Math.abs(chroma.contrastAPCA(ink, ground)), slot)
        .toBeGreaterThanOrEqual(Math.abs(chroma.contrastAPCA(other, ground)));
    }
  });


  it("leaves the disabled label and the red uncorrected until the visitor says otherwise", () => {
    // A control nobody can press and a red that means what it means are meant
    // to fail where the page makes them fail, and neither corrects itself
    // against the ground it ended up on. That defends the default, not the
    // absence of an override: an ink placed on either of them replaces it.
    const palette = generatePalette("harmonic");
    const pair = createContrastColors(chroma("#111111"), chroma("#EEEEEE"));
    const unplaced = samplePage(pair, palette, {});
    const groundPlaced = samplePage(pair, palette, {
      disabledButton: {ground: "color3"},
      errorLine: {ground: "color3"}
    });
    const inkPlaced = samplePage(pair, palette, {
      disabledButton: {ink: "color3"},
      errorLine: {ink: "color3"}
    });

    for (const key of ["disabledButton", "errorLine"]) {
      const element = sampleElement(key);

      expect(inkOf(element, groundPlaced).hex("rgb"), key)
        .toBe(inkOf(element, unplaced).hex("rgb"));
      expect(inkOf(element, inkPlaced).hex("rgb"), key)
        .toBe(palette.color3.color.hex("rgb"));
    }
  });


  it("leaves every other element where the palette put it", () => {
    // A placement applies to the element it was placed on and to nothing
    // else, which is why it is not a field of the page's colours: `muted` is
    // both the disabled button and the picture, `nav` is three elements.
    const palette = generatePalette("triadic");
    const pair = createContrastColors(chroma("#111111"), chroma("#EEEEEE"));
    const page = samplePage(pair, palette, {disabledButton: {ground: "color1"}});

    expect(groundOf(sampleElement("disabledButton"), page)).toBe(palette.color1.color);
    expect(groundOf(sampleElement("imageLabel"), page)).toBe(page.colors.muted);
    expect(inkOf(sampleElement("navItems"), page)).toBe(page.colors.dim);
  });


  it("keeps a placement through a repainted palette, on the same slot", () => {
    // A slot and not a hex: the placement is about the palette member, so a
    // new palette hands the element the new colour of the same slot rather
    // than freezing the page at the one it was placed in.
    const pair = createContrastColors(chroma("#111111"), chroma("#EEEEEE"));
    const placements = {headline: {ink: "color2"}} as const;
    const first = generatePalette("triadic");
    const second = generatePalette("complementary");
    const headline = sampleElement("headline");

    expect(inkOf(headline, samplePage(pair, first, placements)))
      .toBe(first.color2.color);
    expect(inkOf(headline, samplePage(pair, second, placements)))
      .toBe(second.color2.color);
  });


  it("resolves a placement from T or G against the pair, and follows it", () => {
    // The pair's two halves are sources like any slot, and `colorOf()` is
    // where all seven are resolved - so a placement from `BG` tracks the
    // background the way one from `P3` tracks the palette.
    const palette = generatePalette("triadic");
    const first = createContrastColors(chroma("#111111"), chroma("#EEEEEE"));
    const second = createContrastColors(chroma("#111111"), chroma("#204080"));
    const placements = {
      headline: {ink: "background"},
      filledButton: {ground: "text"}
    } as const;
    const headline = sampleElement("headline");
    const filledButton = sampleElement("filledButton");

    expect(inkOf(headline, samplePage(first, palette, placements)).hex("rgb"))
      .toBe("#eeeeee");
    expect(inkOf(headline, samplePage(second, palette, placements)).hex("rgb"))
      .toBe("#204080");
    // The filled button's placement was made on its ground, so it is the fill
    // that follows the pair - the side travels with the placement.
    expect(groundOf(filledButton, samplePage(first, palette, placements)).hex("rgb"))
      .toBe("#111111");
  });


  it("draws a placed colour that matches the ground, and reports Lc 0 for it", () => {
    // The page has to survive a placement nobody can read, and the verdict is
    // what says so - nothing here corrects its own contrast, so an invisible
    // element stays invisible and the mark beside it carries the answer.
    const palette = generatePalette("triadic");
    const ground = palette.color2.color;
    const pair = createContrastColors(chroma("#111111"), ground);
    const page = samplePage(pair, palette, {bodyText: {ink: "color2"}});
    const bodyText = sampleElement("bodyText");

    expect(inkOf(bodyText, page).hex("rgb")).toBe(groundOf(bodyText, page).hex("rgb"));
    expect(Math.abs(chroma.contrastAPCA(inkOf(bodyText, page), groundOf(bodyText, page))))
      .toBe(0);
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
