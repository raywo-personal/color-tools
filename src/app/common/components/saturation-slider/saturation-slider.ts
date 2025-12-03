import {Component, computed, input, model, output} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {randomBetween} from "@common/helpers/random.helper";
import chroma from "chroma-js";


@Component({
  selector: 'app-saturation-slider',
  imports: [
    FormsModule
  ],
  templateUrl: "./saturation-slider.html",
  styles: ``
})
export class SaturationSlider {

  protected readonly hue = computed(() => {
    return this.baseColor().hsl()[0];
  });

  protected readonly luminance = computed(() => {
    const luminance = this.baseColor().hsl()[2];

    return `${luminance * 100}%`;
  });

  public readonly baseColor = input(chroma.random());
  public readonly sat = model<number>(randomBetween(0, 100));
  public readonly satChanged = output<number>();


  protected onSatChanged(value: number) {
    this.satChanged.emit(value);
  }

}
