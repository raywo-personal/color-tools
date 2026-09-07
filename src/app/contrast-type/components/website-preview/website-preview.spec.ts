import {provideZonelessChangeDetection} from "@angular/core";
import {TestBed} from "@angular/core/testing";
import {Dispatcher} from "@ngrx/signals/events";
import {beforeEach, describe, expect, it} from "vitest";
import chroma, {Color} from "chroma-js";
import {AppStateStore} from "@core/app-state.store";
import {commonEvents} from "@core/common/common.events";
import {contrastEvents} from "@core/contrast/contrast.events";
import {converterEvents} from "@core/converter/converter.events";
import {mixColors} from "@engine/color/mix-color.helper";
import {DEFAULT_TYPE_SETTINGS, TypeSettings} from "@engine/contrast/type-settings.model";
import {DEFAULT_TYPE_SETTINGS_BY_ROLE, TypeRole} from "@engine/contrast/type-role.model";
import {SelectedFont} from "@common/models/google-font.model";
import {expectApcaForeground} from "@testing/apca-foreground.expectation";
import {provideFakeLiveAnnouncer} from "@testing/live-announcer.fake";
import {provideSilentFontLoader} from "@testing/font-loader.fake";
import {SAMPLE_ELEMENTS} from "@contrast-type/models/sample-page.model";
import {elementName} from "@contrast-type/models/element-verdict.model";
import {WebsitePreview} from "@contrast-type/components/website-preview/website-preview";


/** A snippet of each piece of copy the assertions below reach for. */
const HEADLINE = "Reading is a physical act";
const LEAD = "A contrast ratio tells you";
const BODY = "A pairing can clear every threshold";
const QUOTE = "Adjust one variable at a time";
const SMALL_PRINT = "Small print, captions and legal notes";
const ACCENT_BUTTON = "Read the notes";
const GHOST_BUTTON = "Browse palettes";
const EYEBROW = "Field notes";
const WORDMARK = "Meridian";
const DISABLED_BUTTON = "Export";
const ERROR_LINE = "This address is already on the list";
const IMAGE_CAPTION = "The caption under a picture";
const LINK = "read this the way a reader would";
const ACTIVE_NAV_ITEM = "Notes";
const FIELD_LABEL = "EMAIL";

/** The draft's fraction for the dim text, restated rather than imported. */
const DIM_MIX = 0.4;


