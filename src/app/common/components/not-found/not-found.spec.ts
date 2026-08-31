import {TestBed} from "@angular/core/testing";
import {provideRouter, Router, RouterOutlet} from "@angular/router";
import {Component, provideZonelessChangeDetection} from "@angular/core";
import {LiveAnnouncer} from "@angular/cdk/a11y";
import {beforeEach, describe, expect, it, vi} from "vitest";
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


  function swatchLabels(page: HTMLElement): string[] {
    return Array.from(page.querySelectorAll("li span:last-child"))
      .map(label => label.textContent?.trim() ?? "");
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


  it("renames it when the router reuses the component for a second unknown path", async () => {
    const {fixture, page} = await renderAt("/contrst");

    await TestBed.inject(Router).navigateByUrl("/palletes");
    await fixture.whenStable();

    expect(page().textContent).toContain("/palletes");
    expect(page().textContent).not.toContain("/contrst");
  });


  it("stops the palette short, which is what makes the page a picture of a miss", async () => {
    const {page} = await renderAt("/does-not-exist");

    const labels = swatchLabels(page());

    expect(labels).toHaveLength(8);
    expect(labels.slice(0, 5).every(label => /^#[0-9A-F]{6}$/.test(label))).toBe(true);
    expect(labels.slice(5)).toEqual(["—", "—", "—"]);
  });


  it("keeps the chips out of the accessibility tree and labels the list instead", async () => {
    const {page} = await renderAt("/does-not-exist");

    const list = page().querySelector("ul");

    expect(list?.getAttribute("aria-label")).toBe(
      "A ColorTools palette of 5 colors, with 3 slots left unmixed");
    expect(page().querySelectorAll("li [aria-hidden=\"true\"]")).toHaveLength(8);
  });


  it("rolls a different palette on demand", async () => {
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

    expect(announce).toHaveBeenCalledWith(
      `New palette: ${swatchLabels(page()).slice(0, 5).join(", ")}`);
  });

});
