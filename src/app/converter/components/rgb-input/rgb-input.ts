import {Component, computed, inject, linkedSignal} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import chroma from 'chroma-js';
import {inRgbRange} from '@common/helpers/rgb.helper';
import {CopyCss} from '@converter/components/copy-css/copy-css';
import {RangedInput} from '@converter/components/ranged-input/ranged-input';
import {injectDispatch} from "@ngrx/signals/events";
import {converterEvents} from "@core/converter/converter.events";
import {AppStateStore} from "@core/app-state.store";


@Component({
  selector: 'ct-rgb-input',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    CopyCss,
    RangedInput
  ],
  templateUrl: './rgb-input.html',
  styles: ``
})
export class RgbInput {

  readonly #stateStore = inject(AppStateStore);
  readonly #dispatch = injectDispatch(converterEvents);

  protected readonly red = linkedSignal(() => {
    return this.#stateStore.currentColor().rgb()[0];
  });

  protected readonly green = linkedSignal(() => {
    return this.#stateStore.currentColor().rgb()[1];
  });

  protected readonly blue = linkedSignal(() => {
    return this.#stateStore.currentColor().rgb()[2];
  });

  private readonly color = computed(() => {
    const red = this.red();
    const green = this.green();
    const blue = this.blue();

    if (!inRgbRange(red) || !inRgbRange(green) || !inRgbRange(blue)) {
      return null;
    }

    return chroma([red, green, blue]);
  });


  protected redChanged(value: number | null) {
    this.red.set(value ?? 0);
    this.colorChanged();
  }


  protected greenChanged(value: number | null) {
    this.green.set(value ?? 0);
    this.colorChanged();
  }


  protected blueChanged(value: number | null) {
    this.blue.set(value ?? 0);
    this.colorChanged();
  }


  private colorChanged() {
    const color = this.color();

    if (color) {
      this.#dispatch.colorChanged(color);
    }
  }

}
