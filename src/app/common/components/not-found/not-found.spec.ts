import {TestBed} from "@angular/core/testing";
import {provideRouter, Router, RouterOutlet} from "@angular/router";
import {Component, provideZonelessChangeDetection} from "@angular/core";
import {LiveAnnouncer} from "@angular/cdk/a11y";
import {beforeEach, describe, expect, it, vi} from "vitest";
import chroma from "chroma-js";
import {colorName} from "@common/helpers/color-name.helper";
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


  it("announces the rolled palette, because nothing moves focus to it", async () => {
    const announce = vi.spyOn(TestBed.inject(LiveAnnouncer), "announce")
      .mockResolvedValue(undefined);
    const {fixture, page} = await renderAt("/does-not-exist");

    page().querySelector("button")?.click();
    await fixture.whenStable();

    const names = swatchLabels(page()).slice(0, 5)
      .map(hex => colorName(chroma(hex)));

    expect(announce).toHaveBeenCalledWith(`New palette: ${names.join(", ")}`);
  });


  it("announces color names, because a hex code is spelled out one character at a time", async () => {
    const announce = vi.spyOn(TestBed.inject(LiveAnnouncer), "announce")
      .mockResolvedValue(undefined);
    const {fixture, page} = await renderAt("/does-not-exist");

    page().querySelector("button")?.click();
    await fixture.whenStable();

    expect(announce.mock.calls[0][0]).not.toMatch(/#[0-9A-F]{6}/);
  });

});
