import {provideZonelessChangeDetection} from "@angular/core";
import {TestBed} from "@angular/core/testing";
import {Dispatcher} from "@ngrx/signals/events";
import chroma from "chroma-js";
import {afterEach, beforeEach, describe, expect, it} from "vitest";
import {AppStateStore} from "@core/app-state.store";
import {contrastEvents} from "@core/contrast/contrast.events";
import {palettesEvents} from "@core/palettes/palettes.events";
import {createContrastColors} from "@engine/contrast/contrast-colors.model";
import {colorName} from "@engine/color/color-name.helper";
import {roleCaptionFor} from "@engine/palette/palette-role.helper";
import {PaletteSlot} from "@engine/palette/palette.model";
import {samplePage} from "@contrast-type/models/sample-page.model";
import {
  verdictFor,
  verdictMark,
  verdictWord
} from "@contrast-type/models/element-verdict.model";
import {provideFakeLiveAnnouncer} from "@testing/live-announcer.fake";
import {PlacedColors} from "@contrast-type/components/placed-colors/placed-colors";


const DARK_ON_LIGHT = createContrastColors(chroma("#111111"), chroma("#eeeeee"));


describe("PlacedColors", () => {

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideFakeLiveAnnouncer()]
    });
  });


  async function ledger() {
    // The store registers its reducers when it is created, so an event
    // dispatched before that is lost and the initial state stands.
    const store = TestBed.inject(AppStateStore);
    const dispatcher = TestBed.inject(Dispatcher);

    dispatcher.dispatch(contrastEvents.contrastColorsChangedWithoutNav(DARK_ON_LIGHT));

    const fixture = TestBed.createComponent(PlacedColors);
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;

    async function place(elementKey: string, slot: PaletteSlot) {
      dispatcher.dispatch(contrastEvents.colorPlaced({elementKey, slot}));
      await fixture.whenStable();
    }

    async function pickStyle(style: "triadic" | "harmonic") {
      dispatcher.dispatch(palettesEvents.styleChanged(style));
      await fixture.whenStable();
    }

    function rows() {
      return Array.from(host.querySelectorAll("li")) as HTMLLIElement[];
    }

    /**
     * The element name of each row - the first `<span>` after the shape.
     * `textContent` runs the row's parts together without a separator, so it
     * answers "does this word appear" and not "which row is this".
     */
    function names() {
      return rows().map(row => row.querySelector("span")?.textContent?.trim() ?? "");
    }

    function texts() {
      return rows().map(row => row.textContent?.replace(/\s+/g, " ").trim() ?? "");
    }

    function resets() {
      return rows()
        .map(row => row.querySelector("button") as HTMLButtonElement);
    }

    /**
     * The page-wide reset: the one control outside the rows that is not the
     * caption's `i`. Found by where it sits rather than by what it is called,
     * so a change of wording is caught by the spec that pins the wording and
     * not by every spec that presses it.
     */
    function resetPage(): HTMLButtonElement | null {
      return Array.from(host.querySelectorAll("button"))
        .find(button => button.closest("li") === null
          && button.closest("ct-info-button") === null) ?? null;
    }

    /** The caption's `i`, and the prose it opens on the body. */
    function info(): HTMLButtonElement {
      return host.querySelector("ct-info-button button") as HTMLButtonElement;
    }

    function infoProse(): string {
      return document.querySelector(".cdk-overlay-container [role=dialog]")
        ?.textContent?.replace(/\s+/g, " ").trim() ?? "";
    }

    async function press(button: HTMLButtonElement) {
      button.click();
      await fixture.whenStable();
    }

    return {
      fixture, host, store, place, pickStyle, rows, names, texts, resets, resetPage, press,
      info, infoProse
    };
  }


  describe("with nothing placed", () => {

    it("says only that nothing is placed, and leaves the rest to the caption's i", async () => {
      // The state on the page, the explanation behind the button: what colours
      // the elements instead is the same sentence whether or not anything is
      // placed, so it is not part of the empty state.
      const {host} = await ledger();
      const sentence = host.querySelector("p:not([class*=tracking])")?.textContent?.trim() ?? "";

      expect(sentence).toBe("Nothing is placed yet.");
    });


    it("shows no rows and no RESET PAGE, because there is nothing to undo", async () => {
      const {rows, resetPage} = await ledger();

      expect(rows()).toEqual([]);
      expect(resetPage()).toBeNull();
    });

  });


  describe("a row per placement", () => {

    it("stands in the page's reading order, not in the order things were dropped", async () => {
      // `SAMPLE_ELEMENTS` is walked rather than the placements: it is the
      // order the marks and the tally are in, and it is also the guard
      // against a key mapped to nothing.
      const {place, names} = await ledger();

      await place("smallPrint", "color1");
      await place("headline", "color2");

      expect(names()).toEqual(["Headline", "Small print"]);
    });


    it("counts the placements in its caption", async () => {
      const {host, place} = await ledger();

      await place("headline", "color2");
      await place("eyebrow", "color3");

      expect(host.querySelector("p")?.textContent?.trim()).toBe("PLACED COLORS · 2");
    });


    it("names the element the way every other path names it", async () => {
      // `elementName(sampleElement(key))`, so the ledger, the marks and the
      // announcement all say `Small print` rather than `SMALL PRINT`.
      const {place, texts} = await ledger();

      await place("smallPrint", "color1");

      expect(texts()[0]).toContain("Small print");
    });


    it("takes its verdict from the same function the marks and the tally read", async () => {
      const {store, place, rows, texts} = await ledger();

      await place("headline", "color2");

      const page = samplePage(
        store.contrastColors(),
        store.currentPalette(),
        store.placements()
      );
      const verdict = verdictFor("headline", page, store.typeRoles());

      expect(rows()[0].querySelector("[data-marker]")?.getAttribute("data-marker"))
        .toBe(verdictMark(verdict.state));
      expect(texts()[0]).toContain(`Lc ${verdict.lc}`);
    });


    it("puts the state in words beside the shape", async () => {
      // A tick and a cross can be read off a row; the arrow and the dash
      // cannot, so the shape is never the only carrier.
      const {store, place, texts} = await ledger();

      await place("headline", "color2");

      const page = samplePage(
        store.contrastColors(),
        store.currentPalette(),
        store.placements()
      );
      const state = verdictFor("headline", page, store.typeRoles()).state;

      expect(texts()[0]).toContain(verdictWord(state));
    });


    it("names the colour and what the palette calls the slot - no P-numbers", async () => {
      const {store, place, texts} = await ledger();

      await place("headline", "color3");

      const palette = store.currentPalette();
      const color = palette.color3.color;

      expect(texts()[0]).toContain(colorName(color));
      expect(texts()[0]).toContain(roleCaptionFor(palette.style, "color3"));
      expect(texts()[0]).not.toMatch(/\bP[1-5]\b/);
    });


    it("follows the palette, because the placement is a slot", async () => {
      const {store, place, pickStyle, texts} = await ledger();

      await place("headline", "color3");
      await pickStyle("triadic");

      const palette = store.currentPalette();

      expect(texts()[0]).toContain(colorName(palette.color3.color));
      expect(texts()[0]).toContain(roleCaptionFor("triadic", "color3"));
    });


    it("carries the placed colour on its swatch", async () => {
      const {store, place, rows} = await ledger();

      await place("headline", "color2");

      const swatch = rows()[0].querySelector("span[style]") as HTMLElement;

      // Through chroma rather than as a string: how a DOM implementation
      // spells `rgb(...)` back is not what this pins.
      expect(chroma(swatch.style.backgroundColor).hex("rgb"))
        .toBe(store.currentPalette().color2.color.hex("rgb"));
    });


    it("says which of the element's two colours the placement took", async () => {
      // The two words the row above the chips uses for the pair. The filled
      // button is one of the three elements whose lever is the ground, so a
      // colour lands there as its fill and its label stays computed.
      const {place, texts} = await ledger();

      await place("headline", "color2");
      await place("filledButton", "color2");

      expect(texts()[0]).toContain("as the text color");
      expect(texts()[1]).toContain("as the background");
    });


    it("gives the running text one row, not one per paragraph", async () => {
      // A placement is keyed by the element, and `bodyText` paints three
      // paragraphs of the preview - one mark per named element, one row per
      // named element.
      const {place, rows} = await ledger();

      await place("bodyText", "color1");

      expect(rows().length).toBe(1);
    });


    it("carries the list role, which Preflight's list-style would otherwise cost", async () => {
      const {host, place} = await ledger();

      await place("headline", "color2");

      const list = host.querySelector("ul") as HTMLUListElement;

      expect(list.getAttribute("role")).toBe("list");
      expect(list.getAttribute("aria-label")).toBe("Placed colors");
    });

  });


  describe("the resets", () => {

    it("names which element the row's reset undoes", async () => {
      // `↺` names nothing, and the wording is the announcement's: six
      // elements default to a palette colour, so "its default color" is the
      // one phrase true of all of them.
      const {place, resets} = await ledger();

      await place("smallPrint", "color1");

      expect(resets()[0].getAttribute("aria-label"))
        .toBe("Reset Small print to its default color");
    });


    it("hides the reset's icon from a screen reader, which has the name", async () => {
      const {place, resets} = await ledger();

      await place("headline", "color2");

      expect(resets()[0].querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
      expect(resets()[0].textContent?.trim()).toBe("");
    });


    it("opens the page-wide reset's name with its visible caption", async () => {
      // WCAG 2.5.3 asks the accessible name to contain the visible label, so
      // the caption goes in verbatim and the effect follows it - a rephrased
      // `Reset the page` leaves speech input with nothing that matches. The
      // row's own reset carries no visible label and stays sentence case.
      const {place, resetPage} = await ledger();

      await place("headline", "color2");

      const label = resetPage()!.getAttribute("aria-label")!;
      const caption = resetPage()!.textContent!.trim();

      expect(label).toBe("RESET PAGE: every element back to its default color");
      expect(caption).toBe("RESET PAGE");
      expect(label).toContain(caption);
    });


    it("pads both resets out to the hit area a control needs", async () => {
      const {place, resets, resetPage} = await ledger();

      await place("headline", "color2");

      expect(Array.from(resets()[0].classList)).toContain("size-11");
      expect(Array.from(resetPage()!.classList)).toContain("h-11");
    });


    it("takes one element back and leaves the others standing", async () => {
      const {store, place, resets, press, names} = await ledger();

      await place("headline", "color2");
      await place("smallPrint", "color1");
      await press(resets()[0]);

      expect(store.placements()).toEqual({smallPrint: "color1"});
      expect(names()).toEqual(["Small print"]);
    });


    it("clears every placement on RESET PAGE and goes back to the sentence", async () => {
      const {store, place, resetPage, press, rows} = await ledger();

      await place("headline", "color2");
      await place("eyebrow", "color3");
      await press(resetPage()!);

      expect(store.placements()).toEqual({});
      expect(rows()).toEqual([]);
      expect(resetPage()).toBeNull();
    });

  });


  describe("the caption's i", () => {

    afterEach(() => {
      // The panel renders into a container appended to the body, which
      // outlives the fixture.
      document.querySelector(".cdk-overlay-container")?.remove();
    });


    it("opens the sentence that names the palette's share of the page", async () => {
      // The reset's wording and this sentence have to agree: five elements
      // take their ink from the palette and the filled button its fill, so a
      // sentence about "the page's own colors" would say the opposite of what
      // the visitor sees.
      const {fixture, info, infoProse} = await ledger();

      info().click();
      await fixture.whenStable();

      const sentence = infoProse();

      expect(sentence).toContain("palette");
      expect(sentence).toContain("the pair above");
      expect(sentence).not.toContain("Nothing is placed");
    });


    it("stands in the caption whether or not anything is placed", async () => {
      // It describes what colours the page without the visitor, which is still
      // true after they have recoloured half of it.
      const {info, place} = await ledger();

      expect(info()).not.toBeNull();

      await place("headline", "color2");

      expect(info()).not.toBeNull();
    });

  });

});
