import chroma, {Color} from "chroma-js";
import {FontSize, FontWeight} from "@engine/contrast/apca-lookup-table.model";
import {
  getRequiredLc,
  lightestPassingFontWeight,
  smallestPassingFontSize
} from "@engine/contrast/apca-rating.helper";
import {nearestPassingPaletteColor} from "@engine/contrast/passing-palette-color.helper";
import {typeRoleName} from "@engine/contrast/type-role.model";
import {colorName} from "@engine/color/color-name.helper";
import {fontSizeKeyFrom} from "@engine/helpers/font-size.helper";
import {Palette} from "@engine/palette/palette.model";
import {TypeRolesMap} from "@common/models/type-role-settings.model";
import {
  groundApposition,
  groundOf,
  inkOf,
  SampleElement,
  SAMPLE_ELEMENTS,
  SamplePageColors,
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
 * up short at the size it is set in and that a larger size carries: the
 * colours work, the type does not, and that is the one the visitor can fix
 * with the slider they already have their hand on.
 *
 * `fail` is what is left: no row of the table carries these two colours at
 * this weight, so only the colours can move.
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
 * `largeOnly` is a bigger size.
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
                               colors: SamplePageColors,
                               roles: TypeRolesMap): ElementVerdict {
  const ink = inkOf(element, colors);
  const ground = groundOf(element, colors);
  const fontSize = elementFontSize(element, roles);
  const sizeKey = fontSizeKeyFrom(fontSize);
  const fontWeight = String(roles[element.role].settings.fontWeight) as FontWeight;
  const contrast = chroma.contrastAPCA(ink, ground);
  const requiredLc = getRequiredLc(sizeKey, fontWeight);
  const carriesAt = smallestPassingFontSize(contrast, fontWeight);

  return {
    element,
    state: verdictState(Math.abs(contrast), requiredLc, carriesAt),
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
export function pageVerdicts(colors: SamplePageColors,
                             roles: TypeRolesMap): readonly ElementVerdict[] {
  return SAMPLE_ELEMENTS.map(element => elementVerdict(element, colors, roles));
}


/** The verdict for the element with the given key. */
export function verdictFor(key: string,
                           colors: SamplePageColors,
                           roles: TypeRolesMap): ElementVerdict {
  return elementVerdict(sampleElement(key), colors, roles);
}


export type VerdictCounts = Readonly<Record<VerdictState, number>>;


/** How many elements of the page reached each state. */
export function verdictCounts(verdicts: readonly ElementVerdict[]): VerdictCounts {
  const counts: Record<VerdictState, number> = {pass: 0, largeOnly: 0, unrated: 0, fail: 0};

  for (const verdict of verdicts) counts[verdict.state]++;

  return counts;
}


/**
 * What each state is called where a number stands beside it.
 *
 * The words are the count's, not a row's: `largeOnly` reads as
 * `only as large text` after a figure and would read as a sentence fragment
 * on its own, which is why `verdictLabel()` says it differently.
 */
const COUNT_WORDS: Record<VerdictState, string> = {
  pass: "pass",
  largeOnly: "only as large text",
  unrated: "not rated",
  fail: "fail"
};


export function verdictCountWord(state: VerdictState): string {
  return COUNT_WORDS[state];
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


/**
 * A colour name with its first letter raised.
 *
 * `colorName()` reads six lists and they do not agree: `basic`, `html` and
 * `x11` are lower case, `ntc` and `pantone` are not - so one sentence could
 * open with `black` and name `Lavender` in the same breath. A name is a name,
 * and only the first letter moves: title case would turn `Sea Green` into
 * `Sea green`.
 */
function capitalized(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}


/** `SMALL PRINT` as `Small print`, for the start of a sentence. */
export function elementName(element: SampleElement): string {
  const lower = element.caption.toLowerCase();

  return lower.charAt(0).toUpperCase() + lower.slice(1);
}


/**
 * What would carry an element that does not pass: the smallest size at its
 * weight, the lightest weight at its size, or neither.
 *
 * The weight it names can sit above what the `WEIGHT` slider reaches - the
 * sentence is about the visitor's page, not about the preview's controls.
 */
export function verdictConsequence(verdict: ElementVerdict): string {
  if (verdict.state === "pass") return "A smaller size or a lighter weight asks for more.";

  const weight = lightestPassingFontWeight(verdict.contrast, verdict.sizeKey);
  const size = verdict.carriesAt;

  if (size !== null && weight !== null) {
    return `It first passes at ${size} on this weight, or at weight ${weight} at this size.`;
  }

  if (size !== null) return `It first passes at ${size} on this weight.`;
  if (weight !== null) return `It first passes at weight ${weight} at this size.`;

  return "No size or weight in the table carries it.";
}


/**
 * The opened verdict, one sentence per line: what is written where, in what
 * type, what it reached against what it needed, what would carry it, and the
 * nearest colour in the palette that would.
 *
 * Sentences rather than a table, because the panel opens into the page's own
 * column: a four-column grid at 320px would wrap into something that reads
 * worse than prose. Both colours are named rather than written as hex - the
 * same names the palette chips carry, so a suggestion can be found in the row
 * above the preview.
 *
 * The first sentence names the ink, then the ground's colour, then which
 * ground that is - three answers in that order, with the place last so it
 * reads as an apposition to the colour rather than to the ink. Written the
 * other way round it said `black on the page, which is Lavender`, which reads
 * as a claim that black is Lavender.
 *
 * A colour is suggested only where one came up short. Under a tick it would
 * read as a correction of a verdict that found nothing wrong, and under an
 * unrated element it would name a bar the table never set.
 */
export function verdictSentences(verdict: ElementVerdict, palette: Palette): readonly string[] {
  const {element, ink, ground, fontSize, sizeKey, fontWeight, lc, requiredLc} = verdict;
  const ratedOn = sizeKey === `${fontSize}px`
    ? ""
    : `, which the table rates on its ${sizeKey} row`;

  const sentences = [
    `${capitalized(colorName(ink))} on ${capitalized(colorName(ground))}, ${groundApposition(element.ground)}.`,
    `${typeRoleName(element.role)} type at ${fontSize}px / ${fontWeight}${ratedOn}.`,
    requiredLc === null
      ? `Lc ${lc}, and the table has no requirement at this size.`
      : `Lc ${lc} against the Lc ${requiredLc} this size and weight ask for.`,
    verdictConsequence(verdict)
  ];

  if (!missedRequirement(verdict)) return sentences;

  return [...sentences, suggestion(verdict, palette)];
}


/** The nearest colour in the palette that would carry the element. */
function suggestion(verdict: ElementVerdict, palette: Palette): string {
  const nearest = nearestPassingPaletteColor(
    verdict.ink,
    verdict.ground,
    verdict.requiredLc,
    palette
  );

  if (!nearest) return "No color in this palette carries it here.";

  return `Nearest pass in this palette: ${colorName(nearest.color)}, Lc ${Math.floor(nearest.contrast)}.`;
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
 */
function verdictState(absContrast: number,
                      requiredLc: number | null,
                      carriesAt: FontSize | null): VerdictState {
  if (requiredLc === null) return "unrated";
  if (absContrast >= requiredLc) return "pass";

  return carriesAt === null ? "fail" : "largeOnly";
}
