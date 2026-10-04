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
 * A document that collects the link elements rather than loading them.
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
      head: {
        appendChild: (link: StubLink) => links.push(link),
        // The service only ever asks for its own links, by prefix.
        querySelectorAll: () => [...links]
      },
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


  function hrefs(): string[] {
    return stub.links.map(link => link.href);
  }


  it("asks for the weights the family ships and no others", () => {
    // The same set the WEIGHT slider stands on. `css2` would tolerate a wider
    // ladder - it serves what the family has and drops the rest, as long as
    // one of the weights exists - but then the request asks for faces that do
    // not exist and says nothing about which weights the visitor actually got.
    loader().loadFonts([selection("Merriweather", [300, 400, 700, 900])]);

    expect(hrefs()[0]).toContain("family=Merriweather:wght@300;400;700;900");
  });


  it("asks a face known by name alone for every weight on the grid", () => {
    // A face restored from an address or v1 storage, before the catalogue has
    // said which weights it ships. Without an axis Google serves the default
    // weight alone, and a role set at 700 is drawn in synthesised bold. The
    // whole grid rather than the role's weight: `css2` rejects a request in
    // which no weight exists, so a single 700 would load nothing at all for
    // a family that ships 400 alone.
    loader().loadFonts([selection("Lobster", [])]);

    expect(hrefs()[0]).toContain("family=Lobster:wght@100;200;300;400;500;600;700;800;900&");
  });


  it("keeps a face's link standing once the catalogue completes it", () => {
    // The grid already holds every weight the family ships. Replacing the link
    // would fetch the stylesheet again and flash the preview through its
    // fallback on every reload.
    const service = loader();

    service.loadFonts([selection("Lobster", [])]);
    const first = stub.links[0];
    const href = first.href;

    service.loadFonts([selection("Lobster", [400])]);

    expect(stub.links).toHaveLength(1);
    expect(stub.links[0]).toBe(first);
    expect(stub.links[0].href).toBe(href);
  });


  it("writes the family name the way the url wants it", () => {
    loader().loadFonts([selection("Playfair Display", [400])]);

    expect(hrefs()[0]).toContain("family=Playfair+Display");
  });


  it("loads one stylesheet per family, however many roles share it", () => {
    // Two roles in Merriweather read the same file; a link per role would
    // fetch it twice and leave two identical elements in the head.
    loader().loadFonts([
      selection("Merriweather", [400, 700]),
      null,
      selection("Merriweather", [400, 700]),
      selection("Lobster", [400])
    ]);

    expect(hrefs()).toHaveLength(2);
  });


  it("takes out a family no role reads any more", () => {
    const service = loader();

    service.loadFonts([selection("Lobster", [400]), selection("Merriweather", [400])]);
    service.loadFonts([selection("Merriweather", [400])]);

    expect(hrefs()).toHaveLength(1);
    expect(hrefs()[0]).toContain("family=Merriweather");
  });


  it("brings a family back that was switched away from and returned to", () => {
    // A remembered family must come back with its stylesheet the second time,
    // or the visitor switches away and back and the preview loses the font.
    const service = loader();

    service.loadFonts([selection("Lobster", [400])]);
    service.loadFonts([selection("Merriweather", [400])]);
    service.loadFonts([selection("Lobster", [400])]);

    expect(hrefs()).toHaveLength(1);
    expect(hrefs()[0]).toContain("family=Lobster");
  });


  it("leaves a family that is already in the head alone", () => {
    // Replacing the link would fetch the stylesheet again and flash the
    // preview through its fallback while it does.
    const service = loader();

    service.loadFonts([selection("Lobster", [400])]);
    const first = stub.links[0];

    service.loadFonts([selection("Lobster", [400])]);

    expect(stub.links[0]).toBe(first);
  });


  it("brings a standing link up to the weights the roles now ask for", () => {
    // The id keys the family alone while the url carries the weight axis. A
    // v1 selection may carry fewer weights than the family ships, so a second
    // role in that family would otherwise stand on a weight the head never
    // loaded, in the browser's synthesised face, with the rating measuring it.
    const service = loader();

    service.loadFonts([selection("Lobster", [400])]);
    service.loadFonts([selection("Lobster", [400]), selection("Lobster", [400, 700])]);

    expect(hrefs()).toHaveLength(1);
    expect(hrefs()[0]).toContain("family=Lobster:wght@400;700");
  });


  it("leaves the document alone when nothing is chosen", () => {
    loader().loadFonts([null, null, null, null]);

    expect(stub.links).toHaveLength(0);
  });

});
