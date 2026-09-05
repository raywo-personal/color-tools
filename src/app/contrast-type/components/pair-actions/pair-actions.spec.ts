import {TestBed} from "@angular/core/testing";
import {provideZonelessChangeDetection} from "@angular/core";
import {Dispatcher, EventInstance} from "@ngrx/signals/events";
import {beforeEach, describe, expect, it} from "vitest";
import chroma from "chroma-js";
import {AppStateStore} from "@core/app-state.store";
import {contrastEvents} from "@core/contrast/contrast.events";
import {converterEvents} from "@core/converter/converter.events";
import {PALETTE_SLOTS} from "@engine/palette/palette.model";
import {colorName} from "@engine/color/color-name.helper";
import {CONTRAST_ID_LENGTH} from "@engine/contrast/contrast-id.helper";
import {fakeLiveAnnouncer, provideFakeLiveAnnouncer} from "@testing/live-announcer.fake";
import {PairActions} from "@contrast-type/components/pair-actions/pair-actions";
import {loadAppStateReducer} from "@core/common/persistence.reducers";
import {initialState} from "@core/models/app-state.model";


type LoadEvent = EventInstance<"[Persistence] loadAppState", void>;

const loadEvent = {type: "[Persistence] loadAppState", payload: undefined} as LoadEvent;


