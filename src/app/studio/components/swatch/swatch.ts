import {Component, computed, inject} from "@angular/core";
import {AppStateStore} from "@core/app-state.store";
import {colorName} from "@common/helpers/color-name.helper";
import {findOptimalTextColor} from "@contrast/helper/optimal-text-color.helper";


/**
 * The current color as a surface, with its name written on it.
 *
 * The draft's swatch is an empty block. It carries the name here for two
 * reasons: a color surface says which color it is rather than leaving that to
 * the eye, and this is the app's first chrome sitting on a color the visitor
 * chose - so the foreground has to come from the app's own APCA calculation
 * instead of a neutral token.
 */
@Component({
  selector: "ct-swatch",
  template: `
    <p class="text-base font-semibold" [style.color]="foreground()">{{ name() }}</p>
  `,
  host: {
    "class": "flex h-48 flex-col justify-end rounded-xs border border-line p-4",
    "[style.background-color]": "background()"
  }
})
export class Swatch {

  readonly #stateStore = inject(AppStateStore);

  protected readonly name = computed(() => colorName(this.#stateStore.currentColor()));

  protected readonly background = computed(() => this.#stateStore.currentColor().hex("rgb"));

  /**
   * Black or white, whichever APCA puts further from the color underneath.
   *
   * Asked at the size and weight the name is actually set in, so the lookup
   * answers for what is on screen. On a mid-lightness color neither candidate
   * clears the table's requirement - that is the color the visitor picked, not
   * a fixable defect - and the better of the two is then still the right
   * answer. The value itself never depends on this: the conversion list below
   * carries it against a neutral surface.
   */
  protected readonly foreground = computed(() => {
    const result = findOptimalTextColor(this.#stateStore.currentColor(), {
      fontSize: "16px",
      fontWeight: "600"
    });

    return result.color.hex("rgb");
  });

}
