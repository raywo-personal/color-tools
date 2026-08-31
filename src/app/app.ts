import {Component, computed, DOCUMENT, inject} from "@angular/core";
import {ActivatedRouteSnapshot, Router, RouterOutlet} from "@angular/router";
import {AppHeader} from "@shell/components/app-header/app-header";


@Component({
  selector: "ct-root",
  imports: [RouterOutlet, AppHeader],
  templateUrl: "./app.html",
  styles: ""
})
export class App {

  private document = inject(DOCUMENT);
  readonly #router = inject(Router);

  /**
   * A screen opts out of the app header with `data: {appHeader: false}`.
   * `routerState` is not a signal, so the completed navigation is what makes
   * the snapshot readable again.
   */
  protected readonly showsAppHeader = computed(() => {
    this.#router.lastSuccessfulNavigation();

    return this.activatedRoute().data["appHeader"] !== false;
  });


  constructor() {
    this.addStructuredData();
  }


  private activatedRoute(): ActivatedRouteSnapshot {
    let route = this.#router.routerState.snapshot.root;
    while (route.firstChild) route = route.firstChild;

    return route;
  }

  private addStructuredData(): void {
    const script = this.document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "ColorTools",
      "description": "Free online color converter and palette generator. Convert between HEX, RGB, HSL and other color formats.",
      "applicationCategory": "DesignApplication",
      "operatingSystem": "All",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      },
      "browserRequirements": "Requires JavaScript. Requires HTML5.",
      "url": "https://color-tools.skillbird.de/",
      "featureList": [
        "Color format conversion (HEX, RGB, HSL)",
        "Color palette generation",
        "Harmonious color schemes",
        "Color contrast checker"
      ],
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "5",
        "ratingCount": "1"
      }
    });

    this.document.head.appendChild(script);
  }

}
