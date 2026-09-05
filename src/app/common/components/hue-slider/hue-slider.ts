import {Component, model} from "@angular/core";
import {FormsModule} from "@angular/forms";

import {randomBetween} from "@engine/helpers/random.helper";


@Component({
  selector: 'ct-hue-slider',
  imports: [FormsModule],
  templateUrl: "./hue-slider.html",
  styles: ``,
})
export class HueSliderComponent {

  public readonly hue = model<number>(randomBetween(0, 360));

}
