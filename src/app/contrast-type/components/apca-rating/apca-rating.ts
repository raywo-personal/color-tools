import {Component, computed, effect, inject} from "@angular/core";
import {LiveAnnouncer} from "@angular/cdk/a11y";
import {AppStateStore} from "@core/app-state.store";
import {getAPCAPolarity} from "@engine/contrast/apca-rating.helper";
import {typeRoleCaption} from "@engine/contrast/type-role.model";
import {figureElementOf, samplePageColors} from "@contrast-type/models/sample-page.model";
import {
  ElementVerdict,
  VerdictFact,
  elementVerdict,
  pageVerdicts,
  VERDICT_STATES,
  VerdictState,
  verdictCountSentence,
  verdictCountWord,
  verdictCounts,
  verdictFacts,
  verdictLabel
} from "@contrast-type/models/element-verdict.model";
import {VerdictShape} from "@contrast-type/components/verdict-shape/verdict-shape";


/** The row under the figure: the element it reads, and its verdict. */
interface FigureRow {

  readonly caption: string;
  /** The type the element is set in, as the visitor reads it - `13px / 400`. */
  readonly spec: string;
  readonly verdict: string;
  readonly state: VerdictState;

}


/** One of the four tallies beside the figure. */
interface CountEntry {

  readonly state: VerdictState;
  readonly count: number;
  /** The state in words, for a screen reader beside the shape. */
  readonly word: string;

}


/**
 * The Lc of the selected role's text, its verdict, and how the whole page
 * fares.
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
 * **The four tallies are the whole page**, not the selected role: they are the
 * count of the marks beside the preview, read off the same `elementVerdict()`
 * the marks are, so the row and the page cannot disagree. The figure says how
 * one role fares, the tallies say how much of the page does.
 *
 * **The figure is the absolute Lc.** `contrastAPCA()` is signed, and the sign
 * is a polarity rather than a magnitude - the verdict is reached through
 * `Math.abs()`, so a minus on the hero figure would suggest a deficit it never
 * causes. Whole numbers, like the table's own requirements, and rounded down
 * rather than to the nearest - `elementVerdict()` says why.
 *
 * **A fail is not told by colour.** `CLAUDE.md` keeps `danger` for the failed
 * copy, so the carriers here are the shape of the mark and the wording, which
 * names the Lc the table asked for.
 *
 * **Nothing here is a live region.** The Lc changes on every frame of a slider
 * drag and on every move of the colour picker, so a polite region would queue
 * a hundred sentences and an assertive one would talk over the visitor. The
 * tally is announced instead, and only where it actually moved - see
 * `#countsAnnounced`.
 */
@Component({
  selector: "ct-apca-rating",
  imports: [VerdictShape],
  templateUrl: "./apca-rating.html",
  host: {
    "class": "block"
  }
})
export class ApcaRating {

  readonly #stateStore = inject(AppStateStore);
  readonly #announcer = inject(LiveAnnouncer);

  readonly #role = this.#stateStore.typeRole;

  readonly #colors = computed(() => samplePageColors(
    this.#stateStore.contrastColors(),
    this.#stateStore.currentPalette()
  ));

  readonly #verdict = computed<ElementVerdict>(() => elementVerdict(
    figureElementOf(this.#role()),
    this.#colors(),
    this.#stateStore.typeRoles()
  ));

  protected readonly caption = computed(() => typeRoleCaption(this.#role()));

  protected readonly figure = computed(() => String(this.#verdict().lc));

  /** The whole page's tally, read by the row of shapes and by the announcement. */
  readonly #pageCounts = computed(() => verdictCounts(
    pageVerdicts(this.#colors(), this.#stateStore.typeRoles())
  ));

  protected readonly counts = computed<readonly CountEntry[]>(() => {
    const counts = this.#pageCounts();

    return VERDICT_STATES.map(state => ({
      state,
      count: counts[state],
      word: verdictCountWord(state)
    }));
  });

  protected readonly row = computed<FigureRow>(() => {
    const verdict = this.#verdict();

    return {
      caption: verdict.element.caption,
      // The element's own size, not the row it is rated on: the slider says
      // 13px, and a spec saying 14px would contradict the control that set
      // it. Which row the table used is in the note under the row.
      spec: `${verdict.fontSize}px / ${verdict.fontWeight}`,
      verdict: verdictLabel(verdict),
      state: verdict.state
    };
  });

  /**
   * What the visitor can do about the row above, and what the pair itself
   * reaches - two rows of label and value rather than two sentences.
   *
   * **Prose here said things only the code knows.** It named which row of the
   * APCA table a size was rated on and which ground an element sat on, and
   * buried the one number a visitor acts on - the size that would carry it -
   * in the middle of a clause. The size and the weight are their own sliders,
   * and the pair's Lc is what the screen is named after; nothing else in the
   * derivation is theirs to read.
   *
   * `Would pass at` is left out where the element already passes: what would
   * carry something already carried is a question nobody asked.
   */
  protected readonly facts = computed<readonly VerdictFact[]>(() => {
    const verdict = this.#verdict();
    const rows = verdictFacts(verdict, this.#stateStore.currentPalette())
      .filter(fact => fact.label === "Would pass at");

    return [...rows, this.#pairFact()];
  });

  /**
   * The pair's own Lc and which way round it is.
   *
   * At a figure of 0 there is no polarity to name - the two colors are at the
   * same perceived lightness, which `getAPCAPolarity()` still reports as
   * `dark-on-light` because it splits at zero.
   */
  readonly #pairFact = computed<VerdictFact>(() => {
    const contrast = this.#stateStore.contrastColors().contrast;
    const figure = Math.floor(Math.abs(contrast));

    if (figure === 0) return {label: "Pair", value: "Lc 0 · too close to tell apart"};

    const polarity = getAPCAPolarity(contrast) === "light-on-dark"
      ? "light on dark"
      : "dark on light";

    return {label: "Pair", value: `Lc ${figure} · ${polarity}`};
  });

  /** The tally as it was last spoken, so an unchanged one is not repeated. */
  #spoken: string | null = null;

  /**
   * The tally, announced when it moves.
   *
   * A colour change and a slider drag replace every mark beside the preview
   * without moving focus, and no control says what came back. The count is
   * the one sentence that covers the whole page, so it is what gets announced.
   *
   * **Only when it changed, and never on the first render.** The Lc moves on
   * every frame of a drag while the tally usually stands still, which is what
   * makes the tally announceable at all; the opening state is what the visitor
   * arrived at, not something that just happened.
   *
   * Polite: the visitor is holding a slider or a picker, and there is nothing
   * to interrupt.
   */
  readonly #countsAnnounced = effect(() => {
    const sentence = verdictCountSentence(this.#pageCounts());
    const first = this.#spoken === null;
    const moved = this.#spoken !== sentence;

    this.#spoken = sentence;

    if (first || !moved) return;

    void this.#announcer.announce(`On the page: ${sentence}.`, "polite");
  });

}
