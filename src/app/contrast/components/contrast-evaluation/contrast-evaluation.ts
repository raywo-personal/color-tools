import {Component, computed, inject, linkedSignal} from "@angular/core";
import {StarRating} from "@contrast/components/star-rating/star-rating";
import {AppStateStore} from "@core/app-state.store";
import {DecimalPipe} from "@angular/common";
import {getAPCARating, NEGATIVE_MAX_APCA_CONTRAST, POSITIVE_MAX_APCA_CONTRAST} from "@contrast/helper/apca-rating.helper";
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
  protected readonly ratio = linkedSignal(() => {
    return this.#stateStore.contrastColors.contrast();
  });

  protected readonly rating = computed(() => {
    const ratio = this.ratio();

    let normalized = ratio < 0
      ? Math.abs(ratio) / NEGATIVE_MAX_APCA_CONTRAST
      : ratio / POSITIVE_MAX_APCA_CONTRAST;

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
  });

  protected readonly isVeryGoodRating = computed(() =>
    this.rating() >= 4);
  protected readonly isGoodRating = computed(() =>
    this.rating() >= 3 && this.rating() < 4);
  protected readonly isPoorRating = computed(() =>
    this.rating() < 3);

}
