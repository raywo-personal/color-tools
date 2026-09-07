import {describe, expect, it} from "vitest";
import chroma from "chroma-js";
import {createContrastColors} from "@engine/contrast/contrast-colors.model";
import {FONT_SIZES, FONT_WEIGHTS, FontWeight} from "@engine/contrast/apca-lookup-table.model";
import {getRequiredLc} from "@engine/contrast/apca-rating.helper";
import {generatePaletteFrom} from "@engine/palette/palette.helper";
import {DEFAULT_TYPE_ROLES, TypeRolesMap} from "@common/models/type-role-settings.model";
import {SAMPLE_ELEMENTS, sampleElement, samplePageColors} from "@contrast-type/models/sample-page.model";
import {
  elementFontSize,
  elementName,
  elementVerdict,
  pageVerdicts,
  VERDICT_STATES,
  verdictCountSentence,
  verdictCounts,
  verdictLabel,
  verdictMark,
  verdictFacts
} from "@contrast-type/models/element-verdict.model";


const BLACK_ON_WHITE = createContrastColors(chroma("#000000"), chroma("#ffffff"));
/** A pair that separates by almost nothing, so no size in the table carries it. */
const ALMOST_ONE_COLOR = createContrastColors(chroma("#7f7f7f"), chroma("#808080"));

const PALETTE = generatePaletteFrom(chroma("#3366CC"), "harmonic", 5);


function colorsOf(pair = BLACK_ON_WHITE) {
  return samplePageColors(pair, PALETTE);
}


/** The default roles with one role's size and weight replaced. */
function roles(role: keyof TypeRolesMap, fontSize: number, fontWeight: number): TypeRolesMap {
  const current = DEFAULT_TYPE_ROLES[role];

  return {
    ...DEFAULT_TYPE_ROLES,
    [role]: {...current, settings: {...current.settings, fontSize, fontWeight}}
  };
}


describe("elementVerdict", () => {

  it("measures the element's own ink on the ground it actually sits on", () => {
    // The filled button's label sits on the accent out of the palette, not on
    // the pair's background - which is the whole reason a page of verdicts
    // says more than the pair's own Lc.
    const colors = colorsOf();
    const verdict = elementVerdict(sampleElement("filledButton"), colors, DEFAULT_TYPE_ROLES);

    expect(verdict.ground.hex("rgb")).toBe(colors.accent.hex("rgb"));
    expect(verdict.ink.hex("rgb")).toBe(colors.onAccent.hex("rgb"));
    expect(verdict.contrast)
      .toBeCloseTo(chroma.contrastAPCA(colors.onAccent, colors.accent), 6);
  });


  it("sets the element at its own share of the role's size", () => {
    // The caption is the small print's size, not body text's - and the
    // verdict has to be about the size the preview draws.
    const set = roles("body", 18, 400);
    const caption = sampleElement("imageCaption");

    expect(elementFontSize(caption, set)).toBe(Math.round(18 * caption.sizeRatio));
    expect(elementVerdict(caption, colorsOf(), set).fontSize).toBe(13);
  });


  it("rounds the figure down, so it never clears a bar it has not reached", () => {
    // Lc 74.76 rounded to the nearest would read 75 under a requirement of
    // exactly 75.
    const justUnder = createContrastColors(chroma("#6f6f6f"), chroma("#ffffff"));
    const verdict = elementVerdict(
      sampleElement("bodyText"),
      colorsOf(justUnder),
      roles("body", 18, 400)
    );

    expect(Math.abs(verdict.contrast)).toBeGreaterThan(74);
    expect(verdict.lc).toBe(74);
    expect(verdict.requiredLc).toBe(75);
  });


  it("calls a size the table declines to rate unrated, not failed", () => {
    // Every cell of the 12px row is null. That is not a pairing that came up
    // short, so it must not be counted as one.
    const verdict = elementVerdict(
      sampleElement("eyebrow"),
      colorsOf(),
      roles("mono", 12, 400)
    );

    expect(verdict.sizeKey).toBe("12px");
    expect(verdict.requiredLc).toBeNull();
    expect(verdict.state).toBe("unrated");
    expect(verdictMark(verdict.state)).toBe("dash");
  });


  it("separates a pairing a larger size carries from one no size carries", () => {
    // Both miss the requirement at 18px / 400. The grey clears the 21px row,
    // so a slider fixes it; the two near-identical colours clear nothing, so
    // only the colours can move.
    const larger = elementVerdict(
      sampleElement("bodyText"),
      colorsOf(createContrastColors(chroma("#6f6f6f"), chroma("#ffffff"))),
      roles("body", 18, 400)
    );
    const hopeless = elementVerdict(
      sampleElement("bodyText"),
      colorsOf(ALMOST_ONE_COLOR),
      roles("body", 18, 400)
    );

    expect(larger.state).toBe("largeOnly");
    expect(larger.carriesAt).toBe("21px");
    expect(verdictMark(larger.state)).toBe("arrow");

    expect(hopeless.state).toBe("fail");
    expect(hopeless.carriesAt).toBeNull();
    expect(verdictMark(hopeless.state)).toBe("cross");
  });


  it("names a pass by its shape as well", () => {
    const verdict = elementVerdict(
      sampleElement("bodyText"),
      colorsOf(),
      roles("body", 18, 400)
    );

    expect(verdict.state).toBe("pass");
    expect(verdictMark(verdict.state)).toBe("tick");
  });


  it("keeps the requirement in a largeOnly label and out of a fail's", () => {
    // The number is what a visitor acts on where a size would fix it, and a
    // bar named under a verdict no size reaches would suggest one does.
    const larger = elementVerdict(
      sampleElement("bodyText"),
      colorsOf(createContrastColors(chroma("#6f6f6f"), chroma("#ffffff"))),
      roles("body", 18, 400)
    );
    const hopeless = elementVerdict(
      sampleElement("bodyText"),
      colorsOf(ALMOST_ONE_COLOR),
      roles("body", 18, 400)
    );

    expect(verdictLabel(larger)).toBe("Needs Lc 75");
    expect(verdictLabel(hopeless)).toBe("Fails at any size");
  });

});


