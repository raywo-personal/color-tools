import {afterNextRender, Component, computed, ElementRef, inject, input, signal, viewChildren} from "@angular/core";
import {injectDispatch} from "@ngrx/signals/events";
import {AppStateStore} from "@core/app-state.store";
import {contrastEvents} from "@core/contrast/contrast.events";
import {colorName} from "@engine/color/color-name.helper";
import {findOptimalTextColor} from "@engine/contrast/optimal-text-color.helper";
import {
  CHIP_SOURCES,
  ChipSource,
  chipLabelFor,
  chipSourceName,
  colorOf
} from "@contrast-type/models/chip-source.model";
import {
  SAMPLE_PLACEMENTS,
  SamplePlacement,
  sampleElement,
  samplePage,
  sideCaption,
  sideName
} from "@contrast-type/models/sample-page.model";
import {VerdictState, elementName, verdictFor, verdictWord} from "@contrast-type/models/element-verdict.model";
import {VerdictShape} from "@contrast-type/components/verdict-shape/verdict-shape";


/** One of the seven chips as this element would wear it. */
interface ChipOption {

  readonly source: ChipSource;
  /** `P1` to `P5`, `T`, `BG` - the row's handle, shown for the focused chip. */
  readonly handle: string;
  readonly background: string;
  /** Black or white, whichever APCA puts further from the chip's own color. */
  readonly tick: string;
  readonly name: string;
  /**
   * The chip's accessible name: the colour, then how the element would fare
   * with it. The row under the toolbar shows the same thing on screen for the
   * focused chip - it is not a live region, so a chip walked past with the
   * arrow keys has to carry the verdict itself.
   */
  readonly label: string;
  readonly placed: boolean;
  readonly state: VerdictState;
  readonly lc: number;
  readonly word: string;

}


/** One of the element's two sides, as the toggle above the chips offers it. */
interface SideOption {

  readonly side: SamplePlacement;
  /** `TEXT`, and `BACKGROUND` or `HIGHLIGHT` - see `sideCaption()`. */
  readonly caption: string;
  readonly selected: boolean;

}


/**
 * The seven chips, as a way of colouring one element of the sample page
 * without a drag.
 *
 * **It is the keyboard's half of the same gesture, not a second feature.** A
 * drag cannot be performed from a keyboard and a chip that only answers a
 * pointer would leave the page uncolourable, so the element's own control
 * opens this and the arrow keys walk the same seven colours the chip row
 * holds - the palette's five and the pair's own two. A press places,
 * `Backspace` takes it back, `Escape` closes - see `verdict-mark.ts` for why
 * the element's control is its mark and not a second stop in the tab order.
 *
 * **All seven, in the row's order, or `T` and `BG` would be mouse-only.** They
 * can be dropped on an element, so they have to be placeable without a drag
 * as well; the order is the row's so that walking the two is the same walk in
 * both places.
 *
 * **Which side first, then which colour.** An element takes a colour for its
 * text and one for its ground, and a drag answers that by which half of the
 * element it is released on - which a keyboard cannot aim at and a screen
 * reader cannot see. So the popup asks outright: a segmented toggle above the
 * chips, the app's own idiom for a choice of two - see `TypeRoles`. It costs
 * the popup one row and it is the only place the question is put in words.
 *
 * **A toggle rather than fourteen chips.** Two rows of seven would need no
 * mode, and they would also double the arrow keys' walk and add two rows of
 * hit area to a popup that already carries the verdict above it. The chip's
 * own verdict preview is what makes the mode safe: it is computed for the
 * selected side, so the row under the chips says what *this* press would do.
 *
 * **A toolbar of real buttons, not a listbox of divs.** Placing a colour is a
 * command rather than a selection that something else applies later: the press
 * is the placement. The toolbar role is what says the arrow keys move between
 * the buttons, and `aria-pressed` is what says which colour the element is
 * already wearing - beside the tick, because a chip told by its colour alone
 * is unreadable on the palette that produced it.
 *
 * **Every chip says what it would do before it is pressed.** The row under it
 * reads the verdict of the element *as if* the focused chip had been placed,
 * built through `samplePage()` with the one placement swapped in - so the
 * figure is the same derivation the page, the rating and the marks use rather
 * than a second opinion about the same element. It opens with the chip's
 * handle, which is the one thing here that says *which* of the seven the arrow
 * keys are on: the chips themselves are seven swatches and two of them are the
 * pair's, which no colour tells apart.
 *
 * **And every chip's own name carries that verdict, not the colour alone.**
 * The row is what a sighted visitor reads while arrowing the chips; it is not
 * a live region, and a name of `Lapis Blue` would let a screen-reader visitor
 * walk all seven and never learn that one of them fails - leaving placing it
 * and resetting as the only way to find out. This is the path for keyboard and
 * touch alike, which makes it the one place the verdict has to travel. Same
 * rule as everywhere on this screen: a colour is never the only carrier.
 *
 * **Nothing here announces.** A placement and a reset already travel with
 * their events, and two polite announcements inside the same hundred
 * milliseconds delete each other - `placementAnnouncedEffect` is the one place
 * that speaks. That is also why a placement leaves this open and moves no
 * focus: the sentence about it would lose to whatever a moved focus said.
 *
 * **The app's own colours, like the panel above it.** It is the app offering
 * the visitor a colour, not a part of the page it colours; only the tick sits
 * on a colour the visitor picked, and that one is measured.
 */
