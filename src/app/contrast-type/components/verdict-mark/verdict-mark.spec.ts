import {provideZonelessChangeDetection} from "@angular/core";
import {ComponentFixture, TestBed} from "@angular/core/testing";
import {Dispatcher} from "@ngrx/signals/events";
import {beforeEach, describe, expect, it} from "vitest";
import chroma from "chroma-js";
import {AppStateStore} from "@core/app-state.store";
import {contrastEvents} from "@core/contrast/contrast.events";
import {converterEvents} from "@core/converter/converter.events";
import {findOptimalTextColor} from "@engine/contrast/optimal-text-color.helper";
import {PaletteSlot} from "@engine/palette/palette.model";
import {provideFakeLiveAnnouncer} from "@testing/live-announcer.fake";
import {SampleGround, samplePage} from "@contrast-type/models/sample-page.model";
import {VerdictMark} from "@contrast-type/components/verdict-mark/verdict-mark";


describe("VerdictMark", () => {

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        // Placing a colour raises the announcement that travels with the
        // event; the real announcer would leave a live region behind.
        provideFakeLiveAnnouncer()
      ]
    });
  });


  async function mark(elementKey: string,
                      options: {surface?: SampleGround; inline?: boolean} = {}) {
    // The store registers its reducers when it is created, so an event
    // dispatched before that is lost and the initial random pair stands.
    const store = TestBed.inject(AppStateStore);
    const dispatcher = TestBed.inject(Dispatcher);

    dispatcher.dispatch(converterEvents.colorChanged(chroma("#3366CC")));
    dispatcher.dispatch(contrastEvents.textColorChanged(chroma("#111111")));
    dispatcher.dispatch(contrastEvents.backgroundColorChanged(chroma("#EEEEEE")));

    const fixture: ComponentFixture<VerdictMark> = TestBed.createComponent(VerdictMark);
    fixture.componentRef.setInput("elementKey", elementKey);

    if (options.surface !== undefined) fixture.componentRef.setInput("surface", options.surface);
    if (options.inline !== undefined) fixture.componentRef.setInput("inline", options.inline);

    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const colors = samplePage(store.contrastColors(), store.currentPalette(), store.placements()).colors;

    function button(): HTMLElement {
      return host.querySelector("button") as HTMLElement;
    }

    /** The badge inside the button - the app's surface, with the APCA rim. */
    function badge(): HTMLElement {
      return button().firstElementChild as HTMLElement;
    }

    /** The element the mark wraps, which carries the dotted underline. */
    function content(): HTMLElement {
      return host.querySelector("[data-content]") as HTMLElement;
    }

    /** The badge that names the element while a colour may go on it. */
    function elementName(): HTMLElement | null {
      return host.querySelector("[data-element-name]");
    }

    /** The chooser inside the opened popup, which lives on the body. */
    function chooser(): HTMLElement | null {
      return document.querySelector(".cdk-overlay-container ct-color-chooser");
    }

    async function carry(slot: PaletteSlot) {
      dispatcher.dispatch(contrastEvents.chipPickedUp(slot));
      await fixture.whenStable();
    }

    /**
     * A release on the given element. The listener is on the document and
     * reads the event's own target, which is what a mouse drag delivers once
     * the chip is transparent to pointers. A touch drag is the one that needs
     * the point looked up instead, and a test DOM has no layout to look one up
     * in - so these drive the mouse's path.
     */
    async function releaseOn(element: EventTarget) {
      element.dispatchEvent(new PointerEvent("pointerup", {bubbles: true}));
      await fixture.whenStable();
    }

    async function moveOver(element: EventTarget) {
      element.dispatchEvent(new PointerEvent("pointermove", {bubbles: true}));
      await fixture.whenStable();
    }

    /**
     * The open popup. A CDK overlay renders into a container on the body, not
     * into the fixture - which is the whole point of it: nothing in the
     * preview moves and nothing clips it.
     */
    function panel(): HTMLElement | null {
      return document.querySelector(".cdk-overlay-container ct-verdict-panel");
    }

    async function press() {
      button().click();
      await fixture.whenStable();
    }

    return {
      fixture, store, host, colors,
      button, badge, content, panel, press,
      elementName, chooser, carry, releaseOn, moveOver
    };
  }


  it("draws itself as the app's badge, so it reads as a control", async () => {
    // A bare glyph in the page's own ink was punctuation the visitor had
    // apparently set, and nobody pressed it. The badge takes the app's
    // surfaces, like the popup it opens.
    const {badge} = await mark("headline");

    expect(badge().className).toContain("bg-panel");
    expect(badge().className).toContain("text-text");
    // The badge changes under the pointer, which a glyph could not.
    expect(badge().className).toContain("group-hover:bg-field");
  });


  it("takes its rim from the surface it sits on, not from the element's ground", async () => {
    // The rim is the edge between the app's badge and the visitor's colour,
    // and `line` is guaranteed against none of theirs. The label on the filled
    // button is measured against the accent; its mark sits beside the button,
    // on the page - a rim drawn against the accent would be a colour chosen
    // for a surface it is not on.
    const beside = await mark("filledButton", {surface: "page"});
    const onTheGround = await mark("filledButton");

    expect(beside.badge().style.borderColor)
      .toBe(findOptimalTextColor(beside.colors.page).color.hex("rgb"));
    expect(onTheGround.badge().style.borderColor)
      .toBe(findOptimalTextColor(onTheGround.colors.accent).color.hex("rgb"));
  });


  it("draws the focus ring in the same colour, offset off the surface", async () => {
    const {button, badge} = await mark("headline");

    expect(button().style.outlineColor).toBe(badge().style.borderColor);
    expect(button().className).toContain("outline-offset-2");
  });


  it("names the element and its verdict before anything is opened", async () => {
    // The mark is useful without being pressed: a screen reader hears how the
    // element fares and then decides whether to open the reasons.
    const {button} = await mark("headline");

    expect(button().getAttribute("aria-label")).toMatch(/^Headline: /);
    expect(button().getAttribute("aria-expanded")).toBe("false");
  });


  it("opens the reasons in words and closes on a second press", async () => {
    const {button, panel, press} = await mark("imageCaption");

    expect(panel()).toBeNull();

    await press();

    expect(button().getAttribute("aria-expanded")).toBe("true");
    expect(panel()).not.toBeNull();

    const text = panel()?.textContent ?? "";

    // The element, its verdict in words, and the rows: the two Lc figures and
    // the type. No prose, and nothing about the APCA table's own rows.
    expect(text).toContain("CAPTION");
    expect(text).toContain("Reached");
    expect(text).toContain("Needed");
    expect(text).toMatch(/Lc \d+/);
    expect(text).toContain("BODY · ");
    expect(text).not.toContain("row");

    await press();

    expect(button().getAttribute("aria-expanded")).toBe("false");
    expect(panel()).toBeNull();
  });


  it("paints the popup in the app's colours, not the page's", async () => {
    // It is the app looking at the visitor's page from outside. In the page's
    // own palette it read as part of the sample content - a box the visitor
    // had somehow styled - which is the one thing it is not.
    const {panel, press, colors} = await mark("headline");

    await press();

    const opened = panel() as HTMLElement;
    const surface = opened.firstElementChild as HTMLElement;

    expect(surface.className).toContain("bg-panel");
    expect(surface.className).toContain("border-line");
    expect(surface.className).toContain("text-text");

    // No style binding hands it a page colour, so nothing in it needs
    // measuring against one.
    expect(opened.innerHTML).not.toContain(colors.page.hex("rgb"));
  });


  it("moves nothing in the page when it opens", async () => {
    // In the flow the panel pushed the elements below it down, so reading one
    // verdict rearranged the page it was about.
    const {host, press} = await mark("headline");
    const before = host.getBoundingClientRect().height;

    await press();

    expect(host.getBoundingClientRect().height).toBe(before);
    expect(host.querySelector("ct-verdict-panel")).toBeNull();
  });


  it("underlines an element that came up short, and leaves an unrated one alone", async () => {
    // The mark is a shape in a gutter, and a shape beside a line is not the
    // line: without a second carrier a failing element says nothing where the
    // eye actually lands.
    const short = await mark("imageCaption");
    const unrated = await mark("eyebrow");

    expect(short.button().getAttribute("aria-label")).not.toContain("passes");
    expect(short.content().className).toContain("decoration-dotted");

    expect(unrated.button().getAttribute("aria-label")).toContain("not rated");
    expect(unrated.content().className).not.toContain("decoration-dotted");
  });


  it("keeps the gutter and the hit-area row off an element inside a line", async () => {
    // A word inside a paragraph cannot indent, and a 44px row would open a
    // gap in the line it sits in.
    const block = await mark("headline");
    const inline = await mark("bodyLink", {inline: true});

    const blockRow = block.host.firstElementChild as HTMLElement;
    const inlineRow = inline.host.firstElementChild as HTMLElement;

    // The host itself carries the display, so a block mark is a block in the
    // page's flow and an inline one stays in its line.
    expect(block.host.className).toContain("block");
    expect(inline.host.className).toContain("inline");

    expect(blockRow.className).toContain("min-h-11");
    expect(blockRow.className).toContain("flex");
    expect(inlineRow.className).not.toContain("min-h-11");
    expect(inlineRow.className).toContain("inline");

    // The hit area survives either way: the button is out of flow and keeps
    // the app's minimum.
    expect(inline.button().className).toContain("size-11");
  });


  it("marks nothing at rest, and names the element the pointer is on", async () => {
    // 1h: the page is the visitor's page until they ask it a question. Hover
    // and focus are the two ways of asking, and the mark's own focus counts -
    // it is the element's stop in the tab order.
    const {host, content, elementName, fixture} = await mark("headline");

    expect(content().className).not.toContain("outline-2");
    expect(elementName()).toBeNull();

    host.dispatchEvent(new PointerEvent("pointerenter"));
    await fixture.whenStable();

    expect(content().className).toContain("outline-2");
    expect(content().className).toContain("outline-dashed");
    expect(elementName()?.textContent).toBe("HEADLINE");

    host.dispatchEvent(new PointerEvent("pointerleave"));
    await fixture.whenStable();

    expect(elementName()).toBeNull();
  });


  it("offers itself while a chip is carried, and names the drop under the pointer", async () => {
    // 1i: every named element dashed and named, the one under the pointer
    // solid. The offer has to be visible before the pointer reaches it, or the
    // visitor is dragging at a page that says nothing.
    const {content, elementName, carry, moveOver} = await mark("headline");

    await carry("color2");

    expect(content().className).toContain("outline-2");
    expect(content().className).toContain("outline-dashed");
    expect(elementName()?.textContent).toBe("HEADLINE");

    await moveOver(content());

    expect(content().className).toContain("outline-2");
    expect(content().className, "the drop is still only offered").not.toContain("outline-dashed");
  });


  it("draws the outline and the name in a colour APCA chose, not in a token", async () => {
    // Both sit on the surface the mark sits on, so they take the rim's colour:
    // `line` and `text` are guaranteed against the app's six surfaces and
    // against none of the visitor's.
    const {badge, content, elementName, carry} = await mark("filledButton", {surface: "page"});

    await carry("color2");

    expect(content().style.outlineColor).toBe(badge().style.borderColor);
    expect(elementName()?.style.borderColor).toBe(badge().style.borderColor);
  });


  it("places the dragged colour where the chip is released", async () => {
    const {store, host, carry, releaseOn} = await mark("headline");

    await carry("color2");
    await releaseOn(host);

    expect(store.placements()["headline"]).toBe("color2");
    // The placement puts the chip down by itself; nothing is left in hand.
    expect(store.carriedSlot()).toBeNull();
  });


  it("puts the chip down where it is released on nothing, without placing", async () => {
    // A drag that ended over the app, or over the page's margin, is a gesture
    // that ended - not a placement on whatever was nearest.
    const {store, carry, releaseOn} = await mark("headline");

    await carry("color3");
    await releaseOn(document.body);

    expect(store.carriedSlot()).toBeNull();
    expect(store.placements()["headline"]).toBeUndefined();
  });


  it("colours the element from its own mark, which is the path without a drag", async () => {
    // The one path a finger and a keyboard share. A drag is the mouse's
    // shortcut: below `lg` the preview is stacked under the whole control
    // column and a keyboard cannot drag at all - so a tap or a press on the
    // mark opens the palette, and a tap or a press on a chip places.
    const {store, chooser, press, fixture} = await mark("headline");

    await press();

    const chips = Array.from(
      (chooser() as HTMLElement).querySelectorAll<HTMLButtonElement>("[role=toolbar] button")
    );

    expect(chips).toHaveLength(5);

    chips[2].click();
    await fixture.whenStable();

    expect(store.placements()["headline"]).toBe("color2");

    // The popup stays where it is, so the next colour is one press away and
    // no focus moves while the placement is being announced.
    expect(chooser()).not.toBeNull();
  });


  it("opens the palette beside the verdict, and Escape hands focus back", async () => {
    // One popup with two blocks, because the element's mark is its one stop in
    // the tab order: `Tab` to an element, press, and the colours are there.
    const {button, panel, chooser, press, fixture} = await mark("headline");

    await press();

    expect(panel()).not.toBeNull();
    expect(chooser()).not.toBeNull();

    const dialog = document.querySelector(".cdk-overlay-container [role=dialog]");

    // The popup's name is where the mark's two jobs are said - the mark's own
    // name stays the verdict, which is what is worth hearing on every pass.
    expect(dialog?.getAttribute("aria-label")).toBe("Headline: verdict and color");
    expect(button().getAttribute("aria-haspopup")).toBe("dialog");

    document.body.dispatchEvent(new KeyboardEvent("keydown", {key: "Escape", bubbles: true}));
    await fixture.whenStable();

    expect(chooser()).toBeNull();
    expect(document.activeElement).toBe(button());
  });

});
