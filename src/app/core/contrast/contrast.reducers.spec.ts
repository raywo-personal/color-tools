import {provideZonelessChangeDetection} from "@angular/core";
import {TestBed} from "@angular/core/testing";
import {Dispatcher} from "@ngrx/signals/events";
import {beforeEach, describe, expect, it} from "vitest";
import chroma from "chroma-js";
import {AppStateStore} from "@core/app-state.store";
import {contrastEvents} from "@core/contrast/contrast.events";
import {palettesEvents} from "@core/palettes/palettes.events";
import {persistenceEvents} from "@core/common/persistence.events";
import {storedPage} from "@testing/stored-address";
import {provideFakeGoogleFonts} from "@testing/google-fonts.fake";
import {commonEvents} from "@core/common/common.events";
import {contrastTypePageOf} from "@core/contrast/contrast.reducers";
import {ContrastTypePage, contrastTypeAddressFrom} from "@contrast-type/models/contrast-type-address.model";
import {generatePaletteFrom} from "@engine/palette/palette.helper";
import {DEFAULT_TYPE_SETTINGS_BY_ROLE} from "@engine/contrast/type-role.model";
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

    dispatcher.dispatch(contrastEvents.colorPlaced({elementKey: "headline", side: "ink", source: "background"}));

    expect(store.placements()).toEqual({headline: {ink: "background"}});

    // The same property a slot has: the source is kept and the colour is
    // resolved when the page is built, so typing a new background moves the
    // headline with it.
    dispatcher.dispatch(contrastEvents.backgroundColorChanged(chroma("#204080")));

    expect(store.placements()).toEqual({headline: {ink: "background"}});
    expect(headlineInk(store)).toBe("#204080");
  });


  it("holds a placement as a slot, so the palette can move under it", () => {
    const {store, dispatcher} = setup();

    dispatcher.dispatch(contrastEvents.colorPlaced({elementKey: "headline", side: "ink", source: "color2"}));

    expect(store.placements()).toEqual({headline: {ink: "color2"}});

    // The colour follows the slot rather than the other way round: a new
    // palette hands the headline `color2`'s new colour without a second
    // event. `sample-page.model.spec.ts` pins the two palettes side by side;
    // what this asserts is that the store keeps the slot.
    dispatcher.dispatch(palettesEvents.styleChanged("triadic"));

    expect(store.placements()).toEqual({headline: {ink: "color2"}});
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
    dispatcher.dispatch(contrastEvents.colorPlaced({elementKey: "quote", side: "ink", source: "color1"}));

    expect(store.placements()).toEqual({quote: {ink: "color1"}});
    expect(store.carriedChip()).toBeNull();
  });


  it("replaces a placement on an element the visitor places again", () => {
    const {store, dispatcher} = setup();

    dispatcher.dispatch(contrastEvents.colorPlaced({elementKey: "headline", side: "ink", source: "color2"}));
    dispatcher.dispatch(contrastEvents.colorPlaced({elementKey: "headline", side: "ink", source: "color4"}));

    expect(store.placements()).toEqual({headline: {ink: "color4"}});
  });


  it("holds both sides of one element, because they are two placements", () => {
    const {store, dispatcher} = setup();

    dispatcher.dispatch(contrastEvents.colorPlaced({elementKey: "bodyText", side: "ink", source: "color2"}));
    dispatcher.dispatch(contrastEvents.colorPlaced({elementKey: "bodyText", side: "ground", source: "color4"}));

    // The second placement did not replace the first: a visitor who colours a
    // paragraph and then puts a band behind it has made both.
    expect(store.placements()).toEqual({bodyText: {ink: "color2", ground: "color4"}});
  });


  it("resets one side and leaves the other standing", () => {
    const {store, dispatcher} = setup();

    dispatcher.dispatch(contrastEvents.colorPlaced({elementKey: "bodyText", side: "ink", source: "color2"}));
    dispatcher.dispatch(contrastEvents.colorPlaced({elementKey: "bodyText", side: "ground", source: "color4"}));
    dispatcher.dispatch(contrastEvents.placementReset({elementKey: "bodyText", side: "ink"}));

    expect(store.placements()).toEqual({bodyText: {ground: "color4"}});
  });


  it("drops the element's key with the last of its two sides", () => {
    // An entry holding neither side would be a second spelling of "nothing
    // placed", and the ledger walks the keys.
    const {store, dispatcher} = setup();

    dispatcher.dispatch(contrastEvents.colorPlaced({elementKey: "bodyText", side: "ground", source: "color4"}));
    dispatcher.dispatch(contrastEvents.placementReset({elementKey: "bodyText", side: "ground"}));

    expect(store.placements()).toEqual({});
    expect(Object.keys(store.placements())).not.toContain("bodyText");
  });


  it("resets one element without touching the others", () => {
    const {store, dispatcher} = setup();

    dispatcher.dispatch(contrastEvents.colorPlaced({elementKey: "headline", side: "ink", source: "color2"}));
    dispatcher.dispatch(contrastEvents.colorPlaced({elementKey: "quote", side: "ink", source: "color3"}));
    dispatcher.dispatch(contrastEvents.placementReset({elementKey: "headline", side: "ink"}));

    // The key is gone rather than set to null: an absent key is the one
    // spelling of "nothing placed" the derivation reads.
    expect(store.placements()).toEqual({quote: {ink: "color3"}});
    expect(Object.keys(store.placements())).not.toContain("headline");
  });


  it("resets the whole page in one gesture", () => {
    const {store, dispatcher} = setup();

    dispatcher.dispatch(contrastEvents.colorPlaced({elementKey: "headline", side: "ink", source: "color2"}));
    dispatcher.dispatch(contrastEvents.colorPlaced({elementKey: "quote", side: "ink", source: "color3"}));
    dispatcher.dispatch(contrastEvents.placementsReset());

    expect(store.placements()).toEqual({});
  });


  it("writes a placement to storage, and a reset of one and of all", () => {
    const {dispatcher} = setup();

    dispatcher.dispatch(contrastEvents.colorPlaced({elementKey: "headline", side: "ink", source: "color2"}));
    dispatcher.dispatch(contrastEvents.colorPlaced({elementKey: "quote", side: "ground", source: "text"}));

    expect(storedPage()?.placements).toEqual({headline: {ink: "color2"}, quote: {ground: "text"}});

    dispatcher.dispatch(contrastEvents.placementReset({elementKey: "headline", side: "ink"}));

    expect(storedPage()?.placements).toEqual({quote: {ground: "text"}});

    dispatcher.dispatch(contrastEvents.placementsReset());

    expect(storedPage()?.placements).toEqual({});
  });


  it("keeps the placements across a reload", () => {
    const {dispatcher} = setup();

    dispatcher.dispatch(contrastEvents.colorPlaced({elementKey: "signIn", side: "ground", source: "color4"}));

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({providers: [provideZonelessChangeDetection(), provideFakeLiveAnnouncer()]});

    const reloaded = setup();

    // In an injection context, as the app initializer dispatches it: the
    // reducer reads the storage through `inject()`.
    TestBed.runInInjectionContext(() => reloaded.dispatcher.dispatch(persistenceEvents.loadAppState()));

    expect(reloaded.store.placements()).toEqual({signIn: {ground: "color4"}});
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

    dispatcher.dispatch(contrastEvents.colorPlaced({elementKey: "headline", side: "ink", source: "color2"}));
    dispatcher.dispatch(contrastEvents.backgroundColorChanged(chroma("#1B1917")));

    expect(store.placements()).toEqual({headline: {ink: "color2"}});
  });

});


