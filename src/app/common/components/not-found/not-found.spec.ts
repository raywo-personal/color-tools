import {TestBed} from "@angular/core/testing";
import {provideRouter, Router, RouterOutlet} from "@angular/router";
import {Component, provideZonelessChangeDetection} from "@angular/core";
import {beforeEach, describe, expect, it} from "vitest";
import chroma from "chroma-js";
import {colorName} from "@engine/color/color-name.helper";
import {PALETTE_SLOTS} from "@engine/palette/palette.model";
import {generatePaletteFrom} from "@engine/palette/palette.helper";
import {isRestorablePaletteSegment, paletteFromSegment} from "@engine/palette/palette-segment.helper";
import {fakeLiveAnnouncer, provideFakeLiveAnnouncer} from "@testing/live-announcer.fake";
import {NotFound} from "./not-found";


@Component({
  selector: "ct-outlet-host",
  imports: [RouterOutlet],
  template: "<router-outlet/>"
})
class OutletHost {
}


describe("NotFound", () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideFakeLiveAnnouncer(),
        provideRouter([{path: "**", component: NotFound}])
      ]
    });
  });


  async function renderAt(path: string) {
    const fixture = TestBed.createComponent(OutletHost);
    await TestBed.inject(Router).navigateByUrl(path);
    await fixture.whenStable();

    return {
      fixture,
      page: (): HTMLElement => fixture.nativeElement as HTMLElement
    };
  }


  /** The label as it is seen, with any screen-reader-only text taken back out. */
  function swatchLabels(page: HTMLElement): string[] {
    return Array.from(page.querySelectorAll("li > span:last-child"))
      .map(label => {
        const hidden = label.querySelector(".cdk-visually-hidden")?.textContent ?? "";

        return (label.textContent ?? "").replace(hidden, "").trim();
      });
  }


  it("carries a header of its own, which is what lets the route drop the app header", async () => {
    const {page} = await renderAt("/does-not-exist");

    expect(page().querySelector("header")).not.toBeNull();
  });


  it("leaves a way off the page, so a visitor is not stranded without the tabs", async () => {
    const {page} = await renderAt("/does-not-exist");

    const destinations = Array.from(page().querySelectorAll("a"))
      .map(link => link.getAttribute("href"));

    expect(destinations).toContain("/");
    expect(destinations).toContain("/contrast");
  });


  it("points the footer at the sections the Studio has, and at Contrast & Type", async () => {
    const {page} = await renderAt("/does-not-exist");

    const destinations = Array.from(page().querySelectorAll("nav a"))
      .map(link => [link.textContent?.trim(), link.getAttribute("href")]);

    // A bare `/` with the section's id: the guard sends it on to the
    // visitor's own palette and keeps the fragment.
    expect(destinations).toEqual([
      ["Converter", "/#converter"],
      ["Palettes", "/#palette"],
      ["Tints & shades", "/#tints-and-shades"],
      ["Contrast & type", "/contrast"]
    ]);
  });


  it("names the address that was actually requested", async () => {
    const {page} = await renderAt("/contrst");

    expect(page().textContent).toContain("/contrst");
  });


  it("keeps the query string, because a broken link is what the address is read for", async () => {
    const {page} = await renderAt("/palletes?color=ff0000");

    expect(page().textContent).toContain("/palletes?color=ff0000");
  });


  it("names a percent-encoded path as it was asked, not decoded", async () => {
    const {page} = await renderAt("/my%20page");

    expect(page().textContent).toContain("/my%20page");
  });


  it("renames it when the router reuses the component for a second unknown path", async () => {
    const {fixture, page} = await renderAt("/contrst");

    await TestBed.inject(Router).navigateByUrl("/palletes");
    await fixture.whenStable();

    expect(page().textContent).toContain("/palletes");
    expect(page().textContent).not.toContain("/contrst");
  });


  it("puts the palette after the way out, so a short viewport cuts the picture", async () => {
    const {page} = await renderAt("/does-not-exist");

    const links = page().querySelector("nav");
    const palette = page().querySelector("ul");
    const order = links?.compareDocumentPosition(palette as Node);

    expect(order).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });


  it("stops the palette short, which is what makes the page a picture of a miss", async () => {
    const {page} = await renderAt("/does-not-exist");

    const labels = swatchLabels(page());

    expect(labels).toHaveLength(8);
    expect(labels.slice(0, 5).every(label => /^#[0-9A-F]{6}$/.test(label))).toBe(true);
    expect(labels.slice(5)).toEqual(["#??????", "#??????", "#??????"]);
  });


  it("keeps the chips out of the accessibility tree and labels the list instead", async () => {
    const {page} = await renderAt("/does-not-exist");

    const list = page().querySelector("ul");

    // Without the role Safari drops the list semantics Preflight took the
    // marker from, and the label goes with them.
    expect(list?.getAttribute("role")).toBe("list");
    expect(list?.getAttribute("aria-label")).toBe(
      "A ColorTools palette of 5 colors, with 3 slots left unmixed");
    expect(page().querySelectorAll("li > span:first-child[aria-hidden=\"true\"]"))
      .toHaveLength(8);
  });


  it("names the unmixed slots for a screen reader too, not with six question marks", async () => {
    const {page} = await renderAt("/does-not-exist");

    const hidden = Array.from(page().querySelectorAll(".cdk-visually-hidden"))
      .map(text => text.textContent?.trim());

    expect(hidden).toEqual(["Not mixed", "Not mixed", "Not mixed"]);
  });


  it("rolls a whole new palette on demand, base color included", async () => {
    const {fixture, page} = await renderAt("/does-not-exist");
    const before = swatchLabels(page());

    page().querySelector("button")?.click();
    await fixture.whenStable();

    expect(swatchLabels(page())).not.toEqual(before);
  });


  describe("the palette link", () => {

    /** The palette segment the picture links to, the leading `/` taken off. */
    function linkedSegment(page: HTMLElement): string {
      const link = page.querySelector("ul")?.closest("a");

      return (link?.getAttribute("href") ?? "").replace(/^\//, "");
    }


    it("opens the palette on show in the Studio", async () => {
      const {page} = await renderAt("/does-not-exist");

      const segment = linkedSegment(page());
      const {palette} = paletteFromSegment(segment);

      expect(isRestorablePaletteSegment(segment)).toBe(true);
      expect(PALETTE_SLOTS.map(slot => palette[slot].color.hex().toUpperCase()))
        .toEqual(swatchLabels(page()).slice(0, 5));
    });


    it("carries the seed the palette was rolled with, so the first drag moves it rather than re-rolling it", async () => {
      const {page} = await renderAt("/does-not-exist");

      const {palette, seed} = paletteFromSegment(linkedSegment(page()));

      // What the Studio does on every move of the base color.
      const rebuilt = generatePaletteFrom(palette.color0.color, palette.style, seed);

      expect(rebuilt.id).toBe(palette.id);
    });


    it("follows a newly mixed palette", async () => {
      const {fixture, page} = await renderAt("/does-not-exist");
      const before = linkedSegment(page());

      page().querySelector("button")?.click();
      await fixture.whenStable();

      const {palette} = paletteFromSegment(linkedSegment(page()));

      expect(linkedSegment(page())).not.toBe(before);
      expect(PALETTE_SLOTS.map(slot => palette[slot].color.hex().toUpperCase()))
        .toEqual(swatchLabels(page()).slice(0, 5));
    });


    it("is named by its caption, not by the hex codes it holds", async () => {
      const {page} = await renderAt("/does-not-exist");

      const link = page().querySelector("ul")?.closest("a");
      const caption = page().querySelector(`#${link?.getAttribute("aria-labelledby")}`);

      expect(caption?.textContent?.trim()).toBe("OPEN THIS PALETTE IN THE STUDIO");
    });

  });


  it("announces the rolled palette, because nothing moves focus to it", async () => {
    const announcer = fakeLiveAnnouncer();
    const {fixture, page} = await renderAt("/does-not-exist");

    page().querySelector("button")?.click();
    await fixture.whenStable();

    const names = swatchLabels(page()).slice(0, 5)
      .map(hex => colorName(chroma(hex)));

    // Polite, because the visitor asked for the palette and is not waiting on
    // it: the roll must not cut into whatever is being read.
    expect(announcer.last).toEqual({
      message: `New palette: ${names.join(", ")}`,
      politeness: "polite"
    });
  });


  it("announces color names, because a hex code is spelled out one character at a time", async () => {
    const announcer = fakeLiveAnnouncer();
    const {fixture, page} = await renderAt("/does-not-exist");

    page().querySelector("button")?.click();
    await fixture.whenStable();

    expect(announcer.last?.message).not.toMatch(/#[0-9A-F]{6}/);
  });

});
