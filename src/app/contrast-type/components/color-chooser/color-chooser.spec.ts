import {provideZonelessChangeDetection} from "@angular/core";
import {ComponentFixture, TestBed} from "@angular/core/testing";
import {Dispatcher} from "@ngrx/signals/events";
import {beforeEach, describe, expect, it} from "vitest";
import chroma from "chroma-js";
import {AppStateStore} from "@core/app-state.store";
import {contrastEvents} from "@core/contrast/contrast.events";
import {converterEvents} from "@core/converter/converter.events";
import {colorName} from "@engine/color/color-name.helper";
import {CHIP_SOURCES, chipLabelFor, colorOf} from "@contrast-type/models/chip-source.model";
import {VERDICT_STATES, verdictWord} from "@contrast-type/models/element-verdict.model";
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

    /** The row under the toolbar: what the chip under the arrow keys reaches. */
    function previewRow(): HTMLElement {
      return Array.from(host.querySelectorAll("p"))
        .find(paragraph => paragraph.querySelector("ct-verdict-shape")) as HTMLElement;
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

    return {
      fixture, store, dispatcher, host, toolbar, chips, previewRow, resetButton, press, click, paint
    };
  }


  it("offers all seven chips in the row's order, each named by its colour and its verdict", async () => {
    // All seven, or `T` and `BG` would be droppable and placeable by mouse
    // alone. The names open with `colorName()`'s, the same ones the chip row
    // above the preview and the ledger use - a swatch a visitor can activate
    // is named, and a handle names nothing. What follows is how the element
    // would fare with that colour; the test below says why it has to be there.
    const {store, chips, toolbar} = await chooser();
    const pair = store.contrastColors();
    const palette = store.currentPalette();
    const words = VERDICT_STATES.map(verdictWord);

    expect(chips()).toHaveLength(CHIP_SOURCES.length);

    for (const [index, source] of CHIP_SOURCES.entries()) {
      const chip = chips()[index];
      const color = colorOf(source, pair, palette);
      const [named, verdict] = chip.getAttribute("aria-label")!.split(": ");
      const [word, lc] = verdict.split(", ");

      expect(chip.style.backgroundColor, source).toBe(color.hex("rgb"));
      expect(named, source).toBe(colorName(color));
      expect(words, source).toContain(word);
      expect(lc, source).toMatch(/^Lc \d+$/);
    }

    // The row is what the arrow keys walk, and its label says what for.
    expect(toolbar().getAttribute("aria-label")).toBe("Color for Headline");
  });


  it("says which of the seven the arrow keys are on, which no colour does", async () => {
    // Seven swatches on the app's own panel, two of them the pair's: the
    // handle is the one thing here that tells them apart, and it is the word
    // the chip in the row and the ledger's rows carry.
    const {chips, previewRow, press} = await chooser();

    expect(previewRow().textContent).toContain(chipLabelFor(CHIP_SOURCES[0]));

    for (let step = 1; step < CHIP_SOURCES.length; step++) {
      await press("ArrowRight");

      expect(previewRow().textContent, `step ${step}`)
        .toContain(chipLabelFor(CHIP_SOURCES[step]));
    }

    expect(chips()).toHaveLength(CHIP_SOURCES.length);
  });


  it("carries the verdict in every chip's own name, not only in the row", async () => {
    // The row under the toolbar shows it for the focused chip and is no live
    // region, so a name of the colour alone would let a screen-reader visitor
    // walk all seven and never learn that one of them fails - with placing it
    // and resetting again as the only way to find out. This is the path for
    // keyboard and touch alike, which makes it the one place it has to travel.
    const {chips, previewRow, press} = await chooser();

    const focused = () => chips().find(chip => chip.getAttribute("tabindex") === "0")!;

    for (const source of CHIP_SOURCES) {
      const label = focused().getAttribute("aria-label")!;
      const [word, lc] = label.split(": ")[1].split(", ");

      // The same word and the same figure the row beside it shows.
      expect(previewRow().textContent, `${source}: ${label}`).toContain(word);
      expect(previewRow().textContent, `${source}: ${label}`).toContain(lc);

      await press("ArrowRight");
    }
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
    // Seven chips as seven stops would cost six presses to walk past the row.
    const {chips, press} = await chooser();
    const stops = () => chips().map(chip => chip.getAttribute("tabindex"));
    const on = (index: number) =>
      CHIP_SOURCES.map((_, position) => position === index ? "0" : "-1");
    const last = CHIP_SOURCES.length - 1;

    expect(stops()).toEqual(on(0));

    await press("ArrowRight");
    expect(stops()).toEqual(on(1));

    // Wrapping, so the row has no dead end at either side.
    await press("ArrowLeft");
    await press("ArrowLeft");
    expect(stops()).toEqual(on(last));

    await press("End");
    expect(stops()).toEqual(on(last));

    await press("Home");
    expect(stops()).toEqual(on(0));
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


  it("places T and G too, which is what keeps them off a mouse-only path", async () => {
    // The row's last two chips can be dropped, so they have to be placeable
    // without a drag as well - this is the whole of the keyboard and touch
    // path to them.
    const {store, chips, click} = await chooser();

    await click(chips()[5]);

    expect(store.placements()["headline"]).toBe("text");

    await click(chips()[6]);

    expect(store.placements()["headline"]).toBe("background");
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