describe("restoring the Contrast & Type address", () => {

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideFakeLiveAnnouncer(), provideFakeGoogleFonts()]
    });
  });


  const palette = generatePaletteFrom(chroma("#3366cc"), "analogous", 9);

  const page: ContrastTypePage = {
    palette,
    seed: 9,
    text: chroma("#0a0b0c"),
    background: chroma("#f0f1f2"),
    type: {
      display: {family: "Playfair Display", settings: {fontSize: 52, fontWeight: 300, lineHeight: 1.15}},
      body: {family: null, settings: {fontSize: 17, fontWeight: 400, lineHeight: 1.5}},
      mono: {family: null, settings: DEFAULT_TYPE_SETTINGS_BY_ROLE.mono},
      ui: {family: null, settings: DEFAULT_TYPE_SETTINGS_BY_ROLE.ui}
    },
    placements: {headline: {ink: "color3"}, filledButton: {ground: "text"}}
  };


  function restored(address: string) {
    const store = TestBed.inject(AppStateStore);

    TestBed.inject(Dispatcher).dispatch(contrastEvents.restoreContrastType(address));

    return store;
  }


  it("restores the page as a whole, so a placement resolves against the sender's palette", () => {
    const store = restored(contrastTypeAddressFrom(page));

    expect(store.currentPalette().id).toBe(palette.id);
    expect(store.paletteSeed()).toBe(9);
    expect(store.currentColor().hex()).toBe(palette.color0.color.hex());
    expect(store.contrastColors().text.hex()).toBe("#0a0b0c");
    expect(store.placements()).toEqual(page.placements);
    expect(headlineInk(store)).toBe(palette.color3.color.hex("rgb"));
  });


  it("writes the same address back, so a link written by the app restores the same page", () => {
    const address = contrastTypeAddressFrom(page);
    const store = restored(address);

    expect(contrastTypeAddressFrom(contrastTypePageOf({
      currentPalette: store.currentPalette(),
      paletteSeed: store.paletteSeed(),
      contrastColors: store.contrastColors(),
      typeRoles: store.typeRoles(),
      placements: store.placements()
    }))).toBe(address);
  });


  it("sets a face by name and keeps the address's weight until the catalogue has answered", () => {
    const {font, settings} = restored(contrastTypeAddressFrom(page)).typeRoles().display;

    expect(font?.family).toBe("Playfair Display");
    expect(settings.fontWeight).toBe(300);
  });


  it("keeps a face the role is already set in, weights and all", () => {
    const store = TestBed.inject(AppStateStore);
    const playfair = {family: "Playfair Display", category: "serif", variant: "regular", weights: [400, 700]};

    TestBed.inject(Dispatcher).dispatch(commonEvents.fontSelected({role: "display", font: playfair}));
    TestBed.inject(Dispatcher).dispatch(contrastEvents.restoreContrastType(contrastTypeAddressFrom(page)));

    expect(store.typeRoles().display.font).toEqual(playfair);
  });


  it("changes nothing on an address it cannot read", () => {
    const store = TestBed.inject(AppStateStore);
    const before = store.currentPalette();

    TestBed.inject(Dispatcher).dispatch(contrastEvents.restoreContrastType("not/an/address"));

    expect(store.currentPalette()).toBe(before);
  });


  it("saves what the address showed, so the next reload opens on it", () => {
    restored(contrastTypeAddressFrom(page));

    expect(storedPage()?.placements).toEqual(page.placements);
  });


  function headlineInk(store: AppStateStore): string {
    return inkOf(sampleElement("headline"), samplePage(store.contrastColors(), store.currentPalette(), store.placements()))
      .hex("rgb");
  }

});
