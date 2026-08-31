import {computed, Service} from "@angular/core";
import {httpResource} from "@angular/common/http";
import {environment} from "@environments/environment";


interface ZenQuote {
  q: string,
  a: string,
  h: string
}

@Service()
export class Quotes {

  readonly #quoteOfTheDay = httpResource<ZenQuote>(() => {
    return `${(environment.quotesApiUrl)}/random`;
  });

  public readonly quoteOfTheDay = computed(() => {
    const resource = this.#quoteOfTheDay;

    return resource;
  });

}
