import {Component, computed, model} from '@angular/core';
import {HueSliderComponent} from "@common/components/hue-slider/hue-slider";
import {LuminanceSlider} from "@common/components/luminance-slider/luminance-slider";
import {SaturationSlider} from "@common/components/saturation-slider/saturation-slider";
import chroma, {Color} from "chroma-js";


@Component({
  selector: 'app-hsl-color-edit',
  imports: [
    HueSliderComponent,
    LuminanceSlider,
    SaturationSlider
  ],
  templateUrl: './hsl-color-edit.html',
  styles: ``,
})
export class HslColorEdit {

  protected readonly colorHue = computed(() => {
    return this.color().hsl()[0];
  });

  protected readonly colorSaturation = computed(() => {
    return this.color().hsl()[1] * 100;
  });

  protected readonly colorLuminance = computed(() => {
    return this.color().hsl()[2] * 100;
  });

  public color = model.required<Color>();


  protected updateHue(value: number) {
    const hslValues = this.color().hsl();
    hslValues[0] = value;
    const newColor = chroma.hsl(...hslValues);

    this.color.set(newColor);
  }


  protected updateSaturation(value: number) {
    const hslValues = this.color().hsl();
    hslValues[1] = value / 100;
    const newColor = chroma.hsl(...hslValues);

    this.color.set(newColor);
  }


  protected updateLuminance(value: number) {
    const hslValues = this.color().hsl();
    hslValues[2] = value / 100;
    const newColor = chroma.hsl(...hslValues);

    this.color.set(newColor);
  }

}
