import {Component, computed, input} from "@angular/core";
import {rangeToArray} from "@common/helpers/iterables.helper";


@Component({
  selector: "ct-star-rating",
  imports: [],
  templateUrl: "./star-rating.html",
  styles: ``,
})
export class StarRating {

  protected readonly stars = computed(() => {
      const count = this.rating();

      if (count <= 0) return [];

      return rangeToArray(1, count, 1);
    }
  );

  protected readonly remainingStars = computed(() => {
    const diff = this.maxRating() - this.rating();

    if (diff <= 0) return [];

    return rangeToArray(1, diff, 1);
  });

  protected readonly ratingCaption = computed(() => {
    const rating = this.rating();
    const max = this.maxRating();

    if (!max || rating <= 0) return "Very poor";

    const percentage = rating / max;

    if (percentage >= 0.8) return "Very good";
    if (percentage >= 0.6) return "Good";
    if (percentage >= 0.4) return "Poor";

    return "Very poor";
  });

  public readonly rating = input.required<number>();
  public readonly maxRating = input(5);
  public readonly showCaption = input(false);
  public readonly small = input(false);

}
