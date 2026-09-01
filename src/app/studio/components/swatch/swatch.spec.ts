import {TestBed} from "@angular/core/testing";
import {provideZonelessChangeDetection} from "@angular/core";
import {Dispatcher} from "@ngrx/signals/events";
import {beforeEach, describe, expect, it} from "vitest";
import chroma, {Color} from "chroma-js";
import {converterEvents} from "@core/converter/converter.events";
import {colorName} from "@common/helpers/color-name.helper";
import {expectApcaForeground} from "@testing/apca-foreground.expectation";
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
    // The property the rule is about, over the whole RGB cube: of the two
    // candidates, the one APCA puts further from the background wins - which is
    // what a neutral token can never promise against a color the visitor
    // picked. `expectApcaForeground` owns the sweep and the assertion, so the
    // next piece of chrome on a visitor color asserts the same thing.
    const {show} = await swatch();

    await expectApcaForeground(async background =>
      (await show(background)).label.style.color);
  });

});