describe("apcaLookup as the verdict states read it", () => {

  it("falls as the size grows in every weight, which is what makes largeOnly mean larger", () => {
    // `verdictState()` calls a contrast that misses its own row and clears
    // another `largeOnly` without comparing the two sizes. That is only
    // honest while every column is monotone: a retuned table with a
    // requirement that rises with the size would let a *smaller* size be
    // reported as the one that carries it.
    for (const weight of FONT_WEIGHTS) {
      let previous: number | null = null;

      for (const size of FONT_SIZES) {
        const required = getRequiredLc(size, weight as FontWeight);

        if (required === null) continue;
        if (previous !== null) expect(required, `${size} / ${weight}`).toBeLessThanOrEqual(previous);

        previous = required;
      }
    }
  });

});


describe("pageVerdicts", () => {

  it("judges every element of the page, in reading order", () => {
    const verdicts = pageVerdicts(colorsOf(), DEFAULT_TYPE_ROLES);

    expect(verdicts.map(verdict => verdict.element.key))
      .toEqual(SAMPLE_ELEMENTS.map(element => element.key));
  });


  it("counts every element into exactly one state", () => {
    const verdicts = pageVerdicts(colorsOf(), DEFAULT_TYPE_ROLES);
    const counts = verdictCounts(verdicts);

    expect(VERDICT_STATES.reduce((total, state) => total + counts[state], 0))
      .toBe(SAMPLE_ELEMENTS.length);
  });


  it("reports the states best first, so the row reads as a scale", () => {
    expect(VERDICT_STATES).toEqual(["pass", "largeOnly", "unrated", "fail"]);
  });

});


describe("verdictCountSentence", () => {

  it("names every state, including the ones at zero", () => {
    // The sentence is what the announcement carries. One that dropped the
    // empty states would change length as a slider moves, and a count of
    // nothing is the answer to "how many failed".
    expect(verdictCountSentence(verdictCounts([])))
      .toBe("0 pass, 0 larger size needed, 0 not rated, 0 fail");
  });

});


