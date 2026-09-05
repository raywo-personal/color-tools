import {TestBed} from "@angular/core/testing";
import {provideZonelessChangeDetection} from "@angular/core";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import chroma from "chroma-js";
import {loadAppStateReducer} from "@core/common/persistence.reducers";
import {initialState} from "@core/models/app-state.model";
import {LOCAL_STORAGE_KEY} from "@common/models/local-storage.model";
import {generatePalette, generatePaletteFrom} from "@engine/palette/palette.helper";
import {EventInstance} from "@ngrx/signals/events";
import {FONT_SIZE_RANGE, LINE_HEIGHT_RANGE} from "@engine/contrast/type-settings.model";
import {contrastIdFromColors} from "@engine/contrast/contrast-id.helper";
import {PALETTE_SLOTS} from "@engine/palette/palette.model";


type LoadEvent = EventInstance<"[Persistence] loadAppState", void>;

const loadEvent = {type: "[Persistence] loadAppState", payload: undefined} as LoadEvent;


describe("loadAppStateReducer", () => {

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({providers: [provideZonelessChangeDetection()]});
  });


  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });


  function loaded() {
    return TestBed.runInInjectionContext(
      () => loadAppStateReducer(loadEvent, initialState)
    );
  }


  function loadedTheme() {
    return loaded().colorTheme;
  }


  it("reports the initial theme to a visitor who has never chosen one", () => {
    // The control in the header shows this value as a pressed button, so a
    // default only the reducer knows would press a button the page does not
    // follow.
    expect(loadedTheme()).toBe(initialState.colorTheme);
  });


  it("reports the initial theme when the stored settings predate the key", () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({currentColor: "#123456"}));

    expect(loadedTheme()).toBe(initialState.colorTheme);
  });


  it("reports the initial theme when the stored settings are unreadable", () => {
    // The whole state load runs through `inject(LocalStorage)`, so an
    // unreadable entry that throws leaves the visitor with a blank viewport
    // rather than a wrong theme.
    localStorage.setItem(LOCAL_STORAGE_KEY, "{not json");

    expect(loadedTheme()).toBe(initialState.colorTheme);
  });


  it("reports a stored theme as it is", () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({colorTheme: "light"}));

    expect(loadedTheme()).toBe("light");
  });


  it("rolls a color for a visitor who has never had one", () => {
    // `chroma.random()` is stubbed rather than the test asserting against a
    // distribution: the property is that the branch runs at all, and a fixed
    // draw states it exactly. Note it does not read `Math.random`, so stubbing
    // that pins nothing here. A value in `EMPTY_SETTINGS` made this branch
    // unreachable, which is what the removal fixed.
    vi.spyOn(chroma, "random").mockReturnValue(chroma("#abcdef"));

    expect(loaded().currentColor.hex()).toBe("#abcdef");
  });


  it("reports a stored color as it is", () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({currentColor: "#123456"}));

    expect(loaded().currentColor.hex()).toBe("#123456");
  });


  it("takes the style from the restored palette, so the picker presses the chip the palette came from", () => {
    const stored = generatePalette("triadic");
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({currentPaletteId: stored.id}));

    const state = loaded();

    expect(state.currentPalette.style).toBe("triadic");
    expect(state.paletteStyle).toBe("triadic");
  });


  it("keeps the style and the palette together for a visitor who has never had one", () => {
    const state = loaded();

    expect(state.paletteStyle).toBe(state.currentPalette.style);
  });


  it("builds the first palette on the stored color", () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({currentColor: "#3366cc"}));

    expect(loaded().currentPalette.color0.color.hex("rgb")).toBe("#3366cc");
  });


  it("brings a stored palette back exactly when it is built on the stored color", () => {
    const stored = generatePaletteFrom(chroma("#3366cc"), "complementary", 11);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
      currentColor: "#3366cc",
      currentPaletteId: stored.id,
      paletteSeed: 11
    }));

    expect(loaded().currentPalette.id).toBe(stored.id);
  });


  it("rebuilds a stored palette that is not built on the stored color, in its style and roll", () => {
    // Storage from before the palette followed the color: the BASE swatch would
    // otherwise show a different color than the swatch above it until the
    // visitor happens to touch the color.
    const stored = generatePaletteFrom(chroma("#ff5733"), "complementary", 11);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
      currentColor: "#3366cc",
      currentPaletteId: stored.id,
      paletteSeed: 11
    }));

    const {currentPalette, paletteStyle} = loaded();

    expect(currentPalette.id).toBe(generatePaletteFrom(chroma("#3366cc"), "complementary", 11).id);
    expect(paletteStyle).toBe("complementary");
  });


  it("reports the stored roll, so the first drag after a reload continues the palette", () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({paletteSeed: 11}));

    expect(loaded().paletteSeed).toBe(11);
  });


  it("keeps the initial roll for a visitor who has none stored", () => {
    expect(loaded().paletteSeed).toBe(initialState.paletteSeed);
  });


  it("builds the first pair out of the palette, not out of a roll", () => {
    // A rolled pair has nothing to do with the color beside it, and nothing
    // afterwards brings the two together - `PALETTE PAIR` is a gesture, not a
    // reaction to the palette changing.
    const state = loaded();
    const members = PALETTE_SLOTS
      .map(slot => state.currentPalette[slot].color.hex("rgb"));

    expect(new Set(members).size, "the palette collapsed").toBeGreaterThan(1);
    expect(members).toContain(state.contrastColors.text.hex("rgb"));
    expect(members).toContain(state.contrastColors.background.hex("rgb"));
  });


  it("opens on such a pair before the load has even run", () => {
    // The store stands on `initialState` until `loadAppState` is dispatched,
    // so the first paint is this pair rather than the reducer's.
    const members = PALETTE_SLOTS
      .map(slot => initialState.currentPalette[slot].color.hex("rgb"));

    expect(new Set(members).size, "the palette collapsed").toBeGreaterThan(1);
    expect(members).toContain(initialState.contrastColors.text.hex("rgb"));
    expect(members).toContain(initialState.contrastColors.background.hex("rgb"));
  });


  it("reports a stored pair as it is, rather than rebuilding it from the palette", () => {
    // The fallback may not win over a pair the visitor set: it is the one thing
    // this screen passes judgement on.
    const stored = contrastIdFromColors({
      text: chroma("#123456"),
      background: chroma("#fedcba")
    });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({contrastId: stored}));

    const {contrastColors} = loaded();

    expect(contrastColors.text.hex("rgb")).toBe("#123456");
    expect(contrastColors.background.hex("rgb")).toBe("#fedcba");
  });


  it("keeps the initial type settings for a visitor who has none stored", () => {
    // They are deliberately absent from `EMPTY_SETTINGS`, so this fallback is
    // reachable - see the note there.
    expect(loaded().typeSettings).toEqual(initialState.typeSettings);
  });


  it("reports stored type settings as they are", () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
      fontSize: 14,
      fontWeight: 500,
      lineHeight: 1.35
    }));

    expect(loaded().typeSettings).toEqual({
      fontSize: 14,
      fontWeight: 500,
      lineHeight: 1.35
    });
  });


  it("repairs stored type settings the controls could not have produced", () => {
    // The three keys carry plain numbers and localStorage is editable by hand.
    // A weight off the `FONT_WEIGHTS` grid has no row in `apcaLookup`, so the
    // rating would read `.contrast` off nothing at all.
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
      fontSize: 400,
      fontWeight: 437,
      lineHeight: 0
    }));

    expect(loaded().typeSettings).toEqual({
      fontSize: FONT_SIZE_RANGE.max,
      fontWeight: 400,
      lineHeight: LINE_HEIGHT_RANGE.min
    });
  });

});
