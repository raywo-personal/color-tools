import {Component, computed, effect, inject} from "@angular/core";
import {LiveAnnouncer} from "@angular/cdk/a11y";
import {AppStateStore} from "@core/app-state.store";
import {samplePageColors} from "@contrast-type/models/sample-page.model";
import {
  pageVerdicts,
  VERDICT_STATES,
  VerdictState,
  verdictCountSentence,
  verdictCountWord,
  verdictCounts
} from "@contrast-type/models/element-verdict.model";
import {VerdictShape} from "@contrast-type/components/verdict-shape/verdict-shape";


/** One of the four tallies. */
interface CountEntry {

  readonly state: VerdictState;
  readonly count: number;
  /** The state in words, beside the shape and for a screen reader. */
  readonly word: string;

}


/**
 * How the whole page fares: one tally per state, and the legend for the marks
 * beside the preview in one.
 *
 * **It is about the page, not about the selected role.** It counts the marks
 * beside the preview, read off the same `elementVerdict()` the marks are, so
 * the two cannot disagree - which is why it stands with the pair that produced
 * them rather than inside the rating, where it read as a second answer about
 * the role.
 *
 * **A line rather than a column.** Four stacked rows pushed the type controls
 * below the fold on a laptop, and the sliders are what a visitor reaches for
 * next. Wrapped in a row the four cost one line, or two at the narrow end.
 *
 * **The word travels with the shape.** This is the one place all four shapes
 * stand together, so it is where they get taught: a tick and a cross can be
 * read off a page, an arrow and a dash cannot. Dropping the words would have
 * made the line shorter and the shapes unreadable.
 *
 * **Nothing here is a live region.** The tally changes on a colour change and
 * on a slider drag without moving focus, so it is announced when it moves -
 * see `#countsAnnounced` - rather than held in a region that would queue a
 * sentence per frame.
 */
@Component({
  selector: "ct-page-verdicts",
  imports: [VerdictShape],
  templateUrl: "./page-verdicts.html",
  host: {
    "class": "block"
  }
})
export class PageVerdicts {

  readonly #stateStore = inject(AppStateStore);
  readonly #announcer = inject(LiveAnnouncer);

  readonly #colors = computed(() => samplePageColors(
    this.#stateStore.contrastColors(),
    this.#stateStore.currentPalette()
  ));

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
