import {Component, computed, inject, linkedSignal} from "@angular/core";
import {CopyCss} from "@converter/components/copy-css/copy-css";
import {RangedInput} from "@converter/components/ranged-input/ranged-input";
import {AppStateStore} from "@core/app-state.store";
import {injectDispatch} from "@ngrx/signals/events";
import {converterEvents} from "@core/converter/converter.events";
import chroma from "chroma-js";
import {isValidOklch, maxChroma} from "@engine/color/oklch.helper";


@Component({
  imports: [
    CopyCss,
    RangedInput
  ],
  selector: "ct-oklch-input",
  styles: ``,
  templateUrl: "./oklch-input.html",
})
export class OklchInput {

  readonly #stateStore = inject(AppStateStore);
  readonly #dispatch = injectDispatch(converterEvents);

  protected readonly hue = linkedSignal(() => {
    const value = this.#stateStore.currentColor().oklch()[2];

    // For colors like #222222, chroma.js returns NaN for hue. We need to
    // fix that. Therefore, we map all NaN values to 0.
    return Number.isNaN(value) ? 0 : value;
  });

  protected readonly lightness = linkedSignal(() => {
    return this.#stateStore.currentColor().oklch()[0] * 100;
  });

  protected readonly chroma = linkedSignal(() => {
    return this.#stateStore.currentColor().oklch()[1];
  });

  protected readonly maxChroma = computed(() => {
    return maxChroma(this.lightness() / 100, this.hue());
  });


  protected hueChanged(value: number | null) {
    this.hue.set(value ?? 0);
    this.clampChroma();
    this.colorChanged();
  }


  protected chromaChanged(value: number | null) {
    this.chroma.set(value ?? 0);
    this.colorChanged();
  }


  protected lightnessChanged(value: number | null) {
    this.lightness.set(value ?? 0);
    this.clampChroma();
    this.colorChanged();
  }


  private readonly color = computed(() => {
    const lightness = this.lightness();
    const chromaValue = this.chroma();
    const hue = this.hue();

    if (!isValidOklch(lightness, chromaValue, hue)) {
      return null;
    }

    return chroma.oklch(lightness / 100, chromaValue, hue);
  });


  private colorChanged() {
    const color = this.color();

    if (color) {
      this.#dispatch.colorChanged(color);
    }
  }


  private clampChroma() {
    const max = this.maxChroma();

    if (this.chroma() > max) {
      this.chroma.set(max);
    }
  }

}
