import {Component, computed, inject, signal} from "@angular/core";
import {CdkDrag, CdkDragEnd, DragStartDelay} from "@angular/cdk/drag-drop";
import {Color} from "chroma-js";
import {injectDispatch} from "@ngrx/signals/events";
import {AppStateStore} from "@core/app-state.store";
import {contrastEvents} from "@core/contrast/contrast.events";
import {ContrastColorRole} from "@engine/contrast/contrast-color.model";
import {PALETTE_SLOTS, PaletteSlot} from "@engine/palette/palette.model";
import {colorName} from "@engine/color/color-name.helper";


interface Chip {
  readonly slot: PaletteSlot;
  readonly color: Color;
  readonly background: string;
  readonly label: string;
}


interface TargetOption {
  readonly role: ContrastColorRole;
  readonly caption: string;
}


const TARGET_OPTIONS: readonly TargetOption[] = [
  {role: "text", caption: "TEXT"},
  {role: "background", caption: "BACKGROUND"}
];

/**
 * How long a finger has to rest on a chip before a drag begins, and no delay
 * for a mouse.
 *
 * Without it CDK claims the first touch move, so a swipe that happens to start
 * on the chip row drags a chip instead of scrolling the screen - and the row
 * sits in the left column, which on a phone is the whole width of the page.
 * The mouse has no such conflict and gets none of the delay: a pointer that
 * moves while a button is held is not a scroll.
 */
const DRAG_START_DELAY: DragStartDelay = {touch: 300, mouse: 0};


/**
 * The five colors of the current palette, each one a way into the pair and a
 * colour the visitor can put on one element of the preview.
 *
 * The draft sets the background on a click and the text color on a
 * double-click. A double-click is not reachable from the keyboard, so it
 * cannot be the only way to set the text color, and the alternative here is a
 * target above the row rather than a second control per chip: five chips are
 * five focus stops instead of ten, every action stays one click, and the row
 * needs no overlay.
 *
 * The price of a target is a mode, and what pays for it is the chip's own
 * name: it says which half of the pair the click will set, so the outcome is
 * spoken by the control the visitor is standing on. That is also why setting a
 * color from here is not announced - see `PairFields`.
 *
 * The target is component state, not app state: it is how this row is being
 * used, not something the app has to remember or share.
 *
 * ## Two gestures on one button
 *
 * **A click applies the colour to the pair. On every device, and only that.**
 * The click is the gesture the target above the row describes, so a visitor who
 * has selected `BACKGROUND` gets a background and nothing else.
 *
 * **A drag carries the chip onto an element of the preview, and its release
 * applies nothing to the pair.** Two things hold that, and they are layered:
 * `pointer-events-none` moves the release's target off the chip, so the click
 * the browser dispatches at the common ancestor of press and release never
 * reaches this button at all; `#draggedFromPress` is the net under that, for
 * the case where press and release do coincide on the chip. Neither is
 * CDK's - its drag has no click handling of any kind.
 *
 * **No press puts a chip in hand - not a tap, not a click.** Three reasons,
 * and each of them is on its own enough:
 *
 * A carry has no carrier the presser can see. Its only evidence is the outlines
 * on the preview, and below `lg` the preview is stacked under the whole control
 * column - so the press that arms a carry and the only sign of it are never on
 * the screen together.
 *
 * A tap-then-tap path would not survive the scroll between its two taps. A
 * finger has to scroll from the chips to the preview at that width, panning
 * fires `pointercancel`, and that is what ends a carry - so on the one screen
 * size where such a path would earn its keep the first tap is undone before
 * the second is made.
 *
 * `pointerType` cannot tell a finger from a screen reader. On iOS VoiceOver and
 * Android TalkBack an activation is a synthesised real touch and arrives as a
 * `pointerdown` with `pointerType: "touch"`; CDK needs a `touchstart`'s
 * `Touch.identifier` and `radiusX` to make that split, which a pointer handler
 * never sees. A carry armed from a press would therefore be armed by an
 * activation whose whole account of itself is the chip's name - and the name
 * says what the click does. This row rests on the outcome being spoken by the
 * control the visitor is standing on, and naming a second outcome is no way
 * out: it would bury the one they are about to make.
 *
 * **The no-drag path is not here.** It is the chooser on the element's own
 * mark - one press, on the thing being coloured, reachable by keyboard, mouse
 * and finger alike, with no state to carry across a scroll. Placing from this
 * row as well would be a second way to do one thing, and it is the way that
 * cannot say what it is doing.
 *
 * **The carry is store state, not a signal here**: the chip that is picked up
 * and the elements that answer the carry are separate component trees, in two
 * columns of the screen - `AppState.carriedSlot` says so too.
 */
@Component({
  selector: "ct-palette-chips",
  imports: [CdkDrag],
  templateUrl: "./palette-chips.html",
  host: {
    "class": "block"
  }
})
export class PaletteChips {

