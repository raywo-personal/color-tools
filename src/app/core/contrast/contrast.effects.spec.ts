import {provideZonelessChangeDetection} from "@angular/core";
import {TestBed} from "@angular/core/testing";
import {Dispatcher} from "@ngrx/signals/events";
import {beforeEach, describe, expect, it} from "vitest";
import {colorName} from "@engine/color/color-name.helper";
import {AppStateStore} from "@core/app-state.store";
import {contrastEvents} from "@core/contrast/contrast.events";
import {elementName} from "@contrast-type/models/element-verdict.model";
import {sampleElement} from "@contrast-type/models/sample-page.model";
import {fakeLiveAnnouncer, provideFakeLiveAnnouncer} from "@testing/live-announcer.fake";


describe("placementAnnouncedEffect", () => {

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideFakeLiveAnnouncer()]
    });
  });


  function setup() {
    const store = TestBed.inject(AppStateStore);
    const dispatcher = TestBed.inject(Dispatcher);

    return {store, dispatcher, announcer: fakeLiveAnnouncer()};
  }


  it("names the element and the colour a placement put on it", () => {
    // A drop and the chooser on an element's mark both repaint one element
    // and add a row to the ledger without moving focus onto either, so
    // nothing on screen would say what happened.
    const {store, dispatcher, announcer} = setup();

    dispatcher.dispatch(contrastEvents.colorPlaced({elementKey: "smallPrint", source: "color3"}));

    const name = elementName(sampleElement("smallPrint"));
    const colour = colorName(store.currentPalette().color3.color);

    expect(announcer.last?.message).toBe(`${name} takes ${colour}`);
    // Polite: the visitor has just finished a gesture of their own, and there
    // is nothing in progress to interrupt.
    expect(announcer.last?.politeness).toBe("polite");
  });


  it("says the element in the words the marks and the ledger use", () => {
    // The same name in the drag path, the keyboard path and the ledger - the
    // all-caps caption is what a screen reader spells out letter by letter.
    const {dispatcher, announcer} = setup();

    dispatcher.dispatch(contrastEvents.colorPlaced({elementKey: "filledButton", source: "color1"}));

    expect(announcer.last?.message).toContain("Filled button");
  });


  it("names no handle, because a handle says nothing about a colour", () => {
    // `P1` is what the row and the ledger show, and spoken it identifies a
    // chip without describing it. The colour's own name is what the visitor
    // acts on.
    const {dispatcher, announcer} = setup();

    dispatcher.dispatch(contrastEvents.colorPlaced({elementKey: "headline", source: "color0"}));

    expect(announcer.last?.message).not.toMatch(/\bP1\b/);
  });


  it("names the pair's own colour when T or G was placed", () => {
    // The source is resolved through `colorOf()`, so a placement from the
    // pair is announced by the colour it actually put on the element.
    const {store, dispatcher, announcer} = setup();

    dispatcher.dispatch(contrastEvents.colorPlaced({elementKey: "headline", source: "background"}));

    const colour = colorName(store.contrastColors.background());

    expect(announcer.last?.message).toBe(`Headline takes ${colour}`);
  });


  it("says which element went back to its default, in words true of all of them", () => {
    // Six elements default to a palette colour rather than to anything of the
    // page's own, so a sentence naming the page would be false for them.
    const {dispatcher, announcer} = setup();

    dispatcher.dispatch(contrastEvents.colorPlaced({elementKey: "quote", source: "color2"}));
    dispatcher.dispatch(contrastEvents.placementReset("quote"));

    expect(announcer.last?.message).toBe("Pull quote back to its default color");
    expect(announcer.last?.politeness).toBe("polite");

    dispatcher.dispatch(contrastEvents.colorPlaced({elementKey: "eyebrow", source: "color2"}));
    dispatcher.dispatch(contrastEvents.placementReset("eyebrow"));

    expect(announcer.last?.message).not.toContain("the page");
  });


  it("says the page was reset without listing what was on it", () => {
    // `RESET PAGE` can clear twenty-two rows, and a sentence naming them all
    // is one nobody hears the end of.
    const {dispatcher, announcer} = setup();

    dispatcher.dispatch(contrastEvents.colorPlaced({elementKey: "quote", source: "color2"}));
    dispatcher.dispatch(contrastEvents.placementsReset());

    expect(announcer.last?.message).toBe("Every placed color removed");
    expect(announcer.last?.politeness).toBe("polite");
  });


  it("says nothing when a chip is only picked up or put down", () => {
    // Picking a chip up moves focus onto the chip, whose own name carries the
    // colour, and putting it down again changes nothing about the page.
    const {dispatcher, announcer} = setup();

    dispatcher.dispatch(contrastEvents.chipPickedUp("color2"));
    dispatcher.dispatch(contrastEvents.chipPutDown());

    expect(announcer.announcements).toHaveLength(0);
  });

});
