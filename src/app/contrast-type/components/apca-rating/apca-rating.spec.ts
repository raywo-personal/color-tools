import {provideZonelessChangeDetection} from "@angular/core";
import {TestBed} from "@angular/core/testing";
import {Dispatcher} from "@ngrx/signals/events";
import chroma from "chroma-js";
import {beforeEach, describe, expect, it} from "vitest";
import {AppStateStore} from "@core/app-state.store";
import {commonEvents} from "@core/common/common.events";
import {contrastEvents} from "@core/contrast/contrast.events";
import {createContrastColors} from "@engine/contrast/contrast-colors.model";
import {DEFAULT_TYPE_SETTINGS, TypeSettings} from "@engine/contrast/type-settings.model";
import {ApcaRating} from "@contrast-type/components/apca-rating/apca-rating";


/**
 * The three pairs the cases are built from, and what the table makes of them.
 *
 * `MID` is the one that carries most of the work: at Lc 74.3 it sits just under
 * 18px/400's requirement of 75 and clears 21px/400's 70, so it separates two
 * neighbouring rows the way #116 asked a spec to. Colours are pinned here
 * rather than in each case because the requirements they are read against are
 * `apcaLookup`'s, not a generator's - see "Pin behaviour, not colours".
 */
const DARK_ON_LIGHT = createContrastColors(chroma("#000000"), chroma("#ffffff"));
const LIGHT_ON_DARK = createContrastColors(chroma("#ffffff"), chroma("#000000"));
const MID = createContrastColors(chroma("#707070"), chroma("#ffffff"));
const IDENTICAL = createContrastColors(chroma("#334455"), chroma("#334455"));

/** Lc 74.76 - one grey step off `MID`, and the far side of 18px/400's 75. */
const JUST_UNDER_75 = createContrastColors(chroma("#6f6f6f"), chroma("#ffffff"));


