import {Component, computed, inject} from "@angular/core";
import {AppStateStore} from "@core/app-state.store";
import {FontSize, FontWeight} from "@engine/contrast/apca-lookup-table.model";
import {
  getAPCAPolarity,
  getRequiredLc,
  lightestPassingFontWeight,
  smallestPassingFontSize
} from "@engine/contrast/apca-rating.helper";
import {fontSizeKeyFrom} from "@engine/helpers/font-size.helper";


type RowState = "pass" | "fail" | "unrated";


interface RatingRow {

  readonly key: string;
  /** The word that says what the row is for - `YOUR TYPE`, `BODY`. */
  readonly caption: string;
  /** The type the row rates, as the visitor reads it - `16px / 400`. */
  readonly spec: string;
  readonly verdict: string;
  readonly state: RowState;
  /** Set on the first reference row, which is where the list changes register. */
  readonly startsReference: boolean;

}


interface ReferenceRow {

  readonly caption: string;
  readonly fontSizeKey: FontSize;
  readonly fontWeight: FontWeight;

}


/**
 * The rows that stand whatever the controls are set to.
 *
 * `SMALLEST` is 14px because that is the smallest size `apcaLookup` rates at
 * all: every cell of the 12px row is null, and at weight 400 the table starts
 * at 14px. A row below it would read `Not rated` for every pair ever shown and
 * say nothing about this one.
 *
 * All three sit at weight 400 so the set is a scale of sizes rather than a
 * mixture; the visitor's own weight is in the row above them.
 */
const REFERENCE_ROWS: readonly ReferenceRow[] = [
  {caption: "BODY", fontSizeKey: "16px", fontWeight: "400"},
  {caption: "LARGE", fontSizeKey: "24px", fontWeight: "400"},
  {caption: "SMALLEST", fontSizeKey: "14px", fontWeight: "400"}
];


