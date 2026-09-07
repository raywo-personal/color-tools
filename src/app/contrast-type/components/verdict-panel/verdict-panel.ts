import {Component, computed, inject, input} from "@angular/core";
import {Color} from "chroma-js";
import {AppStateStore} from "@core/app-state.store";
import {findOptimalTextColor} from "@engine/contrast/optimal-text-color.helper";
import {SampleGround, samplePageColors} from "@contrast-type/models/sample-page.model";
import {verdictFacts, verdictFor, verdictWord} from "@contrast-type/models/element-verdict.model";
import {VerdictShape} from "@contrast-type/components/verdict-shape/verdict-shape";


/**
 * One element's verdict in words, while its mark is open - and nothing while
 * it is not.
 *
 * **A component of its own, because it does not always sit where its mark
 * does.** A verdict is a paragraph of prose, and a paragraph inside a
 * `<td>` is what an auto-layout table apportions its columns around: opening
 * the table header's verdict would push the three columns into new widths and
 * break the sentences mid-word on the table's own `wrap-anywhere`. So the
 * table's three marks hand their panel to the preview, which places it under
 * the table - see `panelBelow` on `VerdictMark`. Everywhere else the mark
 * carries it, directly under the element.
 *
 * It reads the open key from the store rather than taking it as an input, so
 * a panel placed away from its mark needs nothing but the same two values the
 * mark has: which element, and which surface it is drawn against.
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

  /**
   * The page surface the panel is drawn on. Null falls back to the element's
   * own ground, as it does on the mark.
   */
  readonly surface = input<SampleGround | null>(null);

  readonly #colors = computed(() => samplePageColors(
    this.#stateStore.contrastColors(),
    this.#stateStore.currentPalette()
  ));

  protected readonly verdict = computed(() => verdictFor(
    this.elementKey(),
    this.#colors(),
    this.#stateStore.typeRoles()
  ));

  protected readonly open = computed(() => this.#stateStore.openVerdict() === this.elementKey());

  readonly #surfaceColor = computed<Color>(() => {
    const surface = this.surface();

    return surface === null ? this.verdict().ground : this.#colors()[surface];
  });

  protected readonly surfaceHex = computed(() => this.#surfaceColor().hex("rgb"));

  /** Black or white, whichever APCA puts further from the surface it sits on. */
  protected readonly inkHex = computed(() => findOptimalTextColor(this.#surfaceColor()).color.hex("rgb"));

  protected readonly facts = computed(() => verdictFacts(
    this.verdict(),
    this.#stateStore.currentPalette()
  ));

  /**
   * The verdict in words beside its shape. The shape alone is a guess - a
   * tick and a cross can be read off, an arrow cannot - and the panel is
   * where the word costs nothing.
   */
  protected readonly label = computed(() => verdictWord(this.verdict().state));

}
