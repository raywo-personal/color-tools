import chroma, {Color} from "chroma-js";
import {FontSize, FontWeight} from "@engine/contrast/apca-lookup-table.model";
import {
  getRequiredLc,
  lightestPassingFontWeight,
  smallestPassingFontSize
} from "@engine/contrast/apca-rating.helper";
import {nearestPassingPaletteColor} from "@engine/contrast/passing-palette-color.helper";
import {typeRoleCaption} from "@engine/contrast/type-role.model";
import {colorName} from "@engine/color/color-name.helper";
import {fontSizeKeyFrom} from "@engine/helpers/font-size.helper";
import {Palette} from "@engine/palette/palette.model";
import {TypeRolesMap} from "@common/models/type-role-settings.model";
import {
  groundOf,
  inkOf,
  SampleElement,
  SAMPLE_ELEMENTS,
  SamplePage,
  sampleElement
} from "@contrast-type/models/sample-page.model";


/**
 * What the APCA table says about one element of the page.
 *
 * **Four states, not three.** `pass` and `fail` are the ends of it; the two in
 * between are different answers that a single middle state would blur. A size
 * the table declines to rate is `unrated` - every cell of the 12px row is
 * null, and the mono role opens there, so the commonest case of "no verdict"
 * is not a pairing that came up short. `largeOnly` is a pairing that did come
 * up short at its own size and weight and that a larger size or a heavier
 * weight carries: the colours work, the type does not, and that is the one
 * the visitor can fix with a slider they already have their hand on - the
 * size slider is not the only one, so this state cannot be about it alone.
 *
 * `fail` is what is left: no row of the table carries these two colours at
 * any size or weight, so only the colours can move.
 */
export type VerdictState = "pass" | "largeOnly" | "unrated" | "fail";

/** The shape a state is drawn as - see `VERDICT_MARKS`. */
export type VerdictMark = "tick" | "arrow" | "dash" | "cross";

/**
 * Which shape carries which state.
 *
 * Shape rather than colour, as in `apca-rating.html`: a verdict on a page the
 * visitor coloured cannot be told by a hue, and `danger` belongs to the failed
 * copy alone. The arrow points up because the thing that would fix a
 * `largeOnly` is a bigger number on one of the two sliders it still has - a
 * larger size or a heavier weight.
 */
const VERDICT_MARKS: Record<VerdictState, VerdictMark> = {
  pass: "tick",
  largeOnly: "arrow",
  unrated: "dash",
  fail: "cross"
};

/** The states in the order the count reports them, best first. */
export const VERDICT_STATES: readonly VerdictState[] = ["pass", "largeOnly", "unrated", "fail"];


/** One element of the page, measured as it is drawn. */
export interface ElementVerdict {

  readonly element: SampleElement;
  readonly state: VerdictState;
  readonly ink: Color;
  readonly ground: Color;
  /** The element's own size in pixels: the role's size at its share of it. */
  readonly fontSize: number;
  /** The row the table rates that size on, which is not always its own. */
  readonly sizeKey: FontSize;
  readonly fontWeight: FontWeight;
  /** Signed, as `chroma.contrastAPCA()` reports it. */
  readonly contrast: number;
  /** The figure a visitor reads: absolute and rounded down. */
  readonly lc: number;
  readonly requiredLc: number | null;
  /** The smallest size that carries these colours at this weight. */
  readonly carriesAt: FontSize | null;

}


/**
 * The element's size in pixels, as the preview sets it and the table rates it.
 *
 * One function for both, so the figure is about the page on the screen: the
 * preview binds this number as a pixel style and the verdict looks it up.
 */
export function elementFontSize(element: SampleElement, roles: TypeRolesMap): number {
  return Math.round(roles[element.role].settings.fontSize * element.sizeRatio);
}


/**
 * The verdict for one element: its own ink on the ground it actually sits on,
 * at its own size and its role's weight.
 *
 * **The ground is the element's, not the pair's.** The label on the filled
 * button sits on the accent, the disabled label on the muted surface, the
 * field's text in the field - so a page of verdicts says something the pair's
 * own Lc never could. `sample-page.model.ts` holds which ground that is.
 */
export function elementVerdict(element: SampleElement,
                               page: SamplePage,
                               roles: TypeRolesMap): ElementVerdict {
  const ink = inkOf(element, page);
  const ground = groundOf(element, page);
  const fontSize = elementFontSize(element, roles);
  const sizeKey = fontSizeKeyFrom(fontSize);
  const fontWeight = String(roles[element.role].settings.fontWeight) as FontWeight;
  const contrast = chroma.contrastAPCA(ink, ground);
  const requiredLc = getRequiredLc(sizeKey, fontWeight);
  const carriesAt = smallestPassingFontSize(contrast, fontWeight);
  // Not stored on the verdict: `carriedBy()` already looks this up again for
  // the panel's own row, and a second field would only repeat it.
  const weightCarries = lightestPassingFontWeight(contrast, sizeKey) !== null;

  return {
    element,
    state: verdictState(Math.abs(contrast), requiredLc, carriesAt, weightCarries),
    ink,
    ground,
    fontSize,
    sizeKey,
    fontWeight,
    contrast,
    // Rounded down rather than to the nearest: the verdict beside it compares
    // the exact value, so a figure rounded up would cross a requirement the
    // element has not reached - Lc 74.76 under a row reading `Needs Lc 75`.
    lc: Math.floor(Math.abs(contrast)),
    requiredLc,
    carriesAt
  };
}


