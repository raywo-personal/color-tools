import {provideZonelessChangeDetection} from "@angular/core";
import {TestBed} from "@angular/core/testing";
import {Dispatcher} from "@ngrx/signals/events";
import chroma from "chroma-js";
import {beforeEach, describe, expect, it} from "vitest";
import {AppStateStore} from "@core/app-state.store";
import {commonEvents} from "@core/common/common.events";
import {contrastEvents} from "@core/contrast/contrast.events";
import {createContrastColors} from "@engine/contrast/contrast-colors.model";
import {TypeRole} from "@engine/contrast/type-role.model";
import {ApcaRating} from "@contrast-type/components/apca-rating/apca-rating";


/**
 * The pairs the cases are built from.
 *
 * The headline and the body text are the pair's text on the pair's ground, so
 * with the display or the body role selected the figure is the pair's own Lc,
 * and a pair pins the figure exactly. `JUST_UNDER_75` sits one grey step
 * under body text's requirement at 18px/400. Colours are pinned here rather
 * than in each case because the requirements they are read against are
 * `apcaLookup`'s, not a generator's - see "Pin behaviour, not colours".
 */
const DARK_ON_LIGHT = createContrastColors(chroma("#000000"), chroma("#ffffff"));
const LIGHT_ON_DARK = createContrastColors(chroma("#ffffff"), chroma("#000000"));
const IDENTICAL = createContrastColors(chroma("#334455"), chroma("#334455"));

/** Lc 74.76, which a figure rounded to the nearest would write as 75. */
const JUST_UNDER_75 = createContrastColors(chroma("#6f6f6f"), chroma("#ffffff"));


