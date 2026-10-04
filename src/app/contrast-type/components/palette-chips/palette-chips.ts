import {Component, computed, inject, output, signal} from "@angular/core";
import {CdkDrag, CdkDragEnd, DragStartDelay} from "@angular/cdk/drag-drop";
import {CdkMenu, CdkMenuItem, CdkMenuTrigger} from "@angular/cdk/menu";
import chroma, {Color} from "chroma-js";
import {injectDispatch} from "@ngrx/signals/events";
import {AppStateStore} from "@core/app-state.store";
import {contrastEvents} from "@core/contrast/contrast.events";
import {ContrastColorRole} from "@engine/contrast/contrast-color.model";
import {findOptimalTextColor} from "@engine/contrast/optimal-text-color.helper";
import {colorName} from "@engine/color/color-name.helper";
import {
  CHIP_SOURCES,
  ChipSource,
  chipLabelFor,
  chipSourceName,
  colorOf
} from "@contrast-type/models/chip-source.model";


/** One half of the pair, as the chip's menu offers it. */
interface ChipAction {
  readonly role: ContrastColorRole;
  /** The item's own visible text, which is also its accessible name. */
  readonly caption: string;
  /** The Lc the pair would reach - absolute and rounded down, as everywhere. */
  readonly lc: number;
}


interface Chip {
  readonly source: ChipSource;
  readonly color: Color;
  readonly background: string;
  /** `P1` to `P5`, `T`, `BG` - the handle the ledger's rows use as well. */
  readonly handle: string;
  /** Black or white, whichever APCA puts further from the chip's own color. */
  readonly ink: string;
  readonly label: string;
  readonly actions: readonly ChipAction[];
}


/** What each half is called in the item that sets it. */
const ACTION_CAPTIONS: Record<ContrastColorRole, string> = {
  text: "Use as the TEXT color",
  background: "Use as the BACKGROUND"
};

