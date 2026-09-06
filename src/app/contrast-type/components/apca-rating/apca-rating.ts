import {Component, computed, inject} from "@angular/core";
import chroma from "chroma-js";
import {AppStateStore} from "@core/app-state.store";
import {FontSize, FontWeight} from "@engine/contrast/apca-lookup-table.model";
import {
  getAPCAPolarity,
  getRequiredLc,
  lightestPassingFontWeight,
  smallestPassingFontSize
} from "@engine/contrast/apca-rating.helper";
import {typeRoleCaption} from "@engine/contrast/type-role.model";
import {fontSizeKeyFrom} from "@engine/helpers/font-size.helper";
import {
  figureElementOf,
  groundName,
  groundOf,
  inkOf,
  SampleElement,
  samplePageColors
} from "@contrast-type/models/sample-page.model";


type RowState = "pass" | "fail" | "unrated";


/** The selected role's element, measured on the page as it is drawn. */
interface Measured {

  readonly element: SampleElement;
  /** The element's size in pixels: the role's size at the element's share. */
  readonly fontSize: number;
  readonly fontWeight: FontWeight;
  /** Signed, as `chroma.contrastAPCA()` reports it. */
  readonly contrast: number;

}


/** The row under the figure: the element it reads, and its verdict. */
interface WeakestRow {

  readonly caption: string;
  /** The type the element is set in, as the visitor reads it - `13px / 400`. */
  readonly spec: string;
  readonly verdict: string;
  readonly state: RowState;

}


/**
 * The Lc of the selected role's text, and its verdict.
 *
 * **The figure answers about the role, not about the pair.** The pair is an
 * input now: its two colors reach the page as inks and grounds, mixed and
 * placed, and what a visitor wants to know is how the text in the role they
 * are setting fares. So the role's element - the headline, the body text, the
 * eyebrow, the label on the filled button - is measured at its own size and
 * the role's weight, its Lc heads the block, and the row beneath names it with
 * its verdict. The pair's own Lc is a one-line footnote, with the polarity
 * that used to be a sentence under the figure. Switching roles is what walks
 * the page through its sizes, which is what the four threshold rows used to
 * answer.
 *
 * **One element per role, not the weakest.** The role's weakest element was
 * the first answer, and it answered nothing: the small print in the dim ink
 * fails at Lc 100 whatever the pair is. `SampleElement.figure` in
 * `sample-page.model.ts` says which element stands for its role, next to the
 * list the preview draws from - so what is measured is what is shown.
 *
 * **The figure is the absolute Lc.** `contrastAPCA()` is signed, and the sign
 * is a polarity rather than a magnitude - the verdict is reached through
 * `Math.abs()`, so a minus on the hero figure would suggest a deficit it never
 * causes. Whole numbers, like the table's own requirements, and rounded down
 * rather than to the nearest: the verdict beside it compares the exact value,
 * so a figure rounded up would cross a requirement the element has not reached
 * - Lc 74.76 would head a row reading `Needs Lc 75` with `Lc 75`.
 *
 * **A fail is not told by colour.** `CLAUDE.md` keeps `danger` for the failed
 * copy, so the carriers here are the marker's shape - a tick, a cross, a dash
 * - and the wording, which names the Lc the table asked for.
 *
 * **Nothing here is a live region.** The Lc changes on every frame of a slider
 * drag and on every move of the colour picker, so a polite region would queue
 * a hundred sentences and an assertive one would talk over the visitor. The
 * colour and type changes are announced by the controls that cause them.
 */
@Component({
  selector: "ct-apca-rating",
  templateUrl: "./apca-rating.html",
  host: {
    "class": "block"
  }
})
export class ApcaRating {

  readonly #stateStore = inject(AppStateStore);

  readonly #role = this.#stateStore.typeRole;

  readonly #measured = computed<Measured>(() => {
    const colors = samplePageColors(this.#stateStore.contrastColors(), this.#stateStore.currentPalette());
    const {settings} = this.#stateStore.typeRoles()[this.#role()];
    const element = figureElementOf(this.#role());

    return {
      element,
      fontSize: Math.round(settings.fontSize * element.sizeRatio),
      fontWeight: String(settings.fontWeight) as FontWeight,
      contrast: chroma.contrastAPCA(inkOf(element, colors), groundOf(element, colors))
    };
  });

