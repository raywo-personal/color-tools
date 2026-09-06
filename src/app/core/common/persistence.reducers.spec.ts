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
import {DISPLAY_FONT_SIZE_RANGE} from "@engine/contrast/type-role.model";
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


  it("keeps the initial type roles for a visitor who has none stored", () => {
    // They are deliberately absent from `EMPTY_SETTINGS`, so this fallback is
    // reachable - see the note there.
    expect(loaded().typeRoles).toEqual(initialState.typeRoles);
  });


  it("reports stored type roles as they are", () => {
    const display = {font: null, settings: {fontSize: 60, fontWeight: 700, lineHeight: 1.05}};
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({typeRoles: {display}}));

    expect(loaded().typeRoles.display).toEqual(display);
  });


  it("opens a role the storage does not carry at the role's defaults", () => {
    // Storage written while the page had fewer roles, or edited by hand.
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
      typeRoles: {display: {font: null, settings: {fontSize: 60, fontWeight: 700, lineHeight: 1.05}}}
    }));

    const {typeRoles} = loaded();

    expect(typeRoles.ui).toEqual(initialState.typeRoles.ui);
    expect(typeRoles.mono).toEqual(initialState.typeRoles.mono);
  });


  it("repairs stored type settings the controls could not have produced", () => {
    // The entry carries plain numbers and localStorage is editable by hand. A
    // weight off the `FONT_WEIGHTS` grid has no row in `apcaLookup`, so the
    // rating would read `.contrast` off nothing at all.
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
      typeRoles: {body: {font: null, settings: {fontSize: 400, fontWeight: 437, lineHeight: 0}}}
    }));

    expect(loaded().typeRoles.body.settings).toEqual({
      fontSize: FONT_SIZE_RANGE.max,
      fontWeight: 400,
      lineHeight: LINE_HEIGHT_RANGE.min
    });
  });


  it("repairs a display size against the display range, not body text's", () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
      typeRoles: {display: {font: null, settings: {fontSize: 400, fontWeight: 500, lineHeight: 1.1}}}
    }));

    expect(loaded().typeRoles.display.settings.fontSize).toBe(DISPLAY_FONT_SIZE_RANGE.max);
  });


  it("restores a role's typeface with the weights it was stored with", () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
      typeRoles: {
        display: {
          font: {family: "Merriweather", category: "serif", variant: "regular", weights: [300, 400, 700, 900]},
          settings: {fontSize: 44, fontWeight: 700, lineHeight: 1.1}
        }
      }
    }));

    expect(loaded().typeRoles.display.font?.weights).toEqual([300, 400, 700, 900]);
  });


  it("gives a typeface stored before the weights existed an empty list", () => {
    // Both readers of the field fall back on an empty list - the slider to the
    // app's own weights, the loader to the family's default weight - and
    // neither survives an `undefined`.
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
      typeRoles: {
        body: {
          font: {family: "Lobster", category: "display", variant: "regular"},
          settings: {fontSize: 18, fontWeight: 400, lineHeight: 1.6}
        }
      }
    }));

    expect(loaded().typeRoles.body.font?.weights).toEqual([]);
  });


  it("puts the stored weight on a stop the restored family actually ships", () => {
    // A reload has to land where the picker would have left the visitor, not
    // on a weight the browser would synthesise.
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
      typeRoles: {
        body: {
          font: {family: "Merriweather", category: "serif", variant: "regular", weights: [300, 400, 700, 900]},
          settings: {fontSize: 18, fontWeight: 500, lineHeight: 1.6}
        }
      }
    }));

    expect(loaded().typeRoles.body.settings.fontWeight).toBe(400);
  });


  it("reads the single typeface and its axes from before the roles as body text", () => {
    // A visitor who set their type before the roles keeps it; the other roles
    // open at their defaults.
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
      selectedFont: {family: "Merriweather", category: "serif", variant: "regular", weights: [300, 400, 700, 900]},
      fontSize: 14,
      fontWeight: 700,
      lineHeight: 1.35
    }));

    const {typeRoles} = loaded();

    expect(typeRoles.body).toEqual({
      font: {family: "Merriweather", category: "serif", variant: "regular", weights: [300, 400, 700, 900]},
      settings: {fontSize: 14, fontWeight: 700, lineHeight: 1.35}
    });
    expect(typeRoles.display).toEqual(initialState.typeRoles.display);
  });


  it("fills a half-written legacy entry from body text's defaults", () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({fontSize: 14}));

    expect(loaded().typeRoles.body.settings).toEqual({...initialState.typeRoles.body.settings, fontSize: 14});
  });


  it("lets a stored body role win over the legacy keys", () => {
    // Both may be present in a storage written across the change; the newer
    // shape is the one the app wrote last.
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
      fontSize: 14,
      typeRoles: {body: {font: null, settings: {fontSize: 21, fontWeight: 400, lineHeight: 1.6}}}
    }));

    expect(loaded().typeRoles.body.settings.fontSize).toBe(21);
  });

});