const ACTION_ROLES: readonly ContrastColorRole[] = ["text", "background"];

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
 * The seven colors a visitor can reach for: the palette's five, then the
 * pair's own two. Each one is a way into the pair and a colour they can put on
 * one element of the preview.
 *
 * ## A press opens a menu
 *
 * **The chip says what it holds and the menu says what it can be.** The draft
 * sets the background on a click and the text color on a double-click, and a
 * double-click is not reachable from the keyboard - so the two outcomes have
 * to be named somewhere a keyboard can get at. The menu names them: a click or
 * `Space` opens it, the first item takes focus, and the whole gesture is two
 * keys or two clicks.
 *
 * **Not a target above the row.** A `TEXT / BACKGROUND` selector there would
 * say which half the next press writes, which is a mode - a thing to hold in
 * one's head, and a line of this column - for two outcomes the menu already
 * names in words. The half the *sliders* move is a different question and
 * `PairSliders` owns it; this row reports the half it has just written so the
 * panel follows, and asks nothing about it.
 *
 * **Two items, and never the page's elements.** The mark beside an element
 * already offers all seven chips, and it knows which element it is about
 * because the visitor is standing on it - a menu of targets would say
 * `TABLE NUMBER` and leave them to work out which run of figures that is,
 * which the drag never asks either. With both colours of every element it
 * would be 46 entries, and each would have to carry a verdict: a
 * screen-reader visitor has to be able to learn that a colour fails *before*
 * placing it, which is `ColorChooser`'s rule and holds here. At two entries
 * that is one figure each.
 *
 * **An item the colour already occupies is not offered.** `T` has no
 * `Use as the TEXT color` and `BG` no `Use as the BACKGROUND`: the two presses
 * that changed nothing stop existing. The source decides that, not the value -
 * a palette colour that happens to equal the text colour is a coincidence the
 * next roll of the palette undoes, and an item that came and went with it
 * would make the menu flicker.
 *
 * **The figure is the pair's own Lc, not the page's.** Each item measures the
 * pair it would leave behind - this colour against the other half, standing -
 * which is the one thing this row can promise: what the page's elements then
 * read at is the marks' business, and 22 of them cannot be summed into a
 * number. Absolute and rounded down, as every Lc a visitor reads on this
 * screen is.
 *
 * ## `T` and `BG` are chips like the other five
 *
 * **They carry the pair's two colours, and their menu is the same menu** -
 * minus the item they already are. What they are for is the drop: the text
 * colour onto a button, the background onto a card.
 *
 * **The pair is still set only from here and from the two fields.** A release
 * over the preview places a colour on an element and never writes `T` or `BG` -
 * `PlacementGesture` decides every release, and it dispatches `colorPlaced`
 * and nothing else.
 *
 * ## What the chips say, and what they do not
 *
 * **A chip carries its handle, not the role the preview gives its colour.**
 * The page's default assignment - accent, ghost border, eyebrow, card tint -
 * is a starting point that any drop overrides, so a chip captioned `BUTTONS`
 * would be wrong the moment a visitor colours the buttons from somewhere else.
 * It would also move on its own: `roleColorsFrom()` skips whichever slot is
 * the pair's ground, so the caption would shift as the pair moves and the
 * visitor changed nothing. What the page does without them is one sentence
 * that stays true either way, and it stands behind the `i` in `PLACED COLORS`.
 * This is what closed #134.
 *
 * **The handle is this screen's one word for a chip.** `P3`, `T`, `BG` - the
 * same word the ledger's rows carry, so a row points at a chip the visitor can
 * see. `roleCaptionFor()` names a slot by what the generator did with it and
 * stays in the Studio; `chipLabelFor()` says why the two are not printed
 * together.
 *
 * **The chip's name is its handle and its colour; the outcome is the menu's.**
 * The name opens with the handle **verbatim**, because the handle is visible
 * text in the button and WCAG 2.5.3 asks the name to contain the label - the
 * same rule `RESET PAGE` is held to. `T` and `BG` add what the letter stands
 * for: a screen reader speaks them as letters and the adjacency to the two
 * fields that carries it on screen is no help in speech. What a press does is
 * `aria-haspopup`, which CDK sets, and then the items themselves - which is
 * also why setting a colour from here is not announced: the visitor is
 * standing on the item that says it. See `PairFields`.
 *
 * **The label's colour comes from APCA, not from the draft's white.** It sits
 * on a colour the visitor picked, so a token is guaranteed against none of it
 * and a fixed white disappears on `BG` the moment the page is light.
 *
 * ## Two gestures on one button
 *
 * **A click opens the menu. On every device, and only that.**
 *
 * **A drag carries the chip onto an element of the preview, and its release
 * applies nothing to the pair.** `pointer-events-none` moves the release's
 * target off the chip, so the click the browser dispatches at the common
 * ancestor of press and release never reaches this button at all.
 *
 * **Nothing on this button writes to the pair, which is what a drag's click
 * used to have to be kept away from.** An item writes a half, and a drag
 * cannot reach an item: no press opens the menu while a chip is being carried,
 * and a press that turns into a drag has moved on before its click. Where
 * press and release do coincide on the chip, what a stray click can produce is
 * a menu - which `Escape` closes and which has changed nothing. Do not wire an
 * apply back onto this click: the flag that was the net under that is gone
 * with the outcome it guarded.
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
 * says the chip holds a colour and opens a menu.
 *
 * **The no-drag path onto the page is not here.** It is the chooser on the
 * element's own mark - one press, on the thing being coloured, reachable by
 * keyboard, mouse and finger alike, with no state to carry across a scroll. It
 * holds the same seven chips, which is what keeps `T` and `BG` from being
 * mouse-only. Placing from this row as well would be a second way to do one
 * thing, and it is the way that cannot say which element it is doing it to.
 *
 * **The carry is store state, not a signal here**: the chip that is picked up
 * and the elements that answer the carry are separate component trees, in two
 * columns of the screen - `AppState.carriedChip` says so too.
 */
@Component({
  selector: "ct-palette-chips",
  imports: [CdkDrag, CdkMenu, CdkMenuItem, CdkMenuTrigger],
  templateUrl: "./palette-chips.html",
  host: {
    "class": "block"
  }
})
export class PaletteChips {

