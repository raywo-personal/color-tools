import {Component, model} from "@angular/core";
import {FormsModule} from "@angular/forms";
import {randomBetween} from "@common/helpers/random.helper";


@Component({
  selector: 'ct-luminance-slider',
  imports: [
    FormsModule
  ],
  templateUrl: './luminance-slider.html',
  styles: ``,
})
export class LuminanceSlider {

  public readonly lum = model<number>(randomBetween(0, 100));

}
