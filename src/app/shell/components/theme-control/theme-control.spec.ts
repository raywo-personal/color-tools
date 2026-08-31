import {TestBed} from "@angular/core/testing";
import {provideZonelessChangeDetection} from "@angular/core";
import {beforeEach, describe, expect, it} from "vitest";
import {ThemeControl} from "@shell/components/theme-control/theme-control";
import {AppStateStore} from "@core/app-state.store";


describe("ThemeControl", () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()]
    });
  });


  async function control() {
    const fixture = TestBed.createComponent(ThemeControl);
    await fixture.whenStable();

    const buttons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll("button")
    );

    return {fixture, buttons};
  }


  it("offers all three theme states, system among them", async () => {
    const {buttons} = await control();

    expect(buttons.map(button => button.textContent?.trim())).toEqual(["AUTO", "LIGHT", "DARK"]);
  });


  it("dispatches the state that was clicked", async () => {
    const store = TestBed.inject(AppStateStore);
    const {fixture, buttons} = await control();

    buttons[2].click();
    await fixture.whenStable();

    expect(store.colorTheme()).toBe("dark");
  });


  it("presses the button of the stored state", async () => {
    const {fixture, buttons} = await control();

    buttons[1].click();
    await fixture.whenStable();

    expect(buttons.map(button => button.getAttribute("aria-pressed")))
      .toEqual(["false", "true", "false"]);
  });

});
