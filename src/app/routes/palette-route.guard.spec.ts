import {TestBed} from "@angular/core/testing";
import {provideZonelessChangeDetection} from "@angular/core";
import {ActivatedRouteSnapshot, provideRouter, RouterStateSnapshot, UrlTree} from "@angular/router";
import {beforeEach, describe, expect, it} from "vitest";
import {paletteGuard} from "./palette-route.guard";
import {isRestorablePaletteSegment} from "@engine/palette/palette-segment.helper";


describe("paletteGuard", () => {

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])]
    });
  });


  function guard(paletteId: string | undefined) {
    const route = {params: {paletteId}, firstChild: null} as unknown as ActivatedRouteSnapshot;

    return TestBed.runInInjectionContext(
      () => paletteGuard(route, {} as RouterStateSnapshot)
    );
  }


  it("redirects an address it cannot restore to one it can, so it never loops", () => {
    const redirect = guard(undefined) as UrlTree;
    const target = redirect.root.children["primary"].segments.at(-1)?.path ?? "";

    expect(isRestorablePaletteSegment(target)).toBe(true);
    expect(guard(target)).toBe(true);
  });

});
