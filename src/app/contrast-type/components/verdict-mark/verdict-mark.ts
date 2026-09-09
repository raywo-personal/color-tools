import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChild
} from "@angular/core";
import {CdkTrapFocus} from "@angular/cdk/a11y";
import {
  CdkConnectedOverlay,
  CdkOverlayOrigin,
  ConnectedPosition,
  ScrollStrategyOptions
} from "@angular/cdk/overlay";
import {CdkScrollable} from "@angular/cdk/scrolling";
import {Color} from "chroma-js";
import {injectDispatch} from "@ngrx/signals/events";
import {AppStateStore} from "@core/app-state.store";
import {contrastEvents} from "@core/contrast/contrast.events";
import {findOptimalTextColor} from "@engine/contrast/optimal-text-color.helper";
import {SampleGround, samplePage, sideCaption} from "@contrast-type/models/sample-page.model";
import {
  elementName,
  missedRequirement,
  verdictFor,
  verdictWord
} from "@contrast-type/models/element-verdict.model";
import {PlacementGesture} from "@contrast-type/services/placement-gesture.service";
import {ColorChooser} from "@contrast-type/components/color-chooser/color-chooser";
import {VerdictShape} from "@contrast-type/components/verdict-shape/verdict-shape";
import {VerdictPanel} from "@contrast-type/components/verdict-panel/verdict-panel";


/**
 * The app's handle on one element of the sample page: a mark that says how the
 * element fares, opens the reasons in words, offers the palette, and answers a
 * chip released on the element.
 *
 * **One handle per element, and it is this one.** The mark already existed
 * once per named element, already carried the element's name, and was already
 * the element's only stop in the tab order - so `Tab` to an element and press
 * is a path the page had before a colour could be placed on it. A second
 * control per element would have doubled the preview's tab stops and given one
 * element two names to be reached by, which is the same drift the "one mark
 * per named element" rule forbids. What grew is what the press opens, not how
 * many things there are to press: the verdict rows, and under them the chips.
 * The popup is what says both jobs - `dialogLabel` - because a name spoken on
 * every pass through the page cannot carry an inventory.
 *
 * **The mark is anchored to its element, not placed in a gutter.** It wraps
 * the element and sits in a column of its own in front of it, so the two move
 * together: the draft positions the marks absolutely at fixed offsets, which
 * survives exactly one change of a size slider. The column is the badge's
 * `size-5` slot plus the row's `gap-2`, and the button reaches past it on both
 * sides - the hit area is the full `size-11` the app asks of a control, while
 * the page only indents by one and three quarter rem.
 * `min-h-11` on the row is what keeps two stacked hit areas from overlapping,
 * at the price of the page reading a little airier than the draft.
 *
 * **The mark is a badge in the app's colours, and that is what makes it a
 * control.** Drawn as a bare glyph in the page's own ink it was punctuation
 * the visitor had apparently set, and nobody pressed it. The badge takes
 * `panel`, `text` and `field` like the popup it opens: the app looking at the
 * page from outside, in the app's surfaces, with a hover state a glyph could
 * not have.
 *
 * **Its rim and its focus ring are still computed against the page.** They are
 * the edge between the app's badge and the visitor's colour, and a neutral
 * token is guaranteed against none of them - so both take black or white,
 * whichever APCA puts further from that surface. `surface` is usually the
 * element's own ground and is given separately where it is not - the label on
 * the filled button sits on the accent while its mark sits beside the button,
 * on the page.
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
 *
 * **The whole mark is the element's drop target, badge included.** The
 * attribute sits on the host rather than on the wrapped copy, so every element
 * has at least the button's own hit area to release a chip on - three of the
 * table's marks wrap a few characters and one wraps a word inside a line.
 * `PlacementGesture` reads the attribute; do not move it onto the copy.
 *
 * **The element takes both of its colours, and a release has one point, so the
 * outlined box splits.** A hairline appears across it while a chip is carried:
 * release in the upper half and the chip becomes the element's text colour, in
 * the lower half its ground. The split is measured against the outlined copy
 * rather than against the drop target, because the target is this whole row -
 * badge and gutter included - and a midline through that would fall somewhere
 * other than the middle of the words. `data-place-sides` is the one attribute
 * both jobs run off: `src/styles.css` draws the line and `PlacementGesture`
 * measures against the same box.
 *
 * **And the name says which side the release is on.** The halves are geometry
 * and geometry explains nothing; the badge under the element already names it
 * while a chip is carried, so the side goes there beside the name rather than
 * as a second label inside each half - which is also the only thing that
 * would fit on a word inside a line. The chooser asks the same question
 * outright, in words, for whoever is not dragging.
 *
 * **The mark is one occurrence of the element, and the others are
 * `PlaceTarget`.** Five elements appear more than once, and a mark wraps one
 * of them: the rest carry the directive, which draws this same outline and
 * takes the same drop without adding a second mark, a second name or a second
 * tab stop. The two are seen side by side on one element, so a change to what
 * `dashed()` means here belongs there as well. `named()` does not port whole -
 * an occurrence with no badge has no name to show, and `PlaceTarget` says why
 * it therefore answers a carried chip only.
 *
 * **What is drawn while a chip is carried is the app's chrome on the visitor's
 * page**, so the outline and the name take the same APCA foreground the rim
 * takes, against the same `surface`. That is why `surface` has to be right on
 * every mark and not only on the three whose ground is not what is behind
 * them.
 *
 * **The popup is also the no-drag way to colour the element**, for a keyboard
 * and for a finger alike: a drag cannot be performed from a keyboard, and
 * below `lg` the preview is stacked under the whole control column, so a
 * finger cannot practically drag to it either. Tab or tap to the mark, press,
 * and the palette is there - `ColorChooser`.
 */
