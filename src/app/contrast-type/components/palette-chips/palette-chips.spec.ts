import {TestBed} from "@angular/core/testing";
import {By} from "@angular/platform-browser";
import {provideZonelessChangeDetection} from "@angular/core";
import {CdkDrag} from "@angular/cdk/drag-drop";
import {Dispatcher, Events} from "@ngrx/signals/events";
import {beforeEach, describe, expect, it} from "vitest";
import chroma, {Color} from "chroma-js";
import {AppStateStore} from "@core/app-state.store";
import {converterEvents} from "@core/converter/converter.events";
import {contrastEvents} from "@core/contrast/contrast.events";
import {ContrastColorRole} from "@engine/contrast/contrast-color.model";
import {colorName} from "@engine/color/color-name.helper";
import {CHIP_SOURCES} from "@contrast-type/models/chip-source.model";
import {expectApcaForeground} from "@testing/apca-foreground.expectation";
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
    const applied: ContrastColorRole[] = [];

    fixture.componentInstance.colorApplied.subscribe(role => applied.push(role));
    await fixture.whenStable();

    const events = TestBed.inject(Events);
    const host = fixture.nativeElement as HTMLElement;
    const list = host.querySelector("ul") as HTMLUListElement;

    function swatches() {
      return Array.from(list.querySelectorAll("button")) as HTMLButtonElement[];
    }

    /**
     * The items of the open menu. A CDK menu renders into the overlay
     * container on the body, not into the component's own element.
     */
    function items() {
      return Array.from(document
        .querySelectorAll<HTMLButtonElement>(".cdk-overlay-container [role=menuitem]"));
    }

    /** The menu of one chip, opened the way a click opens it. */
    async function openMenu(index: number) {
      swatches()[index].click();
      await fixture.whenStable();

      return items();
    }

    /** What one item reads: its caption and the figure beside it. */
    function captions() {
      return items().map(item => Array
        .from(item.querySelectorAll("span"))
        .map(span => span.textContent?.trim()));
    }

    async function press(caption: string) {
      const item = items()
        .find(candidate => candidate.textContent?.includes(caption)) as HTMLButtonElement;

      item.click();
      await fixture.whenStable();
    }

    /** The open menu itself, which is what carries the chip's name. */
    function menu() {
      return document.querySelector(".cdk-overlay-container [role=menu]");
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

    /** Repaints the pair's background, which is what the `BG` chip carries. */
    async function paintBackground(hex: string) {
      dispatcher.dispatch(contrastEvents.backgroundColorChanged(chroma(hex)));
      await fixture.whenStable();
    }

    /** The handle each chip shows, in the row's order. */
    function handles() {
      return swatches().map(swatch => swatch.textContent?.trim());
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
      host,
      list,
      applied,
      swatches,
      items,
      openMenu,
      captions,
      press,
      menu,
      drags,
      pressWith,
      paintBackground,
      handles,
      startDrag,
      endDrag,
      countPutDowns
    };
  }


  /** The figure an item promises, as every Lc a visitor reads is written. */
  function lc(text: Color | string, background: Color | string): number {
    return Math.floor(Math.abs(chroma.contrastAPCA(text, background)));
  }


  it("shows the palette's five colors and then the pair's own two", async () => {
    const {store, swatches} = await chips();
    const palette = store.currentPalette();

    expect(swatches().length).toBe(CHIP_SOURCES.length);
    // Through chroma rather than as a string: how a DOM implementation spells
    // `rgb(...)` back is not what this pins.
    expect(chroma(swatches()[0].style.backgroundColor).hex("rgb"))
      .toBe(palette.color0.color.hex("rgb"));
    // The pair comes last and in the pair's own order, which is what puts the
    // two chips under the two fields that set them.
    expect(chroma(swatches()[5].style.backgroundColor).hex("rgb")).toBe("#111111");
    expect(chroma(swatches()[6].style.backgroundColor).hex("rgb")).toBe("#eeeeee");
  });


  it("follows the pair, because T and G are the pair's two colors", async () => {
    const {swatches, paintBackground} = await chips();

    await paintBackground("#204080");

    expect(chroma(swatches()[6].style.backgroundColor).hex("rgb")).toBe("#204080");
  });


  it("carries a handle per chip, which is what the ledger's rows point at", async () => {
    const {handles} = await chips();

    expect(handles()).toEqual(["P1", "P2", "P3", "P4", "P5", "T", "BG"]);
  });


  it("writes the handle in whichever of black and white APCA puts further away", async () => {
    // The label sits on a colour the visitor picked, so a token is guaranteed
    // against none of it - and the draft's fixed white disappears on a light
    // `BG` the moment the page is light. The `BG` chip is the one this can
    // drive through the whole cube: it takes the pair's background.
    const {fixture, swatches, paintBackground} = await chips();

    await expectApcaForeground(async background => {
      await paintBackground(background.hex("rgb"));
      await fixture.whenStable();

      const label = swatches()[6].querySelector("span") as HTMLElement;

      return label.style.color;
    });
  });


  it("carries the list role, which Preflight's list-style would otherwise cost", async () => {
    const {list} = await chips();

    // Safari with VoiceOver stops treating a list without markers as a list,
    // and the label goes with it.
    expect(list.getAttribute("role")).toBe("list");
    expect(list.getAttribute("aria-label")).toBe("Palette colors and the pair");
  });


  it("says under the row what a press does, or the menu is undiscoverable", async () => {
    // The chips are seven swatches and the row has no caption of its own: the
    // sentence is what says they are controls and what pressing one offers.
    // The drag and the marks are said once already, beside `PREVIEW`.
    const {host} = await chips();

    expect(host.querySelector("p")?.textContent?.trim())
      .toBe("Press a color to use it as the text or the background.");
  });


  describe("the menu on a chip", () => {

    it("says a press opens something rather than applying a colour", async () => {
      const {swatches} = await chips();

      expect(swatches()[0].getAttribute("aria-haspopup")).toBe("menu");
      expect(swatches()[0].getAttribute("aria-expanded")).toBe("false");
    });


    it("opens on a click and stands the keyboard on the first item", async () => {
      // Two keys or two clicks is the whole gesture, which is what a mode
      // above the row used to buy down to one - see the component.
      const {swatches, openMenu} = await chips();

      const items = await openMenu(0);

      expect(swatches()[0].getAttribute("aria-expanded")).toBe("true");
      expect(items.length).toBe(2);
      expect(document.activeElement).toBe(items[0]);
    });


    it("offers both halves of the pair, each with the Lc it would reach", async () => {
      // The figure is the pair's own, not the page's: this row can promise the
      // two colours it leaves behind and nothing about 22 elements.
      const {store, openMenu, captions} = await chips();
      const color = store.currentPalette().color0.color;

      await openMenu(0);

      expect(captions()).toEqual([
        ["Use as the TEXT color", `Lc ${lc(color, "#EEEEEE")}`],
        ["Use as the BACKGROUND", `Lc ${lc("#111111", color)}`]
      ]);
    });


    it("keeps the promise the figure made", async () => {
      // The one assertion that ties the item to the pair rather than to a
      // formula written twice: what the item said, the pair then stands at.
      const {store, openMenu, press} = await chips();

      const items = await openMenu(2);
      const promised = items[0].textContent?.trim();

      await press("Use as the TEXT color");

      expect(`Lc ${lc(store.contrastColors().text, store.contrastColors().background)}`)
        .toBe(promised?.slice(promised.indexOf("Lc")));
    });


    it("leaves out the item T already is, and the one BG already is", async () => {
      // The two presses that changed nothing stop existing. The source decides
      // it, not the value - a palette colour that happens to equal the text
      // colour keeps both items.
      const {openMenu, captions} = await chips();

      await openMenu(5);

      expect(captions()).toEqual([["Use as the BACKGROUND", `Lc ${lc("#111111", "#111111")}`]]);

      await openMenu(6);

      expect(captions()).toEqual([["Use as the TEXT color", `Lc ${lc("#EEEEEE", "#EEEEEE")}`]]);
    });


    it("names the menu after the chip it belongs to", async () => {
      // It opens away from the row, so seven of them would otherwise be seven
      // identical menus in speech.
      const {store, openMenu, menu} = await chips();
      const color = store.currentPalette().color0.color;

      await openMenu(0);

      expect(menu()?.getAttribute("aria-label")).toBe(`P1: ${colorName(color)}`);
    });

  });


  describe("applying a chip", () => {

    it("sets the background from the item that says so", async () => {
      const {store, openMenu, press} = await chips();
      const expected = store.currentPalette().color2.color.hex("rgb");

      await openMenu(2);
      await press("Use as the BACKGROUND");

      expect(store.contrastColors.background().hex("rgb")).toBe(expected);
      expect(store.contrastColors.text().hex("rgb")).toBe("#111111");
    });


    it("sets the text color from the item that says so", async () => {
      const {store, openMenu, press} = await chips();
      const expected = store.currentPalette().color2.color.hex("rgb");

      await openMenu(2);
      await press("Use as the TEXT color");

      expect(store.contrastColors.text().hex("rgb")).toBe(expected);
      expect(store.contrastColors.background().hex("rgb")).toBe("#eeeeee");
    });


    it("reports the half it wrote, so the sliders follow the colour just set", async () => {
      // A report, not a mode: this row reads nothing back. `PairSliders` holds
      // which half its three tracks move.
      const {applied, openMenu, press} = await chips();

      await openMenu(1);
      await press("Use as the TEXT color");

      expect(applied).toEqual(["text"]);
    });


    it("names every chip by its handle and its colour, not by an outcome", async () => {
      // The outcome is the menu's to say now. The handle still opens the name
      // verbatim, because it is visible text in the button and WCAG 2.5.3 asks
      // the name to contain the label.
      const {store, swatches} = await chips();
      const color = store.currentPalette().color0.color;

      expect(swatches()[0].getAttribute("aria-label")).toBe(`P1: ${colorName(color)}`);
    });


    it("says what T and BG stand for, which the handle alone does not", async () => {
      // A screen reader speaks `T` as a letter and `BG` as two, and neither
      // says which half of the pair it is. The handle is the initial of the
      // field that sets it, which a reader can see and a listener cannot.
      const {swatches} = await chips();

      expect(swatches()[5].getAttribute("aria-label"))
        .toBe(`T, the text color: ${colorName(chroma("#111111"))}`);
      expect(swatches()[6].getAttribute("aria-label"))
        .toBe(`BG, the background: ${colorName(chroma("#EEEEEE"))}`);
    });


    it("puts T on the other half, which is the one item it offers", async () => {
      // The whole of what the two pair chips do to the pair: `T` can become
      // the background and `BG` the text colour, and neither can become itself.
      const {store, openMenu, press} = await chips();

      await openMenu(5);
      await press("Use as the BACKGROUND");

      expect(store.contrastColors.background().hex("rgb")).toBe("#111111");
      expect(store.contrastColors.text().hex("rgb")).toBe("#111111");
    });


    // A regression pin rather than a branch test: no press may put a chip in
    // hand. `pointerType` cannot tell a finger from a screen reader's
    // synthesised touch, so a carry armed here would be armed by an activation
    // whose whole account of itself is the chip's name - and the name says the
    // chip holds a colour and opens a menu. The no-drag path onto the page is
    // the chooser on the element's own mark.
    it.each(["mouse", "touch", "pen"])(
      "opens the menu and carries nothing when a %s pressed it",
      async pointerType => {
        const {store, swatches, openMenu, press, pressWith} = await chips();
        const expected = store.currentPalette().color0.color.hex("rgb");

        pressWith(swatches()[0], pointerType);
        await openMenu(0);
        await press("Use as the BACKGROUND");

        expect(store.contrastColors.background().hex("rgb")).toBe(expected);
        expect(store.carriedChip()).toBeNull();
      }
    );


    it("says nothing, because the visitor is standing on the item that said it", async () => {
      const announcer = fakeLiveAnnouncer();
      const {openMenu, press} = await chips();

      await openMenu(0);
      await press("Use as the BACKGROUND");

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


    it("still opens the menu on the press after a drag", async () => {
      // A drag's click goes to the common ancestor of its press and its
      // release, so nothing here runs on the way out of a drag. The next press
      // has to find the chip as it was.
      const {swatches, openMenu, pressWith, startDrag, endDrag} = await chips();

      pressWith(swatches()[0], "mouse");
      await startDrag(0);
      await endDrag(0);

      const items = await openMenu(0);

      expect(items.length).toBe(2);
    });


    it("puts an open menu away when the same chip is carried off", async () => {
      // The press that starts the drag is on the trigger, which is not an
      // outside click: left to CDK the menu hangs at the place the chip has
      // just left until the drop closes it.
      const {swatches, items, openMenu, startDrag} = await chips();

      await openMenu(0);
      await startDrag(0);

      expect(items()).toEqual([]);
      expect(swatches()[0].getAttribute("aria-expanded")).toBe("false");
    });


    it("writes nothing to the pair when a click does reach the chip after a drag", async () => {
      // What a stray click can produce is a menu, and a menu has changed
      // nothing: the outcome moved into an item, which a drag cannot reach.
      // Do not wire an apply back onto this click.
      const {fixture, store, swatches, pressWith, startDrag, endDrag} = await chips();

      pressWith(swatches()[3], "mouse");
      await startDrag(3);
      await endDrag(3);
      swatches()[3].click();
      await fixture.whenStable();

      expect(store.contrastColors.background().hex("rgb")).toBe("#eeeeee");
      expect(store.contrastColors.text().hex("rgb")).toBe("#111111");
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


    it("lifts the carried chip out of the row, and only that one", async () => {
      // The lift is what keeps the chip in sight over the sticky preview. On
      // the row it lifted nothing: seven chips on one z-index in one stacking
      // context are painted in document order, so dragging the first one let
      // every chip to its right paint over it - the colour disappeared under
      // its own neighbours.
      const {swatches, startDrag, endDrag} = await chips();

      await startDrag(0);

      expect(Array.from(swatches()[0].classList)).toContain("z-30");
      expect(swatches().slice(1).some(chip => chip.classList.contains("z-30"))).toBe(false);

      await endDrag(0);

      expect(swatches().some(chip => chip.classList.contains("z-30"))).toBe(false);
    });


    it("puts the chip in hand when a drag begins", async () => {
      const {store, startDrag} = await chips();

      await startDrag(1);

      expect(store.carriedChip()).toBe("color1");
    });


    it("puts T and G in hand as well, so the pair's colors can be dropped", async () => {
      // The whole point of the two chips: the text colour onto a button, the
      // background onto a card.
      const {store, startDrag, endDrag} = await chips();

      await startDrag(5);

      expect(store.carriedChip()).toBe("text");

      await endDrag(5);
      await startDrag(6);

      expect(store.carriedChip()).toBe("background");
    });


    it("drops T on an element and writes nothing back to the pair", async () => {
      // The rule the two new chips are held to: they carry the pair's colours
      // into the page, and no drop ever writes one back. The release itself
      // raises `colorPlaced` alone, and the drag's own click reaches no item.
      const {fixture, store, dispatcher, swatches, pressWith, startDrag, endDrag} =
        await chips();

      pressWith(swatches()[5], "mouse");
      await startDrag(5);
      dispatcher.dispatch(contrastEvents.colorPlaced({elementKey: "headline", side: "ink", source: "text"}));
      await fixture.whenStable();
      await endDrag(5);
      swatches()[5].click();
      await fixture.whenStable();

      expect(store.placements()).toEqual({headline: {ink: "text"}});
      expect(store.contrastColors.text().hex("rgb")).toBe("#111111");
      expect(store.contrastColors.background().hex("rgb")).toBe("#eeeeee");
    });


    it("puts the chip down where a drag ended on nothing", async () => {
      const {store, startDrag, endDrag} = await chips();

      await startDrag(1);
      await endDrag(1);

      expect(store.carriedChip()).toBeNull();
    });


    it("leaves a placement to put the chip down itself", async () => {
      // The order a browser gives: `PlacementGesture` releases on `pointerup`
      // and CDK ends the drag on `mouseup`, so the service has already placed
      // the colour by the time the chip hears the end. An unconditional
      // `chipPutDown` here would cancel that placement.
      const {fixture, store, dispatcher, startDrag, endDrag, countPutDowns} = await chips();
      const putDowns = countPutDowns();

      await startDrag(1);
      dispatcher.dispatch(contrastEvents.colorPlaced({elementKey: "headline", side: "ink", source: "color1"}));
      await fixture.whenStable();
      await endDrag(1);

      expect(putDowns()).toBe(0);
      expect(store.carriedChip()).toBeNull();
      expect(store.placements()).toEqual({headline: {ink: "color1"}});
    });

  });

});
