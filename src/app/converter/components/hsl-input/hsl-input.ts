import {Component, computed, inject, linkedSignal} from '@angular/core';
import chroma from 'chroma-js';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {inHslAngleRange, inHslPercentRange} from '@common/helpers/hsl.helper';
import {RangedInput} from '@converter/components/ranged-input/ranged-input';
import {CopyCss} from '@converter/components/copy-css/copy-css';
import {AppStateStore} from "@core/app-state.store";
import {injectDispatch} from "@ngrx/signals/events";
import {converterEvents} from "@core/converter/converter.events";


@Component({
  selector: 'ct-hsl-input',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    CopyCss,
    RangedInput
  ],
  templateUrl: './hsl-input.html',
  styles: ``
})
export class HslInput {

  readonly #stateStore = inject(AppStateStore);
  readonly #dispatch = injectDispatch(converterEvents);

  protected readonly hue = linkedSignal(() => {
    const value = this.#stateStore.currentColor().hsl()[0];

    // For colors like #222222, chroma.js returns NaN for hue. We need to
    // fix that. Therefore, we map all NaN values to 0.
    return Number.isNaN(value) ? 0 : value;
  });

  protected readonly saturation = linkedSignal(() => {
    return this.#stateStore.currentColor().hsl()[1] * 100
  });

  protected readonly luminance = linkedSignal(() => {
    return this.#stateStore.currentColor().hsl()[2] * 100
  });

  private readonly color = computed(() => {
    const hue = this.hue();
    const saturation = this.saturation();
    const luminance = this.luminance();

    if (!inHslAngleRange(hue) || !inHslPercentRange(saturation) || !inHslPercentRange(luminance)) {
      return null;
    }

    return chroma.hsl(hue, saturation / 100, luminance / 100);
  });


  protected hueChanged(value: number | null) {
    this.hue.set(value ?? 0);
    this.colorChanged();
  }


  protected saturationChanged(value: number | null) {
    this.saturation.set(value ?? 0);
    this.colorChanged();
  }


  protected luminanceChanged(value: number | null) {
    this.luminance.set(value ?? 0);
    this.colorChanged();
  }


  private colorChanged() {
    const color = this.color();

    if (color) {
      this.#dispatch.colorChanged(color);
    }
  }

}
