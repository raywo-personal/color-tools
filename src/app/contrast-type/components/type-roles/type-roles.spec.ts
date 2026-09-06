import {provideZonelessChangeDetection} from "@angular/core";
import {TestBed} from "@angular/core/testing";
import {Dispatcher} from "@ngrx/signals/events";
import {beforeEach, describe, expect, it} from "vitest";
import {AppStateStore} from "@core/app-state.store";
import {commonEvents} from "@core/common/common.events";
import {provideFakeLiveAnnouncer} from "@testing/live-announcer.fake";
import {provideSilentFontLoader} from "@testing/font-loader.fake";
import {TypeRoles} from "@contrast-type/components/type-roles/type-roles";


describe("TypeRoles", () => {

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        // Picking a face below raises an announcement and a font request.
        provideFakeLiveAnnouncer(),
        provideSilentFontLoader()
      ]
    });
  });


  async function segments() {
    const store = TestBed.inject(AppStateStore);
    const fixture = TestBed.createComponent(TypeRoles);
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;

    function buttons(): HTMLButtonElement[] {
      return Array.from(host.querySelectorAll("button"));
    }

    function captions(): string[] {
      return buttons().map(button => button.querySelector("span:not([aria-hidden])")?.textContent?.trim() ?? "");
    }

    /** The captions of the pressed segments - one, if the control is right. */
    function pressed(): string[] {
      return buttons()
        .filter(button => button.getAttribute("aria-pressed") === "true")
        .map(button => button.querySelector("span:not([aria-hidden])")?.textContent?.trim() ?? "");
    }

    async function press(caption: string) {
      buttons().find(button => button.textContent?.includes(caption))?.click();
      await fixture.whenStable();
    }

    return {fixture, store, host, buttons, captions, pressed, press};
  }


  it("shows the four roles in the order the issue names them", async () => {
    const {captions} = await segments();

    expect(captions()).toEqual(["DISPLAY", "BODY", "MONO", "UI"]);
  });


  it("presses the role the store holds, and only that one", async () => {
    // The inverted segment is the glance-readable answer to "which role am I
    // changing"; `aria-pressed` is the same answer for a screen reader.
    const {pressed} = await segments();

    expect(pressed()).toEqual(["BODY"]);
  });


  it("switches the role in the store when a segment is pressed", async () => {
    const {store, press, pressed} = await segments();

    await press("DISPLAY");

    expect(store.typeRole()).toBe("display");
    expect(pressed()).toEqual(["DISPLAY"]);
  });


  it("follows a role selected from elsewhere", async () => {
    const {fixture, pressed} = await segments();

    TestBed.inject(Dispatcher).dispatch(commonEvents.typeRoleSelected("ui"));
    await fixture.whenStable();

    expect(pressed()).toEqual(["UI"]);
  });


  it("keeps the specimen out of the button's name", async () => {
    // "Aa display" is not a name; the caption is.
    const {buttons} = await segments();

    for (const button of buttons()) {
      const specimen = button.querySelector("[aria-hidden=true]");

      expect(specimen?.textContent?.trim()).toBe("Aa");
    }
  });


  it("sets each specimen in the role's own face and weight", async () => {
    // The row doubles as a summary of what the four roles are set in.
    const {fixture, buttons} = await segments();

    TestBed.inject(Dispatcher).dispatch(commonEvents.fontSelected({
      role: "display",
      font: {family: "Source Serif 4", category: "serif", variant: "regular", weights: [400, 600, 700]}
    }));
    await fixture.whenStable();

    const specimen = (index: number) => buttons()[index].querySelector("[aria-hidden=true]") as HTMLElement;

    // The display default of 500 is not among the family's weights, and the
    // tie between 400 and 600 goes to the lighter one.
    expect(specimen(0).style.fontFamily).toBe('"Source Serif 4", serif');
    expect(specimen(0).style.fontWeight).toBe("400");
    expect(specimen(1).style.fontFamily).toBe("var(--font-sans)");
    expect(specimen(2).style.fontFamily).toBe("var(--font-mono)");
  });


  it("is a named group of buttons, so the row reads as one control", async () => {
    const {host} = await segments();
    const group = host.querySelector("[role=group]");

    expect(group?.getAttribute("aria-label")).toBe("Type role");
    expect(group?.querySelectorAll("button")).toHaveLength(4);
  });

});
