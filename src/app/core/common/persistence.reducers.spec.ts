import {TestBed} from "@angular/core/testing";
import {provideZonelessChangeDetection} from "@angular/core";
import {afterEach, beforeEach, describe, expect, it} from "vitest";
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
  });


  function loadedTheme() {
    return TestBed.runInInjectionContext(
      () => loadAppStateReducer(loadEvent, initialState).colorTheme
    );
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


  it("reports a stored theme as it is", () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({colorTheme: "light"}));

    expect(loadedTheme()).toBe("light");
  });

});
