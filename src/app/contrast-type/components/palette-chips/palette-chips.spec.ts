import {TestBed} from "@angular/core/testing";
import {provideZonelessChangeDetection} from "@angular/core";
import {Dispatcher} from "@ngrx/signals/events";
import {beforeEach, describe, expect, it} from "vitest";
import chroma from "chroma-js";
import {AppStateStore} from "@core/app-state.store";
import {converterEvents} from "@core/converter/converter.events";
import {contrastEvents} from "@core/contrast/contrast.events";
import {colorName} from "@common/helpers/color-name.helper";
import {fakeLiveAnnouncer, provideFakeLiveAnnouncer} from "@testing/live-announcer.fake";
import {PaletteChips} from "@contrast-type/components/palette-chips/palette-chips";


describe("PaletteChips", () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideFakeLiveAnnouncer()]
    });
  });


  async function chips(text = "#111111", background = "#EEEEEE") {
    // The store registers its reducers when it is created, so an event
    // dispatched before that is lost and the initial random pair stands.
    const store = TestBed.inject(AppStateStore);
    const dispatcher = TestBed.inject(Dispatcher);

    dispatcher.dispatch(converterEvents.colorChanged(chroma("#3366CC")));
    dispatcher.dispatch(contrastEvents.textColorChanged(chroma(text)));
    dispatcher.dispatch(contrastEvents.backgroundColorChanged(chroma(background)));

    const fixture = TestBed.createComponent(PaletteChips);
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const list = host.querySelector("ul") as HTMLUListElement;
    const targets = Array.from(host.querySelectorAll("[role=group] button"));

    function swatches() {
      return Array.from(list.querySelectorAll("button")) as HTMLButtonElement[];
    }

    async function pickTarget(caption: string) {
      const button = targets
        .find(target => target.textContent?.trim() === caption) as HTMLButtonElement;

      button.click();
      await fixture.whenStable();
    }

    return {fixture, store, list, targets, swatches, pickTarget};
  }


  it("shows the five colors of the current palette", async () => {
    const {store, swatches} = await chips();
    const palette = store.currentPalette();

    expect(swatches().length).toBe(5);
    // Through chroma rather than as a string: how a DOM implementation spells
    // `rgb(...)` back is not what this pins.
    expect(chroma(swatches()[0].style.backgroundColor).hex("rgb"))
      .toBe(palette.color0.color.hex("rgb"));
  });


  it("carries the list role, which Preflight's list-style would otherwise cost", async () => {
    const {list} = await chips();

    // Safari with VoiceOver stops treating a list without markers as a list,
    // and the label goes with it.
    expect(list.getAttribute("role")).toBe("list");
    expect(list.getAttribute("aria-label")).toBe("Palette colors");
  });


  describe("the target above the row", () => {

    it("starts on the background, which is the draft's single click", async () => {
      const {targets} = await chips();
      const pressed = targets.filter(target => target.getAttribute("aria-pressed") === "true");

      expect(pressed.length).toBe(1);
      expect(pressed[0].textContent?.trim()).toBe("BACKGROUND");
    });


    it("says which half is selected without relying on the inverted chip", async () => {
      const {targets, pickTarget} = await chips();

      await pickTarget("TEXT");

      const states = targets
        .map(target => [target.textContent?.trim(), target.getAttribute("aria-pressed")]);

      expect(states).toEqual([["TEXT", "true"], ["BACKGROUND", "false"]]);
    });

  });


  describe("applying a chip", () => {

    it("sets the background while the target says background", async () => {
      const {fixture, store, swatches} = await chips();
      const expected = store.currentPalette().color2.color.hex("rgb");

      swatches()[2].click();
      await fixture.whenStable();

      expect(store.contrastColors.background().hex("rgb")).toBe(expected);
      expect(store.contrastColors.text().hex("rgb")).toBe("#111111");
    });


    it("sets the text color once the target says text", async () => {
      const {fixture, store, swatches, pickTarget} = await chips();
      const expected = store.currentPalette().color2.color.hex("rgb");

      await pickTarget("TEXT");
      swatches()[2].click();
      await fixture.whenStable();

      expect(store.contrastColors.text().hex("rgb")).toBe(expected);
      expect(store.contrastColors.background().hex("rgb")).toBe("#eeeeee");
    });


    it("names every chip by its color and by what the click will do", async () => {
      // This is what pays for the mode: the outcome is spoken by the control
      // the visitor is standing on, so the target cannot be a hidden trap.
      const {store, swatches, pickTarget} = await chips();
      const color = store.currentPalette().color0.color;

      expect(swatches()[0].getAttribute("aria-label"))
        .toBe(`Use ${colorName(color)} as the background`);

      await pickTarget("TEXT");

      expect(swatches()[0].getAttribute("aria-label"))
        .toBe(`Use ${colorName(color)} as the text color`);
    });


    it("says nothing, because the chip's own name already did", async () => {
      const announcer = fakeLiveAnnouncer();
      const {fixture, swatches} = await chips();

      swatches()[0].click();
      await fixture.whenStable();

      expect(announcer.announcements).toEqual([]);
    });

  });

});
