import {computed, DOCUMENT, effect, inject, Service, signal} from "@angular/core";
import {injectDispatch} from "@ngrx/signals/events";
import {AppStateStore} from "@core/app-state.store";
import {contrastEvents} from "@core/contrast/contrast.events";
import {SamplePlacement} from "@contrast-type/models/sample-page.model";


/**
 * The attribute a drop target carries, holding the `SAMPLE_ELEMENTS` key of
 * the element it stands for.
 *
 * An attribute rather than a registry of components: the release has to name
 * the element under a finger that may never have entered it, and the DOM is
 * the only thing that knows what is under a point.
 */
const TARGET_ATTRIBUTE = "data-place-target";

const TARGET_SELECTOR = `[${TARGET_ATTRIBUTE}]`;

/**
 * The attribute on the box a release is measured against - the same box the
 * hairline that says where the two sides are is drawn across, so what the
 * visitor aims at is what decides the side.
 *
 * It is the outlined box rather than the drop target: a mark's target is its
 * whole row, badge and gutter included, and a midline through that would sit
 * somewhere other than the middle of the words. `src/styles.css` draws the
 * line off this same attribute.
 *
 * **Present only while a chip is carried**, which is the only time either job
 * is asked for - and it is what keeps the line off a page nobody is colouring.
 */
const SPLIT_ATTRIBUTE = "data-place-sides";

const SPLIT_SELECTOR = `[${SPLIT_ATTRIBUTE}]`;


/**
 * Where a carried chip is: the element under the pointer, and which of that
 * element's two colours a release there would take.
 */
export interface PlacePoint {

  readonly elementKey: string;
  readonly side: SamplePlacement;

}


/**
 * The half of a drag that happens over the sample page: which element and
 * which side the pointer is on, and what a release does.
 *
 * **This is a drag-only concern, and the listeners below depend on it.** A chip
 * is picked up by `cdkDragStarted` and by nothing else, so `carriedChip` is
 * only ever set while CDK holds a pointer down - which is what makes a
 * `pointercancel` a cancel here rather than an accident. **Do not hang a tap
 * path off these listeners.** Below `lg` the preview is stacked under the whole
 * control column, so a finger has to scroll between a chip and an element; a
 * pan fires `pointercancel`, and a carry that survived a press would be thrown
 * away by the very scroll it was made for. The no-drag path for touch, mouse
 * and keyboard alike is the element's own mark, which opens the seven chips in
 * a popup - see `ColorChooser`.
 *
 * **The release is decided here and nowhere else.** A chip can be released on
 * an element, on the rest of the app, or nowhere at all, and only one of the
 * three is a placement - so one listener answers all three rather than the
 * chip guessing at `cdkDragEnded` whether it ended over something. There is no
 * double: the browser dispatches `pointerup` before the `mouseup`/`touchend`
 * CDK listens to, so this runs first and the guard in `onDragEnded` finds an
 * empty hand. That guard is the cover for the one case this cannot answer - a
 * drag whose `chipPickedUp` has not yet reached the effect below - so leave it
 * where it is.
 *
 * **The chip is captured when the carry starts, not read at the release.** The
 * effect re-runs on every change of `carriedChip`, so the closure always holds
 * the current one; reading the store inside the handler would be reading it
 * after whatever else ran on the same event.
 *
 * **The side is geometry, and this is the only place it is read.** An element
 * has two colours and a release has one point, so the box splits: the upper
 * half of what the visitor sees outlined takes the text colour, the lower half
 * the ground. `#sideOf()` says which box and why, and `src/styles.css` draws
 * the line the visitor aims either side of. The chooser is the other path and
 * asks the question outright - a drag is still the mouse's shortcut.
 *
 * **A service rather than component state**, because the elements that answer
 * a carry are twenty-two component instances and the pointer is one. It is not
 * app state either - nothing outside the page is about to ask which element a
 * finger is over - which is why it is not in the store beside `carriedChip`.
 */
@Service()
export class PlacementGesture {

  readonly #stateStore = inject(AppStateStore);
  readonly #dispatch = injectDispatch(contrastEvents);
  readonly #document = inject(DOCUMENT);

  readonly #at = signal<PlacePoint | null>(null);

