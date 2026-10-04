import {TestBed} from "@angular/core/testing";
import {provideZonelessChangeDetection} from "@angular/core";
import {Dispatcher} from "@ngrx/signals/events";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import chroma from "chroma-js";
import {AppStateStore} from "@core/app-state.store";
import {palettesEvents} from "@core/palettes/palettes.events";
import {converterEvents} from "@core/converter/converter.events";
import {CopyService} from "@common/services/copy.service";
import {colorName} from "@engine/color/color-name.helper";
import {PALETTE_SLOTS} from "@engine/palette/palette.model";
import {PaletteStyle, styleDescriptionFor} from "@engine/palette/palette-style.model";
import {roleCaptionFor} from "@engine/palette/palette-role.helper";
import {PaletteSwatches} from "@studio/components/palette-swatches/palette-swatches";


describe("PaletteSwatches", () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()]
    });
  });


  afterEach(() => vi.restoreAllMocks());


  async function swatches(style: PaletteStyle = "triadic") {
    // The store registers its reducers when it is created, so an event
    // dispatched before that is lost and the initial random palette stands.
    const store = TestBed.inject(AppStateStore);

    TestBed.inject(Dispatcher).dispatch(palettesEvents.styleChanged(style));
    const fixture = TestBed.createComponent(PaletteSwatches);
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;

    function items() {
      return Array.from(host.querySelectorAll("li"));
    }

    function buttons() {
      return Array.from(host.querySelectorAll("button"));
    }

    function captions(item: HTMLElement) {
      return Array.from(item.querySelectorAll("p")).map(p => p.textContent?.trim() ?? "");
    }

    return {fixture, store, host, items, buttons, captions};
  }


  it("shows the five colors of the current palette in slot order, each with its hex", async () => {
    const {store, items, captions} = await swatches();
    const palette = store.currentPalette();

    expect(items().map(item => captions(item)[0]))
      .toEqual(PALETTE_SLOTS.map(slot => palette[slot].color.hex("rgb").toUpperCase()));
  });


  it("puts the color the visitor is working on first, as the base", async () => {
    const {fixture, buttons, items, captions} = await swatches("triadic");

    TestBed.inject(Dispatcher).dispatch(converterEvents.colorChanged(chroma("#3366CC")));
    await fixture.whenStable();

    expect(buttons()[0].style.backgroundColor).toBe("#3366cc");
    expect(captions(items()[0])).toEqual(["#3366CC", "BASE"]);
  });


  it("follows the sliders while they are still moving", async () => {
    // A drag raises `colorAdjusted` per frame, not `colorChanged`; the
    // palette has to move on that, or it stands still until the release.
    const {fixture, buttons} = await swatches("triadic");

    TestBed.inject(Dispatcher).dispatch(converterEvents.colorAdjusted(chroma("#FF5733")));
    await fixture.whenStable();

    expect(buttons()[0].style.backgroundColor).toBe("#ff5733");
  });


  it("paints each swatch in its color", async () => {
    const {store, buttons} = await swatches();
    const palette = store.currentPalette();

    expect(buttons().map(button => button.style.backgroundColor))
      .toEqual(PALETTE_SLOTS.map(slot => palette[slot].color.hex("rgb")));
  });


  it("captions each swatch with the role its style gives the slot", async () => {
    const {items, captions} = await swatches("triadic");

    expect(items().map(item => captions(item)[1]))
      .toEqual(PALETTE_SLOTS.map(slot => roleCaptionFor("triadic", slot)));
  });


  it("names each swatch by its color and role, never by its hex", async () => {
    // A hex code is read out one character at a time; the color's name is
    // what a screen reader can use.
    const {store, buttons} = await swatches();
    const palette = store.currentPalette();

    buttons().forEach((button, index) => {
      const slot = PALETTE_SLOTS[index];
      const color = palette[slot].color;

      expect(button.getAttribute("aria-label"))
        .toBe(`Copy ${colorName(color)}, ${roleCaptionFor("triadic", slot)}`);
      expect(button.getAttribute("aria-label")).not.toContain("#");
    });
  });


  it("copies the hex it shows, through the copy service", async () => {
    const copyColor = vi.spyOn(TestBed.inject(CopyService), "copyColor")
      .mockResolvedValue(undefined);
    const {store, buttons} = await swatches();
    const second = store.currentPalette().color1.color;

    buttons()[1].click();

    expect(copyColor).toHaveBeenCalledOnce();

    const [color, text] = copyColor.mock.calls[0];

    expect(chroma.valid(color)).toBe(true);
    expect(color.hex("rgb")).toBe(second.hex("rgb"));
    expect(text).toBe(second.hex("rgb").toUpperCase());
  });


  it("explains the style under the swatches", async () => {
    const {host} = await swatches("monochromatic");
    const note = host.querySelector("ul + p");

    expect(note?.textContent?.trim()).toBe(styleDescriptionFor("monochromatic"));
  });


  it("follows a newly rolled palette, roles and note included", async () => {
    const {fixture, host, items, captions} = await swatches("triadic");

    TestBed.inject(Dispatcher).dispatch(palettesEvents.styleChanged("high-contrast"));
    await fixture.whenStable();

    expect(items().map(item => captions(item)[1]))
      .toEqual(PALETTE_SLOTS.map(slot => roleCaptionFor("high-contrast", slot)));
    expect(host.querySelector("ul + p")?.textContent?.trim())
      .toBe(styleDescriptionFor("high-contrast"));
  });


  it("stays a list once Preflight has taken its marker", async () => {
    const {host} = await swatches();
    const list = host.querySelector("ul");

    expect(list?.getAttribute("role")).toBe("list");
    expect(list?.getAttribute("aria-label")).toBe("Palette colors");
  });


  it("puts the five columns behind sm:, so a phone gets two rows", async () => {
    // Five across 320px leave about 50px per swatch, under the touch minimum.
    // `pnpm lint` catches a max-* variant walking a desktop layout back; an
    // unprefixed `grid-cols-5` is desktop-first and no linter objects to it.
    const {host} = await swatches();
    const columns = Array.from(host.querySelector("ul")?.classList ?? [])
      .filter(name => name.includes("grid-cols-"));

    expect(columns.filter(name => !name.includes(":"))).not.toContain("grid-cols-5");
    expect(columns).toContain("sm:grid-cols-5");
  });


  it("binds the single click only, leaving double-click for the pinning decision", async () => {
    // The draft sets the base color on double-click. A synthetic dblclick
    // fires no click of its own, so a handler bound to it is the only thing
    // that could react here - an `ondblclick` attribute never appears, because
    // Angular attaches its listeners without one.
    const copyColor = vi.spyOn(TestBed.inject(CopyService), "copyColor")
      .mockResolvedValue(undefined);
    const {fixture, store, buttons} = await swatches();
    const before = store.currentColor();

    buttons()[0].dispatchEvent(new MouseEvent("dblclick", {bubbles: true}));
    await fixture.whenStable();

    expect(copyColor).not.toHaveBeenCalled();
    expect(store.currentColor()).toBe(before);
  });

});
