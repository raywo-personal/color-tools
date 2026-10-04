import {TestBed} from "@angular/core/testing";
import {provideZonelessChangeDetection} from "@angular/core";
import {Dispatcher} from "@ngrx/signals/events";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import chroma from "chroma-js";
import {AppStateStore} from "@core/app-state.store";
import {converterEvents} from "@core/converter/converter.events";
import {CopyService} from "@common/services/copy.service";
import {colorName} from "@engine/color/color-name.helper";
import {TintShadeRamps} from "@studio/components/tint-shade-ramps/tint-shade-ramps";


describe("TintShadeRamps", () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()]
    });
  });


  afterEach(() => vi.restoreAllMocks());


  async function ramps() {
    const store = TestBed.inject(AppStateStore);
    const fixture = TestBed.createComponent(TintShadeRamps);
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;

    function lists() {
      return Array.from(host.querySelectorAll("ul"));
    }

    function captions() {
      return Array.from(host.querySelectorAll("section > p")).map(p => p.textContent?.trim() ?? "");
    }

    function stepsOf(list: HTMLElement) {
      return Array.from(list.querySelectorAll("button"));
    }

    function backgroundsOf(list: HTMLElement) {
      return stepsOf(list).map(step => step.style.backgroundColor);
    }

    async function show(hex: string) {
      TestBed.inject(Dispatcher).dispatch(converterEvents.colorChanged(chroma(hex)));
      await fixture.whenStable();
    }

    return {fixture, store, host, lists, captions, stepsOf, backgroundsOf, show};
  }


  it("shows the tints and the shades, eleven steps each, in the store's order", async () => {
    const {store, lists, backgroundsOf} = await ramps();
    const [tints, shades] = lists();

    expect(lists()).toHaveLength(2);
    expect(backgroundsOf(tints)).toEqual(store.tintColors().map(color => color.hex("rgb")));
    expect(backgroundsOf(shades)).toEqual(store.shadeColors().map(color => color.hex("rgb")));
    expect(backgroundsOf(tints)).toHaveLength(11);
    expect(backgroundsOf(shades)).toHaveLength(11);
  });


  it("captions the rows the way the draft writes them", async () => {
    const {captions} = await ramps();

    expect(captions()).toEqual(["TINTS → WHITE", "SHADES → BLACK"]);
  });


  it("starts both ramps on the base color and runs them out to white and black", async () => {
    const {lists, backgroundsOf, show} = await ramps();

    await show("#3366CC");

    const [tints, shades] = lists().map(backgroundsOf);

    expect(tints[0]).toBe("#3366cc");
    expect(tints[10]).toBe("#ffffff");
    expect(shades[0]).toBe("#3366cc");
    expect(shades[10]).toBe("#000000");
  });


  it("follows the sliders while they are still moving", async () => {
    // A drag raises `colorAdjusted` per frame, not `colorChanged`; the ramps
    // have to move on that, or they stand still until the release.
    const {fixture, lists, backgroundsOf} = await ramps();

    TestBed.inject(Dispatcher).dispatch(converterEvents.colorAdjusted(chroma("#FF5733")));
    await fixture.whenStable();

    expect(lists().map(list => backgroundsOf(list)[0])).toEqual(["#ff5733", "#ff5733"]);
  });


  it("names each step by its color and position, never by its hex", async () => {
    // A hex code is read out one character at a time. The position is part of
    // the name because neighbouring steps often share a nearest color name.
    const {store, lists, stepsOf} = await ramps();
    const colors = [store.tintColors(), store.shadeColors()];
    const kinds = ["tint", "shade"];

    lists().forEach((list, ramp) => {
      stepsOf(list).forEach((step, index) => {
        const label = step.getAttribute("aria-label");

        expect(label).toBe(`Copy ${colorName(colors[ramp][index])}, ${kinds[ramp]} ${index * 10}%`);
        expect(label).not.toContain("#");
      });
    });
  });


  it("labels each list without the caption's arrow", async () => {
    const {lists} = await ramps();

    expect(lists().map(list => list.getAttribute("aria-label")))
      .toEqual(["Tints towards white", "Shades towards black"]);
  });


  it("copies the step's hex through the copy service", async () => {
    const copyColor = vi.spyOn(TestBed.inject(CopyService), "copyColor")
      .mockResolvedValue(undefined);
    const {store, lists, stepsOf} = await ramps();
    const fourthShade = store.shadeColors()[3];

    stepsOf(lists()[1])[3].click();

    expect(copyColor).toHaveBeenCalledOnce();

    const [color, text] = copyColor.mock.calls[0];

    expect(chroma.valid(color)).toBe(true);
    expect(color.hex("rgb")).toBe(fourthShade.hex("rgb"));
    expect(text).toBe(fourthShade.hex("rgb").toUpperCase());
  });


  it("stays a list once Preflight has taken its marker", async () => {
    const {lists} = await ramps();

    lists().forEach(list => expect(list.getAttribute("role")).toBe("list"));
  });


  it("puts the eleven columns behind sm:, so a phone gets two rows", async () => {
    // Eleven across 320px leave 23px per step, under the touch minimum. The
    // step is the copy target, so it keeps that minimum and the strip wraps.
    // `pnpm lint` catches a max-* variant walking a desktop layout back; an
    // unprefixed `grid-cols-11` is desktop-first and no linter objects to it.
    const {lists} = await ramps();

    lists().forEach(list => {
      const columns = Array.from(list.classList).filter(name => name.includes("grid-cols-"));

      expect(columns.filter(name => !name.includes(":"))).not.toContain("grid-cols-11");
      expect(columns).toContain("sm:grid-cols-11");
    });
  });


  it("binds the single click only, leaving double-click for the pinning decision", async () => {
    // The draft sets the base color on double-click. A synthetic dblclick
    // fires no click of its own, so a handler bound to it is the only thing
    // that could react here.
    const copyColor = vi.spyOn(TestBed.inject(CopyService), "copyColor")
      .mockResolvedValue(undefined);
    const {fixture, store, lists, stepsOf} = await ramps();
    const before = store.currentColor();

    stepsOf(lists()[0])[5].dispatchEvent(new MouseEvent("dblclick", {bubbles: true}));
    await fixture.whenStable();

    expect(copyColor).not.toHaveBeenCalled();
    expect(store.currentColor()).toBe(before);
  });

});
