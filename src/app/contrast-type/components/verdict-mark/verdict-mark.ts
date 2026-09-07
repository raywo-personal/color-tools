import {Component, computed, inject, input} from "@angular/core";
import {CdkConnectedOverlay, CdkOverlayOrigin, ConnectedPosition} from "@angular/cdk/overlay";
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
  verdictWord
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
 * **The mark is computed against the surface it sits on.** The page's colours
 * are the visitor's, so a neutral token is guaranteed against none of them:
 * the glyph and the focus ring take black or white, whichever APCA puts
 * further from that surface. `surface` is usually the element's own ground and
 * is given separately where it is not - the label on the filled button sits on
 * the accent while its mark sits beside the button, on the page. The popup it
 * opens needs none of this: it is drawn on the app's own surfaces.
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
 * **The verdict opens as a popup that moves nothing.** In the page's flow it
 * pushed the elements below it down, so reading one verdict rearranged the
 * page it was about - and inside a table cell it re-apportioned the columns.
 * A CDK overlay renders into a container on the body instead: nothing in the
 * preview moves, the preview's own `overflow-hidden` cannot clip it, and the
 * position strategy finds room at the narrow end where a panel beside an
 * element has none.
 *
 * **The popup is drawn in the app's colours, not the page's** - see
 * `VerdictPanel`. It is the app looking at the visitor's page from outside,
 * and it is meant to read as exactly that.
 */
@Component({
  selector: "ct-verdict-mark",
  imports: [VerdictShape, VerdictPanel, CdkOverlayOrigin, CdkConnectedOverlay],
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

    // A colon rather than a space: three of the four words are verbs that
    // agree with the element, but `not rated` is not - `Eyebrow not rated`
    // reads as a missing `is`, and `Eyebrow: not rated` reads for all four.
    return `${elementName(verdict.element)}: ${verdictWord(verdict.state)}`;
  });

  protected readonly missed = computed(() => missedRequirement(this.verdict()));


  /**
   * Where the popup sits: under the mark and aligned to it, then above it, and
   * flipped to the right edge where the left one has no room.
   *
   * Four fallbacks rather than one position plus `push`: pushing alone slides
   * a popup until it fits and can end up covering the element it is about,
   * which is the one thing it must not hide.
   */
  // Not `readonly ConnectedPosition[]`: `cdkConnectedOverlayPositions` takes a
  // mutable array, and a readonly one fails the template type check.
  protected readonly positions: ConnectedPosition[] = [
    {originX: "start", originY: "bottom", overlayX: "start", overlayY: "top", offsetY: 8},
    {originX: "start", originY: "top", overlayX: "start", overlayY: "bottom", offsetY: -8},
    {originX: "end", originY: "bottom", overlayX: "end", overlayY: "top", offsetY: 8},
    {originX: "end", originY: "top", overlayX: "end", overlayY: "bottom", offsetY: -8}
  ];

  /**
   * The popup's id, so the mark can point `aria-describedby` at it while it is
   * open.
   *
   * The overlay renders on the body, nowhere near the button in the DOM, so a
   * screen reader would otherwise never reach the rows from the mark. The name
   * still carries the verdict on its own - the description is the detail
   * behind it.
   */
  protected readonly panelId = computed(() => `verdict-${this.elementKey()}`);


  protected toggle(): void {
    this.#dispatch.verdictToggled(this.elementKey());
  }


  /** Escape closes it, as it closes every popup. */
  protected onOverlayKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") this.close();
  }


  protected close(): void {
    if (this.open()) this.#dispatch.verdictToggled(this.elementKey());
  }

}
