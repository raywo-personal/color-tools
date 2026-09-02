import {provideZonelessChangeDetection} from "@angular/core";
import {TestBed} from "@angular/core/testing";
import {Dispatcher} from "@ngrx/signals/events";
import {beforeEach, describe, expect, it} from "vitest";
import chroma from "chroma-js";
import {AppStateStore} from "@core/app-state.store";
import {converterEvents} from "@core/converter/converter.events";
import {LOCAL_STORAGE_KEY, SettingsMap} from "@common/models/local-storage.model";
import {maxChroma} from "@common/helpers/oklch.helper";
import {ColorSliders} from "@studio/components/color-sliders/color-sliders";


describe("ColorSliders", () => {

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()]
    });
  });


  async function panel(start = "#3366CC") {
    // The store registers its reducers when it is created, so an event
    // dispatched before that is lost and the initial random color stands.
    const store = TestBed.inject(AppStateStore);

    TestBed.inject(Dispatcher).dispatch(converterEvents.colorChanged(chroma(start)));
    const fixture = TestBed.createComponent(ColorSliders);
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;

    function sliders(): HTMLInputElement[] {
      return Array.from(host.querySelectorAll("input[type=range]"));
    }

    function labels(): string[] {
      return Array.from(host.querySelectorAll("label"))
        .map(label => label.textContent?.trim() ?? "");
    }

    function switchButtons(): HTMLButtonElement[] {
      return Array.from(host.querySelectorAll("[role=group] button"));
    }

    async function select(label: string) {
      const button = switchButtons()
        .find(candidate => candidate.textContent?.trim() === label);

      button?.click();
      await fixture.whenStable();
    }

    async function drag(index: number, to: number) {
      const input = sliders()[index];
      input.value = String(to);
      input.dispatchEvent(new Event("input"));
      await fixture.whenStable();
    }

    async function release(index: number) {
      sliders()[index].dispatchEvent(new Event("change"));
      await fixture.whenStable();
    }

    return {fixture, store, host, sliders, labels, switchButtons, select, drag, release};
  }


  describe("the switch", () => {

    it("starts on HSL and shows that space's three axes", async () => {
      const {labels} = await panel();

      expect(labels()).toEqual(["HUE", "SATURATION", "LIGHTNESS"]);
    });


    it("shows the OKLch axes once it is switched", async () => {
      const {labels, select} = await panel();

      await select("OKLCH");

      expect(labels()).toEqual(["LIGHTNESS", "CHROMA", "HUE"]);
    });


    it("says which space is selected other than by colour", async () => {
      const {switchButtons, select} = await panel();

      const pressed = () => switchButtons()
        .map(button => button.getAttribute("aria-pressed"));

      expect(pressed()).toEqual(["true", "false"]);

      await select("OKLCH");

      expect(pressed()).toEqual(["false", "true"]);
    });


    it("leaves displayColorSpace alone - the conversion list writes all four anyway", async () => {
      const {store, select} = await panel();

      const before = store.displayColorSpace();
      await select("OKLCH");

      expect(store.displayColorSpace()).toBe(before);
    });

  });


  describe("editing", () => {

    it("shows the current color's own values", async () => {
      const {sliders} = await panel("#3366CC");

      const [hue, saturation, lightness] = chroma("#3366CC").hsl();

      expect(sliders().map(input => Number(input.value))).toEqual([
        Math.round(hue),
        Math.round(saturation * 100),
        Math.round(lightness * 100)
      ]);
    });


    it("moves the color while the slider is still being dragged", async () => {
      const {store, drag} = await panel("#3366CC");

      await drag(0, 0);

      expect(store.currentColor().hsl()[0]).toBeCloseTo(0, 0);
    });


    it("edits in OKLch too, and the hex the app shows agrees with the sliders", async () => {
      const {store, select, drag} = await panel("#3366CC");

      await select("OKLCH");
      await drag(2, 30);

      const [, , hue] = store.currentColor().oklch();

      expect(hue).toBeCloseTo(30, 0);
    });


    it("keeps hue and saturation across a lightness of zero", async () => {
      // Black carries neither, so a panel re-reading the color would hand back
      // a grey when the visitor pulls lightness up again - a different color
      // than the one they started from.
      const {store, sliders, drag} = await panel("#3366CC");

      await drag(2, 0);

      expect(store.currentColor().hex("rgb")).toBe("#000000");

      await drag(2, 40);

      expect(sliders().map(input => Number(input.value))).toEqual([220, 60, 40]);
      expect(store.currentColor().hex("rgb")).toBe(chroma.hsl(220, 0.6, 0.4).hex("rgb"));
    });


    it("keeps the chroma across a lightness of zero", async () => {
      // The OKLch counterpart of the test above. The chroma a lightness cannot
      // hold is shown clamped, not stored clamped: at either end of the
      // lightness axis the gamut holds none at any hue, so storing it would
      // leave the visitor with a grey as soon as they came back.
      const {store, sliders, select, drag} = await panel("#3366CC");

      await select("OKLCH");

      const [lightness, chromacity] = [Number(sliders()[0].value), Number(sliders()[1].value)];

      await drag(0, 0);

      expect(store.currentColor().hex("rgb")).toBe("#000000");

      await drag(0, lightness);

      expect(Number(sliders()[1].value)).toBeCloseTo(chromacity, 3);
      expect(store.currentColor().oklch()[1]).toBeCloseTo(chromacity, 3);
    });


    it("stands at 0 for a grey, the hue the app writes for one", async () => {
      // chroma-js reports NaN for the hue of a grey. A slider cannot stand at
      // NaN, and the conversion list writes 0 for the same color.
      const {sliders, select} = await panel("#808080");

      expect(sliders().map(input => Number(input.value))).toEqual([0, 0, 50]);

      await select("OKLCH");

      expect(Number(sliders()[2].value)).toBe(0);
    });


    it("follows a color that arrived from somewhere else", async () => {
      const {fixture, sliders} = await panel("#3366CC");

      TestBed.inject(Dispatcher)
        .dispatch(converterEvents.colorChanged(chroma("#FF5733")));
      await fixture.whenStable();

      const [hue] = chroma("#FF5733").hsl();

      expect(Number(sliders()[0].value)).toBe(Math.round(hue));
    });

  });


  describe("the hue slider", () => {

    it("stops at the largest hue the app writes, in either space", async () => {
      // 360 and 0 are the same angle, and `formatColor()` writes the second of
      // them. A slider standing at 360° would read one angle while the
      // conversion list beside it read the other, for one and the same color.
      const {sliders, select, drag} = await panel("#3366CC");

      expect(sliders()[0].max).toBe("359");

      await drag(0, 359);

      expect(sliders()[0].value).toBe("359");

      await select("OKLCH");

      expect(sliders()[2].max).toBe("359");
    });

  });


  describe("the chroma slider", () => {

    it("takes its maximum from the gamut, not from a constant", async () => {
      const {sliders, select} = await panel("#3366CC");

      await select("OKLCH");

      // From the values the sliders stand at, not from the unrounded color:
      // the ceiling has to answer for the lightness and hue on screen, or the
      // chroma slider would let the visitor past what those two can hold.
      const lightness = Number(sliders()[0].value) / 100;
      const hue = Number(sliders()[2].value);

      // Rounded down to the slider's step, so the ceiling is a value the
      // control can actually reach.
      const expected = Math.floor(maxChroma(lightness, hue) * 1000) / 1000;

      expect(Number(sliders()[1].max)).toBeCloseTo(expected, 3);
    });


    it("pulls chroma back in when a new lightness cannot hold it", async () => {
      const {sliders, select, drag} = await panel("#3366CC");

      await select("OKLCH");

      const ceiling = Number(sliders()[1].max);
      await drag(1, ceiling);

      // Near-black holds almost no chroma at any hue, so the value the visitor
      // set is no longer reachable. Leaving it standing would have the slider
      // claim a chroma the color does not have.
      await drag(0, 2);

      expect(Number(sliders()[1].value)).toBeLessThan(ceiling);
      expect(Number(sliders()[1].value)).toBeLessThanOrEqual(Number(sliders()[1].max));
    });

  });


  describe("persistence", () => {

    function storedColor(): string | undefined {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);

      return stored
        ? (JSON.parse(stored) as Partial<SettingsMap>).currentColor
        : undefined;
    }


    it("does not write to localStorage on every frame of a drag", async () => {
      const {drag} = await panel("#3366CC");

      const before = storedColor();
      await drag(0, 100);
      await drag(0, 101);
      await drag(0, 102);

      // A drag fires per pointer move, and the persistence effect writes the
      // whole settings object each time.
      expect(storedColor()).toBe(before);
    });


    it("writes the color the gesture ended on", async () => {
      const {store, drag, release} = await panel("#3366CC");

      await drag(0, 100);
      await release(0);

      expect(storedColor()).toBe(store.currentColor().hex());
    });

  });

});
