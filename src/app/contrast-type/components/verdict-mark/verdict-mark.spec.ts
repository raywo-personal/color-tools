import {provideZonelessChangeDetection} from "@angular/core";
import {ComponentFixture, TestBed} from "@angular/core/testing";
import {Dispatcher} from "@ngrx/signals/events";
import {beforeEach, describe, expect, it} from "vitest";
import chroma from "chroma-js";
import {AppStateStore} from "@core/app-state.store";
import {contrastEvents} from "@core/contrast/contrast.events";
import {converterEvents} from "@core/converter/converter.events";
import {findOptimalTextColor} from "@engine/contrast/optimal-text-color.helper";
import {SampleGround, samplePageColors} from "@contrast-type/models/sample-page.model";
import {VerdictMark} from "@contrast-type/components/verdict-mark/verdict-mark";


describe("VerdictMark", () => {

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()]
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
    const colors = samplePageColors(store.contrastColors(), store.currentPalette());

    function button(): HTMLElement {
      return host.querySelector("button") as HTMLElement;
    }

    function panel(): HTMLElement | null {
      return host.querySelector("[style*='border-color']");
    }

    async function press() {
      button().click();
      await fixture.whenStable();
    }

    return {fixture, host, colors, button, panel, press};
  }


  it("takes its colour from the surface it sits on, not from the element's ground", async () => {
    // The label on the filled button is measured against the accent; its mark
    // sits beside the button, on the page. A mark drawn against the accent
    // would be a colour chosen for a surface it is not on.
    const beside = await mark("filledButton", {surface: "page"});
    const onTheGround = await mark("filledButton");

    expect(beside.button().style.color)
      .toBe(findOptimalTextColor(beside.colors.page).color.hex("rgb"));
    expect(onTheGround.button().style.color)
      .toBe(findOptimalTextColor(onTheGround.colors.accent).color.hex("rgb"));
  });


  it("draws the focus ring in the same colour, offset off the surface", async () => {
    const {button} = await mark("headline");

    expect(button().style.outlineColor).toBe(button().style.color);
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
    const {button, panel, press, host} = await mark("imageCaption");

    expect(panel()).toBeNull();

    await press();

    expect(button().getAttribute("aria-expanded")).toBe("true");
    expect(panel()).not.toBeNull();

    const text = host.textContent ?? "";

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


  it("paints the opened verdict on its own surface, in a colour APCA chose for it", async () => {
    // The panel opens into the page, so a token would be guaranteed against
    // none of the colours behind it.
    const {panel, press, colors} = await mark("headline");

    await press();

    const opened = panel() as HTMLElement;

    expect(opened.style.backgroundColor).toBe(colors.page.hex("rgb"));
    expect(opened.style.color).toBe(findOptimalTextColor(colors.page).color.hex("rgb"));
  });


  it("underlines an element that came up short, and leaves an unrated one alone", async () => {
    // The mark is a shape in a gutter, and a shape beside a line is not the
    // line: without a second carrier a failing element says nothing where the
    // eye actually lands.
    const short = await mark("imageCaption");
    const unrated = await mark("eyebrow");

    const content = (host: HTMLElement) => host.querySelectorAll("span")[2];

    expect(short.button().getAttribute("aria-label")).not.toContain("passes");
    expect(content(short.host).className).toContain("decoration-dotted");

    expect(unrated.button().getAttribute("aria-label")).toContain("not rated");
    expect(content(unrated.host).className).not.toContain("decoration-dotted");
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

});
