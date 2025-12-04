import {Component, DOCUMENT, inject} from '@angular/core';
import {TopBar} from '@header/components/top-bar/top-bar';
import {RouterOutlet} from '@angular/router';


@Component({
  selector: 'ct-root',
  imports: [TopBar, RouterOutlet],
  templateUrl: './app.html',
  styles: ``
})
export class App {

  private document = inject(DOCUMENT);

  constructor() {
    this.addStructuredData();
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
