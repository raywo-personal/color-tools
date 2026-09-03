import {TestBed} from "@angular/core/testing";
import {provideZonelessChangeDetection} from "@angular/core";
import {Dispatcher} from "@ngrx/signals/events";
import {beforeEach, describe, expect, it} from "vitest";
import chroma from "chroma-js";
import {AppStateStore} from "@core/app-state.store";
import {contrastEvents} from "@core/contrast/contrast.events";
import {colorName} from "@common/helpers/color-name.helper";
import {CONTRAST_ID_LENGTH} from "@contrast/helper/contrast-id.helper";
import {fakeLiveAnnouncer, provideFakeLiveAnnouncer} from "@testing/live-announcer.fake";
import {PairActions} from "@contrast-type/components/pair-actions/pair-actions";


describe("PairActions", () => {

  beforeEach(() => {
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


  it("names both gestures with their own captions", async () => {
    const {buttons} = await actions();

    expect(buttons.map(button => button.textContent?.trim()))
      .toEqual(["SWAP", "RANDOM PAIR"]);
    expect(buttons.every(button => button.getAttribute("aria-label") === null)).toBe(true);
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

});