  readonly #stateStore = inject(AppStateStore);
  readonly #dispatch = injectDispatch(contrastEvents);

  protected readonly dragStartDelay = DRAG_START_DELAY;

  /**
   * The half of the pair a menu item has just written.
   *
   * **A report, not a mode.** The sliders below the row move one half and
   * `PairSliders` holds which - the half a visitor has just set is the one
   * they are most likely to nudge next, so the panel follows a press here
   * rather than making them say it twice. This row reads nothing back: a
   * second display of that state is what a target above the chips would have
   * been.
   */
  readonly colorApplied = output<ContrastColorRole>();

  protected readonly chips = computed<Chip[]>(() => {
    const pair = this.#stateStore.contrastColors();
    const palette = this.#stateStore.currentPalette();

    return CHIP_SOURCES.map(source => {
      const color = colorOf(source, pair, palette);
      const handle = chipLabelFor(source);
      const sourceName = chipSourceName(source);

      return {
        source,
        color,
        background: color.hex("rgb"),
        handle,
        ink: findOptimalTextColor(color).color.hex("rgb"),
        label: sourceName === null
          ? `${handle}: ${colorName(color)}`
          : `${handle}, ${sourceName}: ${colorName(color)}`,
        actions: ACTION_ROLES
          // The item this chip already is: the source against the role, never
          // the two colours - see the comment on the class.
          .filter(role => source !== role)
          .map(role => ({
            role,
            caption: ACTION_CAPTIONS[role],
            lc: lcWith(color, role, pair.text, pair.background)
          }))
      };
    });
  });

  /**
   * The chip CDK is carrying, or nothing.
   *
   * **The source rather than a flag, because the lift is per chip.** The row's
   * seven chips are one component, so a flag put `relative z-30` on all seven
   * at once - they then sat on one z-index in one stacking context, where paint
   * order is document order, and every chip to the right of the carried one
   * painted over it. Dragging `P1` looked like the colour disappearing under
   * its neighbours.
   *
   * **CDK's own drag, not the carry in the store.** `Escape` puts the chip down
   * while CDK goes on translating the element - `DragRef` has no cancel - so a
   * lift tied to `carriedChip` would drop the chip back under its neighbours
   * for the rest of a drag the visitor can still see.
   */
  readonly #draggedChip = signal<ChipSource | null>(null);

  /** Which chip to lift out of the row - the one the pointer is carrying. */
  protected readonly draggedChip = this.#draggedChip.asReadonly();

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
  protected readonly dragging = computed(() => this.#draggedChip() !== null);


  /**
   * A carry begins, and the chip's own menu goes with it.
   *
   * CDK closes a menu on a click outside it, and the press that starts a drag
   * is on the trigger - which is not outside. Left standing, the menu hangs at
   * the place the chip has just left until the drop's click closes it.
   */
  protected onDragStarted(chip: Chip, trigger: CdkMenuTrigger): void {
    trigger.close();
    this.#draggedChip.set(chip.source);
    this.#dispatch.chipPickedUp(chip.source);
  }


  protected onDragEnded(event: CdkDragEnd): void {
    this.#draggedChip.set(null);
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
    if (this.#stateStore.carriedChip() !== null) this.#dispatch.chipPutDown();
  }


  protected apply(chip: Chip, role: ContrastColorRole): void {
    if (role === "text") {
      this.#dispatch.textColorChanged(chip.color);
    } else {
      this.#dispatch.backgroundColorChanged(chip.color);
    }

    this.colorApplied.emit(role);
  }

}


/**
 * The Lc the pair would stand at with this colour on one of its halves.
 *
 * The other half is whatever it is now: the item promises the pair it leaves
 * behind, not a pair in which both halves moved.
 */
function lcWith(color: Color,
                role: ContrastColorRole,
                text: Color,
                background: Color): number {
  const contrast = role === "text"
    ? chroma.contrastAPCA(color, background)
    : chroma.contrastAPCA(text, color);

  return Math.floor(Math.abs(contrast));
}
