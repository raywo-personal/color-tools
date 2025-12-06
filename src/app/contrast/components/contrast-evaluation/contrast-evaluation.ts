import {Component, computed, inject} from "@angular/core";
import {StarRating} from "@contrast/components/star-rating/star-rating";
import {AppStateStore} from "@core/app-state.store";


@Component({
  selector: "div[ct-contrast-evaluation]",
  imports: [
    StarRating
  ],
  templateUrl: "./contrast-evaluation.html",
  styles: ``,
  host: {
    class: "contrast-evaluation"
  }
})
export class ContrastEvaluation {

  readonly #stateStore = inject(AppStateStore);

  protected readonly ratio = this.#stateStore.contrastRatio;

  protected readonly rating = computed(() => {
    return this.ratio();
  });

}
