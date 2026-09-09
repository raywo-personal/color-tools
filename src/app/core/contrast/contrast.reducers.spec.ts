import {provideZonelessChangeDetection} from "@angular/core";
import {TestBed} from "@angular/core/testing";
import {Dispatcher} from "@ngrx/signals/events";
import {beforeEach, describe, expect, it} from "vitest";
import chroma from "chroma-js";
import {AppStateStore} from "@core/app-state.store";
import {contrastEvents} from "@core/contrast/contrast.events";
import {palettesEvents} from "@core/palettes/palettes.events";
import {LOCAL_STORAGE_KEY} from "@common/models/local-storage.model";
import {samplePage, sampleElement, inkOf} from "@contrast-type/models/sample-page.model";
import {provideFakeLiveAnnouncer} from "@testing/live-announcer.fake";


/**
 * Through the store rather than by calling the reducers, because what is
 * under test includes which events the store registers them on and what a
 * placement does to the carried chip.
 */
describe("the placements on the sample page", () => {

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        // A placement and a reset are announced.
        provideFakeLiveAnnouncer()
      ]
    });
  });


  function setup() {
    const store = TestBed.inject(AppStateStore);
    const dispatcher = TestBed.inject(Dispatcher);

    return {store, dispatcher};
  }


  it("opens with nothing placed and nothing in hand", () => {
    const {store} = setup();

    expect(store.placements()).toEqual({});
    expect(store.carriedChip()).toBeNull();
  });


  it("holds a placement from T or G, so the pair can move under it too", () => {
    const {store, dispatcher} = setup();

    dispatcher.dispatch(contrastEvents.colorPlaced({elementKey: "headline", source: "background"}));

    expect(store.placements()).toEqual({headline: "background"});

    // The same property a slot has: the source is kept and the colour is
    // resolved when the page is built, so typing a new background moves the
    // headline with it.
    dispatcher.dispatch(contrastEvents.backgroundColorChanged(chroma("#204080")));

    expect(store.placements()).toEqual({headline: "background"});
    expect(headlineInk(store)).toBe("#204080");
  });


  it("holds a placement as a slot, so the palette can move under it", () => {
    const {store, dispatcher} = setup();

    dispatcher.dispatch(contrastEvents.colorPlaced({elementKey: "headline", source: "color2"}));

    expect(store.placements()).toEqual({headline: "color2"});

    // The colour follows the slot rather than the other way round: a new
    // palette hands the headline `color2`'s new colour without a second
    // event. `sample-page.model.spec.ts` pins the two palettes side by side;
    // what this asserts is that the store keeps the slot.
    dispatcher.dispatch(palettesEvents.styleChanged("triadic"));

    expect(store.placements()).toEqual({headline: "color2"});
    expect(headlineInk(store)).toBe(store.currentPalette().color2.color.hex("rgb"));
  });


  it("carries a chip and puts it down again", () => {
    const {store, dispatcher} = setup();

    dispatcher.dispatch(contrastEvents.chipPickedUp("color3"));

    expect(store.carriedChip()).toBe("color3");

    dispatcher.dispatch(contrastEvents.chipPutDown());

    expect(store.carriedChip()).toBeNull();

    // The row's last two chips carry the pair's colours, so what is in hand is
    // a source rather than a slot.
    dispatcher.dispatch(contrastEvents.chipPickedUp("text"));

    expect(store.carriedChip()).toBe("text");
  });


  it("puts the chip down by placing it, so the drag needs no second event", () => {
    // A drag's release places the colour and ends the carry in one gesture,
    // and it runs before CDK reports the drag ended - so the clearing belongs
    // to the placement rather than to whichever caller notices last.
    const {store, dispatcher} = setup();

    dispatcher.dispatch(contrastEvents.chipPickedUp("color1"));
    dispatcher.dispatch(contrastEvents.colorPlaced({elementKey: "quote", source: "color1"}));

    expect(store.placements()).toEqual({quote: "color1"});
    expect(store.carriedChip()).toBeNull();
  });


  it("replaces a placement on an element the visitor places again", () => {
    const {store, dispatcher} = setup();

    dispatcher.dispatch(contrastEvents.colorPlaced({elementKey: "headline", source: "color2"}));
    dispatcher.dispatch(contrastEvents.colorPlaced({elementKey: "headline", source: "color4"}));

    expect(store.placements()).toEqual({headline: "color4"});
  });


  it("resets one element without touching the others", () => {
    const {store, dispatcher} = setup();

    dispatcher.dispatch(contrastEvents.colorPlaced({elementKey: "headline", source: "color2"}));
    dispatcher.dispatch(contrastEvents.colorPlaced({elementKey: "quote", source: "color3"}));
    dispatcher.dispatch(contrastEvents.placementReset("headline"));

    // The key is gone rather than set to null: an absent key is the one
    // spelling of "nothing placed" the derivation reads.
    expect(store.placements()).toEqual({quote: "color3"});
    expect(Object.keys(store.placements())).not.toContain("headline");
  });


  it("resets the whole page in one gesture", () => {
    const {store, dispatcher} = setup();

    dispatcher.dispatch(contrastEvents.colorPlaced({elementKey: "headline", source: "color2"}));
    dispatcher.dispatch(contrastEvents.colorPlaced({elementKey: "quote", source: "color3"}));
    dispatcher.dispatch(contrastEvents.placementsReset());

    expect(store.placements()).toEqual({});
  });


  it("writes no placement to storage, because carrying one across a reload is #68's", () => {
    const {dispatcher} = setup();

    dispatcher.dispatch(contrastEvents.colorPlaced({elementKey: "headline", source: "color2"}));
    dispatcher.dispatch(contrastEvents.placementReset("headline"));
    dispatcher.dispatch(contrastEvents.placementsReset());

    expect(localStorage.getItem(LOCAL_STORAGE_KEY)).toBeNull();
  });


  function headlineInk(store: AppStateStore): string {
    const page = samplePage(
      store.contrastColors(),
      store.currentPalette(),
      store.placements()
    );

    return inkOf(sampleElement("headline"), page).hex("rgb");
  }

});


describe("the contrast pair", () => {

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideFakeLiveAnnouncer()]
    });
  });


  it("keeps a placement through a change of the pair", () => {
    // The placement is about the palette, and the pair is a different pair of
    // colours: nothing about a new background says the visitor changed their
    // mind about the headline.
    const store = TestBed.inject(AppStateStore);
    const dispatcher = TestBed.inject(Dispatcher);

    dispatcher.dispatch(contrastEvents.colorPlaced({elementKey: "headline", source: "color2"}));
    dispatcher.dispatch(contrastEvents.backgroundColorChanged(chroma("#1B1917")));

    expect(store.placements()).toEqual({headline: "color2"});
  });

});
