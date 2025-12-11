import {Component, inject, linkedSignal} from "@angular/core";
import {Color} from "chroma-js";

import {AppStateStore} from "@core/app-state.store";
import {injectDispatch} from "@ngrx/signals/events";
import {contrastEvents} from "@core/contrast/contrast.events";
import {ColorPickerComponent} from "@common/components/color-picker/color-picker";


@Component({
  selector: "div[ct-color-inputs]",
  imports: [
    ColorPickerComponent
  ],
  templateUrl: "./color-inputs.html",
  styles: ``,
  host: {
    class: "color-inputs"
  }
})
export class ColorInputs {

  readonly #stateStore = inject(AppStateStore);
  readonly #dispatch = injectDispatch(contrastEvents);

  protected readonly textColor = linkedSignal(() => {
    return this.#stateStore.contrastColors.text();
  });

  protected readonly bgColor = linkedSignal(() => {
    return this.#stateStore.contrastColors.background();
  });


  protected onTextColorChanged(color: Color): void {
    this.#dispatch.textColorChanged(color);
  }


  protected onBgColorChanged(color: Color): void {
    this.#dispatch.backgroundColorChanged(color);
  }


  protected switchColors() {
    this.#dispatch.switchColors();
  }

}
