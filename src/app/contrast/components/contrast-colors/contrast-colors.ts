import {Component, inject} from "@angular/core";
import {ColorInputs} from "@contrast/components/color-inputs/color-inputs";
import {ContrastEvaluation} from "@contrast/components/contrast-evaluation/contrast-evaluation";
import {injectDispatch} from "@ngrx/signals/events";
import {transferEvents} from "@core/common/transfer.events";
import {AppStateStore} from "@core/app-state.store";


@Component({
  selector: "div[ct-contrast-colors]",
  imports: [
    ColorInputs,
    ContrastEvaluation
  ],
  templateUrl: "./contrast-colors.html",
  styles: ``,
  host: {
    class: "colors-container"
  }
})
export class ContrastColors {

  readonly #appStore = inject(AppStateStore);
  readonly #dispatch = injectDispatch(transferEvents);


  protected createPaletteFromContrast() {
    const contrastColors = this.#appStore.contrastColors();
    this.#dispatch.startPaletteFromContrast(contrastColors);
  }

}
