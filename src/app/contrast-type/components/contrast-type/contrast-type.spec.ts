import {provideZonelessChangeDetection} from "@angular/core";
import {TestBed} from "@angular/core/testing";
import {beforeEach, describe, expect, it} from "vitest";
import {provideFakeLiveAnnouncer} from "@testing/live-announcer.fake";
import {ContrastType} from "@contrast-type/components/contrast-type/contrast-type";


describe("ContrastType", () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideFakeLiveAnnouncer()]
    });
  });


  async function contrastType() {
    const fixture = TestBed.createComponent(ContrastType);
    await fixture.whenStable();

    return fixture.nativeElement as HTMLElement;
  }


  it("holds the pair, the palette chips and the two gestures", async () => {
    const host = await contrastType();

    expect(host.querySelector("ct-pair-fields")).not.toBeNull();
    expect(host.querySelector("ct-palette-chips")).not.toBeNull();
    expect(host.querySelector("ct-pair-actions")).not.toBeNull();
  });


  it("puts the two columns behind lg:, so the narrow layout is the unprefixed one", async () => {
    // The rule this pins is "Layouts Are Mobile-First". `pnpm lint` catches the
    // other half of it - a `max-*` variant walking a desktop layout back - but
    // an unprefixed `grid-cols-2` is a desktop-first layout no linter objects
    // to, and it would only show on a phone.
    const host = await contrastType();
    const columns = Array.from(host.classList)
      .filter(name => name.includes("grid-cols-"));

    expect(columns.length, "the grid declares no columns at all").toBeGreaterThan(0);
    expect(columns.filter(name => !name.startsWith("lg:"))).toEqual([]);
  });

});
