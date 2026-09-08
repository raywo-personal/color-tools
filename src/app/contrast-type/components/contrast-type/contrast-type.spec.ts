import {provideZonelessChangeDetection} from "@angular/core";
import {TestBed} from "@angular/core/testing";
import {beforeEach, describe, expect, it} from "vitest";
import {provideFakeLiveAnnouncer} from "@testing/live-announcer.fake";
import {provideFakeGoogleFonts} from "@testing/google-fonts.fake";
import {provideSilentFontLoader} from "@testing/font-loader.fake";
import {ContrastType} from "@contrast-type/components/contrast-type/contrast-type";


describe("ContrastType", () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideFakeLiveAnnouncer(),
        // The typeface control reaches the font catalog, so without the fake
        // every fixture here would wait on a request that never answers.
        provideFakeGoogleFonts(),
        provideSilentFontLoader()
      ]
    });
  });


  async function contrastType() {
    const fixture = TestBed.createComponent(ContrastType);
    await fixture.whenStable();

    return fixture.nativeElement as HTMLElement;
  }


  it("holds the pair, the palette chips, the two gestures, the type roles, the rating, the type controls, the ledger and the vision block", async () => {
    const host = await contrastType();

    expect(host.querySelector("ct-pair-fields")).not.toBeNull();
    expect(host.querySelector("ct-palette-chips")).not.toBeNull();
    expect(host.querySelector("ct-pair-actions")).not.toBeNull();
    expect(host.querySelector("ct-type-roles")).not.toBeNull();
    expect(host.querySelector("ct-apca-rating")).not.toBeNull();
    expect(host.querySelector("ct-type-controls")).not.toBeNull();
    expect(host.querySelector("ct-placed-colors")).not.toBeNull();
    expect(host.querySelector("ct-color-vision")).not.toBeNull();
  });


  it("puts the ledger between the type controls and the vision block, with the same rule", async () => {
    // The draft's 1a puts `PLACED COLOURS` after the whole type block, and it
    // is a block of the column rather than a further row of the one above it -
    // which is what the rule and the spacing say.
    const host = await contrastType();
    const order = Array.from(host.querySelectorAll("ct-type-controls, ct-placed-colors, ct-color-vision"))
      .map(element => element.tagName.toLowerCase());

    expect(order).toEqual(["ct-type-controls", "ct-placed-colors", "ct-color-vision"]);

    const ledger = host.querySelector("ct-placed-colors") as HTMLElement;

    // The four the other blocks of the column carry, not the whole list: the
    // component's own host class is the ledger's business, not this file's.
    expect(Array.from(ledger.classList))
      .toEqual(expect.arrayContaining(["mt-6", "border-t", "border-line", "pt-5"]));
  });


  it("puts the rating directly under the type roles, and the type controls after it", async () => {
    // The figure answers about the role the segments select, so it follows
    // them; the sliders that tune that role come after.
    const host = await contrastType();
    const order = Array.from(host.querySelectorAll("ct-type-roles, ct-apca-rating, ct-type-controls"))
      .map(element => element.tagName.toLowerCase());

    expect(order).toEqual(["ct-type-roles", "ct-apca-rating", "ct-type-controls"]);
  });


  it("puts the website preview in the column that grows", async () => {
    const host = await contrastType();
    const preview = host.querySelector("ct-website-preview");

    expect(preview).not.toBeNull();
    expect(preview?.parentElement).toBe(host);
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
