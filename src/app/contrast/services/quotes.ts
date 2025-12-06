import {computed, Injectable} from '@angular/core';
import {httpResource} from "@angular/common/http";
import {environment} from "@environments/environment";


interface ZenQuote {
  q: string,
  a: string,
  h: string
}

@Injectable({
  providedIn: 'root',
})
export class Quotes {

  readonly #quoteOfTheDay = httpResource<ZenQuote>(() => {
    return `${(environment.quotesApiUrl)}/random`;
  });

  public quoteOfTheDay = computed(() => {
    const resource = this.#quoteOfTheDay;

    return resource;
  });

}
