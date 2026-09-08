import {TestBed} from "@angular/core/testing";
import {By} from "@angular/platform-browser";
import {provideZonelessChangeDetection} from "@angular/core";
import {CdkDrag} from "@angular/cdk/drag-drop";
import {Dispatcher, Events} from "@ngrx/signals/events";
import {beforeEach, describe, expect, it} from "vitest";
import chroma from "chroma-js";
import {AppStateStore} from "@core/app-state.store";
import {converterEvents} from "@core/converter/converter.events";
import {contrastEvents} from "@core/contrast/contrast.events";
import {colorName} from "@engine/color/color-name.helper";
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

    const events = TestBed.inject(Events);
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

    /** The `cdkDrag` on each chip, in the row's order. */
    function drags() {
      return fixture.debugElement
        .queryAll(By.directive(CdkDrag))
        .map(found => found.injector.get(CdkDrag));
    }

    /**
     * A press of the kind the browser reports. `PointerEvent` is not in this
     * test environment, so `pointerType` is set by hand - nothing in the
     * component reads it, and the tests below are what keeps that true.
     */
    function pressWith(button: HTMLButtonElement, pointerType: string) {
      const event = new Event("pointerdown", {bubbles: true});

      Object.defineProperty(event, "pointerType", {value: pointerType});
      button.dispatchEvent(event);
    }

    async function startDrag(index: number) {
      const drag = drags()[index];

      drag.started.emit({source: drag, event: new MouseEvent("mousedown")});
      await fixture.whenStable();
    }

    async function endDrag(index: number) {
      const drag = drags()[index];

      drag.ended.emit({
        source: drag,
        distance: {x: 0, y: 0},
        dropPoint: {x: 0, y: 0},
        event: new MouseEvent("mouseup")
      });
      await fixture.whenStable();
    }

    /** How often the chip announced that it had ended a gesture empty-handed. */
    function countPutDowns() {
      let count = 0;

      events.on(contrastEvents.chipPutDown).subscribe(() => count++);

      return () => count;
    }

    return {
      fixture,
      store,
      dispatcher,
      list,
      targets,
      swatches,
      pickTarget,
      drags,
      pressWith,
      startDrag,
      endDrag,
      countPutDowns
    };
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


    // A regression pin rather than a branch test: no press may put a chip in
    // hand. `pointerType` cannot tell a finger from a screen reader's
    // synthesised touch, so a carry armed here would be armed by an activation
    // whose whole account of itself is the chip's name - and the name says
    // what the click does. The no-drag path is the chooser on the element's
    // own mark.
    it.each(["mouse", "touch", "pen"])(
      "applies the colour and carries nothing when a %s pressed it",
      async pointerType => {
        const {fixture, store, swatches, pressWith} = await chips();
        const expected = store.currentPalette().color0.color.hex("rgb");

        pressWith(swatches()[0], pointerType);
        swatches()[0].click();
        await fixture.whenStable();

        expect(store.contrastColors.background().hex("rgb")).toBe(expected);
        expect(store.carriedSlot()).toBeNull();
      }
    );


    it("says nothing, because the chip's own name already did", async () => {
      const announcer = fakeLiveAnnouncer();
      const {fixture, swatches} = await chips();

      swatches()[0].click();
      await fixture.whenStable();

      expect(announcer.announcements).toEqual([]);
    });

  });


  describe("two gestures on one button", () => {

    it("holds a touch back before a drag, so a swipe still scrolls the screen", async () => {
      // Without the delay CDK claims the first touch move, and the chip row
      // is the full width of the page on a phone.
      const {drags} = await chips();

      expect(drags()[0].dragStartDelay).toEqual({touch: 300, mouse: 0});
    });


    it("still applies from the keyboard after a drag that raised no click here", async () => {
      // A drag's click goes to the common ancestor of its press and its
      // release, so `apply()` does not run and cannot clear the drag flag on
      // the way out. The next gesture's start is what clears it - here the
      // keydown - or this press would do nothing at all.
      const {fixture, store, swatches, pressWith, startDrag, endDrag} = await chips();

      pressWith(swatches()[0], "mouse");
      await startDrag(0);
      await endDrag(0);

      swatches()[0].dispatchEvent(new KeyboardEvent("keydown", {key: "Enter", bubbles: true}));
      swatches()[0].click();
      await fixture.whenStable();

      expect(store.contrastColors.background().hex("rgb"))
        .toBe(store.currentPalette().color0.color.hex("rgb"));
    });


    it("stops taking pointer events while the chip is out, and takes them again after", async () => {
      // With no drop list CDK builds no preview: it translates the chip itself,
      // which then sits under the pointer for the whole drag. Without this the
      // drop lands on the chip and reads as a cancel the moment anything in the
      // preview changes its paint order.
      const {swatches, startDrag, endDrag} = await chips();

      await startDrag(0);

      expect(Array.from(swatches()[0].classList)).toContain("pointer-events-none");

      await endDrag(0);

      expect(Array.from(swatches()[0].classList)).not.toContain("pointer-events-none");
    });


    it("puts the chip in hand when a drag begins", async () => {
      const {store, startDrag} = await chips();

      await startDrag(1);

      expect(store.carriedSlot()).toBe("color1");
    });


    it("applies nothing to the pair when a click does reach it after a drag", async () => {
      // The net under `pointer-events-none`. With that class in place a real
      // browser dispatches the drag's click at the common ancestor of press
      // and release, so it never arrives here at all - which is why this spec
      // has to call `.click()` itself. Were the class ever lost, the click
      // would be delivered to the chip and this flag is what stops one gesture
      // meaning two things: a colour placed on an element and half the pair
      // repainted.
      const {fixture, store, swatches, pressWith, startDrag, endDrag} = await chips();

      pressWith(swatches()[3], "mouse");
      await startDrag(3);
      await endDrag(3);
      swatches()[3].click();
      await fixture.whenStable();

      expect(store.contrastColors.background().hex("rgb")).toBe("#eeeeee");
      expect(store.contrastColors.text().hex("rgb")).toBe("#111111");
    });


    it("puts the chip down where a drag ended on nothing", async () => {
      const {store, startDrag, endDrag} = await chips();

      await startDrag(1);
      await endDrag(1);

      expect(store.carriedSlot()).toBeNull();
    });


    it("leaves a placement to put the chip down itself", async () => {
      // The order a browser gives: `PlacementGesture` releases on `pointerup`
      // and CDK ends the drag on `mouseup`, so the service has already placed
      // the colour by the time the chip hears the end. An unconditional
      // `chipPutDown` here would cancel that placement.
      const {fixture, store, dispatcher, startDrag, endDrag, countPutDowns} = await chips();
      const putDowns = countPutDowns();

      await startDrag(1);
      dispatcher.dispatch(contrastEvents.colorPlaced({elementKey: "headline", slot: "color1"}));
      await fixture.whenStable();
      await endDrag(1);

      expect(putDowns()).toBe(0);
      expect(store.carriedSlot()).toBeNull();
      expect(store.placements()).toEqual({headline: "color1"});
    });

  });

});
