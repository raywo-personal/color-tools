import {provideZonelessChangeDetection} from "@angular/core";
import {TestBed} from "@angular/core/testing";
import {Dispatcher} from "@ngrx/signals/events";
import {beforeEach, describe, expect, it} from "vitest";
import chroma, {Color} from "chroma-js";
import {AppStateStore} from "@core/app-state.store";
import {commonEvents} from "@core/common/common.events";
import {contrastEvents} from "@core/contrast/contrast.events";
import {converterEvents} from "@core/converter/converter.events";
import {GoogleFontLoaderService} from "@common/services/google-font-loader.service";
import {mixColors} from "@engine/color/mix-color.helper";
import {DEFAULT_TYPE_SETTINGS, TypeSettings} from "@engine/contrast/type-settings.model";
import {expectApcaForeground} from "@testing/apca-foreground.expectation";
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

/** The draft's fraction for the dim text, restated rather than imported. */
const DIM_MIX = 0.4;


/**
 * A font loader that loads nothing.
 *
 * The real one appends a `<link>` to Google Fonts, and happy-dom fetches it -
 * so `commonEvents.fontSelected` would put this spec on the network for a
 * property about a `font-family` string. Local rather than in `src/testing`
 * until a second spec needs it.
 */
class SilentFontLoader {

  public loadFont(): void {
    // Intentionally empty.
  }

  public setFontFamily(): void {
    // Intentionally empty.
  }

}


describe("WebsitePreview", () => {

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {provide: GoogleFontLoaderService, useClass: SilentFontLoader}
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
    dispatcher.dispatch(commonEvents.typeSettingsChanged(settings));

    const fixture = TestBed.createComponent(WebsitePreview);
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const page = host.querySelector("section") as HTMLElement;

    /** The element the given copy is set in. */
    function copy(snippet: string): HTMLElement {
      const found = Array.from(page.querySelectorAll<HTMLElement>("p, span"))
        .find(element => element.textContent?.includes(snippet));

      if (!found) throw new Error(`no element carries "${snippet}"`);

      return found;
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
      dispatcher.dispatch(commonEvents.typeSettingsChanged({...settings, fontSize}));
      await fixture.whenStable();
    }

    return {fixture, store, host, page, copy, paint, setBackground, setSize};
  }


  it("names the region, so a screen reader can tell the sample page from the app", async () => {
    const {page} = await preview();

    expect(page.getAttribute("aria-label")).toBe("Website preview");
  });


  it("holds nothing focusable, so the fake nav stays out of the tab order", async () => {
    // A button that does nothing is worse than no button, and a second nav in
    // the tab order competes with the real one in the app header.
    const {page} = await preview();

    expect(page.querySelectorAll("a, button, input, select, textarea, [tabindex]"))
      .toHaveLength(0);
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


  it("scales the headline and the small print with the size", async () => {
    const {copy} = await preview({settings: {...DEFAULT_TYPE_SETTINGS, fontSize: 20}});

    expect(copy(HEADLINE).style.fontSize).toBe("50px");
    expect(copy(SMALL_PRINT).style.fontSize).toBe("14px");
  });


  it("leaves the fake site's own chrome at a fixed size", async () => {
    // A wordmark does not track the body size of the article below it, in the
    // draft or on a real site. What `SIZE` governs is the reading content.
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


  it("never sets the headline lighter than a headline is set", async () => {
    const {copy} = await preview({settings: {...DEFAULT_TYPE_SETTINGS, fontWeight: 300}});

    expect(copy(HEADLINE).style.fontWeight).toBe("500");
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


  it("runs on the app's own stack until a typeface is picked", async () => {
    // Nothing chosen, on a first visit or after a clear. An empty font-family
    // would be the alternative.
    const {page} = await preview();

    expect(page.style.fontFamily).toBe("var(--font-sans)");
  });


  it("follows a picked typeface once there is one", async () => {
    const {fixture, page} = await preview();

    TestBed.inject(Dispatcher).dispatch(commonEvents.fontSelected({
      family: "Source Serif 4",
      category: "serif",
      variant: "regular",
      weights: [400, 600, 700]
    }));
    await fixture.whenStable();

    expect(page.style.fontFamily).toBe('"Source Serif 4", serif');
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
    const card = copy(QUOTE).parentElement as HTMLElement;

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


  it("keeps the separators out of the palette, so a rule stays structure", async () => {
    // `color4` has no role on purpose: the nav's underline and the footer rule
    // are the only places left, and a separator in a palette color reads as
    // decoration.
    const {store, copy, page} = await preview();
    const palette = store.currentPalette();
    const footer = copy(SMALL_PRINT).parentElement as HTMLElement;
    const nav = page.firstElementChild as HTMLElement;

    for (const rule of [nav.style.borderBottomColor, footer.style.borderTopColor]) {
      expect(rule).not.toBe(palette.color4.color.hex("rgb"));
      expect(rule).not.toBe("");
    }
  });

});