/**
 * The Lc of the pair, and what it is worth at four sizes.
 *
 * **The figure is the absolute Lc, and the polarity is a sentence.** The draft
 * shows a WCAG ratio with `: 1` beside it; `contrastColors.contrast` is a
 * signed Lc instead, and the sign is a polarity rather than a magnitude - every
 * verdict below is reached through `Math.abs()`, so a minus on the hero figure
 * would suggest a deficit it never causes. The information the sign carries -
 * that swapping the pair is not a cosmetic choice - is what the sentence under
 * the figure says, in words a visitor can act on.
 *
 * **The badge list has no AA/AAA rows.** `getRequiredLc()` answers for one size
 * and one weight, so the draft's fixed four of AA/AAA x normal/large has no
 * APCA counterpart. The rows are the size and weight the type controls hold -
 * the verdict that is actually about the visitor's page - over three fixed
 * references, so the figure means something before a slider is touched. The
 * references are a fixed set rather than a deduplicated one on purpose: a row
 * that disappears when the size slider passes 16px moves the whole list under
 * the thumb mid-drag, and `YOUR TYPE 16px / 400 - Pass` above `BODY 16px / 400
 * - Pass` reads as the answer to "is my type body text", not as a repeat.
 *
 * **A fail is not told by colour.** `CLAUDE.md` keeps `danger` for the failed
 * copy, so the three carriers here are the marker's shape - filled, hollow,
 * a rule - the wording, which names the Lc the table asked for, and the
 * neutral token: a fail is the loud row in `text`, everything settled is
 * `dim`. That inverts the usual emphasis deliberately; what is unresolved is
 * what the eye should land on.
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

  readonly #contrast = computed(() => this.#stateStore.contrastColors().contrast);

  /** The table row the visitor's size is rated on, which is not always its own. */
  readonly #fontSizeKey = computed(() => fontSizeKeyFrom(this.#stateStore.typeSettings().fontSize));

  readonly #fontWeight = computed<FontWeight>(
    () => String(this.#stateStore.typeSettings().fontWeight) as FontWeight
  );

  /**
   * Whole numbers, like the table's own requirements: `apcaLookup` is written
   * in Lc 90, Lc 75, Lc 60, and a figure with a decimal would invite a
   * comparison the rows do not make.
   *
   * **Rounded down rather than to the nearest.** The rows below do make that
   * comparison, against the exact value, so a figure rounded up crosses a
   * requirement the pair has not reached: `#6f6f6f` on white is Lc 74.76 and
   * would head a row reading `Needs Lc 75` with `Lc 75`. Against an integer
   * requirement a floored figure cannot contradict its own verdict - it
   * reaches the requirement exactly when the pair does - at the price of
   * writing the strongest pair there is as 107 rather than 108.
   */
  protected readonly figure = computed(() => String(Math.floor(Math.abs(this.#contrast()))));

  /**
   * What the sign says, in words.
   *
   * At a figure of 0 there is no polarity to name - the two colors are at the
   * same perceived lightness, which `getAPCAPolarity()` still reports as
   * `dark-on-light` because it splits at zero.
   */
  protected readonly polarityText = computed(() => {
    if (this.figure() === "0") return "Too close to tell text from background.";

    return getAPCAPolarity(this.#contrast()) === "light-on-dark"
      ? "Light text on a dark background."
      : "Dark text on a light background.";
  });

  protected readonly rows = computed<RatingRow[]>(() => {
    const settings = this.#stateStore.typeSettings();
    const ownRow: RatingRow = this.#rowFor(
      "own",
      "YOUR TYPE",
      // The visitor's own size, not the row it is rated on: the slider says
      // 17px, and a caption saying 18px would contradict the control that set
      // it. Which row the table used is in the note under the list.
      `${settings.fontSize}px / ${settings.fontWeight}`,
      this.#fontSizeKey(),
      this.#fontWeight(),
      false
    );

    const references = REFERENCE_ROWS.map((row, index) => this.#rowFor(
      row.caption,
      row.caption,
      `${row.fontSizeKey} / ${row.fontWeight}`,
      row.fontSizeKey,
      row.fontWeight,
      index === 0
    ));

    return [ownRow, ...references];
  });

  /**
   * The sentence that explains why the same pair passes at one size and fails
   * at another - the draft's `sizeNote`, carried over.
   *
   * Where the pair fails it says what would carry it, through
   * `smallestPassingFontSize()` and `lightestPassingFontWeight()`. The weight
   * those name can sit above what the `WEIGHT` slider reaches: the note is
   * about the visitor's page, not about the preview's controls.
   */
  protected readonly sizeNote = computed(() => {
    const settings = this.#stateStore.typeSettings();
    const sizeKey = this.#fontSizeKey();
    const weight = this.#fontWeight();
    const requiredLc = getRequiredLc(sizeKey, weight);
    const ratedOn = sizeKey === `${settings.fontSize}px`
      ? `At ${settings.fontSize}px / ${weight}`
      : `At ${settings.fontSize}px / ${weight}, which the table rates on its ${sizeKey} row,`;

    const requirement = requiredLc === null
      ? `${ratedOn} the table sets no requirement.`
      : `${ratedOn} the requirement is Lc ${requiredLc}.`;

    return `${requirement} ${this.#consequence(requiredLc, sizeKey, weight)}`;
  });


  #rowFor(key: string,
          caption: string,
          spec: string,
          fontSizeKey: FontSize,
          fontWeight: FontWeight,
          startsReference: boolean): RatingRow {
    const requiredLc = getRequiredLc(fontSizeKey, fontWeight);
    const state = rowState(Math.abs(this.#contrast()), requiredLc);

    return {key, caption, spec, state, startsReference, verdict: verdictFor(state, requiredLc)};
  }


  #consequence(requiredLc: number | null,
               fontSizeKey: FontSize,
               fontWeight: FontWeight): string {
    const contrast = this.#contrast();

    if (rowState(Math.abs(contrast), requiredLc) === "pass") {
      return "A smaller size or a lighter weight asks for more.";
    }

    const size = smallestPassingFontSize(contrast, fontWeight);
    const weight = lightestPassingFontWeight(contrast, fontSizeKey);

    if (size !== null && weight !== null) {
      return `This pair first passes at ${size} on this weight, or at weight ${weight} at this size.`;
    }

    if (size !== null) return `This pair first passes at ${size} on this weight.`;
    if (weight !== null) return `This pair first passes at weight ${weight} at this size.`;

    return "No size or weight in the table carries this pair.";
  }

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
