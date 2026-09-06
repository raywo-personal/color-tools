import {TestBed} from "@angular/core/testing";
import {provideZonelessChangeDetection} from "@angular/core";
import {Dispatcher} from "@ngrx/signals/events";
import {beforeEach, describe, expect, it} from "vitest";
import chroma, {Color} from "chroma-js";
import {AppStateStore} from "@core/app-state.store";
import {palettesEvents} from "@core/palettes/palettes.events";
import {PALETTE_SLOTS, Palette} from "@engine/palette/palette.model";
import {paletteColorFrom} from "@engine/palette/palette-color.model";
import {colorName} from "@engine/color/color-name.helper";
import {simulateVision} from "@engine/vision/simulate-vision.helper";
import {fakeLiveAnnouncer, provideFakeLiveAnnouncer} from "@testing/live-announcer.fake";
import {ColorVision} from "@contrast-type/components/color-vision/color-vision";


/**
 * A palette written out rather than generated: the generators draw their
 * jitter from a fresh seed, and a spec about what the block prints cannot
 * also be a lottery about which colors it prints it for.
 *
 * The first two sit on one deuteranopia confusion line and a quarter of the
 * Oklab space apart, so that row loses a difference and the other three do
 * not. `simulate-vision.helper.spec.ts` pins why.
 */
const COLORS: readonly Color[] = [
  chroma.oklch(0.62, 0.12, 0),
  chroma.oklch(0.62, 0.12, 170),
  chroma.oklch(0.30, 0.10, 250),
  chroma.oklch(0.85, 0.06, 90),
  chroma.oklch(0.45, 0.14, 300)
];

const ROWS = ["Normal", "Deuteranopia", "Protanopia", "Tritanopia", "Achromatopsia"];


function testPalette(): Palette {
  const [color0, color1, color2, color3, color4] = COLORS
    .map((color, index) => paletteColorFrom(color, PALETTE_SLOTS[index]));

  return {
    id: "colorvisionspec",
    name: "Spec palette",
    style: "triadic",
    color0, color1, color2, color3, color4
  };
}


describe("ColorVision", () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideFakeLiveAnnouncer()]
    });
  });


  async function block() {
    // The store registers its reducers when it is created, so a palette
    // dispatched before that is lost and the initial random one stands.
    TestBed.inject(AppStateStore);
    TestBed.inject(Dispatcher).dispatch(palettesEvents.paletteChangedWithoutNav(testPalette()));

    const fixture = TestBed.createComponent(ColorVision);
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const outer = host.querySelector("ul") as HTMLUListElement;
    const rows = Array.from(outer.children) as HTMLLIElement[];

    function row(caption: string) {
      const found = rows
        .find(candidate => candidate.querySelector("p")?.textContent?.trim() === caption);

      if (!found) throw new Error(`no row for ${caption}`);

      return found;
    }

    function chips(caption: string) {
      return Array.from(row(caption).querySelectorAll("li")) as HTMLLIElement[];
    }

    function swatchColors(caption: string) {
      return chips(caption)
        .map(chip => chroma(chip.style.backgroundColor).hex("rgb"));
    }

    function collapseLine(caption: string) {
      const paragraphs = Array.from(row(caption).querySelectorAll("p"));

      return paragraphs.length > 1 ? paragraphs[1].textContent?.trim() ?? null : null;
    }

    return {fixture, host, outer, rows, row, chips, swatchColors, collapseLine};
  }


  it("shows the five vision models in the order the block draws them", async () => {
    const {rows} = await block();

    expect(rows.map(entry => entry.querySelector("p")?.textContent?.trim())).toEqual(ROWS);
  });


  it("shows the palette unchanged under normal vision", async () => {
    const {swatchColors} = await block();

    expect(swatchColors("Normal"))
      .toEqual(COLORS.map(color => color.hex("rgb")));
  });


  it.each(ROWS.slice(1))("shows the palette as %s delivers it", async caption => {
    const {swatchColors} = await block();
    const vision = caption.toLowerCase() as "deuteranopia";

    expect(swatchColors(caption))
      .toEqual(COLORS.map(color => simulateVision(color, vision).hex("rgb")));
  });


  it("leaves the achromatopsia row without a hue", async () => {
    const {chips} = await block();

    for (const chip of chips("Achromatopsia")) {
      const [r, g, b] = chroma(chip.style.backgroundColor).rgb();

      expect(g).toBe(r);
      expect(b).toBe(r);
    }
  });


  describe("the names the chips carry", () => {

    it("says which member a chip stands for and what color it is", async () => {
      const {chips} = await block();

      expect(chips("Normal").map(chip => chip.textContent?.trim()))
        .toEqual([
          `BASE, ${colorName(COLORS[0])}`,
          `+120, ${colorName(COLORS[1])}`,
          `+240, ${colorName(COLORS[2])}`,
          `BASE LT, ${colorName(COLORS[3])}`,
          `+120 LT, ${colorName(COLORS[4])}`
        ]);
    });


    it("adds the color a member becomes on a deficiency row", async () => {
      // The row's own name says which deficiency, not which color turned into
      // which - that is what the chip has to say for itself.
      const {chips} = await block();
      const becomes = colorName(simulateVision(COLORS[0], "deuteranopia"));

      expect(chips("Deuteranopia")[0].textContent?.trim())
        .toBe(`BASE, ${colorName(COLORS[0])} appears as ${becomes}`);
    });

  });


  describe("the collapse under a row", () => {

    it("names the members the deficiency can no longer tell apart", async () => {
      const {collapseLine} = await block();

      expect(collapseLine("Deuteranopia"))
        .toBe(`${colorName(COLORS[0])} and ${colorName(COLORS[1])} become the same color.`);
    });


    it("stays silent where nothing was lost", async () => {
      const {collapseLine} = await block();

      for (const caption of ["Normal", "Protanopia", "Tritanopia", "Achromatopsia"]) {
        expect(collapseLine(caption)).toBeNull();
      }
    });

  });


  describe("what makes twenty-five colored blocks readable", () => {

    it("carries the list role on the block and on every row", async () => {
      // Preflight removes the marker, and Safari with VoiceOver then stops
      // treating the element as a list.
      const {outer, row} = await block();

      expect(outer.getAttribute("role")).toBe("list");
      expect(outer.getAttribute("aria-label")).toBe("Color vision");

      for (const caption of ROWS) {
        const inner = row(caption).querySelector("ul") as HTMLUListElement;

        expect(inner.getAttribute("role")).toBe("list");
        expect(inner.getAttribute("aria-label")).toBe(caption);
      }
    });


    it("gives every one of the twenty-five chips a name", async () => {
      const {rows} = await block();
      const names = rows
        .flatMap(entry => Array.from(entry.querySelectorAll("li")))
        .map(chip => chip.textContent?.trim());

      expect(names.length).toBe(25);
      expect(names.every(name => (name?.length ?? 0) > 0)).toBe(true);
    });


    it("holds no control, so it announces nothing", async () => {
      // Nothing here is operated: the block reads the palette and the palette
      // is changed elsewhere, where the change is already announced.
      const announcer = fakeLiveAnnouncer();
      const {host} = await block();

      expect(host.querySelectorAll("button, a, input, [tabindex]").length).toBe(0);
      expect(announcer.announcements).toEqual([]);
    });

  });

});
