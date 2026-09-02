import {provideZonelessChangeDetection} from "@angular/core";
import {TestBed} from "@angular/core/testing";
import {beforeEach, describe, expect, it} from "vitest";
import {Studio} from "@studio/components/studio/studio";


describe("Studio", () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()]
    });
  });


  async function studio() {
    const fixture = TestBed.createComponent(Studio);
    await fixture.whenStable();

    return fixture.nativeElement as HTMLElement;
  }


  it("holds the swatch, the controls, the conversion list, the sliders, the palette, the ramps and the export panel", async () => {
    const host = await studio();

    expect(host.querySelector("ct-swatch")).not.toBeNull();
    expect(host.querySelector("ct-color-controls")).not.toBeNull();
    expect(host.querySelector("ul[ct-conversion-list]")).not.toBeNull();
    expect(host.querySelector("ct-color-sliders")).not.toBeNull();
    expect(host.querySelector("ct-style-picker")).not.toBeNull();
    expect(host.querySelector("ct-palette-swatches")).not.toBeNull();
    expect(host.querySelector("ct-tint-shade-ramps")).not.toBeNull();
    expect(host.querySelector("ct-export-panel")).not.toBeNull();
  });


  it("puts the two columns behind lg:, so the narrow layout is the unprefixed one", async () => {
    // The rule this pins is "Layouts Are Mobile-First". `pnpm lint` catches the
    // other half of it - a `max-*` variant walking a desktop layout back - but
    // an unprefixed `grid-cols-2` is a desktop-first layout no linter objects
    // to, and it would only show on a phone.
    const host = await studio();
    const columns = Array.from(host.classList)
      .filter(name => name.includes("grid-cols-"));

    expect(columns.length, "the grid declares no columns at all").toBeGreaterThan(0);
    expect(columns.filter(name => !name.startsWith("lg:"))).toEqual([]);
  });

});
