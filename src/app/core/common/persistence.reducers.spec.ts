import {TestBed} from "@angular/core/testing";
import {provideZonelessChangeDetection} from "@angular/core";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import chroma from "chroma-js";
import {loadAppStateReducer} from "@core/common/persistence.reducers";
import {initialState} from "@core/models/app-state.model";
import {LOCAL_STORAGE_KEY} from "@common/models/local-storage.model";
import {EventInstance} from "@ngrx/signals/events";


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

});
