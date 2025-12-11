import {Component, effect, inject, input, linkedSignal} from "@angular/core";
import {QuoteOfTheDay} from "../quote-of-the-day/quote-of-the-day";
import {ContrastColors} from "@contrast/components/contrast-colors/contrast-colors";
import {AppStateStore} from "@core/app-state.store";
import {TextSamples} from "@contrast/components/text-samples/text-samples";
import {FontSelectorComponent} from "@common/components/font-selector/font-selector";
import {SelectedFont} from "@common/models/google-font.model";
import {commonEvents} from "@core/common/common.events";
import {injectDispatch} from "@ngrx/signals/events";
import {contrastEvents} from "@core/contrast/contrast.events";
import {isRestorable} from "@common/helpers/validate-string-id.helper";
import {CONTRAST_ID_LENGTH} from "@contrast/helper/contrast-id.helper";


@Component({
  selector: "ct-contrast",
  imports: [
    QuoteOfTheDay,
    ContrastColors,
    TextSamples,
    FontSelectorComponent
  ],
  templateUrl: "./contrast.html",
  styles: ``,
})
export class Contrast {

  readonly #stateStore = inject(AppStateStore);
  readonly #dispatch = injectDispatch(commonEvents);
  readonly #contrastDispatch = injectDispatch(contrastEvents);

  protected readonly textColor = linkedSignal(() => {
    return this.#stateStore.contrastColors.text();
  });
  protected readonly backgroundColor = linkedSignal(() => {
    return this.#stateStore.contrastColors.background();
  });


  protected onFontSelected(font: SelectedFont | null) {
    this.#dispatch.fontSelected(font);
  }


  public readonly contrastId = input.required<string>();


  constructor() {
    effect(() => {
      const contrastId = this.contrastId();
      const restorable = isRestorable(contrastId, CONTRAST_ID_LENGTH);

      if (!contrastId || !restorable) {
        this.#contrastDispatch.newRandomColors();
        return;
      }

      this.#contrastDispatch.restoreContrastColors(contrastId);
    });
  }

}
