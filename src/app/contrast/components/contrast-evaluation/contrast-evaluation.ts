import {Component, computed, inject} from "@angular/core";
import {StarRating} from "@contrast/components/star-rating/star-rating";
import {AppStateStore} from "@core/app-state.store";
import {DecimalPipe} from "@angular/common";
import {getAPCARating} from "@contrast/helper/apca-rating.helper";
import {apcaLookup} from "@contrast/helper/apca-look-up-table.helper";


@Component({
  selector: "div[ct-contrast-evaluation]",
  imports: [
    StarRating,
    DecimalPipe
  ],
  templateUrl: "./contrast-evaluation.html",
  styles: ``,
  host: {
    class: "contrast-evaluation"
  }
})
export class ContrastEvaluation {

  readonly #stateStore = inject(AppStateStore);

  protected readonly maxStars = 5;
  protected readonly ratio = this.#stateStore.contrastRatio;

  protected readonly rating = computed(() => {
    const positiveMax = 106;
    const negativeMax = 108;
    const ratio = this.ratio();

    let normalized = ratio < 0
      ? Math.abs(ratio) / negativeMax
      : ratio / positiveMax;

    normalized = Math.max(0, Math.min(1, normalized));

    return Math.round(normalized * this.maxStars);
  });

  protected readonly smallFontRating = computed(() => {
    const ratio = this.ratio();

    return getAPCARating(ratio, 14, "400", apcaLookup);
  });

  protected readonly largeFontRating = computed(() => {
    const ratio = this.ratio();

    return getAPCARating(ratio, 24, "400", apcaLookup);
  })

}