describe("PairActions", () => {

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideFakeLiveAnnouncer()]
    });
  });


  async function actions(text = "#111111", background = "#EEEEEE") {
    // The store registers its reducers and its effects when it is created, so
    // an event dispatched before that is lost and nothing announces.
    const store = TestBed.inject(AppStateStore);
    const dispatcher = TestBed.inject(Dispatcher);

    dispatcher.dispatch(contrastEvents.textColorChanged(chroma(text)));
    dispatcher.dispatch(contrastEvents.backgroundColorChanged(chroma(background)));

    const fixture = TestBed.createComponent(PairActions);
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(host.querySelectorAll("button")) as HTMLButtonElement[];

    function press(caption: string) {
      const button = buttons
        .find(candidate => candidate.textContent?.trim() === caption) as HTMLButtonElement;

      button.click();

      return fixture.whenStable();
    }

    return {fixture, store, buttons, press};
  }


  it("names the three gestures with their own captions", async () => {
    const {buttons} = await actions();

    expect(buttons.map(button => button.textContent?.trim()))
      .toEqual(["SWAP", "RANDOM PAIR", "PALETTE PAIR"]);
  });


  it("leaves a caption to stand as the name where it already reads as an action", async () => {
    // `PALETTE PAIR` names a thing rather than a move, so it carries a name
    // that says what pressing it does. The other two do not need one.
    const {buttons} = await actions();
    const named = buttons
      .filter(button => button.getAttribute("aria-label") !== null)
      .map(button => button.textContent?.trim());

    expect(named).toEqual(["PALETTE PAIR"]);
  });


  describe("SWAP", () => {

    it("exchanges the two colors", async () => {
      const {store, press} = await actions();

      await press("SWAP");

      expect(store.contrastColors.text().hex("rgb")).toBe("#eeeeee");
      expect(store.contrastColors.background().hex("rgb")).toBe("#111111");
    });


    it("announces the pair it produced, because nothing moved and no caption says it", async () => {
      const announcer = fakeLiveAnnouncer();
      const {store, press} = await actions();

      await press("SWAP");

      // Polite: the visitor is still standing on the button they pressed, so
      // there is nothing in progress to interrupt.
      expect(announcer.last).toEqual({
        message: `Swapped: ${colorName(store.contrastColors.text())}`
          + ` on ${colorName(store.contrastColors.background())}`,
        politeness: "polite"
      });
    });

  });


  describe("RANDOM PAIR", () => {

    it("rolls a pair the store then holds", async () => {
      const {store, press} = await actions();

      await press("RANDOM PAIR");

      // Asserting the plumbing rather than "a different pair came back": the
      // roll is random, so inequality would be a test that almost always
      // passes for the wrong reason. What holds is that the roll went the same
      // way as every other change - through `createContrastColors()`, which
      // encodes the id and recomputes the Lc.
      expect(store.contrastColors.id()).toHaveLength(CONTRAST_ID_LENGTH);
      expect(Number.isFinite(store.contrastColors.contrast())).toBe(true);
    });


    it("announces the pair it rolled, and says it is a new one", async () => {
      const announcer = fakeLiveAnnouncer();
      const {store, press} = await actions();

      await press("RANDOM PAIR");

      // The opening word tells the two gestures apart: a roll that happens to
      // land on the swapped pair must not be read as a swap.
      expect(announcer.last).toEqual({
        message: `New pair: ${colorName(store.contrastColors.text())}`
          + ` on ${colorName(store.contrastColors.background())}`,
        politeness: "polite"
      });
    });

  });


  describe("PALETTE PAIR", () => {

    it("takes the pair out of the palette, and no pair in it separates further", async () => {
      const {store, press} = await actions();

      TestBed.inject(Dispatcher).dispatch(converterEvents.colorChanged(chroma("#3366CC")));

      const palette = store.currentPalette();
      const members = PALETTE_SLOTS.map(slot => palette[slot].color.hex("rgb"));

      // Without this the assertions below would silently be about the
      // collapsed-palette fallback rather than about the palette's own colors.
      expect(new Set(members).size, "the palette collapsed").toBeGreaterThan(1);

      await press("PALETTE PAIR");

      const text = store.contrastColors.text().hex("rgb");
      const background = store.contrastColors.background().hex("rgb");

      expect(members).toContain(text);
      expect(members).toContain(background);

      expect(chroma(background).luminance(), "the darker color became the ground")
        .toBeGreaterThanOrEqual(chroma(text).luminance());

      // Oriented the same way the rule orients them - lighter as the ground -
      // because APCA is not symmetric and the reverse polarity is not a pair
      // the gesture can produce.
      const separation = (one: string, other: string) => {
        const [ground, ink] = chroma(one).luminance() >= chroma(other).luminance()
          ? [one, other]
          : [other, one];

        return Math.abs(chroma.contrastAPCA(ink, ground));
      };

      const chosen = separation(text, background);

      for (const one of members) {
        for (const other of members) {
          expect(separation(one, other), `${one} with ${other}`)
            .toBeLessThanOrEqual(chosen);
        }
      }
    });


    it("is a function of the palette, not of what the pair was before", async () => {
      // The difference to the roll beside it: this one answers "what does my
      // palette hold", so it has to give the same answer twice.
      const {store, press} = await actions();

      await press("PALETTE PAIR");
      const first = store.contrastColors.id();

      await press("RANDOM PAIR");
      await press("PALETTE PAIR");

      expect(store.contrastColors.id()).toBe(first);
    });


    it("survives a reload, the way the random roll's pair does", async () => {
      // `sendPaletteToContrast` sits in the same persistable list as the roll
      // and the manual edit, so this pins that the palette-derived pair
      // actually round-trips through save and load rather than assuming the
      // shared mechanism carries it.
      const {store, press} = await actions();

      await press("PALETTE PAIR");
      const text = store.contrastColors.text().hex("rgb");
      const background = store.contrastColors.background().hex("rgb");

      const loaded = TestBed.runInInjectionContext(
        () => loadAppStateReducer(loadEvent, initialState)
      );

      expect(loaded.contrastColors.text.hex("rgb")).toBe(text);
      expect(loaded.contrastColors.background.hex("rgb")).toBe(background);
    });


    it("announces the pair, and says it came from the palette", async () => {
      const announcer = fakeLiveAnnouncer();
      const {store, press} = await actions();

      await press("PALETTE PAIR");

      expect(announcer.last).toEqual({
        message: `From the palette: ${colorName(store.contrastColors.text())}`
          + ` on ${colorName(store.contrastColors.background())}`,
        politeness: "polite"
      });
    });

  });

});
