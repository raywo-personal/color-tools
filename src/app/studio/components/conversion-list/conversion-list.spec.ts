import {Component, provideZonelessChangeDetection} from "@angular/core";
import {TestBed} from "@angular/core/testing";
import {Dispatcher} from "@ngrx/signals/events";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import chroma from "chroma-js";
import {converterEvents} from "@core/converter/converter.events";
import {AppStateStore} from "@core/app-state.store";
import {CopyService} from "@common/services/copy.service";
import {COLOR_SPACES} from "@engine/color/color-space.model";
import {ConversionList} from "@studio/components/conversion-list/conversion-list";


/** The component's selector is an attribute, so it needs a host to sit on. */
@Component({
  imports: [ConversionList],
  template: "<ul ct-conversion-list></ul>"
})
class Host {
}


describe("ConversionList", () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()]
    });
  });


  afterEach(() => vi.restoreAllMocks());


  async function list(color = "#3366CC") {
    // The store registers its reducers when it is created, so an event
    // dispatched before that is lost and the initial random color stands.
    TestBed.inject(AppStateStore);
    TestBed.inject(Dispatcher).dispatch(converterEvents.colorChanged(chroma(color)));

    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();

    const buttons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll("button")
    );

    /**
     * A row by its label rather than by its index. The order follows
     * `COLOR_SPACES`, so an index would tie every assertion below to a
     * declaration these tests are not about.
     */
    function row(label: string): HTMLButtonElement {
      const found = buttons.find(button => name(button).includes(` ${label} `));

      expect(found, `no ${label} row`).toBeDefined();

      return found!;
    }

    return {fixture, buttons, row};
  }


  function name(button: HTMLElement): string {
    return button.textContent?.replace(/\s+/g, " ").trim() ?? "";
  }


  it("shows one row per space the app can edit in, in the order they are declared", async () => {
    const {buttons} = await list();

    expect(buttons.map(button => name(button).split(" ")[1]))
      .toEqual(COLOR_SPACES.map(space => space.toUpperCase()));
  });


  it("writes each space in the format the app itself parses back", async () => {
    const {row} = await list();

    expect(name(row("HEX"))).toBe("Copy HEX #3366CC");
    expect(name(row("RGB"))).toBe("Copy RGB rgb(51 102 204)");
    expect(name(row("HSL"))).toBe("Copy HSL hsl(220 60% 50%)");
    expect(name(row("OKLCH"))).toBe("Copy OKLCH oklch(53.2% 0.168 262)");
  });


  it("has no CMYK row, whatever the draft shows", async () => {
    const {buttons} = await list();

    expect(buttons.map(name).some(text => text.includes("CMYK"))).toBe(false);
  });


  it("copies the format the row itself shows, not always the hex", async () => {
    const copyColor = vi.spyOn(TestBed.inject(CopyService), "copyColor")
      .mockResolvedValue(undefined);
    const {row} = await list();

    row("HSL").click();

    expect(copyColor).toHaveBeenCalledWith(expect.anything(), "hsl(220 60% 50%)");
  });


  it("hands the color along, so the announcement can use its name", async () => {
    // The toast shows the format that landed on the clipboard, speech gets
    // colorName() - a hex code is read out one character at a time. That split
    // only works while the row passes the color rather than the string alone.
    const copyColor = vi.spyOn(TestBed.inject(CopyService), "copyColor")
      .mockResolvedValue(undefined);
    const {row} = await list();

    row("HEX").click();

    const [color] = copyColor.mock.calls[0];

    expect(chroma.valid(color)).toBe(true);
    expect(color.hex("rgb")).toBe("#3366cc");
  });


  it("stays a list once Preflight has taken its marker", async () => {
    const {fixture} = await list();

    const element = (fixture.nativeElement as HTMLElement).querySelector("ul");

    // Without the role Safari drops the list semantics Preflight took the
    // marker from, and the label goes with them.
    expect(element?.getAttribute("role")).toBe("list");
    expect(element?.getAttribute("aria-label")).toBe("Color conversions");
  });


  it("follows the current color", async () => {
    const {fixture, row} = await list();

    TestBed.inject(Dispatcher).dispatch(converterEvents.colorChanged(chroma("#FF5733")));
    await fixture.whenStable();

    expect(name(row("HEX"))).toBe("Copy HEX #FF5733");
  });

});
