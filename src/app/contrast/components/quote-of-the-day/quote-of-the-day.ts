import {Component, inject} from "@angular/core";
import {Quotes} from "../../services/quotes";


@Component({
  selector: 'div[ct-quote-of-the-day]',
  imports: [],
  templateUrl: './quote-of-the-day.html',
  styles: ``,
  host: {
    class: "quote-container"
  }
})
export class QuoteOfTheDay {

  protected readonly qod = inject(Quotes).quoteOfTheDay;

}
