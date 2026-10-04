import {provideZonelessChangeDetection} from "@angular/core";
import {TestBed} from "@angular/core/testing";
import {Dispatcher} from "@ngrx/signals/events";
import chroma from "chroma-js";
import {beforeEach, describe, expect, it} from "vitest";
import {AppStateStore} from "@core/app-state.store";
import {contrastEvents} from "@core/contrast/contrast.events";
import {createContrastColors} from "@engine/contrast/contrast-colors.model";
import {TypeRole} from "@engine/contrast/type-role.model";
import {SelectedFont} from "@common/models/google-font.model";
import {commonEvents} from "@core/common/common.events";
import {palettesEvents} from "@core/palettes/palettes.events";
import {paletteColorFrom} from "@engine/palette/palette-color.model";
import {PaletteSlot} from "@engine/palette/palette.model";
import {ChipSource} from "@contrast-type/models/chip-source.model";
import {SAMPLE_ELEMENTS, SamplePlacement} from "@contrast-type/models/sample-page.model";
import {PageVerdicts} from "@contrast-type/components/page-verdicts/page-verdicts";
import {fakeLiveAnnouncer, provideFakeLiveAnnouncer} from "@testing/live-announcer.fake";
import {provideSilentFontLoader} from "@testing/font-loader.fake";


const DARK_ON_LIGHT = createContrastColors(chroma("#000000"), chroma("#ffffff"));
const IDENTICAL = createContrastColors(chroma("#334455"), chroma("#334455"));


