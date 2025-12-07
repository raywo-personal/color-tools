import {Component, inject} from "@angular/core";
import {QuoteOfTheDay} from "../quote-of-the-day/quote-of-the-day";
import {ContrastColors} from "@contrast/components/contrast-colors/contrast-colors";
import {AppStateStore} from "@core/app-state.store";


@Component({
  selector: "ct-contrast",
  imports: [
    QuoteOfTheDay,
    ContrastColors
  ],
  templateUrl: "./contrast.html",
  styles: ``,
})
export class Contrast {

  readonly #stateStore = inject(AppStateStore);

  protected readonly textColor = this.#stateStore.contrastTextColor;
  protected readonly backgroundColor = this.#stateStore.contrastBgColor;

}