describe("WebsitePreview", () => {

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        // Picking a face raises an announcement and a font request.
        provideFakeLiveAnnouncer(),
        provideSilentFontLoader()
      ]
    });
  });


  async function preview(options: {
    text?: string;
    background?: string;
    base?: string;
    settings?: TypeSettings;
  } = {}) {
    const {
      text = "#111111",
      background = "#EEEEEE",
      base = "#3366CC",
      settings = DEFAULT_TYPE_SETTINGS
    } = options;

    // The store registers its reducers when it is created, so an event
    // dispatched before that is lost and the initial random pair stands.
    const store = TestBed.inject(AppStateStore);
    const dispatcher = TestBed.inject(Dispatcher);

    dispatcher.dispatch(converterEvents.colorChanged(chroma(base)));
    dispatcher.dispatch(contrastEvents.textColorChanged(chroma(text)));
    dispatcher.dispatch(contrastEvents.backgroundColorChanged(chroma(background)));
    dispatcher.dispatch(commonEvents.typeSettingsChanged({role: "body", settings}));

    const fixture = TestBed.createComponent(WebsitePreview);
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const page = host.querySelector("section") as HTMLElement;

    /** The element the given copy is set in. */
    function copy(snippet: string): HTMLElement {
      return within("p, span", snippet);
    }

    /**
     * The copy's own element rather than a wrapper around it.
     *
     * The innermost match, not the first: a link inside running text is a
     * `span` inside a `p` carrying the same text, and every element wrapped
     * by `ct-verdict-mark` sits inside two spans of the mark's own layout
     * that carry it too. The element that binds the type is the one with no
     * matching descendant left.
     */
    function within(selector: string, snippet: string): HTMLElement {
      const matches = Array.from(page.querySelectorAll<HTMLElement>(selector))
        .filter(element => element.textContent?.includes(snippet));
      const found = matches
        .find(element => !matches.some(other => other !== element && element.contains(other)));

      if (!found) throw new Error(`no ${selector} carries "${snippet}"`);

      return found;
    }

    /** The table's body rows, cell by cell. */
    function tableRows(): string[][] {
      return Array.from(page.querySelectorAll("tbody tr"))
        .map(row => Array.from(row.querySelectorAll("td")).map(cell => cell.textContent ?? ""));
    }

    async function paint(newBase: Color) {
      dispatcher.dispatch(converterEvents.colorChanged(newBase));
      await fixture.whenStable();
    }

    async function setBackground(newBackground: string) {
      dispatcher.dispatch(contrastEvents.backgroundColorChanged(chroma(newBackground)));
      await fixture.whenStable();
    }

    async function setSize(fontSize: number) {
      dispatcher.dispatch(commonEvents.typeSettingsChanged({role: "body", settings: {...settings, fontSize}}));
      await fixture.whenStable();
    }

    async function setRole(role: TypeRole, roleSettings: Partial<TypeSettings>) {
      dispatcher.dispatch(commonEvents.typeSettingsChanged({
        role,
        settings: {...DEFAULT_TYPE_SETTINGS_BY_ROLE[role], ...roleSettings}
      }));
      await fixture.whenStable();
    }

    async function pickFace(role: TypeRole, font: SelectedFont | null) {
      dispatcher.dispatch(commonEvents.fontSelected({role, font}));
      await fixture.whenStable();
    }

    return {fixture, store, host, page, copy, within, tableRows, paint, setBackground, setSize, setRole, pickFace};
  }


  it("names the region, so a screen reader can tell the sample page from the app", async () => {
    const {page} = await preview();

    expect(page.getAttribute("aria-label")).toBe("Website preview");
  });


  it("holds no focusable sample content, so the fake nav stays out of the tab order", async () => {
    // A button that does nothing is worse than no button, and a second nav in
    // the tab order competes with the real one in the app header. The verdict
    // marks are the exception and the only one: they are controls, and a
    // verdict a visitor cannot reach is a verdict this app does not get to
    // show.
    const {page} = await preview();
    const focusable = Array.from(
      page.querySelectorAll("a, button, input, select, textarea, [tabindex]")
    );

    expect(focusable.every(element => element.closest("ct-verdict-mark") !== null)).toBe(true);
    expect(focusable).toHaveLength(SAMPLE_ELEMENTS.length);
  });


  it("gives every element exactly one mark, named after it and its verdict", async () => {
    // One list, one mark each: an element that appears more than once - the
    // running text, the nav items, the table's cells, the small print - is
    // one ink on one ground at one size, so it is one verdict.
    const {page} = await preview();
    const marks = Array.from(page.querySelectorAll<HTMLElement>("ct-verdict-mark button"));

    expect(marks).toHaveLength(SAMPLE_ELEMENTS.length);

    const names = marks.map(mark => mark.getAttribute("aria-label") ?? "");

    for (const element of SAMPLE_ELEMENTS) {
      const name = names.find(candidate => candidate.startsWith(`${elementName(element)}:`));

      expect(name, element.key).toBeDefined();
    }

    // The name is sentence case, not the page's all-caps caption: a screen
    // reader spells those out letter by letter.
    expect(names.some(name => name === name.toUpperCase())).toBe(false);
  });


  it("opens a verdict without moving anything in the page", async () => {
    // In the flow the panel pushed the elements below it down, and inside a
    // table cell it re-apportioned the columns - reading one verdict
    // rearranged the page it was about. On the body it does neither, which is
    // also what lets the table's marks sit inside its cells.
    const {page, fixture} = await preview();
    const inTheTable = page.querySelector("table ct-verdict-mark button") as HTMLElement;
    const before = page.getBoundingClientRect().height;

    expect(inTheTable.getAttribute("aria-label")).toMatch(/^Table /);

    inTheTable.click();
    await fixture.whenStable();

    expect(inTheTable.getAttribute("aria-expanded")).toBe("true");
    expect(page.getBoundingClientRect().height).toBe(before);

    // Nothing of it is inside the preview at all.
    expect(page.querySelector("ct-verdict-panel")).toBeNull();

    const popups = document.querySelectorAll(".cdk-overlay-container ct-verdict-panel");

    expect(popups).toHaveLength(1);
    expect(popups[0].textContent).toContain("Lc ");
  });


  it("draws a mark in a colour APCA chose against the surface it sits on", async () => {
    // A neutral token is guaranteed against the six app surfaces and against
    // none of the visitor's, and the marks sit on the page's own colours.
    //
    // The eyebrow's mark, because the eyebrow sits on the page itself: the
    // nav's and the card's marks are measured against a tint of it, which the
    // sweep does not set. `surface` is what tells them apart, and the marks
    // beside the buttons and the field name it explicitly.
    const {page, setBackground} = await preview();

    await expectApcaForeground(async background => {
      await setBackground(background.hex("rgb"));

      const mark = Array.from(page.querySelectorAll<HTMLElement>("ct-verdict-mark button"))
        .find(candidate => candidate.getAttribute("aria-label")?.startsWith("Eyebrow:"));

      return mark?.style.color ?? "";
    });
  });


  it("offsets the marks' focus ring, so it never sits on the colour it announces", async () => {
    const {page} = await preview();
    const marks = Array.from(page.querySelectorAll<HTMLElement>("ct-verdict-mark button"));

    for (const mark of marks) {
      expect(mark.className, mark.getAttribute("aria-label") ?? "")
        .toContain("outline-offset-2");
      expect(mark.style.outlineColor).not.toBe("");
    }
  });


  it("opens one verdict at a time, in words, under the element it is about", async () => {
    const {page, fixture} = await preview();
    const marks = () => Array.from(page.querySelectorAll<HTMLElement>("ct-verdict-mark button"));

    async function press(index: number) {
      marks()[index].click();
      await fixture.whenStable();
    }

    expect(marks().every(mark => mark.getAttribute("aria-expanded") === "false")).toBe(true);

    await press(0);

    const opened = marks().filter(mark => mark.getAttribute("aria-expanded") === "true");

    expect(opened).toHaveLength(1);

    // The rows: the Lc reached, the Lc needed, the type, and what would carry
    // it. The popup lives in the overlay container, not beside its mark.
    const popup = document.querySelector(".cdk-overlay-container ct-verdict-panel");

    expect(popup?.textContent).toContain("Lc ");
    expect(opened[0].getAttribute("aria-describedby")).toBe(popup?.getAttribute("id"));

    await press(5);

    expect(marks().filter(mark => mark.getAttribute("aria-expanded") === "true"))
      .toHaveLength(1);

    // The same mark again closes it: a mark is a disclosure.
    await press(5);

    expect(marks().every(mark => mark.getAttribute("aria-expanded") === "false")).toBe(true);
  });


  it("carries no heading of its own, so the app's outline stays the app's", async () => {
    // The headline is sample copy. As an h2 it would offer "Reading is a
    // physical act" as a section of ColorTools to anyone jumping by heading.
    const {page} = await preview();

    expect(page.querySelectorAll("h1, h2, h3, h4, h5, h6")).toHaveLength(0);
  });


  it("paints the pair as it is, without correcting it", async () => {
    // A pair this close is unreadable, and that is the point: the preview
    // exists to show a bad pairing being bad. Correcting it here would answer
    // the visitor's question for them.
    const {page, copy} = await preview({text: "#808080", background: "#7A7A7A"});

    expect(page.style.backgroundColor).toBe("#7a7a7a");
    expect(page.style.color).toBe("#808080");

    // The reading content sets no color of its own: it inherits the pair, so
    // there is nowhere for a correction to creep back in.
    for (const snippet of [HEADLINE, LEAD, BODY, QUOTE]) {
      expect(copy(snippet).style.color, `"${snippet}" overrides the pair`).toBe("");
    }
  });


  it("sets the reading content at the size, weight and leading the controls hold", async () => {
    const {copy} = await preview({
      settings: {fontSize: 21, fontWeight: 600, lineHeight: 1.45}
    });

    const body = copy(BODY);

    expect(body.style.fontSize).toBe("21px");
    expect(body.style.fontWeight).toBe("600");
    expect(body.style.lineHeight).toBe("1.45");
  });


  it("scales the small print with body text's size, and not the headline", async () => {
    // The small print is body text at a share of its size; the headline is
    // the display role's and does not follow.
    const {copy} = await preview({settings: {...DEFAULT_TYPE_SETTINGS, fontSize: 20}});

    expect(copy(SMALL_PRINT).style.fontSize).toBe("14px");
    expect(copy(HEADLINE).style.fontSize).toBe(`${DEFAULT_TYPE_SETTINGS_BY_ROLE.display.fontSize}px`);
  });


  it("sets the headline at the display role's size, weight and leading", async () => {
    const {copy, setRole} = await preview();

    await setRole("display", {fontSize: 60, fontWeight: 700, lineHeight: 1.05});

    expect(copy(HEADLINE).style.fontSize).toBe("60px");
    expect(copy(HEADLINE).style.fontWeight).toBe("700");
    expect(copy(HEADLINE).style.lineHeight).toBe("1.05");
  });


  it("sets the buttons and the nav in the UI role, the eyebrow in the mono role", async () => {
    const {copy, setRole} = await preview();

    await setRole("ui", {fontSize: 20, fontWeight: 700});
    await setRole("mono", {fontSize: 14, fontWeight: 500});

    expect(copy(ACCENT_BUTTON).style.fontSize).toBe("20px");
    expect(copy(ACCENT_BUTTON).style.fontWeight).toBe("700");
    expect(copy(GHOST_BUTTON).style.fontWeight).toBe("700");
    expect(copy("Notes").style.fontWeight).toBe("700");
    expect(copy(EYEBROW).style.fontSize).toBe("14px");
    expect(copy(EYEBROW).style.fontWeight).toBe("500");
  });


  it("leaves the fake site's wordmark at a fixed size", async () => {
    // A wordmark does not track the type of the article below it, in the
    // draft or on a real site. It is the one text outside the four roles.
    //
    // One fixture, not two: every fixture in this spec reads the same root
    // store, so a second `preview()` would move the first one's DOM too.
    const {copy, setSize} = await preview();

    await setSize(12);
    const small = copy(WORDMARK).style.fontSize;
    const smallBody = copy(BODY).style.fontSize;

    await setSize(34);

    expect(copy(WORDMARK).style.fontSize).toBe(small);
    expect(copy(BODY).style.fontSize, "the body did not follow SIZE either")
      .not.toBe(smallBody);
  });


  it("sets a single-weight display face in that weight, not in a synthesised semibold", async () => {
    // The headline's weight used to be derived from body text's and floored
    // at 500. A family that ships one weight would then be faux-bolded, and
    // the rating would judge a weight the browser made up.
    const {copy, pickFace} = await preview();

    await pickFace("display", {family: "Lobster", category: "display", variant: "regular", weights: [400]});

    // happy-dom drops the quotes around a one-word family, so the face is
    // matched by name rather than by the exact declaration.
    expect(copy(HEADLINE).style.fontWeight).toBe("400");
    expect(copy(HEADLINE).style.fontFamily).toMatch(/^"?Lobster"?, display$/);
  });


  it("mixes a derived surface in OKLab, not in the space chroma falls back to", async () => {
    // The dim text is 40 % of the way from the text color to the background,
    // and at that fraction the space is plain to see: sRGB's gamma-encoded
    // channels land the mix around #979797 where OKLab puts it at #5f5f5f.
    // `mixColors` is what names the space, and a call site that dropped it
    // would still pass every other assertion here.
    const text = "#111111";
    const background = "#EEEEEE";
    const {copy} = await preview({text, background});

    const dim = chroma(copy(SMALL_PRINT).style.color).hex("rgb");

    expect(dim).toBe(mixColors(text, background, DIM_MIX).hex("rgb"));
    expect(dim).not.toBe(chroma.mix(text, background, DIM_MIX).hex("rgb"));
  });


  it("lifts the nav bar off the page in whichever direction the page allows", async () => {
    // A single direction leaves the bar invisible on one of the two pages a
    // visitor can build.
    const {page, setBackground} = await preview();

    // The nav bar is the first thing in the page, above the content block.
    const nav = page.firstElementChild as HTMLElement;
    const lightness = (element: HTMLElement) =>
      chroma(element.style.backgroundColor).oklch()[0];

    await setBackground("#FAF8F4");
    expect(lightness(nav), "no lift on a light page").toBeLessThan(lightness(page));

    await setBackground("#1B1917");
    expect(lightness(nav), "no lift on a dark page").toBeGreaterThan(lightness(page));
  });


  it("runs every role on the app's own type until a face is picked for it", async () => {
    // Nothing chosen, on a first visit or after a clear. An empty font-family
    // would be the alternative; the mono role falls back to the app's mono.
    const {page, copy} = await preview();

    expect(page.style.fontFamily).toBe("var(--font-sans)");
    expect(copy(HEADLINE).style.fontFamily).toBe("var(--font-sans)");
    expect(copy(EYEBROW).style.fontFamily).toBe("var(--font-mono)");
  });


  it("follows a face picked for one role, and leaves the other roles where they were", async () => {
    const {page, copy, pickFace} = await preview();

    await pickFace("body", {family: "Source Serif 4", category: "serif", variant: "regular", weights: [400, 600, 700]});

    expect(page.style.fontFamily).toBe('"Source Serif 4", serif');
    expect(copy(HEADLINE).style.fontFamily).toBe("var(--font-sans)");
    expect(copy(ACCENT_BUTTON).style.fontFamily).toBe("var(--font-sans)");
  });


  it("takes the accent button's label from APCA, not from a neutral token", async () => {
    // The one foreground the preview chooses rather than inherits. The accent
    // comes from the palette, not from the pair the rating judges, so an
    // unreadable label there says nothing about the pairing and only looks
    // broken.
    const {copy, paint, store} = await preview();

    await expectApcaForeground(async accent => {
      await paint(accent);

      // The palette is built on the current color, so the accent is that
      // color. Asserted rather than assumed: the sweep's distances are
      // measured against what it dispatched.
      expect(store.currentPalette().color0.color.hex("rgb")).toBe(accent.hex("rgb"));

      return copy(ACCENT_BUTTON).style.color;
    });
  });


  it("puts four of the five palette colors on the page, without a control", async () => {
    // The alternative was a selector per role. This is what makes it
    // unnecessary - and what a refactor deriving these back out of the pair
    // would silently undo. See the component's own note for why the
    // assignment is fixed.
    //
    // The fraction mirrors `CARD_TINT`; retuning it fails here, which is the
    // point at which someone should look at the card again.
    const cardTint = 0.09;

    const {store, copy} = await preview();
    const palette = store.currentPalette();
    const background = store.contrastColors().background;
    // `closest`, not `parentElement`: the quote sits inside the two spans of
    // its verdict mark's layout, and the card is the block outside them.
    const card = copy(QUOTE).closest("div") as HTMLElement;

    expect(copy(ACCENT_BUTTON).style.backgroundColor)
      .toBe(palette.color0.color.hex("rgb"));
    expect(copy(GHOST_BUTTON).style.borderColor)
      .toBe(palette.color1.color.hex("rgb"));
    expect(copy(EYEBROW).style.color)
      .toBe(palette.color2.color.hex("rgb"));

    expect(card.style.backgroundColor)
      .toBe(mixColors(background, palette.color3.color, cardTint).hex("rgb"));

    // Without this the line above would also pass on a card still tinted from
    // the accent, on the day a generator happens to draw the two alike.
    expect(palette.color3.color.hex("rgb")).not.toBe(palette.color0.color.hex("rgb"));
    expect(card.style.backgroundColor)
      .not.toBe(mixColors(background, palette.color0.color, cardTint).hex("rgb"));
  });


  it("skips a role past the ground rather than putting it on the page's own color", async () => {
    // `color0` is the accent and also a candidate for the ground once a pair
    // is taken from the palette - `PALETTE PAIR` or the initial state can draw
    // exactly this. A first pass reads what `color0` comes out to for this
    // base and seed, then the ground is set to match it on purpose.
    const {store: firstPass} = await preview();
    const ground = firstPass.currentPalette().color0.color.hex("rgb");

    const {store, copy} = await preview({background: ground});
    const palette = store.currentPalette();

    // The role does not fall back to a fixed slot that happens to be the
    // ground - it reads the next one in line, so the button stays visible.
    expect(copy(ACCENT_BUTTON).style.backgroundColor).not.toBe(ground);
    expect(copy(ACCENT_BUTTON).style.backgroundColor)
      .toBe(palette.color1.color.hex("rgb"));
  });


  it("shows the four elements the closing paragraph names", async () => {
    // The page has always claimed that a palette is judged on the disabled
    // button, the error line, the caption and the table. Until #146 it said so
    // and showed none of them.
    const {copy, within, tableRows} = await preview();

    expect(copy(DISABLED_BUTTON).textContent).toContain("disabled");
    expect(within("p", ERROR_LINE)).toBeTruthy();
    expect(within("p", IMAGE_CAPTION)).toBeTruthy();
    expect(tableRows().length).toBeGreaterThan(0);
  });


  it("tells the disabled button by its word, not by its grey alone", async () => {
    // A control told by colour alone is the first thing a thin pairing hides,
    // which is exactly the pairing this button is here to expose.
    const {copy, store} = await preview();
    const colors = store.contrastColors();
    const disabled = copy(DISABLED_BUTTON);

    expect(disabled.textContent?.toLowerCase()).toContain("disabled");
    expect(disabled.style.backgroundColor).not.toBe(colors.background.hex("rgb"));
    expect(disabled.style.color).not.toBe(colors.text.hex("rgb"));
  });


  it("writes the error line in the red, and turns the red with the page", async () => {
    // Not a palette member and not a mix of the pair: repainting the palette
    // leaves it where it is, and only the direction of the page moves it.
    const {within, paint, setBackground} = await preview({background: "#FAF8F4"});

    const onLight = within("p", ERROR_LINE).style.color;

    await paint(chroma("#B02020"));
    expect(within("p", ERROR_LINE).style.color, "the palette moved it").toBe(onLight);

    await setBackground("#1B1917");
    expect(within("p", ERROR_LINE).style.color, "the page's direction did not").not.toBe(onLight);
  });


  it("carries the error beside the red as a shape, so the message survives the pairing", async () => {
    const {within} = await preview();

    expect(within("p", ERROR_LINE).querySelector("svg")).toBeTruthy();
  });


  it("marks the active nav item with a second carrier beside the accent", async () => {
    // An accent that lands at the page's own lightness would leave the visitor
    // with three nav items and no current page.
    const {copy, store} = await preview();
    const active = copy(ACTIVE_NAV_ITEM);

    expect(active.style.borderBottomColor).toBe(store.currentPalette().color0.color.hex("rgb"));
    expect(active.style.color, "the active item is dimmed like the rest").toBe("");
  });


  it("sets the link inside the running text in the accent, at the paragraph's own type", async () => {
    // The link takes its size from the paragraph it sits in - a size of its
    // own would make it a different element rather than a word in a sentence.
    const {within, store} = await preview();
    const link = within("span", LINK);

    expect(link.style.color).toBe(store.currentPalette().color0.color.hex("rgb"));
    expect(link.style.fontSize).toBe("");
  });


  it("scales the caption with body text, at the size the draft calls the first to fail", async () => {
    const {within} = await preview({settings: {...DEFAULT_TYPE_SETTINGS, fontSize: 25}});

    expect(within("p", IMAGE_CAPTION).style.fontSize).toBe("18px");
  });


  it("reports this page's own type in the table, so the figures cannot contradict the sliders", async () => {
    // Sample figures would read as a bug the moment a slider moved: a display
    // role at 96 beside a table still saying 44.
    const {tableRows, setRole} = await preview();

    await setRole("display", {fontSize: 72, fontWeight: 700});
    await setRole("body", {fontSize: 20, fontWeight: 500});

    expect(tableRows()).toEqual([
      ["Headline", "72", "700"],
      ["Body", "20", "500"],
      ["Caption", "14", "500"]
    ]);
  });


  it("sets the disabled button, the field, the caption and the table in their own roles", async () => {
    // The model pins which role each element takes; this pins that the page
    // follows it. Without it the table's figures could be bound to the body
    // role and only the BODY slider would move them, while the issue - and
    // the rating beside the page - call them UI.
    const {copy, within, page, setRole} = await preview();

    await setRole("ui", {fontSize: 20, fontWeight: 700});
    await setRole("mono", {fontSize: 14, fontWeight: 500});

    const [cell, number] = Array.from(page.querySelectorAll<HTMLElement>("tbody tr td"));

    expect(copy(DISABLED_BUTTON).style.fontSize, "disabled button").toBe("20px");
    expect(copy(FIELD_LABEL).style.fontSize, "field label").toBe("16px");
    expect(number.style.fontSize, "table number").toBe("17px");

    expect(within("p", ERROR_LINE).style.fontSize, "error line").toBe("14px");
    expect(within("p", IMAGE_CAPTION).style.fontSize, "caption").toBe("13px");
    expect(cell.style.fontSize, "table cell").toBe("15px");

    expect(within("th", "ELEMENT").style.fontSize, "table header").toBe("14px");
  });


  it("lets the table break rather than run past the column it sits in", async () => {
    // A table is laid out from its cells' min-content width, so at the top of
    // the mono range the unbreakable `ELEMENT` would push the last column out
    // under the panel's `overflow-hidden`, with no scrollbar to say so. The
    // headline's `wrap-break-word` does not answer this one - it leaves
    // min-content alone by definition.
    const {page} = await preview();

    expect(page.querySelector("table")?.classList.contains("wrap-anywhere")).toBe(true);
  });


  it("keeps the separators out of the palette, so a rule stays structure", async () => {
    // `color4` has no role on purpose: the nav's underline and the footer rule
    // are the only places left, and a separator in a palette color reads as
    // decoration.
    const {store, copy, page} = await preview();
    const palette = store.currentPalette();
    const footer = copy(SMALL_PRINT).closest("div") as HTMLElement;
    const nav = page.firstElementChild as HTMLElement;

    for (const rule of [nav.style.borderBottomColor, footer.style.borderTopColor]) {
      expect(rule).not.toBe(palette.color4.color.hex("rgb"));
      expect(rule).not.toBe("");
    }
  });

});
