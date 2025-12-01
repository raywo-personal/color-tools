import {Component, model, output} from '@angular/core';
import {FormsModule} from '@angular/forms';

import {randomBetween} from "@common/helpers/random.helper";


@Component({
  selector: 'app-hue-slider',
  standalone: true,
  imports: [FormsModule],
  templateUrl: "./hue-slider.html",
  styles: ``,
})
export class HueSliderComponent {

  public readonly hue = model<number>(randomBetween(0, 360));
  public readonly hueChanged = output<number>();


  protected onHueChanged(value: number) {
    this.hueChanged.emit(value);
  }

}
