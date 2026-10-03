import {TestBed} from "@angular/core/testing";
import {provideZonelessChangeDetection} from "@angular/core";
import {ActivatedRouteSnapshot, provideRouter, RouterStateSnapshot, UrlTree} from "@angular/router";
import {beforeEach, describe, expect, it} from "vitest";
import chroma from "chroma-js";
import {CONTRAST_ADDRESS_PARAMS, contrastGuard} from "./contrast-route.guard";
import {
  ADDRESS_SEPARATOR,
  contrastTypeAddressFrom,
  isRestorableContrastTypeAddress
} from "@contrast-type/models/contrast-type-address.model";
import {AppStateStore} from "@core/app-state.store";
import {generatePaletteFrom} from "@engine/palette/palette.helper";
import {DEFAULT_TYPE_SETTINGS_BY_ROLE} from "@engine/contrast/type-role.model";


describe("contrastGuard", () => {

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])]
    });
  });


  function guard(segments: readonly (string | undefined)[]) {
    const params = Object.fromEntries(CONTRAST_ADDRESS_PARAMS.map((name, index) => [name, segments[index]]));
    const route = {params, firstChild: null} as unknown as ActivatedRouteSnapshot;

    return TestBed.runInInjectionContext(
      () => contrastGuard(route, {} as RouterStateSnapshot)
    );
  }


  it("redirects an address it cannot restore to one it can, so it never loops", () => {
    const redirect = guard([undefined, undefined, undefined]) as UrlTree;
    const target = redirect.root.children["primary"].segments.slice(-3).map(segment => segment.path);

    expect(isRestorableContrastTypeAddress(target.join(ADDRESS_SEPARATOR))).toBe(true);
    expect(guard(target)).toBe(true);
  });


  it("restores the page the address carries", () => {
    const palette = generatePaletteFrom(chroma("#3366cc"), "triadic", 11);
    const address = contrastTypeAddressFrom({
      palette,
      seed: 11,
      text: chroma("#102030"),
      background: chroma("#f0e0d0"),
      type: {
        display: {family: null, settings: DEFAULT_TYPE_SETTINGS_BY_ROLE.display},
        body: {family: null, settings: DEFAULT_TYPE_SETTINGS_BY_ROLE.body},
        mono: {family: null, settings: DEFAULT_TYPE_SETTINGS_BY_ROLE.mono},
        ui: {family: null, settings: DEFAULT_TYPE_SETTINGS_BY_ROLE.ui}
      },
      placements: {headline: {ink: "color3"}}
    });

    expect(guard(address.split(ADDRESS_SEPARATOR))).toBe(true);

    const store = TestBed.inject(AppStateStore);

    expect(store.currentPalette().id).toBe(palette.id);
    expect(store.contrastColors().background.hex()).toBe("#f0e0d0");
    expect(store.placements()).toEqual({headline: {ink: "color3"}});
  });

});
