import {Component, inject} from "@angular/core";
import {QuoteOfTheDay} from "../quote-of-the-day/quote-of-the-day";
import {ContrastColors} from "@contrast/components/contrast-colors/contrast-colors";
import {AppStateStore} from "@core/app-state.store";
import {TextSamples} from "@contrast/components/text-samples/text-samples";
import {FontSelectorComponent} from "@common/components/font-selector/font-selector";
import {SelectedFont} from "@common/models/google-font.model";
import {commonEvents} from "@core/common/common.events";
import {injectDispatch} from "@ngrx/signals/events";


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

  protected readonly textColor = this.#stateStore.contrastTextColor;
  protected readonly backgroundColor = this.#stateStore.contrastBgColor;


  protected onFontSelected(font: SelectedFont | null) {
    this.#dispatch.fontSelected(font);
  }

}
