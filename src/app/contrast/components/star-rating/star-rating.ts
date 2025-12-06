import {Component, computed, input} from '@angular/core';


@Component({
  selector: 'ct-star-rating',
  imports: [],
  templateUrl: './star-rating.html',
  styles: ``,
})
export class StarRating {

  protected readonly stars = computed(() =>
    Array.from({length: this.rating()}, (_, i) => i + 1)
  );

  protected readonly remainingStars = computed(() => {
    const diff = this.maxRating() - this.rating();

    return Array.from({length: diff}, (_, i) => i + 1);
  });

  protected readonly ratingCaption = computed(() => {
    const rating = this.rating();
    const max = this.maxRating();

    if (!max || rating <= 0) return 'Very poor';

    const percentage = rating / max;

    if (percentage >= 0.8) return 'Very good';
    if (percentage >= 0.6) return 'Good';
    if (percentage >= 0.4) return 'Poor';

    return 'Very poor';
  });

  public readonly rating = input.required<number>();
  public readonly maxRating = input(5);
  public readonly showCaption = input(false);
  public readonly small = input(false);

}
