import {computed, DOCUMENT, effect, inject, Service, signal} from "@angular/core";
import {injectDispatch} from "@ngrx/signals/events";
import {AppStateStore} from "@core/app-state.store";
import {contrastEvents} from "@core/contrast/contrast.events";


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
 * The half of a drag that happens over the sample page: which element the
 * pointer is on, and what a release does.
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

  readonly #over = signal<string | null>(null);

  /** Whether a chip is in hand, which is to say: whether a drag is running. */
  readonly carrying = computed(() => this.#stateStore.carriedChip() !== null);

  /**
   * The key of the element the pointer is over while a chip is carried, or
   * null. Always null at rest: nothing marks the page when nothing is in hand.
   */
  readonly over = this.#over.asReadonly();


  constructor() {
    effect(onCleanup => {
      const source = this.#stateStore.carriedChip();

      if (!source) {
        this.#over.set(null);

        return;
      }

      const track = (event: Event) => this.#over.set(this.#targetOf(event as PointerEvent));
      const release = (event: Event) => {
        const elementKey = this.#targetOf(event as PointerEvent);

        if (elementKey) {
          this.#dispatch.colorPlaced({elementKey, source});
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
  #targetOf(event: PointerEvent): string | null {
    const target = event.target instanceof Element
      ? event.target.closest(TARGET_SELECTOR)
      : null;
    const under = target ?? (event.pointerType === "mouse" ? null : this.#elementUnder(event));

    return under?.getAttribute(TARGET_ATTRIBUTE) ?? null;
  }


  #elementUnder(event: PointerEvent): Element | null {
    return this.#document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest(TARGET_SELECTOR) ?? null;
  }

}
