import {provideZonelessChangeDetection} from "@angular/core";
import {TestBed} from "@angular/core/testing";
import {Dispatcher} from "@ngrx/signals/events";
import {beforeEach, describe, expect, it} from "vitest";
import chroma from "chroma-js";
import {AppStateStore} from "@core/app-state.store";
import {converterEvents} from "@core/converter/converter.events";
import {contrastEvents} from "@core/contrast/contrast.events";
import {ContrastColorRole} from "@engine/contrast/contrast-color.model";
import {LOCAL_STORAGE_KEY, SettingsMap} from "@common/models/local-storage.model";
import {fakeLiveAnnouncer, provideFakeLiveAnnouncer} from "@testing/live-announcer.fake";
import {PairSliders} from "@contrast-type/components/pair-sliders/pair-sliders";


describe("PairSliders", () => {

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideFakeLiveAnnouncer()]
    });
  });


  async function panel(target: ContrastColorRole = "background",
                       text = "#111111",
                       background = "#3366CC") {
    // The store registers its reducers when it is created, so an event
    // dispatched before that is lost and the initial random pair stands.
    const store = TestBed.inject(AppStateStore);
    const dispatcher = TestBed.inject(Dispatcher);

    // The base colour too, because it is what the palette is built from: a
    // drag on the pair must leave that palette standing, and there has to be
    // one to leave.
    dispatcher.dispatch(converterEvents.colorChanged(chroma("#CC6633")));
    dispatcher.dispatch(contrastEvents.textColorChanged(chroma(text)));
    dispatcher.dispatch(contrastEvents.backgroundColorChanged(chroma(background)));

    const fixture = TestBed.createComponent(PairSliders);

    fixture.componentRef.setInput("target", target);
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;

    function sliders(): HTMLInputElement[] {
      return Array.from(element.querySelectorAll("input[type=range]"));
    }

    function caption(): string {
      return element.querySelector("p")?.textContent?.trim() ?? "";
    }

    async function aimAt(role: ContrastColorRole) {
      fixture.componentRef.setInput("target", role);
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

    return {fixture, store, element, sliders, caption, aimAt, drag, release};
  }


  function storedContrastId(): string | undefined {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);

    return stored
      ? (JSON.parse(stored) as Partial<SettingsMap>).contrastId
      : undefined;
  }


  describe("the target", () => {

    it("stands the panel on the half the chip row is aimed at", async () => {
      const {sliders} = await panel("background", "#111111", "#3366CC");

      const [hue] = chroma("#3366CC").hsl();

      expect(Number(sliders()[0].value)).toBe(Math.round(hue));
    });


    it("stands on the text colour when that is the target", async () => {
      const {sliders} = await panel("text", "#AA2244", "#EEEEEE");

      const [hue] = chroma("#AA2244").hsl();

      expect(Number(sliders()[0].value)).toBe(Math.round(hue));
    });


    it("hands the panel the other colour when the target moves", async () => {
      const {sliders, aimAt} = await panel("background", "#AA2244", "#3366CC");

      await aimAt("text");

      const [hue] = chroma("#AA2244").hsl();

      expect(Number(sliders()[0].value)).toBe(Math.round(hue));
    });


    it("names the target, because the sliders name only their axes", async () => {
      // The one thing on this block saying which half the three tracks move.
      // Colour is not a carrier of it, and a visitor who has scrolled past
      // `APPLY TO` has nothing else.
      const {caption, aimAt} = await panel("background");

      expect(caption()).toBe("ADJUST BACKGROUND");

      await aimAt("text");

      expect(caption()).toBe("ADJUST TEXT");
    });

  });


  describe("a drag", () => {

    it("moves the targeted half and leaves the other one standing", async () => {
      const {store, drag} = await panel("background", "#111111", "#3366CC");

      const text = store.contrastColors().text.hex("rgb");

      await drag(0, 0);

      expect(store.contrastColors().background.hsl()[0]).toBeCloseTo(0, 0);
      expect(store.contrastColors().text.hex("rgb")).toBe(text);
    });


    it("moves the text colour when that is the target", async () => {
      const {store, drag} = await panel("text", "#AA2244", "#EEEEEE");

      const background = store.contrastColors().background.hex("rgb");

      await drag(0, 120);

      expect(store.contrastColors().text.hsl()[0]).toBeCloseTo(120, 0);
      expect(store.contrastColors().background.hex("rgb")).toBe(background);
    });


    it("leaves the palette alone", async () => {
      // The converter's colour events rebuild the palette on every frame,
      // which is right for the Studio and wrong here: moving one half of the
      // pair is no statement about the palette the chips are drawn from. The
      // identity of the object is the assertion - a rebuild at the same seed
      // would hand back equal colours in a new palette.
      const {store, drag, release} = await panel("background");

      const palette = store.currentPalette();

      await drag(0, 10);
      await drag(0, 20);
      await release(0);

      expect(store.currentPalette()).toBe(palette);
    });


    it("does not write to localStorage on every frame", async () => {
      const {drag} = await panel("background");

      const before = storedContrastId();

      await drag(0, 100);
      await drag(0, 101);
      await drag(0, 102);

      // A drag fires per pointer move, and the persistence effect writes the
      // whole settings object each time.
      expect(storedContrastId()).toBe(before);
    });


    it("says nothing, because the visitor is holding the control", async () => {
      // Exactly as in the Studio. The announcement that would be wrong here is
      // the pair's own: wiring these events into `contrastPairAnnouncedEffect`
      // would queue a sentence per pointer move.
      const {drag, release} = await panel("background");

      await drag(0, 100);
      await release(0);

      expect(fakeLiveAnnouncer().announcements).toEqual([]);
    });


    it("writes the pair the gesture ended on", async () => {
      const {store, drag, release} = await panel("background");

      await drag(0, 100);
      await release(0);

      expect(storedContrastId()).toBe(store.contrastColors().id);
    });

  });

});
