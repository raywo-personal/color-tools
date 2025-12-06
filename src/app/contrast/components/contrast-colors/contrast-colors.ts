import {Component} from '@angular/core';
import {ColorInputs} from "@contrast/components/color-inputs/color-inputs";
import {ContrastEvaluation} from "@contrast/components/contrast-evaluation/contrast-evaluation";


@Component({
  selector: 'div[ct-contrast-colors]',
  imports: [
    ColorInputs,
    ContrastEvaluation
  ],
  templateUrl: './contrast-colors.html',
  styles: ``,
  host: {
    class: "colors-container"
  }
})
export class ContrastColors {

}
