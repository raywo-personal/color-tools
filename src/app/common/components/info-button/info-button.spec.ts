import {Component, provideZonelessChangeDetection} from "@angular/core";
import {ComponentFixture, TestBed} from "@angular/core/testing";
import {afterEach, beforeEach, describe, expect, it} from "vitest";
import {InfoButton} from "@common/components/info-button/info-button";


const PROSE = "Everything else follows the pair above.";
const LABEL = "Where the page's default colors come from";


/** A caption row with an `i`, the way the two blocks that use it draw one. */
@Component({
  selector: "ct-info-button-host",
  imports: [InfoButton],
  // The prose is written out rather than interpolated: `${...}` in an inline
  // template is a JavaScript hole the template parser reads as Angular syntax,
  // and `pnpm lint` fails the whole run on it.
  template: `
    <p>PLACED COLORS</p>

    <ct-info-button [label]="label">
      <p data-prose>Everything else follows the pair above.</p>
    </ct-info-button>
  `
})
class InfoButtonHost {

  protected readonly label = LABEL;

}


describe("InfoButton", () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()]
    });
  });


  afterEach(() => {
    // The overlay renders into a container appended to the body, which outlives
    // the fixture unless the fixture is destroyed.
    document.querySelector(".cdk-overlay-container")?.remove();
  });


  async function info() {
    const fixture: ComponentFixture<InfoButtonHost> = TestBed.createComponent(InfoButtonHost);
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const button = host.querySelector("button") as HTMLButtonElement;

    /** The open panel, which renders into the CDK's container on the body. */
    function panel(): HTMLElement | null {
      return document.querySelector(".cdk-overlay-container [role=dialog]");
    }

    function prose(): string | null {
      return panel()?.querySelector("[data-prose]")?.textContent?.trim() ?? null;
    }

    async function press() {
      button.click();
      await fixture.whenStable();
    }

    return {fixture, host, button, panel, prose, press};
  }


  it("shows nothing until it is pressed, so the prose is out of the way", async () => {
    // The whole point of the button: the block's explanation is available and
    // not standing over the block.
    const {host, panel} = await info();

    expect(panel()).toBeNull();
    expect(host.textContent).not.toContain(PROSE);
  });


  it("opens the projected prose, and closes it again on a second press", async () => {
    const {prose, press, panel} = await info();

    await press();
    expect(prose()).toBe(PROSE);

    await press();
    expect(panel()).toBeNull();
  });


  it("shows the same prose on every reopening", async () => {
    // Content projected into an `ng-template` is created once and moved into
    // the view the template renders. If closing the panel cost the projected
    // nodes, the second opening would be an empty box - which is the failure
    // this pins.
    const {prose, press} = await info();

    await press();
    await press();
    await press();

    expect(prose()).toBe(PROSE);
  });


  it("names the button and the panel with the same sentence", async () => {
    // The button carries no visible text, so its name is free to say what
    // pressing it gives - and the panel needs that same sentence as its name,
    // because it is what a screen reader hears on arriving there.
    const {button, panel, press} = await info();

    expect(button.getAttribute("aria-label")).toBe(LABEL);

    await press();

    expect(panel()?.getAttribute("aria-label")).toBe(LABEL);
  });


  it("says whether it is open", async () => {
    const {button, press} = await info();

    expect(button.getAttribute("aria-expanded")).toBe("false");

    await press();

    expect(button.getAttribute("aria-expanded")).toBe("true");
  });


  it("takes focus into the panel, so a screen reader reaches the prose", async () => {
    // The sentence used to stand on the page, where a reader met it while
    // reading the block. Behind a button it is reachable only if pressing the
    // button takes the reader there: the panel renders at the end of the body,
    // nowhere near the caption row it belongs to.
    const {panel, press} = await info();

    await press();

    expect(panel()?.contains(document.activeElement)).toBe(true);
  });


  it("closes on Escape and hands focus back to the button", async () => {
    const {button, panel, press, fixture} = await info();

    await press();

    (document.activeElement as HTMLElement).dispatchEvent(
      new KeyboardEvent("keydown", {key: "Escape", bubbles: true}));
    await fixture.whenStable();

    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(button);
  });


  it("closes on a click outside it, without a backdrop to swallow that click", async () => {
    // No backdrop on purpose: a full-viewport backdrop element absorbs the
    // click meant for the next control, so closing one panel and opening the
    // next would cost a dead click.
    const {panel, press, fixture} = await info();

    await press();

    expect(document.querySelector(".cdk-overlay-backdrop")).toBeNull();

    document.body.click();
    await fixture.whenStable();

    expect(panel()).toBeNull();
  });


  it("pads the glyph out to the app's hit area, and hides it from speech", async () => {
    const {button} = await info();

    expect(Array.from(button.classList)).toEqual(expect.arrayContaining(["size-11"]));
    expect(button.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

});
