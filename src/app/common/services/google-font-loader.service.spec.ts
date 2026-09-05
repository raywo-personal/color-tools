import {provideZonelessChangeDetection} from "@angular/core";
import {TestBed} from "@angular/core/testing";
import {afterEach, beforeEach, describe, expect, it} from "vitest";
import {SelectedFont} from "@common/models/google-font.model";
import {GoogleFontLoaderService} from "@common/services/google-font-loader.service";


function selection(family: string, weights: number[]): SelectedFont {
  return {family, category: "sans-serif", variant: "regular", weights};
}


describe("GoogleFontLoaderService", () => {

  beforeEach(() => {
    TestBed.configureTestingModule({providers: [provideZonelessChangeDetection()]});
  });


  afterEach(() => {
    document.getElementById("ct-google-font")?.remove();
    document.body.style.removeProperty("--ct-selected-font");
  });


  function loader(): GoogleFontLoaderService {
    return TestBed.inject(GoogleFontLoaderService);
  }


  function href(): string {
    return document.getElementById("ct-google-font")?.getAttribute("href") ?? "";
  }


  it("asks for the weights the family ships and no others", () => {
    // The same set the WEIGHT slider stands on. `css2` would tolerate a wider
    // ladder - it serves what the family has and drops the rest - but then the
    // request asks for faces that do not exist and says nothing about which
    // weights the visitor actually got.
    loader().loadFont(selection("Merriweather", [300, 400, 700, 900]));

    expect(href()).toContain("family=Merriweather:wght@300;400;700;900");
  });


  it("asks for no weight axis at all where none is known", () => {
    // A selection stored before the weights existed. The family's default is
    // the honest answer; a guessed list could be rejected outright.
    loader().loadFont(selection("Lobster", []));

    expect(href()).toContain("family=Lobster&");
    expect(href()).not.toContain("wght");
  });


  it("writes the family name the way the url wants it", () => {
    loader().loadFont(selection("Playfair Display", [400]));

    expect(href()).toContain("family=Playfair+Display");
  });


  it("brings a family back that was switched away from and returned to", () => {
    // The link is replaced on every call, so a remembered family would come
    // back without a stylesheet the second time - the visitor switches away
    // and back and the preview loses the font.
    const service = loader();

    service.loadFont(selection("Lobster", [400]));
    service.loadFont(selection("Merriweather", [400]));
    service.loadFont(selection("Lobster", [400]));

    expect(document.querySelectorAll("#ct-google-font")).toHaveLength(1);
    expect(href()).toContain("family=Lobster");
  });


  it("leaves the document alone when nothing is chosen", () => {
    loader().loadFont(null);

    expect(document.getElementById("ct-google-font")).toBeNull();
  });

});