/** Every element of the page, in reading order. */
export function pageVerdicts(page: SamplePage,
                             roles: TypeRolesMap): readonly ElementVerdict[] {
  return SAMPLE_ELEMENTS.map(element => elementVerdict(element, page, roles));
}


/** The verdict for the element with the given key. */
export function verdictFor(key: string,
                           page: SamplePage,
                           roles: TypeRolesMap): ElementVerdict {
  return elementVerdict(sampleElement(key), page, roles);
}


export type VerdictCounts = Readonly<Record<VerdictState, number>>;


/** How many elements of the page reached each state. */
export function verdictCounts(verdicts: readonly ElementVerdict[]): VerdictCounts {
  const counts: Record<VerdictState, number> = {pass: 0, largeOnly: 0, unrated: 0, fail: 0};

  for (const verdict of verdicts) counts[verdict.state]++;

  return counts;
}


/**
 * What each state is called where a number stands in front of it - the legend
 * beside the Lc figure.
 *
 * Phrased so one and twelve both read: `1 pass` and `12 pass`, never
 * `1 passes`. `verdictWord()` is the same four states where the subject is one
 * element, and there the verb agrees.
 */
const COUNT_WORDS: Record<VerdictState, string> = {
  pass: "pass",
  largeOnly: "larger size needed",
  unrated: "not rated",
  fail: "fail"
};


export function verdictCountWord(state: VerdictState): string {
  return COUNT_WORDS[state];
}


/**
 * What each state says about one element.
 *
 * **The shapes cannot be read without it.** A tick and a cross carry
 * themselves; an arrow does not - nobody guesses "a larger size would carry
 * this" from an arrow, and a dash is a shrug either way. So the word travels
 * with the shape everywhere it appears: in the mark's accessible name, in the
 * opened panel's header, and in the legend under the figure, which is where
 * all four stand together and the shapes get taught.
 */
const STATE_WORDS: Record<VerdictState, string> = {
  pass: "passes",
  largeOnly: "needs a larger size",
  unrated: "not rated",
  fail: "fails at any size"
};


export function verdictWord(state: VerdictState): string {
  return STATE_WORDS[state];
}


/**
 * The counts in words - what a screen reader hears beside the four shapes,
 * and what the announcement says when the page's tally changes.
 *
 * Every state is named, including the ones at zero: a sentence that dropped
 * them would change length as a slider moves, and a count of nothing is the
 * answer to `how many failed`.
 */
export function verdictCountSentence(counts: VerdictCounts): string {
  return VERDICT_STATES
    .map(state => `${counts[state]} ${verdictCountWord(state)}`)
    .join(", ");
}


export function verdictMark(state: VerdictState): VerdictMark {
  return VERDICT_MARKS[state];
}


/**
 * The verdict in as few words as a row or a mark's name can carry.
 *
 * A `largeOnly` keeps the number, because the number is what the visitor acts
 * on; a `fail` drops it, because no size reaches it and naming a bar would
 * suggest one does. That split is why the two are separate states.
 */
export function verdictLabel(verdict: ElementVerdict): string {
  switch (verdict.state) {
    case "pass":
      return "Pass";
    case "largeOnly":
      return `Needs Lc ${verdict.requiredLc}`;
    case "unrated":
      return "Not rated";
    case "fail":
      return "Fails at any size";
  }
}


/**
 * Whether the element came up short at the size it is set in - the two states
 * between a pass and a size the table declines to rate.
 *
 * The two behave alike wherever the question is "did this text fall short":
 * the dotted underline beside the mark, and whether a colour is worth
 * suggesting. `unrated` is not one of them - no bar was set, so nothing was
 * missed.
 */
export function missedRequirement(verdict: ElementVerdict): boolean {
  return verdict.state === "largeOnly" || verdict.state === "fail";
}


/** `SMALL PRINT` as `Small print`, for the start of a sentence. */
export function elementName(element: SampleElement): string {
  const lower = element.caption.toLowerCase();

  return lower.charAt(0).toUpperCase() + lower.slice(1);
}


/**
 * One row of the opened verdict: a label and a value.
 *
 * Rows rather than prose. A visitor asked what a mark means, and prose
 * answered with things only the code knows - which row of a lookup table
 * rated a size, that a page has an "own colour" - while the two numbers they
 * came for sat inside a sentence. A label and a value can be read at a
 * glance and skipped just as fast.
 */
