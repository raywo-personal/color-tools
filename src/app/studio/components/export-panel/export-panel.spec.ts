import {TestBed} from "@angular/core/testing";
import {provideZonelessChangeDetection} from "@angular/core";
import {Dispatcher} from "@ngrx/signals/events";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import chroma from "chroma-js";
import {AppStateStore} from "@core/app-state.store";
import {palettesEvents} from "@core/palettes/palettes.events";
import {converterEvents} from "@core/converter/converter.events";
import {CopyService} from "@common/services/copy.service";
import {
  cssExport,
  dtcgExport,
  jsonExport,
  scssExport,
  tailwindExport
} from "@engine/palette/palette-export.helper";
import {ExportPanel} from "@studio/components/export-panel/export-panel";


describe("ExportPanel", () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()]
    });
  });


  afterEach(() => vi.restoreAllMocks());


  async function panel() {
    // The store registers its reducers when it is created, so an event
    // dispatched before that is lost and the initial random palette stands.
    const store = TestBed.inject(AppStateStore);
    const dispatcher = TestBed.inject(Dispatcher);

    dispatcher.dispatch(palettesEvents.styleChanged("triadic"));
    dispatcher.dispatch(converterEvents.colorChanged(chroma("#3366CC")));

    const fixture = TestBed.createComponent(ExportPanel);
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;

    function fromStore() {
      return {
        base: store.currentColor(),
        palette: store.currentPalette(),
        tints: store.tintColors(),
        shades: store.shadeColors()
      };
    }

    function tabs(): HTMLButtonElement[] {
      return Array.from(host.querySelectorAll<HTMLButtonElement>("[role=group] button"));
    }

    function tab(caption: string): HTMLButtonElement {
      const found = tabs().find(candidate => candidate.textContent?.trim() === caption);

      expect(found, `no ${caption} tab`).toBeDefined();

      return found!;
    }

    function pressed(): string[] {
      return tabs()
        .filter(candidate => candidate.getAttribute("aria-pressed") === "true")
        .map(candidate => candidate.textContent?.trim() ?? "");
    }

    function copyAll(): HTMLButtonElement {
      const found = Array.from(host.querySelectorAll("button"))
        .find(candidate => candidate.textContent?.trim() === "COPY ALL");

      expect(found, "no COPY ALL button").toBeDefined();

      return found!;
    }

    function block(): HTMLPreElement {
      return host.querySelector("pre")!;
    }

    async function pick(caption: string) {
      tab(caption).click();
      await fixture.whenStable();
    }

    return {fixture, store, host, fromStore, tabs, tab, pressed, copyAll, block, pick};
  }


  it("shows the CSS variables first, with the CSS tab pressed", async () => {
    const {fromStore, pressed, block, tabs} = await panel();

    expect(pressed()).toEqual(["CSS"]);
    expect(tabs().every(tab => tab.hasAttribute("aria-pressed")),
      "every tab carries a pressed state, not only the pressed one").toBe(true);
    expect(block().textContent).toBe(cssExport(fromStore()));
  });


  it("offers the three variable formats first and the two JSON ones after", async () => {
    const {tabs} = await panel();

    expect(tabs().map(tab => tab.textContent?.trim()))
      .toEqual(["CSS", "SCSS", "TAILWIND", "JSON", "DTCG"]);
  });


  it("switches the block to the SCSS variables and presses that tab alone", async () => {
    const {fromStore, pressed, block, pick} = await panel();

    await pick("SCSS");

    expect(pressed()).toEqual(["SCSS"]);
    expect(block().textContent).toBe(scssExport(fromStore()));
    expect(block().textContent).toMatch(/^\$palette-base: /);
  });


  it("switches the block to the Tailwind theme and presses that tab alone", async () => {
    const {fromStore, pressed, block, pick} = await panel();

    await pick("TAILWIND");

    expect(pressed()).toEqual(["TAILWIND"]);
    expect(block().textContent).toBe(tailwindExport(fromStore()));
    expect(block().textContent).toMatch(/^@theme \{/);
  });


  it("switches the block to JSON and presses that tab alone", async () => {
    const {fromStore, pressed, block, pick} = await panel();

    await pick("JSON");

    expect(pressed()).toEqual(["JSON"]);
    expect(block().textContent).toBe(jsonExport(fromStore()));
    expect(() => JSON.parse(block().textContent ?? "")).not.toThrow();
  });


  it("switches the block to the design tokens and presses that tab alone", async () => {
    const {fromStore, pressed, block, pick} = await panel();

    await pick("DTCG");

    expect(pressed()).toEqual(["DTCG"]);
    expect(block().textContent).toBe(dtcgExport(fromStore()));
    expect(block().textContent).toContain("\"$type\": \"color\"");
  });


  it("describes the palette and ramps on screen, a drag included", async () => {
    // A drag raises `colorAdjusted` per frame, not `colorChanged`; the block
    // has to move on that, or it describes the color before the drag.
    const {fixture, fromStore, block} = await panel();

    TestBed.inject(Dispatcher).dispatch(converterEvents.colorAdjusted(chroma("#FF5733")));
    await fixture.whenStable();

    expect(block().textContent).toContain("--palette-base: #FF5733;");
    expect(block().textContent).toBe(cssExport(fromStore()));
  });


  it("follows a newly rolled palette, roles included", async () => {
    const {fixture, fromStore, block} = await panel();

    TestBed.inject(Dispatcher).dispatch(palettesEvents.styleChanged("high-contrast"));
    await fixture.whenStable();

    expect(block().textContent).toContain("/* INK */");
    expect(block().textContent).toBe(cssExport(fromStore()));
  });


  it("copies the whole block through the copy service, named for the toast", async () => {
    const copyText = vi.spyOn(TestBed.inject(CopyService), "copyText")
      .mockResolvedValue(undefined);
    const {block, copyAll, pick} = await panel();

    copyAll().click();

    expect(copyText).toHaveBeenLastCalledWith(block().textContent, "CSS variables");

    for (const [caption, label] of [
      ["SCSS", "SCSS variables"],
      ["TAILWIND", "Tailwind theme"],
      ["JSON", "JSON export"],
      ["DTCG", "DTCG design tokens"]
    ]) {
      await pick(caption);
      copyAll().click();

      expect(copyText).toHaveBeenLastCalledWith(block().textContent, label);
    }

    expect(copyText).toHaveBeenCalledTimes(5);
  });


  it("makes the block the one copy target", async () => {
    // The rows are not targets: the only control besides the five tabs is
    // COPY ALL, and the block itself is not clickable.
    const {host, block} = await panel();

    expect(host.querySelectorAll("button")).toHaveLength(6);
    expect(block().querySelector("button")).toBeNull();
  });


  it("groups the five tabs under a name", async () => {
    const {host} = await panel();
    const group = host.querySelector("[role=group]");

    expect(group?.getAttribute("aria-label")).toBe("Export format");
    expect(group?.querySelectorAll("button")).toHaveLength(5);
  });


  it("scrolls inside the block, capped at a relative height", async () => {
    // The draft caps the block at 300px. A pixel cap ignores the font size
    // setting, and a block that does not scroll widens the page instead.
    const {block} = await panel();
    const classes = Array.from(block().classList);

    expect(classes).toContain("overflow-auto");
    expect(classes.some(name => /^max-h-\d+$/.test(name)),
      "the height cap is a scale step, not an arbitrary value").toBe(true);
    expect(classes.filter(name => name.includes("px"))).toEqual([]);
  });


  it("puts the block in the tab order, named for what it holds", async () => {
    // The block always scrolls - the CSS export is thirty lines under a
    // 20rem cap - and Safari does not focus a scroll container by itself,
    // so without the stop a keyboard-only visitor reads only its first half.
    const {block, pick} = await panel();

    expect(block().getAttribute("tabindex")).toBe("0");
    expect(block().getAttribute("role")).toBe("region");
    expect(block().getAttribute("aria-label")).toBe("CSS variables");

    await pick("JSON");

    expect(block().getAttribute("aria-label")).toBe("JSON export");
  });


  it("wraps the tabs and COPY ALL rather than crowding them", async () => {
    // Five tabs do not fit one row of the narrow column, so the group wraps
    // inside itself as well; the alternative is a tab below its hit area.
    const {host} = await panel();
    const group = host.querySelector("[role=group]");

    expect(group?.parentElement?.classList.contains("flex-wrap")).toBe(true);
    expect(group?.classList.contains("flex-wrap")).toBe(true);
  });

});
