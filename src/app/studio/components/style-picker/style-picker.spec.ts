import {TestBed} from "@angular/core/testing";
import {provideZonelessChangeDetection} from "@angular/core";
import {beforeEach, describe, expect, it} from "vitest";
import {AppStateStore} from "@core/app-state.store";
import {PaletteStyles, styleCaptionFor} from "@engine/palette/palette-style.model";
import {LOCAL_STORAGE_KEY, SettingsMap} from "@common/models/local-storage.model";
import {fakeLiveAnnouncer, provideFakeLiveAnnouncer} from "@testing/live-announcer.fake";
import {StylePicker} from "@studio/components/style-picker/style-picker";


describe("StylePicker", () => {

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideFakeLiveAnnouncer()]
    });
  });


  async function picker() {
    const store = TestBed.inject(AppStateStore);
    const fixture = TestBed.createComponent(StylePicker);
    await fixture.whenStable();

    const chips = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll("button")
    );

    function chip(caption: string): HTMLButtonElement {
      const found = chips.find(candidate => candidate.textContent?.trim() === caption);

      expect(found, `no ${caption} chip`).toBeDefined();

      return found!;
    }

    async function pick(caption: string) {
      chip(caption).click();
      await fixture.whenStable();
    }

    function pressed(): string[] {
      return chips
        .filter(candidate => candidate.getAttribute("aria-pressed") === "true")
        .map(candidate => candidate.textContent?.trim() ?? "");
    }

    return {fixture, store, chips, chip, pick, pressed};
  }


  it("offers every style the generator knows, in the order they are declared", async () => {
    const {chips} = await picker();

    expect(chips.map(chip => chip.textContent?.trim()))
      .toEqual(PaletteStyles.map(styleCaptionFor));
  });


  it("presses the stored style on the first render, before any click", async () => {
    // Wiring aria-pressed to the click instead of to the store would still
    // satisfy the test below, and would press nothing for a restored palette.
    const {store, pressed} = await picker();

    expect(pressed()).toEqual([styleCaptionFor(store.paletteStyle())]);
  });


  it("presses exactly the chip that was picked", async () => {
    const {pick, pressed, chips} = await picker();

    await pick("Triadic");

    expect(pressed()).toEqual(["Triadic"]);
    expect(chips.every(chip => chip.hasAttribute("aria-pressed")),
      "every chip carries a pressed state, not only the pressed one").toBe(true);
  });


  it("sets the style and rolls a palette in it", async () => {
    const {store, pick} = await picker();

    await pick("Monochromatic");

    expect(store.paletteStyle()).toBe("monochromatic");
    expect(store.currentPalette().style).toBe("monochromatic");
  });


  it("rolls the palette again when the pressed chip is picked once more", async () => {
    // The reference, not the colors: a new palette is a new object every time,
    // while two random palettes being different is only overwhelmingly likely.
    const {store, pick} = await picker();

    await pick("Triadic");
    const before = store.currentPalette();

    await pick("Triadic");

    expect(store.currentPalette()).not.toBe(before);
    expect(store.currentPalette().style).toBe("triadic");
  });


  it("announces the new palette, because the swatches change without moving focus", async () => {
    const announcer = fakeLiveAnnouncer();
    const {pick} = await picker();

    await pick("High Contrast");

    expect(announcer.last).toEqual({
      message: "New High Contrast palette",
      politeness: "polite"
    });
  });


  it("persists the palette a pick produced", async () => {
    const {store, pick} = await picker();

    await pick("Complementary");

    const stored = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) ?? "{}") as Partial<SettingsMap>;

    expect(stored.currentPaletteId).toBe(store.currentPalette().id);
    expect(stored.paletteSeed).toBe(store.paletteSeed());
  });


  it("wraps rather than scrolls, so ten chips keep their hit area in the narrow column", async () => {
    const {fixture} = await picker();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.classList.contains("flex-wrap")).toBe(true);
    expect(host.getAttribute("role")).toBe("group");
    expect(host.getAttribute("aria-label")).toBe("Palette style");
  });

});