export interface VerdictFact {

  readonly label: string;
  readonly value: string;
  /** A hex the row shows as a swatch in front of its value. */
  readonly swatch?: string;

}


/**
 * The opened verdict as rows: what the element reached, what it needed, what
 * it is set in, and - where it came up short - what would carry it.
 *
 * **Only what the visitor can already name.** The size, the weight and the
 * role are values they set; the two Lc figures are what the screen is about;
 * a palette colour is a chip above the preview. What is left out is
 * everything that is true of the implementation rather than of the page: the
 * APCA table, which of its rows a size is rated on, and the colours of ink
 * and ground - those last two are on screen at full size, in the element the
 * row is about.
 *
 * **The nearest-colour row is offered on every element.** It used to be held
 * back wherever the app computed the ink for itself, on the grounds that
 * suggesting a colour for an ink nobody could move was a fix that does not
 * exist. Every ink is the visitor's now, so the row is a fix everywhere.
 *
 * **A pass carries three rows, not five.** What would carry an element that
 * is already carried is a question nobody asked, and a nearest-pass row under
 * a tick reads as a correction.
 */
export function verdictFacts(verdict: ElementVerdict, palette: Palette): readonly VerdictFact[] {
  const {element, fontSize, fontWeight, lc, requiredLc} = verdict;

  const facts: VerdictFact[] = [
    {label: "Reached", value: `Lc ${lc}`},
    {
      label: "Needed",
      // Not "Lc null" and not "Lc 0": APCA sets no requirement this small, and
      // a figure here would read as a bar the element cleared.
      value: requiredLc === null ? "not rated at this size" : `Lc ${requiredLc}`
    },
    {label: "Type", value: `${typeRoleCaption(element.role)} · ${fontSize}px · ${fontWeight}`}
  ];

  if (verdict.state === "pass") return facts;

  // "Would pass at", not "Passes at": the element does not pass, and the
  // indicative read as a claim that it does.
  facts.push({label: "Would pass at", value: carriedBy(verdict)});

  if (!missedRequirement(verdict)) return facts;

  return [...facts, nearest(verdict, palette)];
}


/**
 * The smallest size and the lightest weight that carry the element, as a
 * value rather than a sentence - `24px, or weight 700`.
 *
 * Both are the visitor's own sliders, which is why they are the answer here.
 * The weight can sit above what the `WEIGHT` slider reaches: the row is about
 * the page they are building, not about the preview's controls.
 */
function carriedBy(verdict: ElementVerdict): string {
  const weight = lightestPassingFontWeight(verdict.contrast, verdict.sizeKey);
  const size = verdict.carriesAt;

  if (size !== null && weight !== null) return `${size}, or weight ${weight}`;
  if (size !== null) return size;
  if (weight !== null) return `weight ${weight}`;

  return "no size or weight";
}


/**
 * The nearest colour in the palette that would carry the element.
 *
 * `Nearest color`, not `Nearest`: on its own the label asked "nearest what?".
 * The spelling is the app's - `colour` is this codebase's comments, `color` is
 * everything a visitor reads.
 */
function nearest(verdict: ElementVerdict, palette: Palette): VerdictFact {
  const passing = nearestPassingPaletteColor(
    verdict.ink,
    verdict.ground,
    verdict.requiredLc,
    palette
  );

  if (!passing) return {label: "Nearest color", value: "none in this palette"};

  return {
    label: "Nearest color",
    value: `${colorName(passing.color)} · Lc ${Math.floor(passing.contrast)}`,
    swatch: passing.color.hex("rgb")
  };
}


/**
 * The four states, in the order they have to be decided.
 *
 * **`unrated` comes first.** Where the table has no requirement there is
 * nothing the contrast could have missed, so the question of whether a larger
 * size would carry it is a different one - the opened verdict still answers it
 * in words, but the mark says what the table said: nothing.
 *
 * `largeOnly` before `fail`, because every column of `apcaLookup` falls as the
 * size grows: a contrast that misses its own row and clears another clears a
 * larger one. `element-verdict.model.spec.ts` pins that, which is what would
 * catch a retuned table.
 *
 * **Both sliders decide it, not only the size's.** `carriesAt` alone once let
 * an element that a heavier weight already carries read as `fail` - a cross
 * and "Fails at any size" in the badge under a popup that named the very
 * weight that would carry it, the mark and its own panel disagreeing about
 * the same element. `weightCarries` closes that: either slider passing is
 * what makes it `largeOnly`.
 */
function verdictState(absContrast: number,
                      requiredLc: number | null,
                      carriesAt: FontSize | null,
                      weightCarries: boolean): VerdictState {
  if (requiredLc === null) return "unrated";
  if (absContrast >= requiredLc) return "pass";

  return carriesAt === null && !weightCarries ? "fail" : "largeOnly";
}
