import {TestBed} from "@angular/core/testing";
import {provideZonelessChangeDetection} from "@angular/core";
import {afterEach, beforeEach, describe, expect, it} from "vitest";
import {LocalStorage} from "@common/services/local-storage.service";
import {EMPTY_SETTINGS, LOCAL_STORAGE_KEY} from "@common/models/local-storage.model";


describe("LocalStorage", () => {

  let service: LocalStorage;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({providers: [provideZonelessChangeDetection()]});
    service = TestBed.inject(LocalStorage);
  });


  afterEach(() => {
    localStorage.clear();
  });


  it("reports nothing for a key EMPTY_SETTINGS does not carry", () => {
    // The caller's own fallback is only reachable through this null. A value
    // in EMPTY_SETTINGS would make `chroma.random()` on the other side dead
    // code without anything failing.
    expect(EMPTY_SETTINGS.currentColor).toBeUndefined();
    expect(service.get("currentColor")).toBeNull();
  });


  it("leaves the theme to the caller's fallback", () => {
    // The one place the theme default lives is `initialState`, so the reducer's
    // `getOrDefault("colorTheme", state.colorTheme)` has to be able to reach
    // it. A value here would make that line unreachable and the two defaults
    // would have to be kept equal by hand.
    expect(EMPTY_SETTINGS.colorTheme).toBeUndefined();
    expect(service.get("colorTheme")).toBeNull();
  });


  it("reports the EMPTY_SETTINGS value for a key it does carry", () => {
    expect(service.get("currentPaletteId")).toBe(EMPTY_SETTINGS.currentPaletteId);
  });


  it("reports nothing for a key a stored map predates", () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({colorTheme: "light"}));

    expect(service.get("currentColor")).toBeNull();
    expect(service.get("colorTheme")).toBe("light");
  });


  it("keeps the other keys when one is written", () => {
    service.set("colorTheme", "dark");
    service.set("currentColor", "#123456");

    expect(service.get("colorTheme")).toBe("dark");
    expect(service.get("currentColor")).toBe("#123456");
  });

});
