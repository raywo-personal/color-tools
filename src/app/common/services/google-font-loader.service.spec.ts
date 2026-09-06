import {DOCUMENT} from "@angular/common";
import {provideZonelessChangeDetection} from "@angular/core";
import {TestBed} from "@angular/core/testing";
import {beforeEach, describe, expect, it} from "vitest";
import {SelectedFont} from "@common/models/google-font.model";
import {GoogleFontLoaderService} from "@common/services/google-font-loader.service";


function selection(family: string, weights: number[]): SelectedFont {
  return {family, category: "sans-serif", variant: "regular", weights};
}


/** The link element the service builds, as far as the service touches it. */
interface StubLink {

  id: string;
  rel: string;
  href: string;

  remove(): void;

}


/**
 * A document that collects the link element rather than loading it.
 *
 * The real one is happy-dom's, which fetches a `<link rel="stylesheet">` the
 * moment it reaches the head - so every run would ask fonts.googleapis.com
 * for a stylesheet, and a request that outlives the test prints a
 * NetworkError under a green summary. Offline that is every run. The members
 * below are the whole of what the service asks a document for.
 */
function stubDocument() {
  const links: StubLink[] = [];

  function createElement(): StubLink {
    const link: StubLink = {
      id: "",
      rel: "",
      href: "",
      remove: () => {
        const index = links.indexOf(link);

        if (index >= 0) links.splice(index, 1);
      }
    };

    return link;
  }

  return {
    links,
    document: {
      createElement,
      getElementById: (id: string) => links.find(link => link.id === id) ?? null,
      head: {appendChild: (link: StubLink) => links.push(link)},
      body: {style: {setProperty: () => undefined, removeProperty: () => undefined}}
    }
  };
}


describe("GoogleFontLoaderService", () => {

  let stub: ReturnType<typeof stubDocument>;


  beforeEach(() => {
    stub = stubDocument();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {provide: DOCUMENT, useValue: stub.document}
      ]
    });
  });


  function loader(): GoogleFontLoaderService {
    return TestBed.inject(GoogleFontLoaderService);
  }


  function href(): string {
    return stub.links.find(link => link.id === "ct-google-font")?.href ?? "";
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

    expect(stub.links).toHaveLength(1);
    expect(href()).toContain("family=Lobster");
  });


  it("leaves the document alone when nothing is chosen", () => {
    loader().loadFont(null);

    expect(stub.links).toHaveLength(0);
  });

});
