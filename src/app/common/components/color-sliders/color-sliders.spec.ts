import {Component, provideZonelessChangeDetection, signal} from "@angular/core";
import {TestBed} from "@angular/core/testing";
import {beforeEach, describe, expect, it} from "vitest";
import chroma, {Color} from "chroma-js";
import {maxChroma} from "@engine/color/oklch.helper";
import {ColorSliders} from "@common/components/color-sliders/color-sliders";


/**
 * A host of the kind the panel is built for: it hands the colour in and writes
 * back what a drag hands out.
 *
 * The write-back is what both real hosts do through the store, and the panel's
 * kept HSL and OKLch values are only honest against a colour that comes back -
 * a host that swallowed the adjustment would be testing a panel nobody has.
 */
@Component({
  imports: [ColorSliders],
  template: `
    <ct-color-sliders [color]="color()"
                      [subject]="subject()"
                      [caption]="caption()"
                      (colorAdjusted)="adjust($event)"
                      (commit)="commit()"/>
  `
})
class TestHost {

  readonly color = signal<Color>(chroma("#3366CC"));
  readonly caption = signal("PLAY");

  /** Whose colour the host is handing in - the Studio would pass nothing. */
  readonly subject = signal<unknown>(undefined);

  /** Every colour the panel handed out, in order. */
  readonly adjustments: Color[] = [];

  /** The colour standing when each gesture ended. */
  readonly commits: Color[] = [];


  adjust(color: Color): void {
    this.adjustments.push(color);
    this.color.set(color);
  }


  commit(): void {
    this.commits.push(this.color());
  }

}


