import {provideZonelessChangeDetection} from "@angular/core";
import {TestBed} from "@angular/core/testing";
import {beforeEach, describe, expect, it} from "vitest";
import {VERDICT_STATES, VerdictState} from "@contrast-type/models/element-verdict.model";
import {VerdictShape} from "@contrast-type/components/verdict-shape/verdict-shape";


describe("VerdictShape", () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()]
    });
  });


  async function shape(state: VerdictState) {
    const fixture = TestBed.createComponent(VerdictShape);
    fixture.componentRef.setInput("state", state);
    await fixture.whenStable();

    return (fixture.nativeElement as HTMLElement).querySelector("svg") as SVGElement;
  }


  it("gives each state a shape of its own, so a verdict is not told by colour", async () => {
    const markers = [];

    for (const state of VERDICT_STATES) {
      markers.push((await shape(state)).getAttribute("data-marker"));
    }

    expect(markers).toEqual(["tick", "arrow", "dash", "cross"]);
    expect(new Set(markers).size).toBe(VERDICT_STATES.length);
  });


  it("draws every shape as a stroke in the current colour", async () => {
    // A `✓` is set in whichever family the visitor picked, and a family
    // without the glyph renders a box. `currentColor` is what lets the caller
    // hand it a colour APCA chose.
    for (const state of VERDICT_STATES) {
      const drawn = await shape(state);

      expect(drawn.getAttribute("stroke"), state).toBe("currentColor");
      expect(drawn.getAttribute("fill"), state).toBe("none");
      expect(drawn.getAttribute("aria-hidden"), state).toBe("true");
      expect(drawn.querySelector("path")?.getAttribute("d"), state).toBeTruthy();
    }
  });

});
