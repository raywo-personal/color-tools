import {Component, computed, input, model, viewChild} from "@angular/core";
import {FormsModule, NgModel, ReactiveFormsModule} from "@angular/forms";


@Component({
  selector: 'div[app-ranged-input]',
  imports: [
    ReactiveFormsModule,
    FormsModule
  ],
  templateUrl: './ranged-input.html',
  styles: ``,
  host: {
    "[class.was-validated]": "valueField().touched || valueField().dirty"
  }
})
export class RangedInput {

  protected readonly valueField = viewChild.required<NgModel>("valueField");

  protected readonly valueRead = computed(() => {
    return this.value()?.toFixed(this.precision()) ?? 0;
  });

  protected readonly placeholder = computed(() => {
    return `${this.min()}–${this.max()}`;
  });

  protected readonly step = computed(() => {
    return 1 / (10 ** this.precision());
  });

  protected readonly fieldId = computed(() => {
    return `value-${crypto.randomUUID()}`;
  });

  protected readonly helpId = computed(() => {
    return `value-help-${this.fieldId()}`;
  });


  public readonly value = model.required<number | null>();
  public readonly label = input.required<string>();
  public readonly min = input<number>(0);
  public readonly max = input<number>(100);
  public readonly precision = input<number>(2);
  public readonly unit = input<string | null>(null);


  protected valueChanged(value: string) {
    this.value.set(parseFloat(value));
  }

}
