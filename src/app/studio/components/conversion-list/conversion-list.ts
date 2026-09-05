import {Component, computed, inject} from "@angular/core";
import {AppStateStore} from "@core/app-state.store";
import {CopyService} from "@common/services/copy.service";
import {COLOR_SPACES} from "@engine/color/color-space.model";
import {formatColor} from "@engine/color/color-format.helper";


/**
 * The current color in every format, each row a copy target.
 *
 * A row hands `CopyService` both the color and the text it shows: the format on
 * screen is what lands on the clipboard, while the announcement gets the
 * color's name, because a hex code is spelled out one character at a time.
 */
@Component({
  selector: "ul[ct-conversion-list]",
  templateUrl: "./conversion-list.html",
  host: {
    // Preflight removes the list marker, and Safari then drops the list
    // semantics with it - taking the label below along. The role puts both
    // back, so a screen reader still announces four conversions rather than
    // four loose buttons.
    "role": "list",
    "aria-label": "Color conversions"
  }
})
export class ConversionList {

  readonly #stateStore = inject(AppStateStore);
  readonly #copy = inject(CopyService);

  protected readonly rows = computed(() => {
    const color = this.#stateStore.currentColor();

    return COLOR_SPACES.map(space => ({
      space,
      label: space.toUpperCase(),
      value: formatColor(color, space)
    }));
  });


  protected copyRow(value: string): void {
    void this.#copy.copyColor(this.#stateStore.currentColor(), value);
  }

}