  /** Whether a chip is in hand, which is to say: whether a drag is running. */
  readonly carrying = computed(() => this.#stateStore.carriedChip() !== null);

  /**
   * The key of the element the pointer is over while a chip is carried, or
   * null. Always null at rest: nothing marks the page when nothing is in hand.
   */
  readonly over = computed(() => this.#at()?.elementKey ?? null);

  /**
   * Which of that element's two colours a release would take, or null where
   * the pointer is over no element.
   *
   * The marks read it to say the side in words beside the element's name, so
   * a visitor learns what the halves mean from the one occurrence that has a
   * badge - `VerdictMark`.
   */
  readonly side = computed(() => this.#at()?.side ?? null);


  constructor() {
    effect(onCleanup => {
      const source = this.#stateStore.carriedChip();

      if (!source) {
        this.#at.set(null);

        return;
      }

      const track = (event: Event) => this.#at.set(this.#targetOf(event as PointerEvent));
      const release = (event: Event) => {
        const at = this.#targetOf(event as PointerEvent);

        if (at) {
          this.#dispatch.colorPlaced({elementKey: at.elementKey, side: at.side, source});
        } else {
          this.#dispatch.chipPutDown();
        }
      };
      // A pan or a zoom takes the pointer away mid-drag, and CDK ends its own
      // drag on the same event. Only true while nothing but a drag can arm a
      // carry - see the class comment.
      const cancel = () => this.#dispatch.chipPutDown();
      // Escape ends the carry, so nothing is placed and the page stops
      // offering itself. It does not end CDK's drag: `DragRef` has no key
      // handling and no public cancel, so the chip keeps following the pointer
      // until it is let go. The click behind that release is the chip's to
      // answer for - its own drag guard is what keeps a released drag from
      // repainting the pair - and this service handles no click at all;
      // `verdict-mark.html` says why it must not. A follow-up rather than
      // something worked around here.
      const escape = (event: Event) => {
        if ((event as KeyboardEvent).key === "Escape") this.#dispatch.chipPutDown();
      };

      // On the document: a drag moves away from the chip immediately, and a
      // touch drag never sends a single event to what it is over.
      this.#document.addEventListener("pointermove", track);
      this.#document.addEventListener("pointerup", release);
      this.#document.addEventListener("pointercancel", cancel);
      this.#document.addEventListener("keydown", escape);

      onCleanup(() => {
        this.#document.removeEventListener("pointermove", track);
        this.#document.removeEventListener("pointerup", release);
        this.#document.removeEventListener("pointercancel", cancel);
        this.#document.removeEventListener("keydown", escape);
      });
    });
  }


  /**
   * The element key under the pointer, or null.
   *
   * **The event's own target answers it for a mouse, because the chip is
   * transparent to pointers while it drags** - `[class.pointer-events-none]`
   * in `palette-chips.html`. There is no CDK preview to be transparent
   * instead: with no `cdkDropList` there is no clone, and CDK translates the
   * chip's own element under the cursor. Take that class away and the hit test
   * returns the chip, `closest()` returns null, and every drag reads as a
   * cancel - with every spec still green, because a test DOM has no layout.
   *
   * **The point is looked up for a touch or a pen, and only there.** Those
   * capture the pointer implicitly to the element the gesture started on, so
   * the browser keeps delivering every event to the chip whatever its
   * `pointer-events` says; `elementFromPoint` is the only way to learn what is
   * under the finger. It is a synchronous hit test that forces a layout, so it
   * stays off the mouse's path rather than being a fallback for both, and a
   * layout-free test DOM returns nothing from it - which is why the specs
   * drive the target path.
   */
  #targetOf(event: PointerEvent): PlacePoint | null {
    const target = event.target instanceof Element
      ? event.target.closest(TARGET_SELECTOR)
      : null;
    const under = target ?? (event.pointerType === "mouse" ? null : this.#elementUnder(event));
    const elementKey = under?.getAttribute(TARGET_ATTRIBUTE);

    if (!under || !elementKey) return null;

    return {elementKey, side: this.#sideOf(under, event)};
  }


  /**
   * Which half of the element the pointer is in: the upper one takes the text
   * colour, the lower one the ground.
   *
   * **Halves of the outlined box, not of the drop target.** A mark's target is
   * its whole row - the badge's column and the hit area's minimum height
   * included - and a midline through that would fall somewhere other than the
   * middle of the words the visitor is aiming at. `SPLIT_ATTRIBUTE` marks the
   * box the line is drawn across, and this measures the same one.
   *
   * The ink on top, because that is the order the chooser's toggle reads in
   * and the order `SAMPLE_PLACEMENTS` is in - a visitor who learnt one knows
   * the other.
   *
   * **A box with no height answers with the ink.** A layout-free test DOM
   * reports every rect as zero, and the midline of a zero-height box is its
   * own top edge - so every release would read as a ground, on every element,
   * with every spec still green. The ink is the side a page opens in and the
   * one a drag is for.
   */
  #sideOf(target: Element, event: PointerEvent): SamplePlacement {
    const box = target.matches(SPLIT_SELECTOR)
      ? target
      : target.querySelector(SPLIT_SELECTOR) ?? target;
    const rect = box.getBoundingClientRect();

    if (rect.height === 0) return "ink";

    return event.clientY < rect.top + rect.height / 2 ? "ink" : "ground";
  }


  #elementUnder(event: PointerEvent): Element | null {
    return this.#document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest(TARGET_SELECTOR) ?? null;
  }

}