@Component({
  selector: "ct-color-chooser",
  imports: [VerdictShape],
  templateUrl: "./color-chooser.html",
  host: {
    "class": "block"
  }
})
export class ColorChooser {

  readonly #stateStore = inject(AppStateStore);
  readonly #dispatch = injectDispatch(contrastEvents);

  /** The `SAMPLE_ELEMENTS` key of the element this chooser colours. */
  readonly elementKey = input.required<string>();

  private readonly chipButtons = viewChildren<ElementRef<HTMLButtonElement>>("chip");

  /** Which chip the arrow keys are standing on - the roving tab stop. */
  readonly #active = signal(0);

  protected readonly active = this.#active.asReadonly();

  /**
   * Which of the element's two colours the chips place on.
   *
   * Opens on the ink, which is the side a page is coloured on most of the
   * time and the side a drag's own default half is - `PlacementGesture` says
   * why the two agree.
   */
  readonly #side = signal<SamplePlacement>("ink");

  protected readonly element = computed(() => sampleElement(this.elementKey()));

  protected readonly caption = computed(() => this.element().caption);

  /** The two sides for the toggle, in `SAMPLE_PLACEMENTS` order. */
  protected readonly sides = computed<readonly SideOption[]>(() => {
    const element = this.element();
    const selected = this.#side();

    return SAMPLE_PLACEMENTS.map(side => ({
      side,
      caption: sideCaption(element, side),
      selected: side === selected
    }));
  });

  /**
   * The toggle's own name, and the chip row's.
   *
   * In sentence case and never the page's caption: a screen reader spells
   * `SMALL PRINT` out letter by letter, so the caption stays on screen and
   * `elementName()` speaks. The side is `sideName()`, the same words the
   * announcement and the ledger use.
   */
  protected readonly toolbarLabel = computed(() =>
    `${elementName(this.element())}: ${sideName(this.element(), this.#side())}`);

  /**
   * The toggle group's own name: the choice it offers, in the same two words
   * its buttons carry - a screen reader hears what the two buttons are for
   * before walking them, and the chip row below has a name of its own.
   */
  protected readonly sidesLabel = computed(() => {
    const element = this.element();

    return `${sideName(element, "ink")} or ${sideName(element, "ground")} for ${elementName(element)}`;
  });

  /** The way back, named after the side it takes back. */
  protected readonly resetLabel = computed(() =>
    `Reset ${sideName(this.element(), this.#side())}`);

