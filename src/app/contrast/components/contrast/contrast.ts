import {Component, signal} from '@angular/core';
import {QuoteOfTheDay} from "../quote-of-the-day/quote-of-the-day";
import chroma from "chroma-js";


@Component({
  selector: 'ct-contrast',
  imports: [
    QuoteOfTheDay
  ],
  templateUrl: './contrast.html',
  styles: ``,
})
export class Contrast {

  protected readonly textColor = signal(chroma.random());
  protected readonly backgroundColor = signal(chroma.random());

}
