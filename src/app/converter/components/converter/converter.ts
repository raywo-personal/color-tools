import {Component, computed, inject} from '@angular/core';
import {FunctionButtons} from "@converter/components/background-buttons/function-buttons";
import {ColorPreview} from "@converter/components/color-preview/color-preview/color-preview";
import {ColorSwatches} from "@converter/components/color-swatches/color-swatches";
import {HexInput} from "@converter/components/hex-input/hex-input";
import {HslInput} from "@converter/components/hsl-input/hsl-input";
import {PasteTarget} from "@converter/components/paste-target/paste-target";
import {RgbInput} from "@converter/components/rgb-input/rgb-input";
import {AppStateStore} from "@core/app-state.store";


@Component({
  selector: 'ct-converter',
  imports: [
    FunctionButtons,
    ColorPreview,
    ColorSwatches,
    HexInput,
    HslInput,
    PasteTarget,
    RgbInput
  ],
  templateUrl: './converter.html',
  styles: ``,
})
export class Converter {

  readonly #stateStore = inject(AppStateStore);

  protected readonly textColor = computed(() => {
    const useBackground = this.#stateStore.useAsBackground();

    if (!useBackground) return "unset";

    return this.#stateStore.textColor().hex();
  });

}
