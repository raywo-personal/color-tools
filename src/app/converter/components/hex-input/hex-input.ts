import {Component, computed, inject, linkedSignal, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import chroma, {Color} from 'chroma-js';
import {CopyCss} from '@converter/components/copy-css/copy-css';
import {AppStateStore} from "@core/app-state.store";
import {injectDispatch} from "@ngrx/signals/events";
import {converterEvents} from "@core/converter/converter.events";


@Component({
  selector: 'ct-hex-input',
  imports: [
    FormsModule,
    CopyCss
  ],
  templateUrl: './hex-input.html',
  styles: ``
})
export class HexInput {

  readonly #stateStore = inject(AppStateStore);
  readonly #dispatch = injectDispatch(converterEvents);

  readonly #changing = signal<boolean>(false);

  protected readonly hexColor = linkedSignal(() => {
    const currentColor = this.#stateStore.currentColor();

    return currentColor?.hex().replace("#", "") ?? "";
  });

  protected readonly color = computed<Color | null>(() => {
    const hexColor = this.hexColor();

    if (!chroma.valid(hexColor)) return null;

    return chroma(hexColor);
  });


  protected colorChanged() {
    const color = this.color();

    if (color) {
      this.#changing.set(true);
      this.#dispatch.colorChanged(color);
    }
  }

}