describe("ColorSliders", () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()]
    });
  });


  async function panel(start = "#3366CC") {
    const fixture = TestBed.createComponent(TestHost);
    const host = fixture.componentInstance;

    host.color.set(chroma(start));
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;

    function sliders(): HTMLInputElement[] {
      return Array.from(element.querySelectorAll("input[type=range]"));
    }

    function labels(): string[] {
      return Array.from(element.querySelectorAll("label"))
        .map(label => label.textContent?.trim() ?? "");
    }

    function switchButtons(): HTMLButtonElement[] {
      return Array.from(element.querySelectorAll("[role=group] button"));
    }

    function caption(): string {
      return element.querySelector("p")?.textContent?.trim() ?? "";
    }

    async function select(label: string) {
      const button = switchButtons()
        .find(candidate => candidate.textContent?.trim() === label);

      button?.click();
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

    /** The colour the host is holding - what a real host would have stored. */
    function color(): Color {
      return host.color();
    }

    return {
      fixture, host, element, sliders, labels, switchButtons, caption,
      select, drag, release, color
    };
  }


  /** How many different colors a slider's track gradient passes through. */
  function distinctStops(input: HTMLInputElement): number {
    const gradient = input.style.getPropertyValue("--ct-track-image");
    const stops = gradient.match(/#[0-9a-f]{6}/gi) ?? [];

    return new Set(stops.map(stop => stop.toLowerCase())).size;
  }


  describe("the caption", () => {

    it("is the Studio's PLAY unless the host says otherwise", async () => {
      const {caption} = await panel();

      expect(caption()).toBe("PLAY");
    });


    it("is whatever the host names it", async () => {
      // What pays for a host whose colour is one of several: the sliders name
      // their axes and never their subject.
      const {fixture, host, caption} = await panel();

      host.caption.set("ADJUST BACKGROUND");
      await fixture.whenStable();

      expect(caption()).toBe("ADJUST BACKGROUND");
    });

  });


  describe("the switch", () => {

    it("starts on HSL and shows that space's three axes", async () => {
      const {labels} = await panel();

      expect(labels()).toEqual(["HUE", "SATURATION", "LIGHTNESS"]);
    });


    it("shows the OKLch axes once it is switched", async () => {
      const {labels, select} = await panel();

      await select("OKLCH");

      expect(labels()).toEqual(["LIGHTNESS", "CHROMA", "HUE"]);
    });


    it("says which space is selected other than by colour", async () => {
      const {switchButtons, select} = await panel();

      const pressed = () => switchButtons()
        .map(button => button.getAttribute("aria-pressed"));

      expect(pressed()).toEqual(["true", "false"]);

      await select("OKLCH");

      expect(pressed()).toEqual(["false", "true"]);
    });


    it("is the panel's own view state and hands the host nothing", async () => {
      // The space is not a colour change, and the store's `displayColorSpace`
      // is not what it steers - `studio.spec.ts` pins that half against the
      // store the panel no longer reaches.
      const {host, select} = await panel();

      await select("OKLCH");

      expect(host.adjustments).toEqual([]);
      expect(host.commits).toEqual([]);
    });

  });


  describe("editing", () => {

    it("shows the colour it was handed", async () => {
      const {sliders} = await panel("#3366CC");

      const [hue, saturation, lightness] = chroma("#3366CC").hsl();

      expect(sliders().map(input => Number(input.value))).toEqual([
        Math.round(hue),
        Math.round(saturation * 100),
        Math.round(lightness * 100)
      ]);
    });


    it("hands out a colour per frame while the slider is still being dragged", async () => {
      const {host, drag} = await panel("#3366CC");

      await drag(0, 0);
      await drag(0, 10);

      expect(host.adjustments.length).toBe(2);
      expect(host.adjustments[1].hsl()[0]).toBeCloseTo(10, 0);
    });


    it("raises commit at the end of a gesture, and not during it", async () => {
      const {host, drag, release} = await panel("#3366CC");

      await drag(0, 100);
      await drag(0, 101);

      expect(host.commits).toEqual([]);

      await release(0);

      expect(host.commits.length).toBe(1);
      expect(host.commits[0].hsl()[0]).toBeCloseTo(101, 0);
    });


    it("edits in OKLch too, and the colour it hands out agrees with the sliders", async () => {
      const {color, select, drag} = await panel("#3366CC");

      await select("OKLCH");
      await drag(2, 30);

      const [, , hue] = color().oklch();

      expect(hue).toBeCloseTo(30, 0);
    });


    it("keeps hue and saturation across a lightness of zero", async () => {
      // Black carries neither, so a panel re-reading the color would hand back
      // a grey when the visitor pulls lightness up again - a different color
      // than the one they started from.
      const {color, sliders, drag} = await panel("#3366CC");

      await drag(2, 0);

      expect(color().hex("rgb")).toBe("#000000");

      await drag(2, 40);

      expect(sliders().map(input => Number(input.value))).toEqual([220, 60, 40]);
      expect(color().hex("rgb")).toBe(chroma.hsl(220, 0.6, 0.4).hex("rgb"));
    });


    it("keeps the chroma across a lightness of zero", async () => {
      // The OKLch counterpart of the test above. The chroma a lightness cannot
      // hold is shown clamped, not stored clamped: at either end of the
      // lightness axis the gamut holds none at any hue, so storing it would
      // leave the visitor with a grey as soon as they came back.
      const {color, sliders, select, drag} = await panel("#3366CC");

      await select("OKLCH");

      const [lightness, chromacity] = [Number(sliders()[0].value), Number(sliders()[1].value)];

      await drag(0, 0);

      expect(color().hex("rgb")).toBe("#000000");

      await drag(0, lightness);

      expect(Number(sliders()[1].value)).toBeCloseTo(chromacity, 3);
      expect(color().oklch()[1]).toBeCloseTo(chromacity, 3);
    });


    it("stands at 0 for a grey, the hue the app writes for one", async () => {
      // chroma-js reports NaN for the hue of a grey. A slider cannot stand at
      // NaN, and the conversion list writes 0 for the same color.
      const {sliders, select} = await panel("#808080");

      expect(sliders().map(input => Number(input.value))).toEqual([0, 0, 50]);

      await select("OKLCH");

      expect(Number(sliders()[2].value)).toBe(0);
    });


    it("still shows the hues on a grey's hue track, in either space", async () => {
      // Drawn at the grey's own saturation or chroma, every stop would be the
      // same grey and the control would read as dead. The ramp is drawn at a
      // floor instead, so it shows what the hues would be with some color.
      const {sliders, select} = await panel("#808080");

      expect(distinctStops(sliders()[0])).toBeGreaterThan(1);

      await select("OKLCH");

      expect(distinctStops(sliders()[2])).toBeGreaterThan(1);
    });


    it("gives the kept values up when the subject changes under the same bytes", async () => {
      // Contrast & Type hands in one half of the pair at a time, and two halves
      // that coincide arrive as the same three bytes - the comparison the
      // colour alone gets. Without the subject the panel would go on showing
      // the hue and saturation of the half it is no longer editing, neither of
      // which black carries.
      const {fixture, host, sliders, drag} = await panel("#3366CC");

      await drag(2, 0);

      expect(host.color().hex("rgb")).toBe("#000000");

      host.subject.set("text");
      host.color.set(chroma("#000000"));
      await fixture.whenStable();

      expect(sliders().map(input => Number(input.value))).toEqual([0, 0, 0]);

      await drag(2, 40);

      expect(host.color().hex("rgb")).toBe(chroma.hsl(0, 0, 0.4).hex("rgb"));
    });


    it("gives the kept chroma up on that same switch", async () => {
      // The OKLch half of it. The chroma reads 0 at either end of the lightness
      // axis whatever is kept, so what the switch has to be read off is the
      // colour the panel builds once lightness is back.
      const {fixture, host, select, drag} = await panel("#3366CC");

      await select("OKLCH");
      await drag(0, 0);

      host.subject.set("text");
      host.color.set(chroma("#000000"));
      await fixture.whenStable();

      await drag(0, 40);

      expect(host.color().oklch()[1]).toBeCloseTo(0, 3);
    });


    it("follows a colour that arrived from somewhere else", async () => {
      // A hex field, a picker, `Random` - and on Contrast & Type a switch to
      // the other half of the pair, which reaches the panel as exactly this.
      const {fixture, host, sliders} = await panel("#3366CC");

      host.color.set(chroma("#FF5733"));
      await fixture.whenStable();

      const [hue] = chroma("#FF5733").hsl();

      expect(Number(sliders()[0].value)).toBe(Math.round(hue));
    });

  });


  describe("the hue slider", () => {

    it("stops at the largest hue the app writes, in either space", async () => {
      // 360 and 0 are the same angle, and `formatColor()` writes the second of
      // them. A slider standing at 360° would read one angle while the
      // conversion list beside it read the other, for one and the same color.
      const {sliders, select, drag} = await panel("#3366CC");

      expect(sliders()[0].max).toBe("359");

      await drag(0, 359);

      expect(sliders()[0].value).toBe("359");

      await select("OKLCH");

      expect(sliders()[2].max).toBe("359");
    });

  });


  describe("the chroma slider", () => {

    it("takes its maximum from the gamut, not from a constant", async () => {
      const {sliders, select} = await panel("#3366CC");

      await select("OKLCH");

      // From the color itself, not from the rounded values the sliders show:
      // the color was built at its own lightness and hue, and that is where
      // the ceiling it sits under has to be read.
      const [lightness, , hue] = chroma("#3366CC").oklch();

      // Rounded down to the slider's step, so the ceiling is a value the
      // control can actually reach.
      const expected = Math.floor(maxChroma(lightness, hue) * 1000) / 1000;

      expect(Number(sliders()[1].max)).toBeCloseTo(expected, 3);
    });


    it("holds the chroma of a color that sits near a cusp of the gamut", async () => {
      // Near the sRGB cusps the ceiling falls steeply with hue - for this blue
      // from 0.302 at its own hue to 0.253 at the whole degree beside it. A
      // ceiling read at the rounded hue would have the slider claim less
      // chroma than the conversion list, and the first nudge of lightness
      // would rebuild the color under that lower ceiling.
      const {color, sliders, select, drag} = await panel("#000FF0");

      await select("OKLCH");

      const [lightness, chromacity] = chroma("#000FF0").oklch();

      expect(Number(sliders()[1].value)).toBeCloseTo(chromacity, 3);

      await drag(0, Math.round(lightness * 1000) / 10 + 0.1);

      expect(color().oklch()[1]).toBeCloseTo(chromacity, 2);
    });


    it("pulls chroma back in when a new lightness cannot hold it", async () => {
      const {sliders, select, drag} = await panel("#3366CC");

      await select("OKLCH");

      const ceiling = Number(sliders()[1].max);
      await drag(1, ceiling);

      // Near-black holds almost no chroma at any hue, so the value the visitor
      // set is no longer reachable. Leaving it standing would have the slider
      // claim a chroma the color does not have.
      await drag(0, 2);

      expect(Number(sliders()[1].value)).toBeLessThan(ceiling);
      expect(Number(sliders()[1].value)).toBeLessThanOrEqual(Number(sliders()[1].max));
    });

  });

});
