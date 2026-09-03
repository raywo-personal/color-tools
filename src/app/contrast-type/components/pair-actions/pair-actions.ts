import {Component} from "@angular/core";
import {injectDispatch} from "@ngrx/signals/events";
import {contrastEvents} from "@core/contrast/contrast.events";
import {transferEvents} from "@core/common/transfer.events";


/**
 * The three gestures that replace both colors at once.
 *
 * None of them moves focus and no control says what came back, so all three
 * are announced - in `contrastPairAnnouncedEffect`, so the announcement travels
 * with the event rather than with these buttons.
 *
 * `PALETTE PAIR` is the palette-to-pair direction, and a gesture rather than a
 * reaction: see `contrastPairFromPalette()` for why the pair does not follow
 * the palette by itself. It sits beside the random roll because the two answer
 * neighbouring questions - what does my palette hold, and show me something
 * else entirely - and apart from the chip row above, which sets one half at a
 * time and leaves the other alone.
 *
 * The `WithNav` in the random pair's event name is v1's: the navigation
 * effects are not registered, so the event changes the state and nothing else.
 */
@Component({
  selector: "ct-pair-actions",
  template: `
    <button type="button"
            class="h-11 cursor-pointer rounded-xs border border-line px-5 font-sans text-base text-dim hover:text-text focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-current"
            (click)="swap()">SWAP
    </button>

    <button type="button"
            class="h-11 cursor-pointer rounded-xs border border-line px-5 font-sans text-base text-dim hover:text-text focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-current"
            (click)="rollRandomPair()">RANDOM PAIR
    </button>

    <!-- The caption says where the pair comes from; the name says what pressing
         it does, because "palette pair" alone does not read as an action. -->
    <button type="button"
            class="h-11 cursor-pointer rounded-xs border border-line px-5 font-sans text-base text-dim hover:text-text focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-current"
            aria-label="PALETTE PAIR: take the most readable pair from the current palette"
            (click)="takePalettePair()">PALETTE PAIR
    </button>
  `,
  host: {
    "class": "flex flex-wrap gap-2"
  }
})
export class PairActions {

  readonly #dispatch = injectDispatch(contrastEvents);
  readonly #transfer = injectDispatch(transferEvents);


  protected swap(): void {
    this.#dispatch.switchColors();
  }


  protected rollRandomPair(): void {
    this.#dispatch.newRandomColorsWithNav();
  }


  protected takePalettePair(): void {
    this.#transfer.sendPaletteToContrast();
  }

}
