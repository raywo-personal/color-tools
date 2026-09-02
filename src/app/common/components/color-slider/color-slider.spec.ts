import {Component, provideZonelessChangeDetection, signal} from "@angular/core";
import {TestBed} from "@angular/core/testing";
import {beforeEach, describe, expect, it} from "vitest";
import {ColorSlider} from "@common/components/color-slider/color-slider";


@Component({
  imports: [ColorSlider],
  template: `
    <ct-color-slider label="HUE"
                     [min]="0"
                     [max]="360"
                     [step]="1"
                     [value]="value()"
                     [valueText]="valueText()"
                     track="linear-gradient(90deg, #000000, #FFFFFF)"
                     (valueChange)="onValueChange($event)"
                     (commit)="commits.set(commits() + 1)"/>
  `
})
class Host {

  readonly value = signal(210);
  readonly valueText = signal("210°");
  readonly commits = signal(0);


  onValueChange(value: number): void {
    this.value.set(value);
    this.valueText.set(`${value}°`);
  }

}


describe("ColorSlider", () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()]
    });
  });


  async function slider() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    const input = element.querySelector("input[type=range]") as HTMLInputElement;
    const label = element.querySelector("label") as HTMLLabelElement;

    async function drag(to: string) {
      input.value = to;
      input.dispatchEvent(new Event("input"));
      await fixture.whenStable();
    }

    async function release() {
      input.dispatchEvent(new Event("change"));
      await fixture.whenStable();
    }

    return {fixture, host: fixture.componentInstance, element, input, label, drag, release};
  }


  it("stands at the value it was given", async () => {
    const {input} = await slider();

    expect(input.value).toBe("210");
  });


  it("is a native range input, so the keyboard reaches it", async () => {
    const {input} = await slider();

    // The draft draws a div with a pointer handler. Arrow keys, Home and End
    // and the value in the accessibility tree all come with the element, so
    // this is the assertion that the control is operable at all.
    expect(input.type).toBe("range");
    expect(input.min).toBe("0");
    expect(input.max).toBe("360");
    expect(input.step).toBe("1");
  });


  it("is named by its own label, and carries the value with its unit", async () => {
    const {input, label} = await slider();

    expect(label.textContent?.trim()).toBe("HUE");
    expect(label.getAttribute("for")).toBe(input.id);

    // Without aria-valuetext a screen reader reads the bare number, which for
    // OKLch chroma is a 0.104 on a scale whose maximum moves.
    expect(input.getAttribute("aria-valuetext")).toBe("210°");
  });


  it("offsets its focus ring, because the track carries the visitor's color", async () => {
    const {input} = await slider();

    expect(Array.from(input.classList)
      .some(name => /(?:outline|ring)-offset-/.test(name))).toBe(true);
  });


  it("puts the track gradient where a utility class cannot reach", async () => {
    const {input} = await slider();

    // The gradient belongs on the track pseudo-element, and the custom property
    // is the only way in.
    expect(input.style.getPropertyValue("--ct-track-image"))
      .toBe("linear-gradient(90deg, #000000, #FFFFFF)");
  });


  it("reports every step of a drag, so the caller can follow it live", async () => {
    const {host, drag} = await slider();

    await drag("120");
    await drag("121");

    expect(host.value()).toBe(121);
  });


  it("reports the end of a gesture apart from the values it passed through", async () => {
    const {host, drag, release} = await slider();

    await drag("120");
    await drag("121");

    expect(host.commits(), "a drag in progress is not a commit").toBe(0);

    await release();

    expect(host.commits()).toBe(1);
  });


  it("shows the value text it was handed, not the raw number", async () => {
    const {element, drag} = await slider();

    await drag("42");

    expect(element.textContent).toContain("42°");
  });

});
