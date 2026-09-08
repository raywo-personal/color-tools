import {afterNextRender, Component, computed, ElementRef, inject, input, signal, viewChildren} from "@angular/core";
import {injectDispatch} from "@ngrx/signals/events";
import {AppStateStore} from "@core/app-state.store";
import {contrastEvents} from "@core/contrast/contrast.events";
import {colorName} from "@engine/color/color-name.helper";
import {findOptimalTextColor} from "@engine/contrast/optimal-text-color.helper";
import {PALETTE_SLOTS, PaletteSlot} from "@engine/palette/palette.model";
import {sampleElement, samplePage} from "@contrast-type/models/sample-page.model";
import {VerdictState, elementName, verdictFor, verdictWord} from "@contrast-type/models/element-verdict.model";
import {VerdictShape} from "@contrast-type/components/verdict-shape/verdict-shape";


/** One palette member as this element would wear it. */
interface ChipOption {

  readonly slot: PaletteSlot;
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


/**
 * The palette, as a way of colouring one element of the sample page without a
 * drag.
 *
 * **It is the keyboard's half of the same gesture, not a second feature.** A
 * drag cannot be performed from a keyboard and a chip that only answers a
 * pointer would leave the page uncolourable, so the element's own control
 * opens this and the arrow keys walk the same five colours the chip row holds.
 * A press places, `Backspace` takes it back, `Escape` closes - see
 * `verdict-mark.ts` for why the element's control is its mark and not a
 * second stop in the tab order.
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
 * than a second opinion about the same element.
 *
 * **And every chip's own name carries that verdict, not the colour alone.**
 * The row is what a sighted visitor reads while arrowing the chips; it is not
 * a live region, and a name of `Lapis Blue` would let a screen-reader visitor
 * walk all five and never learn that one of them fails - leaving placing it
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

  protected readonly element = computed(() => sampleElement(this.elementKey()));

  protected readonly caption = computed(() => this.element().caption);

  /**
   * Which of the element's two colours a chip would take, in the visitor's
   * words. `SampleElement.placement` is the one list that decides it.
   */
  protected readonly sideWord = computed(() =>
    this.element().placement === "ground" ? "BACKGROUND" : "COLOR");

  /**
   * The row's name, in sentence case: a screen reader spells the page's
   * all-caps captions out letter by letter, so the caption stays on screen and
   * `elementName()` speaks.
   */
  protected readonly toolbarLabel = computed(() => {
    const side = this.element().placement === "ground" ? "Background" : "Color";

    return `${side} for ${elementName(this.element())}`;
  });

  protected readonly placedSlot = computed(() =>
    this.#stateStore.placements()[this.elementKey()] ?? null);

  protected readonly chips = computed<readonly ChipOption[]>(() => {
    const key = this.elementKey();
    const pair = this.#stateStore.contrastColors();
    const palette = this.#stateStore.currentPalette();
    const placements = this.#stateStore.placements();
    const roles = this.#stateStore.typeRoles();
    const placed = placements[key];

    return PALETTE_SLOTS.map(slot => {
      const color = palette[slot].color;
      // The page this element would be on, not the one it is on: the swap goes
      // through `samplePage()` so the figure comes out of the same derivation
      // the preview paints with.
      const verdict = verdictFor(key, samplePage(pair, palette, {...placements, [key]: slot}), roles);

      const name = colorName(color);
      const word = verdictWord(verdict.state);

      return {
        slot,
        background: color.hex("rgb"),
        tick: findOptimalTextColor(color).color.hex("rgb"),
        name,
        // A colon before the word, for `verdict-mark`'s reason: `not rated`
        // is not a verb and `Lapis Blue not rated` reads as a missing `is`.
        // The Lc after it, in the order the visible row below has them.
        label: `${name}: ${word}, Lc ${verdict.lc}`,
        placed: placed === slot,
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
      const placed = this.placedSlot();

      this.#focus(placed ? PALETTE_SLOTS.indexOf(placed) : 0);
    });
  }


  protected onFocus(index: number): void {
    this.#active.set(index);
  }


  protected place(slot: PaletteSlot): void {
    this.#dispatch.colorPlaced({elementKey: this.elementKey(), slot});
  }


  protected reset(): void {
    if (this.placedSlot()) this.#dispatch.placementReset(this.elementKey());
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
        this.#focus(PALETTE_SLOTS.length - 1);
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
    const count = PALETTE_SLOTS.length;

    this.#focus((this.#active() + by + count) % count);
  }


  #focus(index: number): void {
    this.#active.set(index);
    this.chipButtons()[index]?.nativeElement.focus();
  }

}
