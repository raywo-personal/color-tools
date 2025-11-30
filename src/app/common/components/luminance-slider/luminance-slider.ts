import {Component, model, output} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {randomBetween} from "@common/helpers/random.helper";


@Component({
  selector: 'app-luminance-slider',
  imports: [
    FormsModule
  ],
  templateUrl: './luminance-slider.html',
  styles: ``,
})
export class LuminanceSlider {

  public readonly lum = model<number>(randomBetween(0, 100));
  public readonly lumChanged = output<number>();


  protected onLumChanged(value: number) {
    this.lumChanged.emit(value);
  }

}
