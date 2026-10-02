import {TestBed} from "@angular/core/testing";
import {provideZonelessChangeDetection} from "@angular/core";
import {Dispatcher} from "@ngrx/signals/events";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import chroma from "chroma-js";
import {AppStateStore} from "@core/app-state.store";
import {converterEvents} from "@core/converter/converter.events";
import {palettesEvents} from "@core/palettes/palettes.events";
import {PALETTE_SLOTS} from "@engine/palette/palette.model";
import {generatePaletteFrom} from "@engine/palette/palette.helper";
import {paletteSegmentFrom, PALETTE_SEED_BASE62_LENGTH} from "@engine/palette/palette-segment.helper";
import {bigIntToBase62} from "@engine/helpers/base62.helper";
import {createTints} from "@engine/helpers/tints-and-shades.helper";
import {persistenceEvents} from "@core/common/persistence.events";
import {LOCAL_STORAGE_KEY} from "@common/models/local-storage.model";
import {provideSilentFontLoader} from "@testing/font-loader.fake";


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


describe("restoring a palette segment", () => {

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      // `loadAppState` hands the type roles to the font loader.
      providers: [provideZonelessChangeDetection(), provideSilentFontLoader()]
    });
  });


  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });


  /** The palette the sender was looking at, and the roll it follows with. */
  const shared = generatePaletteFrom(chroma("#3366cc"), "analogous", 11);
  const segment = paletteSegmentFrom(shared, 11);


  /** A store whose own color, style and roll differ from the shared ones. */
  function receiver() {
    const store = TestBed.inject(AppStateStore);
    const dispatcher = TestBed.inject(Dispatcher);

    dispatcher.dispatch(converterEvents.colorChanged(chroma("#ff5733")));
    dispatcher.dispatch(palettesEvents.styleChanged("monochromatic"));

    return {store, dispatcher};
  }


  function hexes(store: AppStateStore) {
    return PALETTE_SLOTS.map(slot => store.currentPalette()[slot].color.hex("rgb"));
  }


  it("puts the color beside BASE on BASE itself", () => {
    const {store, dispatcher} = receiver();

    dispatcher.dispatch(palettesEvents.restorePalette(segment));

    expect(store.currentPalette().id).toBe(shared.id);
    expect(store.currentColor().hex("rgb")).toBe("#3366cc");
  });


  it("lets the tints follow the restored color, not the visitor's own", () => {
    const {store, dispatcher} = receiver();

    dispatcher.dispatch(palettesEvents.restorePalette(segment));

    const expected = createTints(chroma("#3366cc"), store.useBezier(), store.correctLightness());
    expect(store.tintColors().map(c => c.hex())).toEqual(expected.map(c => c.hex()));
  });


  it("takes style and roll from the segment, so the picker presses the shared chip", () => {
    const {store, dispatcher} = receiver();

    dispatcher.dispatch(palettesEvents.restorePalette(segment));

    expect(store.paletteStyle()).toBe("analogous");
    expect(store.paletteSeed()).toBe(11);
  });


  it("follows a drag the way the sender's palette did", () => {
    // Under the receiver's own roll the four derived swatches would re-roll
    // on the first frame instead of moving with the base.
    const {store, dispatcher} = receiver();

    dispatcher.dispatch(palettesEvents.restorePalette(segment));
    dispatcher.dispatch(converterEvents.colorAdjusted(chroma("#22aa66")));

    const sendersFrame = generatePaletteFrom(chroma("#22aa66"), "analogous", 11);
    expect(hexes(store)).toEqual(PALETTE_SLOTS.map(slot => sendersFrame[slot].color.hex("rgb")));
  });


  it("leaves the visitor's state alone when the seed is out of range", () => {
    const {store, dispatcher} = receiver();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const before = store.currentPalette().id;

    dispatcher.dispatch(palettesEvents.restorePalette(
      shared.id + bigIntToBase62(2n ** 32n, PALETTE_SEED_BASE62_LENGTH)
    ));

    expect(store.currentPalette().id).toBe(before);
    expect(store.currentColor().hex("rgb")).toBe("#ff5733");
  });


  it("wins over the storage loaded before it, and saves what the link showed", () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
      currentColor: "#ff5733",
      currentPaletteId: generatePaletteFrom(chroma("#ff5733"), "triadic", 5).id,
      paletteSeed: 5
    }));
    const store = TestBed.inject(AppStateStore);
    const dispatcher = TestBed.inject(Dispatcher);

    // In an injection context, as the app initializer dispatches it: the
    // reducer reads the storage through `inject()`.
    TestBed.runInInjectionContext(() => dispatcher.dispatch(persistenceEvents.loadAppState()));
    expect(store.currentPalette().style).toBe("triadic");

    dispatcher.dispatch(palettesEvents.restorePalette(segment));

    expect(store.currentPalette().id).toBe(shared.id);
    const saved = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) ?? "{}");
    expect(saved.currentColor).toBe("#3366cc");
    expect(saved.currentPaletteId).toBe(shared.id);
    expect(saved.paletteSeed).toBe(11);
  });

});