@Component({
  selector: "ct-verdict-mark",
  imports: [VerdictShape, VerdictPanel, ColorChooser, CdkOverlayOrigin, CdkConnectedOverlay, CdkTrapFocus],
  templateUrl: "./verdict-mark.html",
  host: {
    "[class.block]": "!inline()",
    "[class.inline]": "inline()",
    "[attr.data-place-target]": "elementKey()",
    "(pointerenter)": "onHover(true)",
    "(pointerleave)": "onHover(false)",
    "(focusin)": "onFocusWithin(true)",
    "(focusout)": "onFocusWithin(false)"
  }
})
export class VerdictMark {

  readonly #stateStore = inject(AppStateStore);
  readonly #dispatch = injectDispatch(contrastEvents);
  readonly #gesture = inject(PlacementGesture);

  /** The `SAMPLE_ELEMENTS` key of the element this mark judges. */
  readonly elementKey = input.required<string>();

  /**
   * The page surface the mark itself sits on, which decides what its rim and
   * its focus ring are drawn in. Defaults to nothing and falls back to the
   * element's own ground - see `surfaceColor`.
   */
  readonly surface = input<SampleGround | null>(null);

  /**
   * Whether the element is a word inside a line rather than a block of its
   * own. Inline, the mark loses the gutter column and the row's minimum
   * height: a link in a paragraph cannot indent, and a 44px row inside
   * running text would open a gap in it.
   */
  readonly inline = input(false);

