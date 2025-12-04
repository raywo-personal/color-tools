import {Component, computed, input} from '@angular/core';
import {DecimalPipe} from '@angular/common';


@Component({
  selector: 'ct-key-value-display',
  imports: [
    DecimalPipe
  ],
  templateUrl: './key-value-display.html',
  styles: ``
})
export class KeyValueDisplay {

  protected readonly sanitizedValue = computed(() => {
    return isNaN(this.value()) ? 0 : this.value();
  });

  public readonly key = input.required<string>();
  public readonly value = input.required<number>();
  public readonly precision = input<number>(2);

  protected readonly digitsInfo = computed(() => {
    return `1.${this.precision()}-${this.precision()}`;
  });

}
