import {Component, inject} from '@angular/core';
import {Quotes} from "../../services/quotes";
import {AppStateStore} from "@core/app-state.store";


@Component({
  selector: 'div[ct-quote-of-the-day]',
  imports: [],
  templateUrl: './quote-of-the-day.html',
  styles: ``,
  host: {
    class: "quote-container",
    "[style.--ct-cc-bg]": "backgroundColor().hex()",
    "[style.--ct-cc-text]": "textColor().hex()"
  }
})
export class QuoteOfTheDay {

  readonly #quotes = inject(Quotes);
  readonly #stateStore = inject(AppStateStore);

  protected readonly qod = this.#quotes.quoteOfTheDay;

  protected readonly textColor = this.#stateStore.contrastTextColor;
  protected readonly backgroundColor = this.#stateStore.contrastBackgroundColor;

}
