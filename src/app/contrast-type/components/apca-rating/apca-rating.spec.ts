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
import {fakeLiveAnnouncer, provideFakeLiveAnnouncer} from "@testing/live-announcer.fake";


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
      providers: [provideZonelessChangeDetection(), provideFakeLiveAnnouncer()]
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
      return Array.from(host.querySelectorAll("[data-figure] span"))
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

    /** The rows under the element's own: label and value, in order. */
    function facts() {
      const list = Array.from(host.querySelectorAll("ul")).at(-1);

      return Array.from(list?.querySelectorAll("li") ?? []).map(row => {
        const spans = row.querySelectorAll("span");

        return {
          label: spans[0]?.textContent?.trim() ?? "",
          value: spans[1]?.textContent?.trim() ?? ""
        };
      });
    }

    function factValue(label: string): string | undefined {
      return facts().find(fact => fact.label === label)?.value;
    }

    async function selectRole(next: TypeRole) {
      dispatcher.dispatch(commonEvents.typeRoleSelected(next));
      await fixture.whenStable();
    }

    return {fixture, host, caption, figureParts, row, facts, factValue, selectRole};
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
    // The 21px row asks 70, so a bigger size carries it: the arrow, not the
    // cross, which is reserved for a pairing no size reaches.
    expect(row().marker).toBe("arrow");
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
    const {row, factValue} = await rating(DARK_ON_LIGHT, "mono");

    expect(row().verdict).toBe("Not rated");
    expect(row().marker).toBe("dash");
    // A size the table declines to rate still has a size that would get it
    // rated, and that size is the useful answer.
    expect(factValue("Would pass at")).toBeDefined();
  });


  it("names the size and the weight that would carry the element, and nothing else", async () => {
    // Lc 74.76 at 18px / 400: the 21px row asks 70, and weight 500 at 18px
    // asks 70. Both are the visitor's own sliders, which is why they are the
    // answer - the APCA table's own rows are not on the page and are not
    // named here.
    const {factValue, facts} = await rating(JUST_UNDER_75, "body");

    expect(factValue("Would pass at")).toBe("21px, or weight 500");
    expect(facts().map(fact => fact.label)).toEqual(["Would pass at", "Pair"]);
  });


  it("asks a passing element no question nobody asked", async () => {
    // What would carry something already carried is not an answer to
    // anything, so the row is left out rather than filled with a caveat.
    const {facts, row} = await rating(DARK_ON_LIGHT, "display");

    expect(row().verdict).toBe("Pass");
    expect(facts().map(fact => fact.label)).toEqual(["Pair"]);
  });


  it("says so where no size or weight carries the element", async () => {
    // Two identical colors clear no cell of the table, so there is nothing to
    // name as a way out.
    const {factValue, row} = await rating(IDENTICAL, "display");

    // No bar is named: the requirement is real, but no size reaches it, so a
    // row saying `Needs Lc 38` would suggest the sliders could fix it.
    expect(row().verdict).toBe("Fails at any size");
    expect(row().marker).toBe("cross");
    expect(factValue("Would pass at")).toBe("no size or weight");
  });


  it("keeps the pair's own Lc and polarity as a row of its own", async () => {
    // The pair is an input now, not the result - but swapping it is not a
    // cosmetic choice, and this row is where that is still said.
    const {factValue} = await rating(LIGHT_ON_DARK, "body");

    expect(factValue("Pair")).toBe("Lc 107 · light on dark");
  });


  it("claims no polarity for the pair where there is nothing to tell apart", async () => {
    // `getAPCAPolarity()` splits at zero and answers `dark-on-light` for a pair
    // of identical colors, which is a direction the visitor cannot see.
    const {factValue} = await rating(IDENTICAL, "display");

    expect(factValue("Pair")).toBe("Lc 0 · too close to tell apart");
  });


  it("carries the four threshold rows no longer", async () => {
    // Switching roles is what walks the pair through its sizes now. The one
    // list left is the two rows under the element - not a size and a
    // requirement per row.
    const {host, facts} = await rating();

    expect(host.textContent).not.toContain("YOUR TYPE");
    expect(host.querySelectorAll("li")).toHaveLength(facts().length);
  });


  it("leaves the page's tally to `PageVerdicts`", async () => {
    // The tally counts every mark beside the preview and belongs to the pair
    // that produced them; under the figure it read as a second answer about
    // the selected role.
    const {host} = await rating();

    expect(host.querySelector("[aria-label='Verdicts on the page']")).toBeNull();
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


  it("puts nothing in a live region, and announces nothing", async () => {
    // The Lc changes on every frame of a slider drag and on every move of the
    // colour picker; a polite region would queue a hundred sentences. What a
    // screen reader hears when the page changes is the tally, which usually
    // stands still - and it is announced by `PageVerdicts`.
    const {fixture, host} = await rating();

    await fixture.whenStable();

    expect(fakeLiveAnnouncer().announcements).toEqual([]);

    expect(host.querySelector("[aria-live]")).toBeNull();
    expect(host.querySelector("[role=alert]")).toBeNull();
    expect(host.querySelector("[role=status]")).toBeNull();
  });

});
