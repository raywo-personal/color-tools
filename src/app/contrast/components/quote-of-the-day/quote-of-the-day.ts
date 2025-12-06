import {Component, inject, input} from '@angular/core';
import {Quotes} from "../../services/quotes";
import {Color} from "chroma-js";


@Component({
  selector: 'ct-quote-of-the-day',
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

  protected readonly qod = this.#quotes.quoteOfTheDay;

  public readonly textColor = input.required<Color>();
  public readonly backgroundColor = input.required<Color>();

}
