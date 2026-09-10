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


  it("holds the pair, the palette chips, the sliders, the two gestures, the ledger, the type roles, the rating, the type controls and the vision block", async () => {
    const host = await contrastType();

    expect(host.querySelector("ct-pair-fields")).not.toBeNull();
    expect(host.querySelector("ct-palette-chips")).not.toBeNull();
    expect(host.querySelector("ct-pair-sliders")).not.toBeNull();
    expect(host.querySelector("ct-pair-actions")).not.toBeNull();
    expect(host.querySelector("ct-type-roles")).not.toBeNull();
    expect(host.querySelector("ct-apca-rating")).not.toBeNull();
    expect(host.querySelector("ct-type-controls")).not.toBeNull();
    expect(host.querySelector("ct-placed-colors")).not.toBeNull();
    expect(host.querySelector("ct-color-vision")).not.toBeNull();
  });


  it("puts the ledger between the pair's tally and the type roles, with the same rule", async () => {
    // The ledger asks about the same colours as the pair, so it stands with
    // them and the type block follows: what is about the page's colours is in
    // one run of the column. It is a block of that column rather than a
    // further row of the one above it - which is what the rule and the
    // spacing say.
    const host = await contrastType();
    const order = Array.from(host.querySelectorAll("ct-page-verdicts, ct-placed-colors, ct-type-roles"))
      .map(element => element.tagName.toLowerCase());

    expect(order).toEqual(["ct-page-verdicts", "ct-placed-colors", "ct-type-roles"]);

    const ledger = host.querySelector("ct-placed-colors") as HTMLElement;

    // The four the other blocks of the column carry, not the whole list: the
    // component's own host class is the ledger's business, not this file's.
    expect(Array.from(ledger.classList))
      .toEqual(expect.arrayContaining(["mt-5", "border-t", "border-line", "pt-4"]));
  });


  it("puts the sliders directly under the chips, because one target steers both", async () => {
    // `APPLY TO` names the half a chip's click applies to and the half the
    // sliders move. A block between them would put the two controls of one
    // mode on either side of something unrelated.
    const host = await contrastType();
    const order = Array.from(host.querySelectorAll("ct-palette-chips, ct-pair-sliders, ct-pair-actions"))
      .map(element => element.tagName.toLowerCase());

    expect(order).toEqual(["ct-palette-chips", "ct-pair-sliders", "ct-pair-actions"]);
  });


  it("steers the sliders from the chip row's target, not from a second selector", async () => {
    // The one mode has one display. Pressing `TEXT` above the chips is what
    // aims the sliders, and the sliders' own caption is what says so.
    const fixture = TestBed.createComponent(ContrastType);
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const chips = host.querySelector("ct-palette-chips") as HTMLElement;
    const caption = () => host
      .querySelector("ct-pair-sliders p")?.textContent?.trim() ?? "";

    expect(caption()).toBe("ADJUST BACKGROUND");

    const text = Array
      .from(chips.querySelectorAll<HTMLButtonElement>("[role=group] button"))
      .find(button => button.textContent?.trim() === "TEXT") as HTMLButtonElement;

    text.click();
    await fixture.whenStable();

    expect(caption()).toBe("ADJUST TEXT");
    expect(text.getAttribute("aria-pressed")).toBe("true");
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


  it("puts every column count behind a breakpoint, so the narrow layout is the unprefixed one", async () => {
    // The rule this pins is "Layouts Are Mobile-First". `pnpm lint` catches the
    // other half of it - a `max-*` variant walking a desktop layout back - but
    // an unprefixed `grid-cols-2` is a desktop-first layout no linter objects
    // to, and it would only show on a phone.
    const host = await contrastType();
    const columns = Array.from(host.classList)
      .filter(name => name.includes("grid-cols-"));

    expect(columns.length, "the grid declares no columns at all").toBeGreaterThan(0);
    expect(columns.filter(name => !/^(lg|xl):/.test(name))).toEqual([]);
  });


  it("declares two columns at lg and three at xl", async () => {
    const host = await contrastType();
    const columns = Array.from(host.classList)
      .filter(name => name.includes("grid-cols-"));

    // The tracks, not their widths: what the layout promises is a count, and
    // the widths are the doc comment's business.
    const tracks = (prefix: string) => columns
      .filter(name => name.startsWith(prefix))
      .flatMap(name => name.split("_"));

    expect(tracks("lg:").length).toBe(2);
    expect(tracks("xl:").length).toBe(3);
  });


  it("lifts the type block into the third column at xl and leaves the preview in the middle", async () => {
    // The preview is what the screen is about, so it keeps the column that
    // grows and the two control columns flank it.
    const host = await contrastType();
    const type = host.querySelector("ct-type-roles")?.parentElement as HTMLElement;
    const preview = host.querySelector("ct-website-preview") as HTMLElement;

    expect(Array.from(type.classList))
      .toEqual(expect.arrayContaining(["xl:col-start-3", "xl:row-start-1"]));
    expect(Array.from(preview.classList))
      .toEqual(expect.arrayContaining(["lg:col-start-2", "lg:row-start-1"]));
  });


  it("keeps the type block's rule to the widths where it is a block under the colours", async () => {
    // A rule across the top of a column says nothing, and at `xl` that is what
    // the type block is. Below it, it is the block under the colours and the
    // rule is the draft's own.
    const host = await contrastType();
    const type = host.querySelector("ct-type-roles")?.parentElement as HTMLElement;

    expect(Array.from(type.classList))
      .toEqual(expect.arrayContaining(["mt-5", "border-t", "border-line", "pt-4"]));
    expect(Array.from(type.classList))
      .toEqual(expect.arrayContaining(["xl:mt-0", "xl:border-t-0", "xl:pt-0"]));
  });


  it("splits the controls into a colour column and a type column", async () => {
    // Which column a block goes in is what the issue behind this screen is
    // about: the pair and the ways to get one on one side, the role and the
    // type it is set in on the other, and the tally with the colours because
    // it judges the pair rather than the role.
    const host = await contrastType();
    const columnOf = (selector: string) =>
      host.querySelector(selector)?.parentElement;
    const colors = columnOf("ct-pair-fields");
    const type = columnOf("ct-type-roles");

    expect(colors).not.toBe(type);

    for (const selector of ["ct-palette-chips", "ct-pair-sliders", "ct-pair-actions",
      "ct-page-verdicts", "ct-placed-colors", "ct-color-vision"]) {
      expect(columnOf(selector), selector).toBe(colors);
    }

    for (const selector of ["ct-apca-rating", "ct-type-controls"]) {
      expect(columnOf(selector), selector).toBe(type);
    }
  });

});