describe("PageVerdicts", () => {

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideFakeLiveAnnouncer(),
        // Picking a face raises a font request as well as a sentence.
        provideSilentFontLoader()
      ]
    });
  });


  async function verdicts(colors = DARK_ON_LIGHT) {
    // The store registers its reducers when it is created, so an event
    // dispatched before that is lost and the initial state stands.
    TestBed.inject(AppStateStore);

    const dispatcher = TestBed.inject(Dispatcher);
    dispatcher.dispatch(contrastEvents.contrastColorsChangedWithoutNav(colors));

    const fixture = TestBed.createComponent(PageVerdicts);
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;

    /** One shape, one number and one word per state. */
    function counts() {
      return Array.from(host.querySelectorAll("li")).map(entry => {
        const spans = entry.querySelectorAll("span");

        return {
          marker: entry.querySelector("[data-marker]")?.getAttribute("data-marker") ?? "",
          count: Number(spans[0]?.textContent?.trim()),
          word: spans[1]?.textContent?.trim() ?? ""
        };
      });
    }

    async function setPair(next: typeof colors) {
      dispatcher.dispatch(contrastEvents.contrastColorsChangedWithoutNav(next));
      await fixture.whenStable();
    }

    /** Puts a known colour in a slot, so a placement's outcome is decided. */
    async function setSlot(slot: PaletteSlot, hex: string) {
      dispatcher.dispatch(
        palettesEvents.updatePaletteColor(paletteColorFrom(chroma(hex), slot))
      );
      await fixture.whenStable();
    }

    async function place(elementKey: string,
                         source: ChipSource,
                         side: SamplePlacement = "ink") {
      dispatcher.dispatch(contrastEvents.colorPlaced({elementKey, side, source}));
      await fixture.whenStable();
    }

    /** Picks a face for a role, which snaps that role's weight to what it ships. */
    async function pickFace(role: TypeRole, font: SelectedFont) {
      dispatcher.dispatch(commonEvents.fontSelected({role, font}));
      await fixture.whenStable();
    }

    return {fixture, host, counts, setPair, setSlot, place, pickFace};
  }


  it("counts every element of the page into one of the four states", async () => {
    // The tally is the count of the marks beside the preview, so it has to
    // add up to the page - a state left out of the row would hide elements.
    const {counts} = await verdicts();
    const tally = counts();

    expect(tally.map(entry => entry.marker)).toEqual(["tick", "arrow", "dash", "cross"]);
    expect(tally.reduce((total, entry) => total + entry.count, 0))
      .toBe(SAMPLE_ELEMENTS.length);
  });


  it("keeps a word beside every shape", async () => {
    // A tick and a cross can be guessed off a page, an arrow cannot, and this
    // is the one place all four stand together. Laying the four out in a row
    // shortened the block; dropping the words would have shortened it further
    // and left the shapes unreadable.
    const {counts} = await verdicts();

    expect(counts().map(entry => entry.word))
      .toEqual(["pass", "larger size needed", "not rated", "fail"]);
  });


  it("lays the four out as a wrapping row, not as a column", async () => {
    // Stacked, the four rows pushed the type controls below the fold on a
    // laptop, and the sliders are what a visitor reaches for next.
    const {host} = await verdicts();
    const list = host.querySelector("ul") as HTMLElement;

    expect(list.className).toContain("flex");
    expect(list.className).toContain("flex-wrap");
    // Preflight strips the marker, and Safari with VoiceOver then stops
    // announcing the element as a list.
    expect(list.getAttribute("role")).toBe("list");
  });


  it("says nothing about the tally the visitor arrived at", async () => {
    // The opening state is not something that just happened.
    const {fixture} = await verdicts();

    await fixture.whenStable();

    expect(fakeLiveAnnouncer().announcements).toEqual([]);
  });


  it("announces the tally when it moves", async () => {
    // A colour change replaces every mark beside the preview without moving
    // focus, and no control says what came back.
    const {setPair, counts} = await verdicts(DARK_ON_LIGHT);
    const before = counts().map(entry => entry.count);

    await setPair(IDENTICAL);

    expect(counts().map(entry => entry.count)).not.toEqual(before);
    expect(fakeLiveAnnouncer().last?.politeness).toBe("polite");
    expect(fakeLiveAnnouncer().last?.message).toContain("On the page: ");
    expect(fakeLiveAnnouncer().last?.message).toContain("larger size needed");
  });


  it("does not repeat a tally that stood still", async () => {
    // The Lc moves on every frame of a drag while the tally usually does not,
    // which is what makes the tally announceable at all.
    const {setPair} = await verdicts(DARK_ON_LIGHT);

    await setPair(IDENTICAL);

    const spoken = fakeLiveAnnouncer().announcements.length;

    await setPair(IDENTICAL);

    expect(fakeLiveAnnouncer().announcements).toHaveLength(spoken);
  });


  it("gives way to the sentence of the gesture that moved it", async () => {
    // Both are about the same change, and `LiveAnnouncer` would delete the
    // first of the two - so the visitor hears what they did, not the count
    // that followed from it. `AnnouncementService` is what decides.
    const {counts, setSlot, place} = await verdicts(DARK_ON_LIGHT);

    // White in a slot the roles do not read, then that slot on the body text:
    // white on white is Lc 0, so the tally has to move.
    await setSlot("color4", "#ffffff");

    const before = counts().map(entry => entry.count);
    const spokenBefore = fakeLiveAnnouncer().announcements.length;

    await place("bodyText", "color4");

    expect(counts().map(entry => entry.count), "the tally stood still").not.toEqual(before);

    const since = fakeLiveAnnouncer().announcements.slice(spokenBefore);

    expect(since.map(spoken => spoken.message))
      .toEqual(["Body text takes white as its text color"]);
    expect(since.map(spoken => spoken.politeness)).toEqual(["polite"]);
  });


  it("still lets the next change be summarised after a gesture said nothing new", async () => {
    // The gesture's claim lasts one change. A placement that moves no verdict
    // must not cost the change after it its tally.
    const {counts, setSlot, place, setPair} = await verdicts(DARK_ON_LIGHT);

    await setSlot("color4", "#ffffff");

    const before = counts().map(entry => entry.count);

    // The eyebrow is set in the mono role at a size the table declines to
    // rate, so no colour moves its verdict.
    await place("eyebrow", "color4");

    expect(counts().map(entry => entry.count), "the eyebrow moved a verdict").toEqual(before);
    expect(fakeLiveAnnouncer().last?.message).toBe("Eyebrow takes white as its text color");

    await setPair(IDENTICAL);

    expect(fakeLiveAnnouncer().last?.message).toContain("On the page: ");
  });


  it("gives way to the face a visitor picked, on the screen they share", async () => {
    // The type controls sit beside this block, so the collision is not
    // hypothetical: a face that ships one weight takes the role's weight with
    // it, every element of that role is rated on a different row, and the
    // tally moves on the same event that names the face. The face is what the
    // visitor did; the tally is what followed.
    const {counts, pickFace} = await verdicts(DARK_ON_LIGHT);
    const before = counts().map(entry => entry.count);

    await pickFace("body", {
      family: "Lobster",
      category: "display",
      variant: "regular",
      weights: [700]
    });

    expect(counts().map(entry => entry.count), "the tally stood still").not.toEqual(before);

    const spoken = fakeLiveAnnouncer().announcements;

    expect(spoken.at(-1)?.message).toContain("Lobster");
    expect(spoken.map(entry => entry.message).filter(message => message.includes("On the page: ")))
      .toEqual([]);
  });


  it("puts nothing in a live region", async () => {
    // The tally moves on every colour change; a region would queue a sentence
    // per frame of a drag instead of speaking the one that landed.
    const {host} = await verdicts();

    expect(host.querySelector("[aria-live]")).toBeNull();
    expect(host.querySelector("[role=alert]")).toBeNull();
    expect(host.querySelector("[role=status]")).toBeNull();
  });

});
