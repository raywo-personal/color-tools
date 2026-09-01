import {TestBed} from "@angular/core/testing";
import {provideZonelessChangeDetection} from "@angular/core";
import {Dispatcher} from "@ngrx/signals/events";
import {beforeEach, describe, expect, it} from "vitest";
import chroma, {Color} from "chroma-js";
import {converterEvents} from "@core/converter/converter.events";
import {colorName} from "@common/helpers/color-name.helper";
import {calculateAPCAContrast} from "@contrast/helper/optimal-text-color.helper";
import {Swatch} from "@studio/components/swatch/swatch";


describe("Swatch", () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()]
    });
  });


  async function swatch() {
    const fixture = TestBed.createComponent(Swatch);
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const dispatcher = TestBed.inject(Dispatcher);

    async function show(color: Color) {
      dispatcher.dispatch(converterEvents.colorChanged(color));
      await fixture.whenStable();

      return {
        background: host.style.backgroundColor,
        label: host.querySelector("p") as HTMLParagraphElement
      };
    }

    return {fixture, show};
  }


  it("paints the current color", async () => {
    const {show} = await swatch();

    expect((await show(chroma("#3366CC"))).background).toBe("#3366cc");
  });


  it("names the color it shows, so the surface is not a bare block", async () => {
    const {show} = await swatch();
    const {label} = await show(chroma("#3366CC"));

    expect(label.textContent?.trim()).toBe(colorName(chroma("#3366CC")));
  });


  it("takes the foreground from APCA, not from a neutral token", async () => {
    // A deterministic sweep rather than a random draw, so a failure names the
    // same color twice. The assertion is the property the rule is about: of the
    // two candidates, the one APCA puts further from the background wins -
    // which is what a neutral token can never promise against a color the
    // visitor picked.
    const {show} = await swatch();

    for (let red = 0; red < 256; red += 51) {
      for (let green = 0; green < 256; green += 51) {
        for (let blue = 0; blue < 256; blue += 51) {
          const background = chroma(red, green, blue);
          const {label} = await show(background);

          const black = Math.abs(calculateAPCAContrast("#000000", background));
          const white = Math.abs(calculateAPCAContrast("#ffffff", background));
          const expected = black >= white ? "#000000" : "#ffffff";

          expect(label.style.color, `foreground on ${background.hex("rgb")}`)
            .toBe(expected);
        }
      }
    }
  });

});
