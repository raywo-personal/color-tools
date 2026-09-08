import {Component, computed, inject} from "@angular/core";
import {injectDispatch} from "@ngrx/signals/events";
import {AppStateStore} from "@core/app-state.store";
import {contrastEvents} from "@core/contrast/contrast.events";
import {colorName} from "@engine/color/color-name.helper";
import {chipLabelFor, colorOf} from "@contrast-type/models/chip-source.model";
import {SAMPLE_ELEMENTS, samplePage} from "@contrast-type/models/sample-page.model";
import {
  VerdictState,
  elementName,
  verdictFor,
  verdictWord
} from "@contrast-type/models/element-verdict.model";
import {VerdictShape} from "@contrast-type/components/verdict-shape/verdict-shape";
import {InfoButton} from "@common/components/info-button/info-button";


/** One placement, as the ledger shows it. */
interface PlacedRow {

  readonly key: string;
  /** `Small print`, from `elementName()` - the name every path uses. */
  readonly name: string;
  readonly state: VerdictState;
  /** The state in words, because a shape is never the only carrier. */
  readonly word: string;
  readonly swatch: string;
  readonly color: string;
  /** The chip the colour came off: `P1` to `P5`, `T` or `BG`. */
  readonly handle: string;
  /**
   * Which of the element's two colours the placement took, in the words the
   * chip's own name uses for the pair - see `PaletteChips`.
   */
  readonly side: string;
  readonly lc: number;
  readonly resetLabel: string;

}


/**
 * The record of what the visitor put on the page: a row per placement, and the
 * one gesture that clears the lot.
 *
 * **Every row reads `verdictFor()` and measures nothing itself.** The mark
 * beside the element, the page's tally, the rating's own row and this ledger
 * are four readers of one function, which is what stops two of them
 * disagreeing about the same element. A row that computed its own Lc would be
 * a fifth answer.
 *
 * **The word travels with the shape.** A tick and a cross can be read off a
 * row; the arrow and the dash cannot, so each row says how the element fares
 * in words as well - the draft's column of bare glyphs does not port. Same
 * reason `page-verdicts` keeps its four words.
 *
 * **A row per named element, not per occurrence.** A placement is keyed by the
 * element, and the running text, the nav items, the table's cells and the
 * small print each appear more than once in the preview at one size in one
 * ink: the body row says once that the running text moved, the way there is
 * one mark per named element rather than one per paragraph.
 *
 * **The rows are in the page's reading order**, taken by walking
 * `SAMPLE_ELEMENTS` rather than the placements. That is also the guard the
 * type asks for - `ElementPlacements` permits a key mapped to `undefined` -
 * and it keeps the ledger in the order the marks and the tally are in, rather
 * than in the order the visitor happened to drop things.
 *
 * **A row names the chip the colour came off, and what the colour is called.**
 * The handle - `P3`, `T`, `BG` - is the word on the chip the visitor pressed or
 * dragged, so the row points at something they can still see; that is the
 * whole of why it is here rather than `roleCaptionFor()`, which names a slot
 * by what the generator did with it and is the Studio's question. One word per
 * screen, as #134 asked: do not print both. `colorName()` stands beside the
 * handle, because a handle identifies a chip without saying anything about it
 * and a swatch is a colour that needs a carrier which is not the colour
 * itself.
 *
 * **The side is the text color or the background, not the name of a ground.**
 * Which of the element's two colours a placement took is
 * `SampleElement.placement`, and these are the two words the row above the
 * chips already uses for the pair. What the page's derived surfaces are called
 * - `accentSoft`, `muted`, `field` - is true of the derivation and not of the
 * page, which is why `verdictFacts()` leaves it out as well.
 *
 * **Empty, the block says only that nothing is placed.** What colours the
 * elements instead is true whether or not the visitor has placed anything, so
 * it stands behind the caption's `i` rather than in the empty state - see
 * `InfoButton`. The caption keeps the count, which is what a visitor comes
 * back to the block for.
 *
 * **Nothing here announces.** A placement and both resets are announced by
 * `placementAnnouncedEffect`, so the sentence travels with the event rather
 * than with one of the three ways of raising it. Do not add a `LiveAnnouncer`
 * call to the buttons below: two polite announcements in one change-detection
 * pass delete each other.
 */
@Component({
  selector: "ct-placed-colors",
  imports: [VerdictShape, InfoButton],
  templateUrl: "./placed-colors.html",
  host: {
    "class": "block"
  }
})
export class PlacedColors {

  readonly #stateStore = inject(AppStateStore);
  readonly #dispatch = injectDispatch(contrastEvents);

  readonly #page = computed(() => samplePage(
    this.#stateStore.contrastColors(),
    this.#stateStore.currentPalette(),
    this.#stateStore.placements()
  ));

  protected readonly rows = computed<readonly PlacedRow[]>(() => {
    const placements = this.#stateStore.placements();
    const pair = this.#stateStore.contrastColors();
    const palette = this.#stateStore.currentPalette();
    const page = this.#page();
    const roles = this.#stateStore.typeRoles();
    const rows: PlacedRow[] = [];

    for (const element of SAMPLE_ELEMENTS) {
      const source = placements[element.key];

      if (!source) continue;

      const verdict = verdictFor(element.key, page, roles);
      const color = colorOf(source, pair, palette);
      const name = elementName(element);

      rows.push({
        key: element.key,
        name,
        state: verdict.state,
        word: verdictWord(verdict.state),
        swatch: color.hex("rgb"),
        color: colorName(color),
        handle: chipLabelFor(source),
        side: element.placement === "ink" ? "as the text color" : "as the background",
        lc: verdict.lc,
        // The same wording the announcement uses: six elements default to a
        // palette colour rather than to anything of the page's own, so
        // "its default color" is the one phrase true of all of them.
        resetLabel: `Reset ${name} to its default color`
      });
    }

    return rows;
  });

  protected readonly hasRows = computed(() => this.rows().length > 0);

  /**
   * The block's caption with the count the draft puts beside it, and without
   * it while the block is empty - there the sentence below says what "none"
   * means, which a `0` would not.
   */
  protected readonly caption = computed(() => this.hasRows()
    ? `PLACED COLORS · ${this.rows().length}`
    : "PLACED COLORS");


  protected reset(key: string): void {
    this.#dispatch.placementReset(key);
  }


  protected resetPage(): void {
    this.#dispatch.placementsReset();
  }

}