  /** The table row the element's size is rated on, which is not always its own. */
  readonly #fontSizeKey = computed(() => fontSizeKeyFrom(this.#measured().fontSize));

  protected readonly caption = computed(() => typeRoleCaption(this.#role()));

  protected readonly figure = computed(() => String(Math.floor(Math.abs(this.#measured().contrast))));

  protected readonly row = computed<WeakestRow>(() => {
    const {element, fontSize, fontWeight, contrast} = this.#measured();
    const requiredLc = getRequiredLc(this.#fontSizeKey(), fontWeight);
    const state = rowState(Math.abs(contrast), requiredLc);

    return {
      caption: element.caption,
      // The element's own size, not the row it is rated on: the slider says
      // 13px, and a spec saying 14px would contradict the control that set
      // it. Which row the table used is in the note under the row.
      spec: `${fontSize}px / ${fontWeight}`,
      verdict: verdictFor(state, requiredLc),
      state
    };
  });

  /**
   * The sentence that explains the verdict: what the element sits on, what
   * the table asks of text that size, and - where it fails - what would carry
   * it, through `smallestPassingFontSize()` and `lightestPassingFontWeight()`.
   * The weight those name can sit above what the `WEIGHT` slider reaches: the
   * note is about the visitor's page, not about the preview's controls.
   */
  protected readonly note = computed(() => {
    const {element, fontSize, fontWeight, contrast} = this.#measured();
    const sizeKey = this.#fontSizeKey();
    const requiredLc = getRequiredLc(sizeKey, fontWeight);
    const where = `${sentenceCase(element.caption)} on ${groundName(element.ground)} at ${fontSize}px / ${fontWeight}`;
    const ratedOn = sizeKey === `${fontSize}px` ? "" : `, which the table rates on its ${sizeKey} row,`;

    const requirement = requiredLc === null
      ? `${where}${ratedOn} has no requirement in the table.`
      : `${where}${ratedOn} needs Lc ${requiredLc}.`;

    return `${requirement} ${consequence(contrast, requiredLc, sizeKey, fontWeight)}`;
  });

  /**
   * The pair itself, in one line: its Lc and which way round it is. At a
   * figure of 0 there is no polarity to name - the two colors are at the same
   * perceived lightness, which `getAPCAPolarity()` still reports as
   * `dark-on-light` because it splits at zero.
   */
  protected readonly pairNote = computed(() => {
    const contrast = this.#stateStore.contrastColors().contrast;
    const figure = Math.floor(Math.abs(contrast));

    if (figure === 0) return "The pair itself: Lc 0, too close to tell text from background.";

    const polarity = getAPCAPolarity(contrast) === "light-on-dark"
      ? "light text on a dark background"
      : "dark text on a light background";

    return `The pair itself: Lc ${figure}, ${polarity}.`;
  });

}


/**
 * A cell without a requirement is a third state, not a fail.
 *
 * `meetsAPCARequirement()` answers `false` for both, which is the right answer
 * to its own question and the wrong one here: 12px is not a pairing that came
 * up short, it is a size APCA declines to rate, and a row saying `Needs Lc
 * null` or `Fail` would put the blame on the colors.
 */
function rowState(absContrast: number, requiredLc: number | null): RowState {
  if (requiredLc === null) return "unrated";

  return absContrast >= requiredLc ? "pass" : "fail";
}


function verdictFor(state: RowState, requiredLc: number | null): string {
  if (state === "pass") return "Pass";
  if (state === "fail") return `Needs Lc ${requiredLc}`;

  return "Not rated";
}


function consequence(contrast: number,
                     requiredLc: number | null,
                     fontSizeKey: FontSize,
                     fontWeight: FontWeight): string {
  if (rowState(Math.abs(contrast), requiredLc) === "pass") {
    return "A smaller size or a lighter weight asks for more.";
  }

  const size = smallestPassingFontSize(contrast, fontWeight);
  const weight = lightestPassingFontWeight(contrast, fontSizeKey);

  if (size !== null && weight !== null) {
    return `It first passes at ${size} on this weight, or at weight ${weight} at this size.`;
  }

  if (size !== null) return `It first passes at ${size} on this weight.`;
  if (weight !== null) return `It first passes at weight ${weight} at this size.`;

  return "No size or weight in the table carries it.";
}


/** `SMALL PRINT` as `Small print`, for the start of a sentence. */
function sentenceCase(caption: string): string {
  const lower = caption.toLowerCase();

  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
