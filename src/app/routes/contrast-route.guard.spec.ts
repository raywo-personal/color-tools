import {TestBed} from "@angular/core/testing";
import {provideZonelessChangeDetection} from "@angular/core";
import {ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree} from "@angular/router";
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
import {contrastTypePageOf} from "@core/contrast/contrast.reducers";
import {PALETTE_SEGMENT_LENGTH} from "@engine/palette/palette-segment.helper";


describe("contrastGuard", () => {

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])]
    });
  });


  function guard(segments: readonly (string | undefined)[], fragment: string | null = null) {
    const params = Object.fromEntries(CONTRAST_ADDRESS_PARAMS.map((name, index) => [name, segments[index]]));
    const route = {params, firstChild: null, fragment} as unknown as ActivatedRouteSnapshot;

    return TestBed.runInInjectionContext(
      () => contrastGuard(route, {} as RouterStateSnapshot)
    );
  }


  /** The three segments a redirect leads to, as the router hands them over. */
  function segmentsOf(redirect: UrlTree): string[] {
    return redirect.root.children["primary"].segments.slice(-3).map(segment => segment.path);
  }


  function currentAddress(): string {
    const store = TestBed.inject(AppStateStore);

    return contrastTypeAddressFrom(contrastTypePageOf({
      currentPalette: store.currentPalette(),
      paletteSeed: store.paletteSeed(),
      contrastColors: store.contrastColors(),
      typeRoles: store.typeRoles(),
      placements: store.placements()
    }));
  }


  /** Three segments, but a palette segment whose seed field overflows. */
  const UNRESTORABLE = ["z".repeat(PALETTE_SEGMENT_LENGTH), "0", ",,,"];


  it("sends a path without an address on to the page the visitor already has", () => {
    const before = currentAddress();

    const redirect = guard([undefined, undefined, undefined]) as UrlTree;

    expect(segmentsOf(redirect).join(ADDRESS_SEPARATOR)).toBe(before);
  });


  it("lets the redirect through, so it never loops", () => {
    const target = segmentsOf(guard([undefined, undefined, undefined]) as UrlTree);

    expect(isRestorableContrastTypeAddress(target.join(ADDRESS_SEPARATOR))).toBe(true);
    expect(guard(target)).toBe(true);
  });


  it("rolls a fresh palette for an address it cannot restore and keeps the rest of the page", () => {
    expect(isRestorableContrastTypeAddress(UNRESTORABLE.join(ADDRESS_SEPARATOR))).toBe(false);

    const [paletteBefore, ...restBefore] = currentAddress().split(ADDRESS_SEPARATOR);
    const target = segmentsOf(guard(UNRESTORABLE) as UrlTree);
    const [paletteAfter, ...restAfter] = target;

    expect(isRestorableContrastTypeAddress(target.join(ADDRESS_SEPARATOR))).toBe(true);
    expect(paletteAfter).not.toBe(paletteBefore);
    expect(restAfter).toEqual(restBefore);
  });


  it("keeps the fragment", () => {
    const fromBare = guard([undefined, undefined, undefined], "preview") as UrlTree;
    const fromUnreadable = guard(UNRESTORABLE, "preview") as UrlTree;

    expect(fromBare.fragment).toBe("preview");
    expect(fromUnreadable.fragment).toBe("preview");
  });


  it("writes a family name into the link encoded once", () => {
    const palette = generatePaletteFrom(chroma("#3366cc"), "triadic", 11);
    const address = contrastTypeAddressFrom({
      palette,
      seed: 11,
      text: chroma("#102030"),
      background: chroma("#f0e0d0"),
      type: {
        display: {family: "Open Sans", settings: DEFAULT_TYPE_SETTINGS_BY_ROLE.display},
        body: {family: null, settings: DEFAULT_TYPE_SETTINGS_BY_ROLE.body},
        mono: {family: null, settings: DEFAULT_TYPE_SETTINGS_BY_ROLE.mono},
        ui: {family: null, settings: DEFAULT_TYPE_SETTINGS_BY_ROLE.ui}
      },
      placements: {}
    });

    // The params as the router hands them over for the link: decoded once.
    guard(segmentsOf(TestBed.inject(Router).parseUrl(`/contrast/${address}`)));

    const redirect = guard([undefined, undefined, undefined]) as UrlTree;
    const url = TestBed.inject(Router).serializeUrl(redirect);

    expect(url.endsWith("/Open%20Sans,,,")).toBe(true);
    expect(guard(segmentsOf(redirect))).toBe(true);
    expect(TestBed.inject(AppStateStore).typeRoles().display.font?.family).toBe("Open Sans");
  });


  it("lets the redirect through whatever family a link restored", () => {
    const [palette, view] = currentAddress().split(ADDRESS_SEPARATOR);

    // What the router hands over for `.../100%2525,,,`: it decodes once.
    expect(guard([palette, view, "100%25,,,"])).toBe(true);

    const target = segmentsOf(guard([undefined, undefined, undefined]) as UrlTree);

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
