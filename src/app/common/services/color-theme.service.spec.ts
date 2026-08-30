import {TestBed} from "@angular/core/testing";
import {provideZonelessChangeDetection} from "@angular/core";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {ColorThemeService} from "@common/services/color-theme.service";


describe("ColorThemeService", () => {

  let service: ColorThemeService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()]
    });

    service = TestBed.inject(ColorThemeService);
  });


  afterEach(() => {
    document.documentElement.removeAttribute("data-theme");
    vi.restoreAllMocks();
  });


  function mockSystemTheme(prefersDark: boolean): void {
    vi.spyOn(window, "matchMedia").mockImplementation(query => ({
      matches: prefersDark,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false
    } as MediaQueryList));
  }


  it("writes the theme onto the root element, not onto the body", () => {
    service.colorTheme = "dark";

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(document.body.getAttribute("data-theme")).toBeNull();
  });


  it("keeps light and dark as written", () => {
    service.colorTheme = "light";
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");

    service.colorTheme = "dark";
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });


  it("resolves 'system' before it reaches the DOM", () => {
    mockSystemTheme(true);
    service.colorTheme = "system";
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    mockSystemTheme(false);
    service.colorTheme = "system";
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

});