describe("ApcaRating", () => {

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()]
    });
  });


  async function rating(colors = DARK_ON_LIGHT, role: TypeRole = "body") {
    // The store registers its reducers when it is created, so an event
    // dispatched before that is lost and the initial state stands.
    TestBed.inject(AppStateStore);

    const dispatcher = TestBed.inject(Dispatcher);
    dispatcher.dispatch(contrastEvents.contrastColorsChangedWithoutNav(colors));
    dispatcher.dispatch(commonEvents.typeRoleSelected(role));

    const fixture = TestBed.createComponent(ApcaRating);
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const paragraphs = () => Array.from(host.querySelectorAll("p"));

    function caption(): string {
      return paragraphs()[0].textContent?.trim() ?? "";
    }

    /** The unit and the figure. */
    function figureParts(): (string | undefined)[] {
      return Array.from(paragraphs()[1].querySelectorAll("span"))
        .map(span => span.textContent?.trim());
    }

    function row() {
      const spans = Array.from(paragraphs()[2].querySelectorAll("span"));

      return {
        caption: spans[0].textContent?.trim() ?? "",
        spec: spans[1].textContent?.trim() ?? "",
        verdict: spans[2].textContent?.trim() ?? "",
        marker: paragraphs()[2].querySelector("[data-marker]")?.getAttribute("data-marker") ?? "",
        /** Whether the spec and the verdict stand in `text`, whatever the row's colour. */
        carries: [spans[1], spans[2]].map(span => span.classList.contains("text-text"))
      };
    }

    function note(): string {
      return paragraphs()[3].textContent?.trim() ?? "";
    }

    function pairNote(): string {
      return paragraphs()[4].textContent?.trim() ?? "";
    }

    async function selectRole(next: TypeRole) {
      dispatcher.dispatch(commonEvents.typeRoleSelected(next));
      await fixture.whenStable();
    }

    return {fixture, host, caption, figureParts, row, note, pairNote, selectRole};
  }


  it("says which role the figure is about", async () => {
    const {caption, selectRole} = await rating();

    expect(caption()).toBe("BODY");

    await selectRole("ui");

    expect(caption()).toBe("UI");
  });


  it("writes the Lc without its sign, under the unit APCA leads with", async () => {
    // The verdict is reached through Math.abs(), so a minus on the hero
    // figure would suggest a deficit it never causes. The sign is a polarity,
    // and the footnote says it in words.
    const {figureParts} = await rating(LIGHT_ON_DARK, "display");

    expect(figureParts()).toEqual(["Lc", "107"]);
  });


  it("rounds the figure down, so it never heads a verdict it contradicts", async () => {
    // Rounded to the nearest, Lc 74.76 would read `Lc 75` over a row asking
    // for exactly that and marked a fail.
    const {figureParts, row} = await rating(JUST_UNDER_75, "body");

    expect(figureParts()).toEqual(["Lc", "74"]);
    expect(row().verdict).toBe("Needs Lc 75");
    expect(row().marker).toBe("cross");
  });


  it("names the element the figure reads, at its own size and the role's weight", async () => {
    const {row} = await rating(DARK_ON_LIGHT, "display");

    expect(row().caption).toBe("HEADLINE");
    expect(row().spec).toBe("44px / 500");
    expect(row().verdict).toBe("Pass");
    expect(row().marker).toBe("tick");
  });


  it("reads body text's figure off the running text, not off the small print", async () => {
    // The small print is set in the dim ink at 13px, which the table rates at
    // Lc 100 - a bar black on white does not clear. A figure reading the
    // role's weakest element failed whatever the pair was and said nothing.
    const {row, figureParts} = await rating(DARK_ON_LIGHT, "body");

    expect(row().caption).toBe("BODY TEXT");
    expect(row().spec).toBe("18px / 400");
    expect(row().verdict).toBe("Pass");
    expect(figureParts()).toEqual(["Lc", "106"]);
  });


  it("moves the figure with the role, so switching roles walks the page through its sizes", async () => {
    const {row, selectRole} = await rating(DARK_ON_LIGHT, "display");

    expect(row().spec).toBe("44px / 500");

    await selectRole("body");

    expect(row().caption).toBe("BODY TEXT");
    expect(row().spec).toBe("18px / 400");
  });


  it("calls a size the table declines to rate unrated rather than failed", async () => {
    // Every cell of the 12px row is null, and the mono role opens at 12px.
    // That is not a pairing that came up short, so it gets its own marker and
    // its own word.
    const {row, note} = await rating(DARK_ON_LIGHT, "mono");

    expect(row().verdict).toBe("Not rated");
    expect(row().marker).toBe("dash");
    expect(note()).toContain("has no requirement in the table.");
  });


  it("says what the element sits on, what it needs, and what would carry it", async () => {
    // Lc 74.76 at 18px / 400: the 21px row asks 70, and weight 500 at 18px
    // asks 70.
    const {note} = await rating(JUST_UNDER_75, "body");

    expect(note()).toBe("Body text on the page at 18px / 400 needs Lc 75. It first passes at 21px on this weight, or at weight 500 at this size.");
  });


  it("says what a passing element is holding on to", async () => {
    // 44px is rated on the 48px row, where weight 500 asks Lc 38.
    const {note} = await rating(DARK_ON_LIGHT, "display");

    expect(note()).toBe("Headline on the page at 44px / 500, which the table rates on its 48px row, needs Lc 38. A smaller size or a lighter weight asks for more.");
  });


  it("does not name the element the figure reads as its own ground", async () => {
    // The filled button is the one element that sits on its own fill, and a
    // ground named after the button would read `Filled button on the filled
    // button`. Only the requirement is pinned: what carries it depends on the
    // accent the palette hands the button.
    const {note} = await rating(DARK_ON_LIGHT, "ui");

    expect(note()).toContain("Filled button on its own background at 15px / 600 needs Lc 75.");
    expect(note()).not.toContain("on the filled button");
  });


  it("says so where no size or weight in the table carries the element", async () => {
    // Two identical colors clear no cell of the table, so there is nothing to
    // name as a way out.
    const {note, row} = await rating(IDENTICAL, "display");

    expect(row().verdict).toBe("Needs Lc 38");
    expect(note()).toContain("No size or weight in the table carries it.");
  });


  it("keeps the pair's own Lc and polarity as a footnote", async () => {
    // The pair is an input now, not the result - but swapping it is not a
    // cosmetic choice, and the footnote is where that is still said.
    const {pairNote} = await rating(LIGHT_ON_DARK, "body");

    expect(pairNote()).toBe("The pair itself: Lc 107, light text on a dark background.");
  });


  it("claims no polarity for the pair where there is nothing to tell apart", async () => {
    // `getAPCAPolarity()` splits at zero and answers `dark-on-light` for a pair
    // of identical colors, which is a direction the visitor cannot see.
    const {pairNote} = await rating(IDENTICAL, "display");

    expect(pairNote()).toBe("The pair itself: Lc 0, too close to tell text from background.");
  });


  it("carries the four threshold rows no longer", async () => {
    // Switching roles is what walks the pair through its sizes now.
    const {host} = await rating();

    expect(host.querySelectorAll("li")).toHaveLength(0);
    expect(host.textContent).not.toContain("YOUR TYPE");
  });


  it("holds the spec and the verdict in `text`, whatever the row's state", async () => {
    // `dim` reaches Lc 68.4 against `bg` in the light theme and 50.9 in the
    // dark one, and the row can ask Lc 100 at the size it is set in: in the
    // row's own colour its wording would sit below the bar it announces.
    const {row} = await rating(JUST_UNDER_75, "body");

    expect(row().carries).toEqual([true, true]);
  });


  it("does not reach for the danger pair, which belongs to the failed copy", async () => {
    const {host} = await rating(JUST_UNDER_75, "body");

    expect(host.innerHTML).not.toContain("danger");
  });


  it("puts nothing in a live region", async () => {
    // The Lc changes on every frame of a slider drag and on every move of the
    // colour picker; a polite region would queue a hundred sentences.
    const {host} = await rating();

    expect(host.querySelector("[aria-live]")).toBeNull();
    expect(host.querySelector("[role=alert]")).toBeNull();
    expect(host.querySelector("[role=status]")).toBeNull();
  });

});
