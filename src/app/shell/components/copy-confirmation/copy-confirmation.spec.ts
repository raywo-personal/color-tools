import {TestBed} from "@angular/core/testing";
import {provideZonelessChangeDetection, signal, WritableSignal} from "@angular/core";
import {beforeEach, describe, expect, it} from "vitest";
import {CopyService} from "@common/services/copy.service";
import {CopyConfirmation} from "./copy-confirmation";


describe("CopyConfirmation", () => {

  let confirmation: WritableSignal<string | null>;


  beforeEach(() => {
    confirmation = signal<string | null>(null);

    // The component renders one signal and nothing else. Driving it through
    // the real service would pull the clipboard, the announcer and a 1400 ms
    // timer into a test about markup - the service's own spec covers those.
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {provide: CopyService, useValue: {confirmation} as Partial<CopyService>}
      ]
    });
  });


  async function render() {
    const fixture = TestBed.createComponent(CopyConfirmation);
    await fixture.whenStable();

    return {
      fixture,
      toast: (): HTMLElement | null =>
        (fixture.nativeElement as HTMLElement).querySelector("p")
    };
  }


  it("shows nothing until something is copied", async () => {
    const {toast} = await render();

    expect(toast()).toBeNull();
  });


  it("shows what was copied", async () => {
    const {fixture, toast} = await render();

    confirmation.set("Copied #3366CC");
    await fixture.whenStable();

    expect(toast()?.textContent?.trim()).toBe("Copied #3366CC");
  });


  it("is hidden from screen readers, because LiveAnnouncer already said it in better words", async () => {
    const {fixture, toast} = await render();

    confirmation.set("Copied #3366CC");
    await fixture.whenStable();

    expect(toast()?.getAttribute("aria-hidden")).toBe("true");
  });


  it("gets out of the way again", async () => {
    const {fixture, toast} = await render();

    confirmation.set("Copied #3366CC");
    await fixture.whenStable();

    confirmation.set(null);
    await fixture.whenStable();

    expect(toast()).toBeNull();
  });


  it("sits at the top of the narrow column, so it does not cover the control the thumb just hit", async () => {
    const {fixture, toast} = await render();

    confirmation.set("Copied #3366CC");
    await fixture.whenStable();

    const classes = toast()?.classList;

    expect(classes?.contains("top-4")).toBe(true);
    expect(classes?.contains("sm:bottom-8")).toBe(true);
  });

});