describe("ApcaRating", () => {

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()]
    });
  });


  async function rating(colors = DARK_ON_LIGHT, settings: TypeSettings = DEFAULT_TYPE_SETTINGS) {
    // The store registers its reducers when it is created, so an event
    // dispatched before that is lost and the initial state stands.
    TestBed.inject(AppStateStore);

    const dispatcher = TestBed.inject(Dispatcher);
    dispatcher.dispatch(contrastEvents.contrastColorsChangedWithoutNav(colors));
    dispatcher.dispatch(commonEvents.typeSettingsChanged(settings));

    const fixture = TestBed.createComponent(ApcaRating);
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;

    function text(selector: string): string {
      return host.querySelector(selector)?.textContent?.trim() ?? "";
    }

    function items(): HTMLLIElement[] {
      return Array.from(host.querySelectorAll("li"));
    }

    function rows() {
      return items().map(item => {
        const spans = Array.from(item.querySelectorAll("span"));

        return {
          marker: spans[0],
          caption: spans[1].textContent?.trim() ?? "",
          spec: spans[2].textContent?.trim() ?? "",
          verdict: spans[3].textContent?.trim() ?? ""
        };
      });
    }

    /** What the row's marker is, read off its shape rather than its colour. */
    function shapes(): string[] {
      return rows().map(row => {
        const classes = row.marker.classList;

        if (classes.contains("bg-current")) return "filled";
        if (classes.contains("rounded-full")) return "hollow";

        return "rule";
      });
    }

    return {fixture, host, text, items, rows, shapes};
  }


  it("writes the Lc without its sign, under the unit APCA leads with", async () => {
    // The verdicts are all reached through Math.abs(), so a minus on the hero
    // figure would suggest a deficit it never causes. The sign is a polarity,
    // and the sentence below says it in words.
    const {host} = await rating(LIGHT_ON_DARK);
    const parts = Array.from(host.querySelectorAll("p")[0].querySelectorAll("span"))
      .map(span => span.textContent?.trim());

    expect(parts).toEqual(["Lc", "107"]);
  });


  it("rounds the figure down, so it never heads a row it contradicts", async () => {
    // Rounded to the nearest, Lc 74.76 would read `Lc 75` over a row asking
    // for exactly that and marked a fail.
    const {host, rows} = await rating(JUST_UNDER_75);
    const parts = Array.from(host.querySelectorAll("p")[0].querySelectorAll("span"))
      .map(span => span.textContent?.trim());

    expect(parts).toEqual(["Lc", "74"]);
    expect(rows()[0].verdict).toBe("Needs Lc 75");
  });


  it("says a positive Lc as dark text on a light background", async () => {
    const {host} = await rating(DARK_ON_LIGHT);

    expect(host.querySelectorAll("p")[1].textContent).toContain("Dark text on a light background");
  });


  it("says a negative Lc as light text on a dark background", async () => {
    // The information the dropped sign carries: swapping the pair is not a
    // cosmetic choice.
    const {host} = await rating(LIGHT_ON_DARK);

    expect(host.querySelectorAll("p")[1].textContent).toContain("Light text on a dark background");
  });


  it("claims no polarity where there is nothing to tell apart", async () => {
    // `getAPCAPolarity()` splits at zero and answers `dark-on-light` for a pair
    // of identical colors, which is a direction the visitor cannot see.
    const {host} = await rating(IDENTICAL);

    expect(host.querySelectorAll("p")[1].textContent).toContain("Too close to tell");
  });


  it("opens the list with the size and weight the type controls hold", async () => {
    const {rows} = await rating(DARK_ON_LIGHT, {...DEFAULT_TYPE_SETTINGS, fontSize: 21, fontWeight: 600});
    const own = rows()[0];

    expect(own.caption).toBe("YOUR TYPE");
    expect(own.spec).toBe("21px / 600");
  });


  it("captions the visitor's row with the size the slider says, not the row it is rated on", async () => {
    // 17px has no row of its own; the table rates it on 18px. A caption saying
    // 18px would contradict the control that set it - which row was used is in
    // the note instead.
    const {rows, text} = await rating(MID, {...DEFAULT_TYPE_SETTINGS, fontSize: 17});

    expect(rows()[0].spec).toBe("17px / 400");
    expect(text("ul + p")).toContain("which the table rates on its 18px row");
  });


  it("rates an exact table size against its own row", async () => {
    // The guard on #116: at Lc 74.3 the 18px row asks 75 and the 21px row 70,
    // so a size rated one row up would read Pass here.
    const {rows} = await rating(MID, {...DEFAULT_TYPE_SETTINGS, fontSize: 18});

    expect(rows()[0].verdict).toBe("Needs Lc 75");
  });


  it("carries the three references under the visitor's row", async () => {
    const {rows} = await rating(DARK_ON_LIGHT);

    expect(rows().map(row => `${row.caption} ${row.spec}`)).toEqual([
      "YOUR TYPE 18px / 400",
      "BODY 16px / 400",
      "LARGE 24px / 400",
      "SMALLEST 14px / 400"
    ]);
  });


  it("keeps the reference rows whatever the visitor sets, so the list does not move under a drag", async () => {
    const {rows} = await rating(DARK_ON_LIGHT, {...DEFAULT_TYPE_SETTINGS, fontSize: 16});

    expect(rows()).toHaveLength(4);
    expect(rows()[1].spec).toBe("16px / 400");
  });


  it("separates a fail from a pass by shape and wording, not by colour", async () => {
    // At Lc 74.3: 16px asks 90 and 14px asks 100, 24px asks 60.
    const {rows, shapes} = await rating(MID);

    expect(rows().map(row => row.verdict))
      .toEqual(["Needs Lc 75", "Needs Lc 90", "Pass", "Needs Lc 100"]);
    expect(shapes()).toEqual(["hollow", "hollow", "filled", "hollow"]);
  });


  it("does not reach for the danger pair, which belongs to the failed copy", async () => {
    const {host} = await rating(MID);

    expect(host.innerHTML).not.toContain("danger");
  });


  it("calls a size the table declines to rate unrated rather than failed", async () => {
    // Every cell of the 12px row is null. That is not a pairing that came up
    // short, so it gets its own marker and its own word.
    const {rows, shapes} = await rating(DARK_ON_LIGHT, {...DEFAULT_TYPE_SETTINGS, fontSize: 12});

    expect(rows()[0].verdict).toBe("Not rated");
    expect(shapes()[0]).toBe("rule");
  });


  it("names what would carry a failing pair", async () => {
    const {text} = await rating(MID, {...DEFAULT_TYPE_SETTINGS, fontSize: 18});

    expect(text("ul + p"))
      .toBe("At 18px / 400 the requirement is Lc 75. This pair first passes at 21px on this weight, or at weight 500 at this size.");
  });


  it("says the table sets no requirement where it declines to rate the size", async () => {
    // The size slider reaches 11px, so the unrated row is not a corner the
    // visitor has to be talked into.
    const {text} = await rating(DARK_ON_LIGHT, {...DEFAULT_TYPE_SETTINGS, fontSize: 12});

    expect(text("ul + p"))
      .toBe("At 12px / 400 the table sets no requirement. This pair first passes at 14px on this weight.");
  });


  it("says so where no size or weight in the table carries the pair", async () => {
    // Two identical colors clear no cell of the table, so there is nothing to
    // name as a way out.
    const {text} = await rating(IDENTICAL);

    expect(text("ul + p"))
      .toBe("At 18px / 400 the requirement is Lc 75. No size or weight in the table carries this pair.");
  });


  it("says what a passing pair is holding on to", async () => {
    const {text} = await rating(DARK_ON_LIGHT, {...DEFAULT_TYPE_SETTINGS, fontSize: 16});

    expect(text("ul + p"))
      .toBe("At 16px / 400 the requirement is Lc 90. A smaller size or a lighter weight asks for more.");
  });


  it("announces the badges as a list", async () => {
    // Preflight removes the list style, and Safari with VoiceOver then stops
    // treating the element as a list.
    const {host} = await rating();

    expect(host.querySelector("ul")?.getAttribute("role")).toBe("list");
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
