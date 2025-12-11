import {Component, inject, linkedSignal, signal} from "@angular/core";
import {AppStateStore} from "@core/app-state.store";
import {FONT_WEIGHTS, FontWeight} from "@contrast/models/apca-lookup-table.model";
import {StarRating} from "@contrast/components/star-rating/star-rating";
import {getAPCARating} from "@contrast/helper/apca-rating.helper";
import {apcaLookup} from "@contrast/helper/apca-look-up-table.helper";


@Component({
  selector: "div[ct-text-samples]",
  imports: [
    StarRating
  ],
  templateUrl: "./text-samples.html",
  styles: ``,
  host: {
    class: "row row-cols-3 g-4 text-samples",
    "[style.--ct-cc-text]": "textColor().hex()",
    "[style.--ct-cc-bg]": "bgColor().hex()",
    "[style.--ct-cc-font-family]": "selectedFont() ? 'var(--ct-selected-font)' : 'inherit'"
  }
})
export class TextSamples {

  readonly #stateStore = inject(AppStateStore);

  protected readonly textColor = linkedSignal(() => {
    return this.#stateStore.contrastColors.text();
  });
  protected readonly bgColor = linkedSignal(() => {
    return this.#stateStore.contrastColors.background();
  });
  protected readonly contrast = linkedSignal(() => {
    return this.#stateStore.contrastColors.contrast();
  });
  protected readonly selectedFont = this.#stateStore.selectedFont;

  protected readonly fontSizes = [14, 16, 32];
  protected readonly fontWeights = FONT_WEIGHTS;

  protected readonly sampleTextParagraph1 = signal(
    "All human beings are born free and equal in dignity and rights. " +
    "They are endowed with reason and conscience and should act towards one another in a spirit of brotherhood."
  );

  protected readonly sampleTextParagraph2 = signal(
    "Everyone is entitled to all the rights and freedoms set forth in this Declaration, " +
    "without distinction of any kind, such as race, colour, sex, language, religion, political or other opinion, " +
    "national or social origin, property, birth or other status."
  );


  protected fwClass(weight: string) {
    return `fw-${weight}`;
  }


  protected isCommonBodyText(fontSize: number, fontWeight: string): boolean {
    return fontSize === 16 && fontWeight === "400";
  }


  protected isCommonHeading(fontSize: number, fontWeight: string): boolean {
    return fontSize === 32 && fontWeight === "700";
  }


  protected ratingFor(fontSize: number, fontWeight: FontWeight): number {
    return getAPCARating(this.contrast(), fontSize, fontWeight, apcaLookup);
  }

}
