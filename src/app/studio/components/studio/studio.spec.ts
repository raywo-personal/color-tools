import {provideZonelessChangeDetection} from "@angular/core";
import {TestBed} from "@angular/core/testing";
import {Dispatcher} from "@ngrx/signals/events";
import {beforeEach, describe, expect, it} from "vitest";
import chroma from "chroma-js";
import {AppStateStore} from "@core/app-state.store";
import {converterEvents} from "@core/converter/converter.events";
import {LOCAL_STORAGE_KEY, SettingsMap} from "@common/models/local-storage.model";
import {Studio} from "@studio/components/studio/studio";


describe("Studio", () => {

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()]
    });
  });


  async function studio() {
    const fixture = TestBed.createComponent(Studio);
    await fixture.whenStable();

    return fixture.nativeElement as HTMLElement;
  }


  /**
   * The screen with the base colour set, and the sliders reachable.
   *
   * `ColorSliders` is host-agnostic, so what the panel does with a colour is
   * pinned in its own spec. What is pinned here is the wiring: which colour
   * goes in, and which events come out.
   */
  async function screen(start = "#3366CC") {
    // The store registers its reducers when it is created, so an event
    // dispatched before that is lost and the initial random color stands.
    const store = TestBed.inject(AppStateStore);

    TestBed.inject(Dispatcher).dispatch(converterEvents.colorChanged(chroma(start)));

    const fixture = TestBed.createComponent(Studio);
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;

    function sliders(): HTMLInputElement[] {
      return Array.from(element.querySelectorAll("ct-color-sliders input[type=range]"));
    }

    async function select(label: string) {
      const button = Array
        .from(element.querySelectorAll<HTMLButtonElement>("ct-color-sliders [role=group] button"))
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

    return {fixture, store, sliders, select, drag, release};
  }


  function storedColor(): string | undefined {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);

    return stored
      ? (JSON.parse(stored) as Partial<SettingsMap>).currentColor
      : undefined;
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


  describe("the sliders", () => {

    it("stands the panel on the base colour", async () => {
      const {sliders} = await screen("#3366CC");

      const [hue] = chroma("#3366CC").hsl();

      expect(Number(sliders()[0].value)).toBe(Math.round(hue));
    });


    it("moves the base colour while the slider is still being dragged", async () => {
      const {store, drag} = await screen("#3366CC");

      await drag(0, 0);

      expect(store.currentColor().hsl()[0]).toBeCloseTo(0, 0);
    });


    it("leaves displayColorSpace alone - the conversion list writes all four anyway", async () => {
      const {store, select} = await screen();

      const before = store.displayColorSpace();
      await select("OKLCH");

      expect(store.displayColorSpace()).toBe(before);
    });


    it("does not write to localStorage on every frame of a drag", async () => {
      const {drag} = await screen("#3366CC");

      const before = storedColor();
      await drag(0, 100);
      await drag(0, 101);
      await drag(0, 102);

      // A drag fires per pointer move, and the persistence effect writes the
      // whole settings object each time.
      expect(storedColor()).toBe(before);
    });


    it("writes the colour the gesture ended on", async () => {
      const {store, drag, release} = await screen("#3366CC");

      await drag(0, 100);
      await release(0);

      expect(storedColor()).toBe(store.currentColor().hex());
    });

  });

});