  readonly #stateStore = inject(AppStateStore);
  readonly #dispatch = injectDispatch(contrastEvents);

  protected readonly options = TARGET_OPTIONS;
  protected readonly dragStartDelay = DRAG_START_DELAY;

  /**
   * The background to begin with, which is the click the draft draws. It is
   * also the half a palette color is usually tried as - the text color then
   * follows from whether it reads on it.
   */
  protected readonly target = signal<ContrastColorRole>("background");

  protected readonly chips = computed<Chip[]>(() => {
    const palette = this.#stateStore.currentPalette();
    const target = this.target();
    const targetName = target === "text" ? "text color" : "background";

    return PALETTE_SLOTS.map(slot => {
      const color = palette[slot].color;

      return {
        slot,
        color,
        background: color.hex("rgb"),
        // What the click does, and it is the whole of what a press does. The
        // name is read out by the control the visitor is standing on, so a
        // second outcome it did not name would be a press that lied about
        // itself - which is why no press arms a carry.
        label: `Use ${colorName(color)} as the ${targetName}`
      };
    });
  });

  /**
   * Whether the press or key now in progress turned into a drag, so that its
   * click has to go nowhere.
   *
   * **It is the net under `pointer-events-none`, and that is why it stays.**
   * With that class in place the release's target is the element under the
   * pointer, so the browser dispatches the drag's click at the common ancestor
   * of press and release and `apply()` never runs. Take the class away and the
   * two targets coincide on the chip, the click *is* delivered here, and this
   * flag is the only thing left between a drop and half the pair being
   * repainted. Do not delete it because a drag "already" applies nothing.
   *
   * **Cleared at the start of the next gesture**, because the end of a gesture
   * offers no point that reliably runs: `apply()` does not run after a drag at
   * all, so a flag cleared there would still be standing at the next Enter on
   * any chip and would swallow it. `onGestureStart()` is on both `pointerdown`
   * and `keydown` - a gesture always starts, and clearing it there is what
   * makes the flag mean "this gesture", not "some earlier one".
   */
  #draggedFromPress = false;

  readonly #dragging = signal(false);

  /**
   * Whether this row has a chip under the pointer right now.
   *
   * **The dragged chip stops taking pointer events while it is out**, and that
   * alone is what makes the drop land on the element the pointer is over. With
   * no `cdkDropList` CDK builds no preview: `_pointerMove` translates the
   * chip's own root element by the pointer displacement, so the chip sits
   * under the pointer for the whole drag and would otherwise be both the
   * `target` of every move and what `elementFromPoint()` returns.
   *
   * **Paint order has nothing to do with it.** A hit test skips an element
   * with `pointer-events: none` however far in front it paints, which is why
   * the carried chip can be lifted over the sticky preview with a `z-index` -
   * `palette-chips.html` says why it has to be.
   *
   * **Do not remove this because "the drag works anyway".** Without it the
   * chip is what the release lands on, so every drop reads as a cancel - and
   * no spec would catch it: happy-dom has no layout, so a spec picks the
   * release's target by hand.
   */
  protected readonly dragging = this.#dragging.asReadonly();


  protected pickTarget(role: ContrastColorRole): void {
    this.target.set(role);
  }


  /**
   * A gesture begins - a press or a key - and nothing has been dragged in it
   * yet.
   *
   * One handler on both events rather than a branch on the kind of gesture:
   * what the flag needs is a point that is reliably before the click, and both
   * of these are.
   */
  protected onGestureStart(): void {
    this.#draggedFromPress = false;
  }


  protected onDragStarted(chip: Chip): void {
    this.#draggedFromPress = true;
    this.#dragging.set(true);
    this.#dispatch.chipPickedUp(chip.slot);
  }


  protected onDragEnded(event: CdkDragEnd): void {
    this.#dragging.set(false);
    // A free drag has no drop list to return the element to, so CDK leaves it
    // translated where the pointer let go. Without this the chip stays out of
    // its row for good.
    event.source.reset();

    // **The release belongs to `PlacementGesture`, and it has already had it.**
    // CDK ends a drag on `mouseup` or `touchend`, and the service listens on
    // `pointerup`, which the browser fires first - so by the time this runs the
    // service has either placed the colour or put the chip down, and the hand
    // is empty either way. The one case that reaches the dispatch below is a
    // drag whose listeners were never installed: the effect that installs them
    // runs after the dispatch that picked the chip up. Keep the condition. An
    // unconditional `chipPutDown` here would cancel a placement the service had
    // just made, which is what its own comment warns about.
    if (this.#stateStore.carriedSlot() !== null) this.#dispatch.chipPutDown();
  }


  protected apply(chip: Chip): void {
    // The drag already said what the gesture meant. Letting the click through
    // as well would repaint half the pair every time a colour is placed.
    if (this.#draggedFromPress) return;

    if (this.target() === "text") {
      this.#dispatch.textColorChanged(chip.color);
    } else {
      this.#dispatch.backgroundColorChanged(chip.color);
    }
  }

}
