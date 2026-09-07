import {Component, computed, inject, input} from "@angular/core";
import {AppStateStore} from "@core/app-state.store";
import {samplePageColors} from "@contrast-type/models/sample-page.model";
import {verdictFacts, verdictFor, verdictWord} from "@contrast-type/models/element-verdict.model";
import {VerdictShape} from "@contrast-type/components/verdict-shape/verdict-shape";


/**
 * One element's verdict: what it reached, what it needed, what it is set in,
 * and what would carry it.
 *
 * **It is drawn in the app's own colours, and it is meant to look like it.**
 * The panel is the app looking at the visitor's page from outside, so it takes
 * `panel`, `line`, `text` and `dim` like every other surface of the app rather
 * than the page's colours. In the page's own palette it read as a part of the
 * sample content - a box the visitor had somehow styled - which is the one
 * thing it is not. The tokens also make it the only piece of chrome inside the
 * preview whose contrast is guaranteed without measuring: `panel` and `text`
 * are an app pair, not a colour anyone picked.
 *
 * **A presentation block and nothing else.** Whether it is open and where it
 * sits is `verdict-mark.html`'s overlay, so this component does not know it is
 * in a popup and would render just as well in a page.
 */
@Component({
  selector: "ct-verdict-panel",
  imports: [VerdictShape],
  templateUrl: "./verdict-panel.html",
  host: {
    "class": "block"
  }
})
export class VerdictPanel {

  readonly #stateStore = inject(AppStateStore);

  /** The `SAMPLE_ELEMENTS` key of the element this panel is about. */
  readonly elementKey = input.required<string>();

  readonly #colors = computed(() => samplePageColors(
    this.#stateStore.contrastColors(),
    this.#stateStore.currentPalette()
  ));

  protected readonly verdict = computed(() => verdictFor(
    this.elementKey(),
    this.#colors(),
    this.#stateStore.typeRoles()
  ));

  /**
   * The verdict in words beside its shape. The shape alone is a guess - a tick
   * and a cross can be read off, an arrow cannot - and here the word costs
   * nothing.
   */
  protected readonly label = computed(() => verdictWord(this.verdict().state));

  protected readonly facts = computed(() => verdictFacts(
    this.verdict(),
    this.#stateStore.currentPalette()
  ));

}
