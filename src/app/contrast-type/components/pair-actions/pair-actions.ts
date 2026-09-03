import {Component} from "@angular/core";
import {injectDispatch} from "@ngrx/signals/events";
import {contrastEvents} from "@core/contrast/contrast.events";


/**
 * The two gestures that replace both colors at once.
 *
 * Neither moves focus and neither control says what came back, so both are
 * announced - in `contrastPairAnnouncedEffect`, so the announcement travels
 * with the event rather than with these two buttons.
 *
 * The `WithNav` in the random pair's event name is v1's: the navigation
 * effects are not registered, so the event changes the state and nothing else.
 */
@Component({
  selector: "ct-pair-actions",
  template: `
    <button type="button"
            class="h-11 cursor-pointer rounded-xs border border-line px-5 font-mono text-base tracking-widest text-dim hover:text-text focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-current"
            (click)="swap()">SWAP
    </button>

    <button type="button"
            class="h-11 cursor-pointer rounded-xs border border-line px-5 font-mono text-base tracking-widest text-dim hover:text-text focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-current"
            (click)="rollRandomPair()">RANDOM PAIR
    </button>
  `,
  host: {
    "class": "flex flex-wrap gap-2"
  }
})
export class PairActions {

  readonly #dispatch = injectDispatch(contrastEvents);


  protected swap(): void {
    this.#dispatch.switchColors();
  }


  protected rollRandomPair(): void {
    this.#dispatch.newRandomColorsWithNav();
  }

}
