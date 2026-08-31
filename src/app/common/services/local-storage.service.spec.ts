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


  it("reports the EMPTY_SETTINGS value for a key it does carry", () => {
    expect(service.get("colorTheme")).toBe("system");
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
