import {provideZonelessChangeDetection} from "@angular/core";
import {TestBed} from "@angular/core/testing";
import {Dispatcher} from "@ngrx/signals/events";
import {beforeEach, describe, expect, it} from "vitest";
import {AppStateStore} from "@core/app-state.store";
import {commonEvents} from "@core/common/common.events";
import {LOCAL_STORAGE_KEY, SettingsMap} from "@common/models/local-storage.model";
import {DEFAULT_TYPE_SETTINGS, TypeSettings} from "@engine/contrast/type-settings.model";
import {SelectedFont} from "@common/models/google-font.model";
import {TypeControls} from "@contrast-type/components/type-controls/type-controls";
import {provideFakeGoogleFonts} from "@testing/google-fonts.fake";
import {fakeLiveAnnouncer, provideFakeLiveAnnouncer} from "@testing/live-announcer.fake";


/** A selection as the picker builds one, with the weights of a real family. */
function selection(family: string, weights: number[]): SelectedFont {
  return {family, category: "sans-serif", variant: "regular", weights};
}


describe("TypeControls", () => {

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideFakeGoogleFonts(),
        provideFakeLiveAnnouncer()
      ]
    });
  });


  async function controls(settings: TypeSettings = DEFAULT_TYPE_SETTINGS,
                          font: SelectedFont | null = null) {
    // The store registers its reducers when it is created, so an event
    // dispatched before that is lost and the initial settings stand.
    const store = TestBed.inject(AppStateStore);

    // The font first: picking one snaps the weight to what the family ships,
    // so the settings have to be written against the family already chosen.
    if (font) TestBed.inject(Dispatcher).dispatch(commonEvents.fontSelected(font));
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

    function weightSlider(): HTMLInputElement {
      return sliders()[1];
    }

    function weightNote(): string {
      const describedBy = weightSlider().getAttribute("aria-describedby");

      return describedBy
        ? host.querySelector(`#${describedBy}`)?.textContent?.trim() ?? ""
        : "";
    }

    async function pickFont(query: string) {
      const combobox = host.querySelector("input[role=combobox]") as HTMLInputElement;

      combobox.value = query;
      combobox.dispatchEvent(new Event("input"));
      await fixture.whenStable();

      combobox.dispatchEvent(new KeyboardEvent("keydown", {key: "Enter", bubbles: true}));
      await fixture.whenStable();
    }

    async function clearFont() {
      const clear = Array.from(host.querySelectorAll("button"))
        .find(button => button.textContent?.trim() === "CLEAR");

      clear?.click();
      await fixture.whenStable();
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

    return {
      fixture, store, host, sliders, labels, values, weightSlider, weightNote,
      pickFont, clearFont, drag, release, stored
    };
  }


  it("shows the four controls the draft draws, in its order", async () => {
    const {labels} = await controls();

    expect(labels()).toEqual(["TYPEFACE", "SIZE", "WEIGHT", "LEADING"]);
  });


  it("stands at the settings the store holds", async () => {
    // The weight slider counts rows of the weight grid, so 600 is the fourth
    // of 300, 400, 500, 600, 700.
    const {sliders} = await controls({fontSize: 21, fontWeight: 600, lineHeight: 1.45});

    expect(sliders().map(input => input.value)).toEqual(["21", "3", "1.45"]);
  });


  it("writes each value with the unit the eye gets, so speech carries it too", async () => {
    const {values} = await controls({fontSize: 21, fontWeight: 600, lineHeight: 1.45});

    expect(values()).toEqual(["21px", "600", "1.45"]);
  });


  it("steps the weight over the rows the lookup table has, while no family narrows them", async () => {
    // A weight of 437 has no row in `apcaLookup` to be rated against, so the
    // control may not produce one. The slider counts the five rows of the grid.
    const {weightSlider, values} = await controls();

    expect(weightSlider().min).toBe("0");
    expect(weightSlider().max).toBe("4");
    expect(weightSlider().step).toBe("1");
    expect(values()[1]).toBe("400");
  });


  it("steps the weight over the weights the chosen family actually ships", async () => {
    // A weight the family does not have is synthesised by the browser, and the
    // rating would then answer about a faux-bold nobody set.
    const {weightSlider} = await controls(
      DEFAULT_TYPE_SETTINGS,
      selection("Merriweather", [300, 400, 700, 900])
    );

    expect(weightSlider().max).toBe("2");
  });


  it("moves the weight onto a stop the family has when one is picked", async () => {
    const {store} = await controls(
      {...DEFAULT_TYPE_SETTINGS, fontWeight: 500},
      selection("Merriweather", [300, 400, 700, 900])
    );

    expect(store.typeSettings().fontWeight).toBe(400);
  });


  it("writes the weight, not the row, when the slider moves", async () => {
    const {store, drag} = await controls(
      DEFAULT_TYPE_SETTINGS,
      selection("Merriweather", [300, 400, 700, 900])
    );

    await drag(1, 2);

    expect(store.typeSettings().fontWeight).toBe(700);
  });


  it("says why the weight will not move on a family that ships one", async () => {
    // A disabled slider with nothing beside it is announced as "dimmed" and
    // leaves the reason on screen nowhere.
    const {weightSlider, weightNote} = await controls(
      DEFAULT_TYPE_SETTINGS,
      selection("Lobster", [400])
    );

    expect(weightSlider().disabled).toBe(true);
    expect(weightNote()).toContain("Lobster");
  });


  it("takes the typeface the picker reports into the store", async () => {
    const {store, pickFont} = await controls();

    await pickFont("merriweather");

    expect(store.selectedFont()?.family).toBe("Merriweather");
  });


  it("announces the family and the weight it leaves the visitor on", async () => {
    // Picking a family can move the WEIGHT slider on the other side of the
    // column, and nothing else says so.
    const {pickFont} = await controls({...DEFAULT_TYPE_SETTINGS, fontWeight: 500});

    await pickFont("merriweather");

    expect(fakeLiveAnnouncer().last).toEqual({
      message: "Merriweather, weight 400",
      politeness: "polite"
    });
  });


  it("says when the family it announces ships that one weight only", async () => {
    const {pickFont} = await controls();

    await pickFont("lobster");

    expect(fakeLiveAnnouncer().last?.message).toContain("the only weight it ships");
  });


  it("announces going back to the app's own type", async () => {
    const {pickFont, clearFont} = await controls();

    await pickFont("lobster");
    await clearFont();

    expect(fakeLiveAnnouncer().last?.message).toContain("app's own type");
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

    await drag(1, 0);

    expect(store.typeSettings()).toEqual({fontSize: 21, fontWeight: 300, lineHeight: 1.45});
  });

});