  protected readonly placedSource = computed(() =>
    this.#stateStore.placements()[this.elementKey()]?.[this.#side()] ?? null);

  protected readonly chips = computed<readonly ChipOption[]>(() => {
    const key = this.elementKey();
    const pair = this.#stateStore.contrastColors();
    const palette = this.#stateStore.currentPalette();
    const placements = this.#stateStore.placements();
    const roles = this.#stateStore.typeRoles();
    const side = this.#side();
    const placed = placements[key]?.[side];

    return CHIP_SOURCES.map(source => {
      const color = colorOf(source, pair, palette);
      // The page this element would be on, not the one it is on: the swap goes
      // through `samplePage()` so the figure comes out of the same derivation
      // the preview paints with. Only the selected side is swapped, because
      // the element keeps whatever the other one is wearing - which is what
      // makes the figure the answer to *this* press.
      const verdict = verdictFor(
        key,
        samplePage(pair, palette, {...placements, [key]: {...placements[key], [side]: source}}),
        roles
      );

      const name = colorName(color);
      const word = verdictWord(verdict.state);
      const handle = chipLabelFor(source);
      const sourceName = chipSourceName(source);

      return {
        source,
        handle,
        background: color.hex("rgb"),
        tick: findOptimalTextColor(color).color.hex("rgb"),
        name,
        // The handle first, or two chips read out the same colour name and
        // nothing tells a screen-reader visitor which of them the arrow keys
        // are on - `T` and `P1` both hold `#111111` on the draft's pair, and
        // `BG` collides with whichever palette slot the generator matched it
        // to. `chipSourceName()` spells `T` and `BG` out for the same reason
        // `palette-chips.ts` does: a listener hears a letter, not a word.
        //
        // Then the colour and how the element would fare with it. A colon
        // before the word, for `verdict-mark`'s reason: `not rated` is not a
        // verb and `Lapis Blue not rated` reads as a missing `is`. The Lc
        // after it, in the order the visible row below has them.
        label: sourceName === null
          ? `${handle}: ${name}: ${word}, Lc ${verdict.lc}`
          : `${handle}, ${sourceName}: ${name}: ${word}, Lc ${verdict.lc}`,
        placed: placed === source,
        state: verdict.state,
        lc: verdict.lc,
        word
      };
    });
  });

  /** The chip the arrow keys are on, which is what the row under them reads. */
  protected readonly preview = computed(() => this.chips()[this.active()]);


  constructor() {
    // The chooser is built when the popup opens, so this runs once per
    // opening: the arrow keys start on the colour the element is already
    // wearing, and the focus lands there rather than on the popup's edge -
    // otherwise the first arrow press would be spent getting into the row.
    afterNextRender(() => {
      const placed = this.placedSource();

      this.#focus(placed ? CHIP_SOURCES.indexOf(placed) : 0);
    });
  }


  protected onFocus(index: number): void {
    this.#active.set(index);
  }


  /**
   * Switching sides moves the roving stop to the colour the new side is
   * already wearing, the way opening the popup does - otherwise the stop would
   * be left on a chip that belongs to the other side. It moves no focus: that
   * is on the toggle the visitor has just pressed, and taking it away would
   * make a second press of the same button impossible.
   */
  protected selectSide(side: SamplePlacement): void {
    this.#side.set(side);

    const placed = this.placedSource();

    this.#active.set(placed ? CHIP_SOURCES.indexOf(placed) : 0);
  }


  protected place(source: ChipSource): void {
    this.#dispatch.colorPlaced({elementKey: this.elementKey(), side: this.#side(), source});
  }


  protected reset(): void {
    if (this.placedSource()) {
      this.#dispatch.placementReset({elementKey: this.elementKey(), side: this.#side()});
    }
  }


  /**
   * The toolbar's keys. `Enter` and `Space` are the buttons' own, so they are
   * not here: a chip is pressed the way every other button in the app is.
   */
  protected onKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        this.#step(1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        this.#step(-1);
        break;
      case "Home":
        this.#focus(0);
        break;
      case "End":
        this.#focus(CHIP_SOURCES.length - 1);
        break;
      case "Backspace":
      case "Delete":
        this.reset();
        break;
      default:
        return;
    }

    event.preventDefault();
  }


  /** Wrapping, so the row has no dead end at either side. */
  #step(by: number): void {
    const count = CHIP_SOURCES.length;

    this.#focus((this.#active() + by + count) % count);
  }


  #focus(index: number): void {
    this.#active.set(index);
    this.chipButtons()[index]?.nativeElement.focus();
  }

}
