import {Component, computed, input, output} from '@angular/core';
import {createShades, createTints} from "@common/helpers/tints-and-shades.helper";
import {PaletteColor} from "@palettes/models/palette-color.model";
import {Color} from "chroma-js";
import {contrastingColor} from "@common/helpers/contrasting-color.helper";


@Component({
  selector: 'div[app-single-color-shades]',
  imports: [],
  templateUrl: './single-color-shades.html',
  styles: ``,
  host: {
    "class": "shades"
  }
})
export class SingleColorShades {

  protected readonly shades = computed(() => {
    const color = this.color();

    return [
      ...createTints(color.startingColor)
        .slice(1)
        .reverse(),
      ...createShades(color.startingColor)
    ];
  });


  public readonly color = input.required<PaletteColor>();
  public readonly colorSelected = output<Color>();


  protected isBaseColor(color: Color): boolean {
    return color.hex() === this.color().startingColor.hex();
  }


  protected isCurrentColor(color: Color): boolean {
    return color.hex() === this.color().color.hex();
  }


  protected textColor(color: Color): string {
    return contrastingColor(color).hex();
  }


  protected onShadeClick(shade: Color) {
    this.colorSelected.emit(shade);
  }

}
