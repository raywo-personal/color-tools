import {Component, computed, inject} from "@angular/core";
import {ColorSwatch} from "@converter/components/color-swatch/color-swatch";
import {DecimalPipe} from "@angular/common";
import {ColorSpace} from "@common/models/color-space.model";
import {FormsModule} from "@angular/forms";
import {AppStateStore} from "@core/app-state.store";
import {injectDispatch} from "@ngrx/signals/events";
import {converterEvents} from "@core/converter/converter.events";
import {rangeToArray} from "@common/helpers/iterables.helper";


@Component({
  selector: "ct-color-swatches",
  imports: [
    ColorSwatch,
    DecimalPipe,
    FormsModule
  ],
  templateUrl: "./color-swatches.html",
  styles: ``
})
export class ColorSwatches {

  readonly #stateStore = inject(AppStateStore);
  readonly #dispatch = injectDispatch(converterEvents);

  protected readonly colorSpace = this.#stateStore.displayColorSpace;
  protected readonly tintColors = this.#stateStore.tintColors;
  protected readonly shadeColors = this.#stateStore.shadeColors;
  protected readonly correctLightness = this.#stateStore.correctLightness;
  protected readonly useBezier = this.#stateStore.useBezier;

  protected readonly swatchSteps = computed(() => {
    const length = this.tintColors().length;

    if (length <= 1) return [0];

    const step = 1 / (length - 1);

    return rangeToArray(0, 1, step);
  });


  protected useCorrectLightness(value: boolean) {
    this.#dispatch.correctLightnessChanged(value);
  }


  protected useBezierChanged(value: boolean) {
    this.#dispatch.useBezierChanged(value);
  }


  protected useColorSpace(space: ColorSpace) {
    this.#dispatch.displayColorSpaceChanged(space);
  }

}
