import {TestBed} from "@angular/core/testing";
import {provideZonelessChangeDetection} from "@angular/core";
import {Dispatcher} from "@ngrx/signals/events";
import {beforeEach, describe, expect, it} from "vitest";
import chroma from "chroma-js";
import {AppStateStore} from "@core/app-state.store";
import {converterEvents} from "@core/converter/converter.events";
import {contrastEvents} from "@core/contrast/contrast.events";
import {provideFakeLiveAnnouncer} from "@testing/live-announcer.fake";
import {PairFields} from "@contrast-type/components/pair-fields/pair-fields";


describe("PairFields", () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideFakeLiveAnnouncer()]
    });
  });


  async function fields(text = "#111111", background = "#EEEEEE", base = "#3366CC") {
    // The store registers its reducers when it is created, so an event
    // dispatched before that is lost and the initial random pair stands.
    const store = TestBed.inject(AppStateStore);
    const dispatcher = TestBed.inject(Dispatcher);

    dispatcher.dispatch(converterEvents.colorChanged(chroma(base)));
    dispatcher.dispatch(contrastEvents.textColorChanged(chroma(text)));
    dispatcher.dispatch(contrastEvents.backgroundColorChanged(chroma(background)));

    const fixture = TestBed.createComponent(PairFields);
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const rows = Array.from(host.querySelectorAll("ct-color-field"));

    function row(index: number) {
      const element = rows[index];

      return {
        label: (element.querySelector("label") as HTMLLabelElement).textContent?.trim(),
        picker: element.querySelector("input[type=color]") as HTMLInputElement,
        value: element.querySelector("input[type=text]") as HTMLInputElement,
        base: element.querySelector("button") as HTMLButtonElement
      };
    }

    return {fixture, store, rows, text: row(0), background: row(1)};
  }


  it("holds the pair in the draft's order, text above background", async () => {
    const {rows, text, background} = await fields();

    expect(rows.length).toBe(2);
    expect(text.label).toBe("TEXT");
    expect(background.label).toBe("BACKGROUND");
  });


  it("stands on the pair the store holds", async () => {
    const {text, background} = await fields();

    expect(text.value.value).toBe("#111111");
    expect(background.value.value).toBe("#EEEEEE");
  });


  it("sets the text color from its own field only", async () => {
    const {fixture, store, text} = await fields();

    text.value.value = "#FF5733";
    text.value.dispatchEvent(new Event("input"));
    text.value.dispatchEvent(new Event("blur"));
    await fixture.whenStable();

    expect(store.contrastColors.text().hex("rgb")).toBe("#ff5733");
    expect(store.contrastColors.background().hex("rgb")).toBe("#eeeeee");
  });


  it("sets the background from its own field only", async () => {
    const {fixture, store, background} = await fields();

    background.value.value = "#FF5733";
    background.value.dispatchEvent(new Event("input"));
    background.value.dispatchEvent(new Event("blur"));
    await fixture.whenStable();

    expect(store.contrastColors.background().hex("rgb")).toBe("#ff5733");
    expect(store.contrastColors.text().hex("rgb")).toBe("#111111");
  });


  it("recomputes the Lc rather than leaving the pair's own maths to the screen", async () => {
    const {fixture, store, background} = await fields();
    const before = store.contrastColors.contrast();

    background.value.value = "#111111";
    background.value.dispatchEvent(new Event("input"));
    background.value.dispatchEvent(new Event("blur"));
    await fixture.whenStable();

    // Black text on black: whatever the figure was, it is now near nothing.
    expect(Math.abs(store.contrastColors.contrast()))
      .toBeLessThan(Math.abs(before));
    expect(Math.abs(store.contrastColors.contrast())).toBeLessThan(1);
  });


  describe("BASE", () => {

    it("takes the color the Studio is working on into the text half", async () => {
      const {fixture, store, text} = await fields();

      text.base.click();
      await fixture.whenStable();

      expect(store.contrastColors.text().hex("rgb")).toBe("#3366cc");
      expect(store.contrastColors.background().hex("rgb")).toBe("#eeeeee");
    });


    it("takes it into the background half", async () => {
      const {fixture, store, background} = await fields();

      background.base.click();
      await fixture.whenStable();

      expect(store.contrastColors.background().hex("rgb")).toBe("#3366cc");
      expect(store.contrastColors.text().hex("rgb")).toBe("#111111");
    });


    it("gives the two buttons names that tell them apart", async () => {
      const {text, background} = await fields();

      // Both are captioned BASE, so without this a screen reader's control
      // list holds two entries a visitor cannot choose between - and the row
      // above them is not reliably spoken with either.
      expect(text.base.textContent?.trim()).toBe("BASE");
      expect(background.base.textContent?.trim()).toBe("BASE");
      expect(text.base.getAttribute("aria-label")).toBe("BASE: use as the text color");
      expect(background.base.getAttribute("aria-label")).toBe("BASE: use as the background");
    });

  });

});
