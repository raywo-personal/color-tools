import {TestBed} from "@angular/core/testing";
import {provideZonelessChangeDetection} from "@angular/core";
import {ActivatedRouteSnapshot, provideRouter, RouterStateSnapshot, UrlTree} from "@angular/router";
import {beforeEach, describe, expect, it} from "vitest";
import chroma from "chroma-js";
import {PALETTE_SEGMENT_PARAM, paletteGuard} from "./palette-route.guard";
import {isRestorablePaletteSegment, PALETTE_SEGMENT_LENGTH, paletteSegmentFrom} from "@engine/palette/palette-segment.helper";
import {AppStateStore} from "@core/app-state.store";
import {generatePaletteFrom} from "@engine/palette/palette.helper";


describe("paletteGuard", () => {

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])]
    });
  });


  function guard(segment: string | undefined, fragment: string | null = null) {
    const route = {params: {[PALETTE_SEGMENT_PARAM]: segment}, firstChild: null, fragment} as unknown as ActivatedRouteSnapshot;

    return TestBed.runInInjectionContext(
      () => paletteGuard(route, {} as RouterStateSnapshot)
    );
  }


  function segmentOf(redirect: UrlTree): string {
    return redirect.root.children["primary"].segments.at(-1)?.path ?? "";
  }


  function currentSegment(): string {
    const store = TestBed.inject(AppStateStore);

    return paletteSegmentFrom(store.currentPalette(), store.paletteSeed());
  }


  /** Well-formed, but the seed field spells a value past the 32 bits. */
  const UNRESTORABLE_SEGMENT = "z".repeat(PALETTE_SEGMENT_LENGTH);


  it("sends a path without a segment on to the state the visitor already has", () => {
    const before = currentSegment();

    const redirect = guard(undefined) as UrlTree;

    expect(segmentOf(redirect)).toBe(before);
  });


  it("lets the redirect through, so it never loops", () => {
    const target = segmentOf(guard(undefined) as UrlTree);

    expect(guard(target)).toBe(true);
  });


  it("restores the palette and the seed a segment carries", () => {
    const palette = generatePaletteFrom(chroma("#3366cc"), "triadic", 11);
    const segment = paletteSegmentFrom(palette, 11);

    expect(guard(segment)).toBe(true);

    const store = TestBed.inject(AppStateStore);

    expect(store.currentPalette().id).toBe(palette.id);
    expect(store.paletteSeed()).toBe(11);
  });


  it("rolls a fresh palette for a segment it cannot restore", () => {
    expect(isRestorablePaletteSegment(UNRESTORABLE_SEGMENT)).toBe(false);

    const before = currentSegment();
    const target = segmentOf(guard(UNRESTORABLE_SEGMENT) as UrlTree);

    expect(isRestorablePaletteSegment(target)).toBe(true);
    expect(target).not.toBe(before);
  });


  it("keeps the fragment, so a link into a section still lands there", () => {
    const fromBare = guard(undefined, "palette") as UrlTree;
    const fromUnreadable = guard(UNRESTORABLE_SEGMENT, "palette") as UrlTree;

    expect(fromBare.fragment).toBe("palette");
    expect(fromUnreadable.fragment).toBe("palette");
  });

});
