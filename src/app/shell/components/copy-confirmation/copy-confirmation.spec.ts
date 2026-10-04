import {TestBed} from "@angular/core/testing";
import {provideZonelessChangeDetection, signal, WritableSignal} from "@angular/core";
import {beforeEach, describe, expect, it} from "vitest";
import {CopyOutcome, CopyService} from "@common/services/copy.service";
import {CopyConfirmation} from "./copy-confirmation";


describe("CopyConfirmation", () => {

  let confirmation: WritableSignal<CopyOutcome | null>;


  beforeEach(() => {
    confirmation = signal<CopyOutcome | null>(null);

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

    confirmation.set({message: "Copied #3366CC", failed: false});
    await fixture.whenStable();

    expect(toast()?.textContent?.trim()).toBe("Copied #3366CC");
  });


  it("is hidden from screen readers, because LiveAnnouncer already said it in better words", async () => {
    const {fixture, toast} = await render();

    confirmation.set({message: "Copied #3366CC", failed: false});
    await fixture.whenStable();

    expect(toast()?.getAttribute("aria-hidden")).toBe("true");
  });


  it("gets out of the way again", async () => {
    const {fixture, toast} = await render();

    confirmation.set({message: "Copied #3366CC", failed: false});
    await fixture.whenStable();

    confirmation.set(null);
    await fixture.whenStable();

    expect(toast()).toBeNull();
  });


  it("marks a failure by more than its color, which a greyscale screenshot loses", async () => {
    const {fixture, toast} = await render();

    confirmation.set({message: "Copied #3366CC", failed: false});
    await fixture.whenStable();

    expect(toast()?.querySelector("svg")).toBeNull();

    confirmation.set({message: "Could not copy #3366CC", failed: true});
    await fixture.whenStable();

    expect(toast()?.querySelector("svg")).not.toBeNull();
    expect(toast()?.textContent?.trim()).toBe("Could not copy #3366CC");
  });


  it("colors a failure in the danger pair and a success in the neutral one", async () => {
    const {fixture, toast} = await render();

    confirmation.set({message: "Copied #3366CC", failed: false});
    await fixture.whenStable();

    expect(toast()?.classList.contains("bg-text")).toBe(true);
    expect(toast()?.classList.contains("bg-danger")).toBe(false);

    confirmation.set({message: "Could not copy #3366CC", failed: true});
    await fixture.whenStable();

    expect(toast()?.classList.contains("bg-danger")).toBe(true);
    expect(toast()?.classList.contains("text-on-danger")).toBe(true);
    expect(toast()?.classList.contains("bg-text")).toBe(false);
  });


  it("sits at the top of the narrow column, so it does not cover the control the thumb just hit", async () => {
    const {fixture, toast} = await render();

    confirmation.set({message: "Copied #3366CC", failed: false});
    await fixture.whenStable();

    const classes = toast()?.classList;

    expect(classes?.contains("top-4")).toBe(true);
    expect(classes?.contains("sm:bottom-8")).toBe(true);
  });

});
