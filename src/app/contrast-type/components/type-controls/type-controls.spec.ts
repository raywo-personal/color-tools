import {provideZonelessChangeDetection} from "@angular/core";
import {TestBed} from "@angular/core/testing";
import {Dispatcher} from "@ngrx/signals/events";
import {beforeEach, describe, expect, it} from "vitest";
import {AppStateStore} from "@core/app-state.store";
import {commonEvents} from "@core/common/common.events";
import {LOCAL_STORAGE_KEY, SettingsMap} from "@common/models/local-storage.model";
import {DEFAULT_TYPE_SETTINGS, TypeSettings} from "@engine/contrast/type-settings.model";
import {TypeControls} from "@contrast-type/components/type-controls/type-controls";


describe("TypeControls", () => {

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()]
    });
  });


  async function controls(settings: TypeSettings = DEFAULT_TYPE_SETTINGS) {
    // The store registers its reducers when it is created, so an event
    // dispatched before that is lost and the initial settings stand.
    const store = TestBed.inject(AppStateStore);

    TestBed.inject(Dispatcher).dispatch(commonEvents.typeSettingsChanged(settings));

    const fixture = TestBed.createComponent(TypeControls);
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;

    function sliders(): HTMLInputElement[] {
      return Array.from(host.querySelectorAll("input[type=range]"));
    }

    function labels(): string[] {
      return Array.from(host.querySelectorAll("label"))
        .map(label => label.textContent?.trim() ?? "");
    }

    function values(): string[] {
      return sliders().map(input => input.getAttribute("aria-valuetext") ?? "");
    }

    async function drag(index: number, to: number) {
      const input = sliders()[index];
      input.value = String(to);
      input.dispatchEvent(new Event("input"));
      await fixture.whenStable();
    }

    async function release(index: number) {
      sliders()[index].dispatchEvent(new Event("change"));
      await fixture.whenStable();
    }

    function stored(): Partial<SettingsMap> {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);

      return raw ? (JSON.parse(raw) as Partial<SettingsMap>) : {};
    }

    return {fixture, store, host, sliders, labels, values, drag, release, stored};
  }


  it("shows the three axes the draft draws, in its order", async () => {
    const {labels} = await controls();

    expect(labels()).toEqual(["SIZE", "WEIGHT", "LEADING"]);
  });


  it("stands at the settings the store holds", async () => {
    const {sliders} = await controls({fontSize: 21, fontWeight: 600, lineHeight: 1.45});

    expect(sliders().map(input => input.value)).toEqual(["21", "600", "1.45"]);
  });


  it("writes each value with the unit the eye gets, so speech carries it too", async () => {
    const {values} = await controls({fontSize: 21, fontWeight: 600, lineHeight: 1.45});

    expect(values()).toEqual(["21px", "600", "1.45"]);
  });


  it("steps the weight over the rows the lookup table has", async () => {
    // A weight of 437 has no row in `apcaLookup` to be rated against, so the
    // control may not produce one.
    const {sliders} = await controls();
    const weight = sliders()[1];

    expect(weight.min).toBe("300");
    expect(weight.max).toBe("700");
    expect(weight.step).toBe("100");
  });


  it("moves the settings in the store while a slider is being dragged", async () => {
    // The preview follows the store, so a drag has to reach it per frame.
    const {store, drag} = await controls();

    await drag(0, 27);

    expect(store.typeSettings().fontSize).toBe(27);
  });


  it("does not persist while a drag is in progress", async () => {
    // `typeSettingsAdjusted` is deliberately outside `anyPersistableEvents$`:
    // a drag would otherwise serialize the whole settings map per frame.
    const {drag, stored} = await controls();

    localStorage.clear();
    await drag(2, 1.9);

    expect(stored().lineHeight).toBeUndefined();
  });


  it("persists the value the gesture ends on", async () => {
    const {drag, release, stored} = await controls();

    localStorage.clear();
    await drag(2, 1.85);
    await drag(2, 1.9);
    await release(2);

    expect(stored().lineHeight).toBe(1.9);
  });


  it("leaves the two axes a drag does not touch where they were", async () => {
    const {store, drag} = await controls({fontSize: 21, fontWeight: 600, lineHeight: 1.45});

    await drag(1, 300);

    expect(store.typeSettings()).toEqual({fontSize: 21, fontWeight: 300, lineHeight: 1.45});
  });

});