  readonly #page = computed(() => samplePage(
    this.#stateStore.contrastColors(),
    this.#stateStore.currentPalette(),
    this.#stateStore.placements()
  ));

  protected readonly verdict = computed(() => verdictFor(
    this.elementKey(),
    this.#page(),
    this.#stateStore.typeRoles()
  ));

  protected readonly open = computed(() => this.#stateStore.openVerdict() === this.elementKey());

  /** The colour the surface is painted in, so APCA has something to measure. */
  readonly #surfaceColor = computed<Color>(() => {
    const surface = this.surface();

    return surface === null ? this.verdict().ground : this.#page().colors[surface];
  });

  /**
   * Black or white, whichever APCA puts further from the surface - the badge's
   * rim and the focus ring, the two edges that meet the page.
   *
   * The maximum rather than a threshold: on a mid-lightness page neither
   * clears the table, and that is the colour the visitor picked rather than
   * something this mark can fix. No size is passed - a rim is a line, and the
   * table's rows are about text.
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

  /** The element's all-caps name, as the page's own badge shows it. */
  protected readonly caption = computed(() => this.verdict().element.caption);

  /**
   * What the badge under the element says: its name, and while a chip is over
   * this element the side a release would land on.
   *
   * The side only while the pointer is on this element, because that is when
   * the answer is about to be used - the other twenty-one are outlined to say
   * a colour may go there, not to say where in them.
   */
  protected readonly badge = computed(() => {
    const side = this.#gesture.side();

    if (!this.over() || side === null) return this.caption();

    return `${this.caption()} · ${sideCaption(this.verdict().element, side)}`;
  });

  /**
   * What the popup is, in both of its jobs. The mark's own name stays the
   * verdict: it is what a screen reader needs before deciding whether to press
   * anything, and it is spoken on every pass through the page.
   */
  protected readonly dialogLabel = computed(() =>
    `${elementName(this.verdict().element)}: verdict and color`);

  readonly #hovered = signal(false);
  readonly #focusedWithin = signal(false);

  protected readonly carrying = this.#gesture.carrying;

  /** Whether the pointer carrying a chip is over this element. */
  protected readonly over = computed(() => this.#gesture.over() === this.elementKey());

  /**
   * Whether the element shows its outline and its name.
   *
   * Every element at once while a chip is carried, so the visitor can see
   * where a colour may go; at rest only the one under the pointer or holding
   * focus, so nothing marks the page until it is asked.
   */
  protected readonly named = computed(() =>
    this.carrying() || this.#hovered() || this.#focusedWithin());

  /** Solid names the drop; dashed only offers it. */
  protected readonly dashed = computed(() => this.named() && !this.over());

  private readonly markButton = viewChild.required<ElementRef<HTMLElement>>("markButton");

  /**
   * The popup follows its mark while anything scrolls, and goes away once it
   * has itself left the window.
   *
   * The following is what `reposition` is for, and it needs the scroll
   * container registered - `cdkScrollable` on the page in `WebsitePreview`.
   * `autoClose` is the window's half only: it measures the **overlay** against
   * the viewport and knows nothing about the container the mark sits in, so it
   * is what closes a popup when the app's own page is scrolled. What closes it
   * when the preview is scrolled is `#closesWithItsMark` below.
   */
  protected readonly scrollStrategy = inject(ScrollStrategyOptions)
    .reposition({autoClose: true});

  /**
   * The scrolling page the mark sits on, where there is one: the preview
   * registers its scroll container as `cdkScrollable`, and a mark rendered
   * outside one - under a test renderer, say - has none.
   */
  readonly #pageScroll = inject(CdkScrollable, {optional: true});

  /**
   * Closes the popup once its mark has scrolled out of the visible page.
   *
   * The preview scrolls inside itself from `lg`, so a mark can leave the
   * visible page while staying well inside the window - and the panel then
   * stands over the app, in the app's colours, describing an element nobody
   * can see. `autoClose` does not reach this: it waits for the overlay itself
   * to clear the viewport, which is most of the page's height later. Nor can
   * the CDK be told to measure against the container from here -
   * `CdkConnectedOverlay` never hands its scrollables to the position
   * strategy, so `positionChange`'s `scrollableViewProperties` are all false.
   *
   * Out of view, not merely clipped: a mark half over the page's top edge is
   * still something the visitor can see the popup belongs to, and closing on
   * the first pixel of overlap would take the verdict away mid-scroll.
   *
   * The vertical axis alone, because that is the only one the page scrolls on
   * - `website-preview.html` says why it keeps `overflow-hidden` across.
   */
  readonly #closesWithItsMark = effect(onCleanup => {
    if (!this.open() || !this.#pageScroll) return;

    const pageScroll = this.#pageScroll;
    const mark = this.markButton().nativeElement;

    const subscription = pageScroll.elementScrolled().subscribe(() => {
      const bounds = pageScroll.getElementRef().nativeElement.getBoundingClientRect();
      const rect = mark.getBoundingClientRect();

      if (rect.bottom < bounds.top || rect.top > bounds.bottom) this.close();
    });

    onCleanup(() => subscription.unsubscribe());
  });


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


  protected onHover(over: boolean): void {
    this.#hovered.set(over);
  }


  protected onFocusWithin(inside: boolean): void {
    this.#focusedWithin.set(inside);
  }


  /**
   * **No branch for a chip in hand, and that is a claim about the gesture.** A
   * chip is only ever in hand while CDK holds a pointer down, and a drag's
   * release lands on a different element than its press, so the click the
   * browser then fires goes to the two targets' common ancestor and never to
   * this button. Nothing can therefore press a mark while something is
   * carried. Give a carry a way to survive a released pointer - a tap path,
   * say - and this needs to place instead of opening, or a drop will open a
   * verdict over the page it just changed.
   */
  protected toggle(): void {
    this.#dispatch.verdictToggled(this.elementKey());
  }


  /**
   * Escape closes it, as it closes every popup - and hands focus back to the
   * mark, because the popup takes it when it opens and closing without it
   * would drop the visitor at the top of the document.
   */
  protected onOverlayKeydown(event: KeyboardEvent): void {
    if (event.key !== "Escape") return;

    this.markButton().nativeElement.focus();
    this.close();
  }


  protected close(): void {
    if (this.open()) this.#dispatch.verdictToggled(this.elementKey());
  }

}
