import {TestBed} from "@angular/core/testing";
import {provideZonelessChangeDetection} from "@angular/core";
import {Dispatcher} from "@ngrx/signals/events";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import chroma from "chroma-js";
import {AppStateStore} from "@core/app-state.store";
import {converterEvents} from "@core/converter/converter.events";
import {palettesEvents} from "@core/palettes/palettes.events";
import {PALETTE_SLOTS} from "@palettes/models/palette.model";


/**
 * Through the store rather than by calling the reducers: the rule under test
 * is that the palette follows the color the *converter's* reducer has just
 * written, and that depends on the order the store registers the two in.
 */
describe("the palette and the current color", () => {

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()]
    });
  });


  afterEach(() => vi.restoreAllMocks());


  function setup() {
    const store = TestBed.inject(AppStateStore);
    const dispatcher = TestBed.inject(Dispatcher);

    return {store, dispatcher};
  }


  function base(store: AppStateStore) {
    return store.currentPalette().color0.color.hex("rgb");
  }


  function hexes(store: AppStateStore) {
    return PALETTE_SLOTS.map(slot => store.currentPalette()[slot].color.hex("rgb"));
  }


  it("starts from the current color before anything is dispatched", () => {
    const {store} = setup();

    expect(base(store)).toBe(store.currentColor().hex("rgb"));
  });


  it("builds a picked style on the current color", () => {
    const {store, dispatcher} = setup();

    dispatcher.dispatch(converterEvents.colorChanged(chroma("#3366CC")));
    dispatcher.dispatch(palettesEvents.styleChanged("triadic"));

    expect(store.currentPalette().style).toBe("triadic");
    expect(base(store)).toBe("#3366cc");
  });


  it("rebuilds the palette on a committed color, in the style that is set", () => {
    const {store, dispatcher} = setup();

    dispatcher.dispatch(palettesEvents.styleChanged("monochromatic"));
    dispatcher.dispatch(converterEvents.colorChanged(chroma("#FF5733")));

    expect(base(store)).toBe("#ff5733");
    expect(store.currentPalette().style).toBe("monochromatic");
  });


  it("follows every frame of a drag, so the palette is seen moving with the sliders", () => {
    const {store, dispatcher} = setup();

    dispatcher.dispatch(palettesEvents.styleChanged("triadic"));
    dispatcher.dispatch(converterEvents.colorAdjusted(chroma("#3366CD")));

    expect(base(store)).toBe("#3366cd");
    expect(store.currentPalette().style).toBe("triadic");
  });


  it("keeps the variations still while the base moves", () => {
    // The generators jitter their members. Without the kept seed, two frames
    // at the same color would come back as two different palettes, and a drag
    // would flicker through them.
    const {store, dispatcher} = setup();

    dispatcher.dispatch(palettesEvents.styleChanged("analogous"));
    dispatcher.dispatch(converterEvents.colorAdjusted(chroma("#3366CC")));
    const firstFrame = hexes(store);

    dispatcher.dispatch(converterEvents.colorAdjusted(chroma("#FF5733")));
    dispatcher.dispatch(converterEvents.colorAdjusted(chroma("#3366CC")));

    expect(hexes(store)).toEqual(firstFrame);
  });


  it("draws a new roll when a style is picked, so the pressed chip re-rolls", () => {
    // `randomSeed()` reads `Math.random`, so a stubbed draw names the seed
    // exactly rather than asserting that two 32-bit draws differ.
    const {store, dispatcher} = setup();
    vi.spyOn(Math, "random").mockReturnValue(0.25);

    dispatcher.dispatch(palettesEvents.styleChanged("triadic"));

    expect(store.paletteSeed()).toBe(Math.floor(0.25 * 2 ** 32));
  });


  it("keeps the roll while the color moves", () => {
    const {store, dispatcher} = setup();

    dispatcher.dispatch(palettesEvents.styleChanged("triadic"));
    const seed = store.paletteSeed();

    dispatcher.dispatch(converterEvents.colorAdjusted(chroma("#3366CC")));
    dispatcher.dispatch(converterEvents.colorChanged(chroma("#3366CC")));
    dispatcher.dispatch(converterEvents.newRandomColorWithNav());

    expect(store.paletteSeed()).toBe(seed);
  });


  it("follows the color a roll of Random produced", () => {
    const {store, dispatcher} = setup();

    dispatcher.dispatch(converterEvents.newRandomColorWithNav());

    expect(base(store)).toBe(store.currentColor().hex("rgb"));
  });

});
