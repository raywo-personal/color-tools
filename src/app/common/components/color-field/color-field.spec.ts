import {Component, provideZonelessChangeDetection, signal} from "@angular/core";
import {TestBed} from "@angular/core/testing";
import {beforeEach, describe, expect, it} from "vitest";
import chroma, {Color} from "chroma-js";
import {colorName} from "@common/helpers/color-name.helper";
import {fakeLiveAnnouncer, provideFakeLiveAnnouncer} from "@testing/live-announcer.fake";
import {ColorField} from "@common/components/color-field/color-field";


@Component({
  imports: [ColorField],
  template: `
    <ct-color-field [label]="label()"
                    [color]="color()"
                    (colorChange)="onColorChange($event)">
      <button type="button">BASE</button>
    </ct-color-field>
  `
})
class Host {

  readonly label = signal("");
  readonly color = signal<Color>(chroma("#3366CC"));
  readonly emitted = signal<Color[]>([]);

  /**
   * Writes the color back, the way the screens do through the store. The field
   * has to normalise without it as well - see the last case below.
   */
  onColorChange(color: Color): void {
    this.emitted.update(colors => [...colors, color]);
    this.color.set(color);
  }

}


describe("ColorField", () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideFakeLiveAnnouncer()]
    });
  });


  async function field(label = "") {
    const fixture = TestBed.createComponent(Host);
    const host = fixture.componentInstance;

    host.label.set(label);
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    const picker = element.querySelector("input[type=color]") as HTMLInputElement;
    const input = element.querySelector("input[type=text]") as HTMLInputElement;

    async function type(value: string) {
      input.value = value;
      input.dispatchEvent(new Event("input"));
      await fixture.whenStable();
    }

    async function blur() {
      input.dispatchEvent(new Event("blur"));
      await fixture.whenStable();
    }

    async function pressEnter() {
      input.dispatchEvent(new KeyboardEvent("keydown", {key: "Enter"}));
      await fixture.whenStable();
    }

    return {fixture, host, element, picker, input, type, blur, pressEnter};
  }


  describe("the value field", () => {

    it("shows the color it was given", async () => {
      const {input} = await field();

      expect(input.value).toBe("#3366CC");
    });


    it("emits on blur", async () => {
      const {host, type, blur} = await field();

      await type("#FF5733");
      await blur();

      expect(host.color().hex("rgb")).toBe("#ff5733");
    });


    it("emits on Enter, without waiting for the field to lose focus", async () => {
      const {host, type, pressEnter} = await field();

      await type("#FF5733");
      await pressEnter();

      expect(host.color().hex("rgb")).toBe("#ff5733");
    });


    it("takes any format the conversion list writes, not only hex", async () => {
      const {host, type, blur} = await field();

      await type("oklch(68.0% 0.210 34)");
      await blur();

      expect(chroma.deltaE(host.color(), chroma("#ff5733"))).toBeLessThan(2);
    });


    it("rejects what is not a color and keeps the color that is current", async () => {
      const {host, type, blur} = await field();

      await type("not a color");
      await blur();

      expect(host.emitted()).toEqual([]);
      expect(host.color().hex("rgb")).toBe("#3366cc");
    });


    it("puts the current value back rather than leaving the field wiped", async () => {
      const {input, type, blur} = await field();

      await type("");
      await blur();

      expect(input.value).toBe("#3366CC");
    });


    it("announces the rejection, because nothing moved and nothing was said", async () => {
      const announcer = fakeLiveAnnouncer();
      const {host, type, pressEnter} = await field();

      await type("#GGHHII");
      await pressEnter();

      // Assertive, and by name: the visitor is still in the field, and a hex
      // code is read out one character at a time.
      expect(announcer.last).toEqual({
        message: `Not a color. Keeping ${colorName(host.color())}`,
        politeness: "assertive"
      });
    });


    it("says which field rejected the value, because a blur is spoken after the focus left", async () => {
      // Without the caption the message names only the color, and on a screen
      // with two fields the visitor hears it standing on whatever they clicked
      // next - a palette chip's answer, by the sound of it.
      const announcer = fakeLiveAnnouncer();
      const {host, type, blur} = await field("TEXT");

      await type("#GGHHII");
      await blur();

      expect(announcer.last).toEqual({
        message: `TEXT: Not a color. Keeping ${colorName(host.color())}`,
        politeness: "assertive"
      });
    });


    it("normalises the spelling of a value that parses to the color already set", async () => {
      const {input, type, blur} = await field();

      await type("rgb(51 102 204)");
      await blur();

      expect(input.value).toBe("#3366CC");
    });


    it("normalises even where the caller writes nothing back", async () => {
      // The screens dispatch and let the store answer, and a store may hold a
      // color the event did not change. The field must not be left showing the
      // visitor's spelling of it.
      const {host, picker, input, type, blur} = await field();

      host.onColorChange = () => undefined;

      await type("rgb(51 102 204)");
      await blur();

      expect(input.value).toBe("#3366CC");
      expect(picker.value.toLowerCase()).toBe("#3366cc");
    });

  });


  describe("the picker", () => {

    it("shows the color it was given", async () => {
      const {picker} = await field();

      // Case-insensitively: the native control normalises its value to lower
      // case in a browser, and the DOM implementation the tests run on need
      // not do the same.
      expect(picker.value.toLowerCase()).toBe("#3366cc");
    });


    it("emits on change, so a drag through the native picker is one update", async () => {
      const {fixture, host, picker} = await field();

      picker.value = "#ff5733";
      picker.dispatchEvent(new Event("input"));
      await fixture.whenStable();

      expect(host.emitted(), "an input event alone must not be emitted").toEqual([]);

      picker.dispatchEvent(new Event("change"));
      await fixture.whenStable();

      expect(host.color().hex("rgb")).toBe("#ff5733");
    });


    it("follows a color that arrived from elsewhere", async () => {
      const {fixture, host, picker, input} = await field();

      host.color.set(chroma("#FF5733"));
      await fixture.whenStable();

      expect(picker.value.toLowerCase()).toBe("#ff5733");
      expect(input.value).toBe("#FF5733");
    });

  });


  describe("the label", () => {

    it("names the field itself, so the caption on screen is not doubled", async () => {
      const {element, input} = await field("TEXT");
      const label = element.querySelector("label") as HTMLLabelElement;

      expect(label.textContent?.trim()).toBe("TEXT");
      expect(label.getAttribute("for")).toBe(input.id);
      expect(input.getAttribute("aria-label")).toBeNull();
    });


    it("names the picker from the caption, which labels no control of its own", async () => {
      const {picker} = await field("BACKGROUND");

      expect(picker.getAttribute("aria-label")).toBe("Pick the background color");
    });


    it("falls back to generic names where a screen has only one field", async () => {
      const {element, picker, input} = await field();

      expect(element.querySelector("label")).toBeNull();
      expect(input.getAttribute("aria-label")).toBe("Color value");
      expect(picker.getAttribute("aria-label")).toBe("Pick a color");
    });

  });


  it("projects the trailing button beside the two controls", async () => {
    const {element} = await field();
    const projected = element.querySelector("button");

    expect(projected?.textContent?.trim()).toBe("BASE");
  });

});