describe("verdictFacts", () => {

  function valueOf(facts: readonly {label: string; value: string}[], label: string) {
    return facts.find(fact => fact.label === label)?.value;
  }


  it("gives the two figures, the type, and what would carry it", () => {
    // The two Lc figures are what the screen is about; the role, the size and
    // the weight are values the visitor set. Nothing else is theirs to read.
    const verdict = elementVerdict(
      sampleElement("bodyText"),
      colorsOf(createContrastColors(chroma("#6f6f6f"), chroma("#ffffff"))),
      roles("body", 18, 400)
    );
    const facts = verdictFacts(verdict, PALETTE);

    expect(valueOf(facts, "Reached")).toBe("Lc 74");
    expect(valueOf(facts, "Needed")).toBe("Lc 75");
    expect(valueOf(facts, "Type")).toBe("BODY · 18px · 400");
    expect(valueOf(facts, "Would pass at")).toBe("21px, or weight 500");
  });


  it("names nothing the visitor cannot already read off the page", () => {
    // Prose here said which row of the APCA table rated a size and that a
    // page has an "own colour" - neither is on screen, and the second is not
    // a distinction at all. The colours are left out too: they are in the
    // element the panel is about, at full size.
    const verdict = elementVerdict(
      sampleElement("imageCaption"),
      colorsOf(),
      roles("body", 18, 400)
    );
    const written = verdictFacts(verdict, PALETTE)
      .map(fact => `${fact.label} ${fact.value}`)
      .join(" ");

    expect(verdict.sizeKey).not.toBe(`${verdict.fontSize}px`);
    expect(written).not.toContain("row");
    expect(written).not.toContain("table");
    expect(written).not.toContain("own colour");

    // And no sentence: nothing in a value ends in a full stop.
    for (const fact of verdictFacts(verdict, PALETTE)) {
      expect(fact.value, fact.label).not.toContain(".");
    }
  });


  it("sets no bar where the table rates the size at all", () => {
    // Not "Lc null" and not "Lc 0" - a figure here would read as a bar the
    // element cleared.
    const verdict = elementVerdict(sampleElement("eyebrow"), colorsOf(), roles("mono", 12, 400));

    expect(valueOf(verdictFacts(verdict, PALETTE), "Needed")).toBe("not rated at this size");
  });


  it("carries three rows for a pass and no way out", () => {
    // What would carry something already carried is a question nobody asked,
    // and a nearest-pass row under a tick reads as a correction.
    const passing = elementVerdict(sampleElement("bodyText"), colorsOf(), roles("body", 18, 400));

    expect(passing.state).toBe("pass");
    expect(verdictFacts(passing, PALETTE).map(fact => fact.label))
      .toEqual(["Reached", "Needed", "Type"]);
  });


  it("suggests a colour only where something came up short", () => {
    // An unrated element missed no bar, so a nearest-pass row would name one
    // the table never set.
    const unrated = elementVerdict(sampleElement("eyebrow"), colorsOf(), roles("mono", 12, 400));
    const failing = elementVerdict(
      sampleElement("bodyText"),
      colorsOf(createContrastColors(chroma("#6f6f6f"), chroma("#ffffff"))),
      roles("body", 18, 400)
    );

    expect(unrated.state).toBe("unrated");
    expect(verdictFacts(unrated, PALETTE).map(fact => fact.label))
      .toEqual(["Reached", "Needed", "Type", "Would pass at"]);

    const nearest = verdictFacts(failing, PALETTE).at(-1);

    // `Nearest color`, not `Nearest`: on its own the label asked
    // "nearest what?".
    expect(nearest?.label).toBe("Nearest color");
    expect(nearest?.value).toMatch(/^(.+ · Lc \d+|none in this palette)$/);
  });


  it("hands the suggestion its colour, so the row points at a chip", () => {
    // A name alone asks the visitor to recognise it in the chip row above.
    const failing = elementVerdict(
      sampleElement("bodyText"),
      colorsOf(createContrastColors(chroma("#6f6f6f"), chroma("#ffffff"))),
      roles("body", 18, 400)
    );
    const nearest = verdictFacts(failing, PALETTE).at(-1);

    if (nearest?.value === "none in this palette") return;

    expect(nearest?.swatch).toMatch(/^#[0-9a-f]{6}$/);
  });

});


describe("elementName", () => {

  it("writes the all-caps caption as the start of a sentence", () => {
    // The caption is what the rating shows; a screen reader spells all caps
    // out letter by letter, and a sentence needs the name either way.
    expect(elementName(sampleElement("smallPrint"))).toBe("Small print");
    expect(elementName(sampleElement("filledButton"))).toBe("Filled button");
  });

});
