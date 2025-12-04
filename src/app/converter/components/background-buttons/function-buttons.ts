import {Component, inject} from '@angular/core';
import {injectDispatch} from "@ngrx/signals/events";
import {converterEvents} from "@core/converter/converter.events";
import {AppStateStore} from "@core/app-state.store";


@Component({
  selector: 'ct-function-buttons',
  imports: [],
  templateUrl: './function-buttons.html',
  styles: ``
})
export class FunctionButtons {

  readonly #stateStore = inject(AppStateStore);
  readonly #dispatch = injectDispatch(converterEvents);


  protected readonly useBackground = this.#stateStore.useAsBackground;


  protected useAsBackground() {
    this.#dispatch.useAsBackgroundChanged(true);
  }


  protected restoreBackground() {
    this.#dispatch.useAsBackgroundChanged(false);
  }


  protected useAsPaletteStarter() {
    const currentColor = this.#stateStore.currentColor();

    this.#dispatch.useColorAsPaletteStarter(currentColor);
  }

}
