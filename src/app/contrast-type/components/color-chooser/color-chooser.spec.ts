import {provideZonelessChangeDetection} from "@angular/core";
import {ComponentFixture, TestBed} from "@angular/core/testing";
import {Dispatcher} from "@ngrx/signals/events";
import {beforeEach, describe, expect, it} from "vitest";
import chroma from "chroma-js";
import {AppStateStore} from "@core/app-state.store";
import {contrastEvents} from "@core/contrast/contrast.events";
import {converterEvents} from "@core/converter/converter.events";
import {colorName} from "@engine/color/color-name.helper";
import {PALETTE_SLOTS} from "@engine/palette/palette.model";
import {expectApcaForeground} from "@testing/apca-foreground.expectation";
import {fakeLiveAnnouncer, provideFakeLiveAnnouncer} from "@testing/live-announcer.fake";
import {ColorChooser} from "@contrast-type/components/color-chooser/color-chooser";


describe("ColorChooser", () => {

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        // A placement is announced by the effect that travels with the event,
        // and this spec pins that the chooser adds no second sentence.
        provideFakeLiveAnnouncer()
      ]
    });
  });


  async function chooser(elementKey = "headline") {
    // The store registers its reducers when it is created, so an event
    // dispatched before that is lost and the initial random pair stands.
    const store = TestBed.inject(AppStateStore);
    const dispatcher = TestBed.inject(Dispatcher);

    dispatcher.dispatch(converterEvents.colorChanged(chroma("#3366CC")));
    dispatcher.dispatch(contrastEvents.textColorChanged(chroma("#111111")));
    dispatcher.dispatch(contrastEvents.backgroundColorChanged(chroma("#EEEEEE")));

    const fixture: ComponentFixture<ColorChooser> = TestBed.createComponent(ColorChooser);
    fixture.componentRef.setInput("elementKey", elementKey);
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;

    function toolbar(): HTMLElement {
      return host.querySelector("[role=toolbar]") as HTMLElement;
    }

    function chips(): HTMLButtonElement[] {
      return Array.from(toolbar().querySelectorAll("button"));
    }

    function resetButton(): HTMLButtonElement {
      return Array.from(host.querySelectorAll("button"))
        .find(button => button.textContent?.includes("Reset")) as HTMLButtonElement;
    }

    /** A key pressed on the chip the row's one tab stop is standing on. */
    async function press(key: string) {
      const standingOn = chips().find(chip => chip.getAttribute("tabindex") === "0");

      (standingOn ?? chips()[0]).dispatchEvent(new KeyboardEvent("keydown", {key, bubbles: true}));
      await fixture.whenStable();
    }

    async function click(element: HTMLElement) {
      element.click();
      await fixture.whenStable();
    }

    async function paint(hex: string) {
      dispatcher.dispatch(converterEvents.colorChanged(chroma(hex)));
      await fixture.whenStable();
    }

    return {fixture, store, dispatcher, host, toolbar, chips, resetButton, press, click, paint};
  }


  it("offers the palette in slot order, each chip named by its colour", async () => {
    // The names are `colorName()`'s, the same ones the chip row above the
    // preview and the ledger use - a swatch a visitor can activate is named,
    // and P-numbers name nothing.
    const {store, chips, toolbar} = await chooser();
    const palette = store.currentPalette();

    expect(chips()).toHaveLength(PALETTE_SLOTS.length);

    for (const [index, slot] of PALETTE_SLOTS.entries()) {
      const chip = chips()[index];

      expect(chip.style.backgroundColor, slot).toBe(palette[slot].color.hex("rgb"));
      expect(chip.getAttribute("aria-label"), slot).toBe(colorName(palette[slot].color));
    }

    // The row is what the arrow keys walk, and its label says what for.
    expect(toolbar().getAttribute("aria-label")).toBe("Color for Headline");
  });


  it("names the side a chip would land on, so the two ground elements say so", async () => {
    // On the filled button and the error line a chip takes the surface, not
    // the words - `SampleElement.placement` is what decides it.
    const onInk = await chooser("headline");
    const onGround = await chooser("filledButton");

    expect(onInk.host.textContent).toContain("HEADLINE · COLOR");
    expect(onGround.host.textContent).toContain("FILLED BUTTON · BACKGROUND");
  });


  it("keeps one tab stop for the whole row and moves it with the arrows", async () => {
    // Five chips as five stops would cost four presses to walk past the row.
    const {chips, press} = await chooser();
    const stops = () => chips().map(chip => chip.getAttribute("tabindex"));

    expect(stops()).toEqual(["0", "-1", "-1", "-1", "-1"]);

    await press("ArrowRight");
    expect(stops()).toEqual(["-1", "0", "-1", "-1", "-1"]);

    // Wrapping, so the row has no dead end at either side.
    await press("ArrowLeft");
    await press("ArrowLeft");
    expect(stops()).toEqual(["-1", "-1", "-1", "-1", "0"]);

    await press("End");
    expect(stops()).toEqual(["-1", "-1", "-1", "-1", "0"]);

    await press("Home");
    expect(stops()).toEqual(["0", "-1", "-1", "-1", "-1"]);
  });


  it("places the chip that is pressed, and says so once", async () => {
    // The sentence is `placementAnnouncedEffect`'s. A second one from here
    // would delete the first: `LiveAnnouncer` clears its pending timeout on
    // every call and writes a hundred milliseconds later.
    const {store, chips, click} = await chooser();

    await click(chips()[2]);

    expect(store.placements()["headline"]).toBe("color2");
    expect(fakeLiveAnnouncer().announcements).toHaveLength(1);
  });


  it("leaves itself open on a placement, so nothing competes with the sentence", async () => {
    // A popup that closed would move focus in the same tick, and a focus a
    // screen reader narrates lands inside the same hundred milliseconds as the
    // placement. Staying open is also what lets a visitor try the next colour.
    const {host, chips, click} = await chooser();

    await click(chips()[1]);

    expect(host.querySelector("[role=toolbar]")).not.toBeNull();
    expect(chips()[1].getAttribute("aria-pressed")).toBe("true");
  });


  it("tells the placed chip by a tick, not by its colour alone", async () => {
    const {chips, click} = await chooser();

    expect(chips().some(chip => chip.querySelector("svg") !== null)).toBe(false);

    await click(chips()[3]);

    expect(chips()[3].querySelector("svg")).not.toBeNull();
    expect(chips().filter(chip => chip.querySelector("svg") !== null)).toHaveLength(1);
  });


  it("draws the tick in the colour APCA chose against the chip it sits on", async () => {
    // The one thing in here on a colour the visitor picked. A token is
    // guaranteed against the app's six surfaces and against none of theirs, so
    // a tick in `text` would vanish on the chip that carries it.
    const {chips, click, paint, store} = await chooser();

    await click(chips()[0]);

    await expectApcaForeground(async color => {
      await paint(color.hex("rgb"));

      // The palette is built on the current color, so `color0` is that color.
      expect(store.currentPalette().color0.color.hex("rgb")).toBe(color.hex("rgb"));

      return (chips()[0].querySelector("svg") as SVGElement | null)?.style.color ?? "";
    });
  });


  it("takes a colour back with Backspace and with the button that says so", async () => {
    // A key nobody is told about is not a way back, so the reset is spelled
    // out as well - and it is off while there is nothing to take away.
    const {store, chips, click, press, resetButton} = await chooser();

    expect(resetButton().disabled).toBe(true);

    await click(chips()[2]);
    expect(resetButton().disabled).toBe(false);

    await press("Backspace");
    expect(store.placements()["headline"]).toBeUndefined();

    await click(chips()[2]);
    await click(resetButton());
    expect(store.placements()["headline"]).toBeUndefined();
  });


  it("says what a chip would do before it is pressed, in a shape and a word", async () => {
    // The row under the chips reads the element's verdict as if the chip under
    // the arrow keys had been placed - through `samplePage()`, so it is the
    // same derivation the page and the marks use rather than a second opinion.
    const {host, press} = await chooser();

    const shown = () => host.textContent ?? "";

    expect(shown()).toMatch(/Lc \d+/);
    expect(host.querySelector("ct-verdict-shape")).not.toBeNull();

    const first = shown();

    await press("ArrowRight");

    // A different colour is a different figure, so the row follows the keys.
    expect(shown()).not.toBe(first);
  });


  it("gives every control the app's hit area and the app's own focus ring", async () => {
    // `src/styles.css` defines no global focus style, so a control without one
    // is ringed by the browser and stands out from every other control in the
    // popup. The offset is on the element itself, because the check reads one
    // element at a time.
    const {chips, resetButton} = await chooser();

    for (const control of [...chips(), resetButton()]) {
      const where = control.getAttribute("aria-label") ?? control.textContent ?? "";

      expect(control.className, where).toContain("h-11");
      expect(control.className, where).toContain("outline-offset-2");
      expect(control.className, where).toContain("focus-visible:outline-2");
    }
  });

});
