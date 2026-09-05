import {provideZonelessChangeDetection} from "@angular/core";
import {TestBed} from "@angular/core/testing";
import {beforeEach, describe, expect, it} from "vitest";
import {GoogleFontsService} from "@common/services/google-fonts.service";
import {fakeGoogleFonts, FAKE_FONTS, googleFont, provideFakeGoogleFonts} from "@testing/google-fonts.fake";


describe("FakeGoogleFonts", () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideFakeGoogleFonts()]
    });
  });


  it("stands in for the service the components inject", () => {
    expect(TestBed.inject(GoogleFontsService)).toBe(fakeGoogleFonts());
  });


  it("answers with a catalog in the order it was given", () => {
    const items = fakeGoogleFonts().googleFonts.value()?.items ?? [];

    expect(items.map(font => font.family)).toEqual(FAKE_FONTS.map(font => font.family));
  });


  it("holds a family that ships a single weight, which is the case the slider has to survive", () => {
    const single = FAKE_FONTS.filter(font => font.variants.length === 1);

    expect(single.length).toBeGreaterThan(0);
  });


  it("hands back nothing while the request is out or has failed", () => {
    const catalog = fakeGoogleFonts();

    catalog.fail();

    expect(catalog.googleFonts.value()).toBeUndefined();
    expect(catalog.googleFonts.error()).toBeDefined();

    catalog.succeed();

    expect(catalog.googleFonts.value()?.items).toHaveLength(FAKE_FONTS.length);
  });


  it("counts what a retry asked for", () => {
    const catalog = fakeGoogleFonts();

    catalog.googleFonts.reload();

    expect(catalog.reloads).toBe(1);
  });


  it("searches the list a spec puts in", () => {
    const catalog = fakeGoogleFonts();

    catalog.items.set([googleFont("Only One", "serif", ["regular"])]);

    expect(catalog.searchFonts("only").map(font => font.family)).toEqual(["Only One"]);
    expect(catalog.searchFonts("")).toEqual([]);
  });

});
