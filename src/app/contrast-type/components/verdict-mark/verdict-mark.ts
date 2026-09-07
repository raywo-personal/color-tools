import {Component, computed, inject, input} from "@angular/core";
import {Color} from "chroma-js";
import {injectDispatch} from "@ngrx/signals/events";
import {AppStateStore} from "@core/app-state.store";
import {contrastEvents} from "@core/contrast/contrast.events";
import {findOptimalTextColor} from "@engine/contrast/optimal-text-color.helper";
import {SampleGround, samplePageColors} from "@contrast-type/models/sample-page.model";
import {
  elementName,
  missedRequirement,
  verdictFor,
  verdictLabel
} from "@contrast-type/models/element-verdict.model";
import {VerdictShape} from "@contrast-type/components/verdict-shape/verdict-shape";
import {VerdictPanel} from "@contrast-type/components/verdict-panel/verdict-panel";


/**
 * The verdict beside one element of the sample page: a mark that says how the
 * element fares, and opens the reasons in words.
 *
 * **The mark is anchored to its element, not placed in a gutter.** It wraps
 * the element and sits in a column of its own in front of it, so the two move
 * together: the draft positions the marks absolutely at fixed offsets, which
 * survives exactly one change of a size slider. The column is the glyph's
 * `size-4` slot plus the row's `gap-2`, and the button reaches past it on both
 * sides - the hit area is the full `size-11` the app asks of a control, while
 * the page only indents by a rem and a half.
 * `min-h-11` on the row is what keeps two stacked hit areas from overlapping,
 * at the price of the page reading a little airier than the draft.
 *
 * **Everything it is drawn in is computed against the surface it sits on.**
 * The page's colours are the visitor's, so a neutral token is guaranteed
 * against none of them: the glyph, the focus ring and the opened panel take
 * black or white, whichever APCA puts further from that surface. `surface` is
 * usually the element's own ground and is given separately where it is not -
 * the label on the filled button sits on the accent while its mark sits
 * beside the button, on the page.
 *
 * **The mark is a disclosure, and its name carries the verdict.** A screen
 * reader hears the element and how it fares before deciding whether to open
 * anything, so the mark is useful without being pressed; `aria-expanded`
 * says whether the panel is out. The name is sentence case, because a screen
 * reader spells the page's all-caps captions out letter by letter.
 *
 * **A failing element carries a dotted underline as well.** The mark is a
 * shape in a gutter, and a shape beside a line is not the line itself: the
 * decoration is on the element, so the text that came up short says so
 * wherever the eye lands. It is drawn on the wrapper rather than on the
 * element, because text decoration propagates into everything in flow below
 * it and the element is the caller's markup - it also means a link that draws
 * its own underline keeps drawing it. `unrated` gets none: the table declined
 * to rate that size, which is not the same as the text falling short.
 *
 * **The panel opens into the page's flow, under the element.** An overlay
 * would be clipped by the preview's own `overflow-hidden`, and at 320px there
 * is no room beside an element for a tablet of text. The page moving down is
 * the price, and it keeps the verdict next to the thing it judges. The one
 * place that does not hold is a table cell - `panelBelow` and
 * `VerdictPanel`'s own comment say what happens there instead.
 */
@Component({
  selector: "ct-verdict-mark",
  imports: [VerdictShape, VerdictPanel],
  templateUrl: "./verdict-mark.html",
  host: {
    "[class.block]": "!inline()",
    "[class.inline]": "inline()"
  }
})
export class VerdictMark {

  readonly #stateStore = inject(AppStateStore);
  readonly #dispatch = injectDispatch(contrastEvents);

  /** The `SAMPLE_ELEMENTS` key of the element this mark judges. */
  readonly elementKey = input.required<string>();

  /**
   * The page surface the mark itself sits on, which decides what it is drawn
   * in. Defaults to nothing and falls back to the element's own ground - see
   * `surfaceColor`.
   */
  readonly surface = input<SampleGround | null>(null);

  /**
   * Whether the element is a word inside a line rather than a block of its
   * own. Inline, the mark loses the gutter column and the row's minimum
   * height: a link in a paragraph cannot indent, and a 44px row inside
   * running text would open a gap in it.
   */
  readonly inline = input(false);

  /**
   * Whether this mark carries its own panel underneath it.
   *
   * False leaves the panel to the caller, which then has to place a
   * `ct-verdict-panel` for the same element somewhere - otherwise the mark
   * opens nothing and `aria-expanded` lies. The table's three marks are the
   * reason it exists; `VerdictPanel` says why.
   */
  readonly panelBelow = input(true);

  readonly #colors = computed(() => samplePageColors(
    this.#stateStore.contrastColors(),
    this.#stateStore.currentPalette()
  ));

  protected readonly verdict = computed(() => verdictFor(
    this.elementKey(),
    this.#colors(),
    this.#stateStore.typeRoles()
  ));

  protected readonly open = computed(() => this.#stateStore.openVerdict() === this.elementKey());

  /** The colour the surface is painted in, so APCA has something to measure. */
  readonly #surfaceColor = computed<Color>(() => {
    const surface = this.surface();

    return surface === null ? this.verdict().ground : this.#colors()[surface];
  });

  /**
   * Black or white, whichever APCA puts further from the surface.
   *
   * The maximum rather than a threshold: on a mid-lightness page neither
   * clears the table, and that is the colour the visitor picked rather than
   * something this mark can fix. No size is passed - the glyph is a shape, and
   * the table's rows are about text.
   */
  protected readonly inkHex = computed(() => findOptimalTextColor(this.#surfaceColor()).color.hex("rgb"));

  protected readonly label = computed(() => {
    const verdict = this.verdict();

    return `${elementName(verdict.element)}: ${verdictLabel(verdict).toLowerCase()}`;
  });

  protected readonly missed = computed(() => missedRequirement(this.verdict()));


  protected toggle(): void {
    this.#dispatch.verdictToggled(this.elementKey());
  }

}
