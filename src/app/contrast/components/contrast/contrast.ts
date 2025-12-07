import {Component, inject} from "@angular/core";
import {QuoteOfTheDay} from "../quote-of-the-day/quote-of-the-day";
import {ContrastColors} from "@contrast/components/contrast-colors/contrast-colors";
import {AppStateStore} from "@core/app-state.store";
import {TextSamples} from "@contrast/components/text-samples/text-samples";


@Component({
  selector: "ct-contrast",
  imports: [
    QuoteOfTheDay,
    ContrastColors,
    TextSamples
  ],
  templateUrl: "./contrast.html",
  styles: ``,
})
export class Contrast {

  readonly #stateStore = inject(AppStateStore);

  protected readonly textColor = this.#stateStore.contrastTextColor;
  protected readonly backgroundColor = this.#stateStore.contrastBgColor;

}
