import {TestBed} from "@angular/core/testing";
import {provideZonelessChangeDetection} from "@angular/core";
import {Dispatcher} from "@ngrx/signals/events";
import {beforeEach, describe, expect, it} from "vitest";
import chroma from "chroma-js";
import {AppStateStore} from "@core/app-state.store";
import {converterEvents} from "@core/converter/converter.events";
import {colorName} from "@engine/color/color-name.helper";
import {fakeLiveAnnouncer, provideFakeLiveAnnouncer} from "@testing/live-announcer.fake";
import {ColorControls} from "@studio/components/color-controls/color-controls";


/**
 * What the field and the picker do with a value is `ColorField`'s own spec.
 * What is pinned here is the wiring: the field stands on the store's color and
 * a commit reaches it, plus the roll, which is this component's own.
 */
describe("ColorControls", () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideFakeLiveAnnouncer()]
    });
  });


  async function controls(start = "#3366CC") {
    // The store registers its reducers when it is created, so an event
    // dispatched before that is lost and the initial random color stands.
    const store = TestBed.inject(AppStateStore);

    TestBed.inject(Dispatcher).dispatch(converterEvents.colorChanged(chroma(start)));
    const fixture = TestBed.createComponent(ColorControls);
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const picker = host.querySelector("input[type=color]") as HTMLInputElement;
    const field = host.querySelector("input[type=text]") as HTMLInputElement;
    const random = host.querySelector("button") as HTMLButtonElement;

    async function type(value: string) {
      field.value = value;
      field.dispatchEvent(new Event("input"));
      await fixture.whenStable();
    }

    async function blur() {
      field.dispatchEvent(new Event("blur"));
      await fixture.whenStable();
    }

    return {fixture, store, picker, field, random, type, blur};
  }


  describe("the color field", () => {

    it("stands on the color the store holds", async () => {
      const {picker, field} = await controls();

      expect(field.value).toBe("#3366CC");
      // Case-insensitively: the native control normalises its value to lower
      // case in a browser, and the DOM implementation the tests run on need
      // not do the same.
      expect(picker.value.toLowerCase()).toBe("#3366cc");
    });


    it("carries no caption, so the two controls keep their generic names", async () => {
      const {fixture, picker, field} = await controls();
      const host = fixture.nativeElement as HTMLElement;

      // The swatch above says which color this is; a caption would repeat it.
      expect(host.querySelector("label")).toBeNull();
      expect(picker.getAttribute("aria-label")).toBe("Pick a color");
      expect(field.getAttribute("aria-label")).toBe("Color value");
    });


    it("commits into the store", async () => {
      const {store, type, blur} = await controls();

      await type("#FF5733");
      await blur();

      expect(store.currentColor().hex("rgb")).toBe("#ff5733");
    });


    it("commits the picker on change, so a drag is one update", async () => {
      const {fixture, store, picker} = await controls();

      picker.value = "#ff5733";
      picker.dispatchEvent(new Event("input"));
      await fixture.whenStable();

      expect(store.currentColor().hex("rgb"),
        "an input event alone must not reach the store").toBe("#3366cc");

      picker.dispatchEvent(new Event("change"));
      await fixture.whenStable();

      expect(store.currentColor().hex("rgb")).toBe("#ff5733");
    });

  });


  describe("RND", () => {

    it("rolls a color and moves the picker and the field with it", async () => {
      const {fixture, store, picker, field, random} = await controls();

      random.click();
      await fixture.whenStable();

      // Asserting the plumbing rather than "a different color came back": the
      // roll is random, so inequality would be a test that passes 16 777 215
      // times out of 16 777 216.
      const rolled = store.currentColor().hex("rgb");

      expect(picker.value.toLowerCase()).toBe(rolled);
      expect(field.value).toBe(rolled.toUpperCase());
    });


    it("announces the color it rolled, because nothing moved the focus", async () => {
      const announcer = fakeLiveAnnouncer();
      const {fixture, store, random} = await controls();

      random.click();
      await fixture.whenStable();

      expect(announcer.last).toEqual({
        message: `New color ${colorName(store.currentColor())}`,
        politeness: "polite"
      });
    });


    it("names itself with its own caption, nothing hidden beside it", async () => {
      const {random} = await controls();

      // The caption is the accessible name, so the text a visitor reads is the
      // phrase voice control answers to. An aria-label or a visually hidden
      // expansion next to it would either replace that phrase or double it.
      expect(random.textContent?.replace(/\s+/g, " ").trim()).toBe("Random");
      expect(random.getAttribute("aria-label")).toBeNull();
    });

  });

});
