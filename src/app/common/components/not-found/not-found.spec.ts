import {TestBed} from "@angular/core/testing";
import {provideRouter} from "@angular/router";
import {provideZonelessChangeDetection} from "@angular/core";
import {LiveAnnouncer} from "@angular/cdk/a11y";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {NotFound} from "./not-found";


describe("NotFound", () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([])
      ]
    });
  });


  async function render() {
    const fixture = TestBed.createComponent(NotFound);
    await fixture.whenStable();

    return {
      fixture,
      page: (): HTMLElement => fixture.nativeElement as HTMLElement
    };
  }


  function valuesIn(page: HTMLElement): string[] {
    return Array.from(page.querySelectorAll("dd"))
      .map(value => value.textContent?.trim() ?? "");
  }


  it("carries a header of its own, which is what lets the route drop the app header", async () => {
    const {page} = await render();

    expect(page().querySelector("header")).not.toBeNull();
  });


  it("leaves a way off the page, so a visitor is not stranded without the tabs", async () => {
    const {page} = await render();

    const destinations = Array.from(page().querySelectorAll("a"))
      .map(link => link.getAttribute("href"));

    expect(destinations).toContain("/");
    expect(destinations).toContain("/contrast");
  });


  it("shows the chroma sRGB holds next to the one that was asked for", async () => {
    const {page} = await render();

    const [requested, nearest] = valuesIn(page());

    expect(requested).toBe("oklch(62% 0.340 268)");
    expect(nearest).toMatch(/^oklch\(62% 0\.\d{3} 268\) · #[0-9A-F]{6}$/);
    expect(nearest).not.toContain("0.340");
  });


  it("rolls a different color on demand", async () => {
    const {fixture, page} = await render();
    const before = valuesIn(page());

    page().querySelector("button")?.click();
    await fixture.whenStable();

    expect(valuesIn(page())).not.toEqual(before);
  });


  it("announces the rolled color, because nothing moves focus to it", async () => {
    const announce = vi.spyOn(TestBed.inject(LiveAnnouncer), "announce")
      .mockResolvedValue(undefined);
    const {fixture, page} = await render();

    page().querySelector("button")?.click();
    await fixture.whenStable();

    expect(announce).toHaveBeenCalledWith(`Mixed ${valuesIn(page())[1]}`);
  });


  it("keeps the swatch out of the accessibility tree but not its caption", async () => {
    const {page} = await render();

    const caption = Array.from(page().querySelectorAll("p"))
      .find(paragraph => paragraph.textContent?.includes("clipped to"));

    expect(caption).toBeDefined();
    expect(caption?.closest("[aria-hidden=\"true\"]")).toBeNull();
    expect(page().querySelectorAll("[aria-hidden=\"true\"]").length).toBe(2);
  });

});
