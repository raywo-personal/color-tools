import {Component, computed, input} from '@angular/core';
import {Color} from 'chroma-js';
import {ColorSpace} from '@common/models/color-space.model';
import {NgTemplateOutlet} from '@angular/common';
import {KeyValueDisplay} from '@converter/components/key-value-display/key-value-display';
import {NgbTooltip} from '@ng-bootstrap/ng-bootstrap';
import {injectDispatch} from "@ngrx/signals/events";
import {converterEvents} from "@core/converter/converter.events";


@Component({
  selector: 'ct-color-swatch',
  imports: [
    NgTemplateOutlet,
    KeyValueDisplay,
    NgbTooltip
  ],
  templateUrl: './color-swatch.html',
  styles: ``
})
export class ColorSwatch {

  readonly #dispatch = injectDispatch(converterEvents);

  public readonly color = input.required<Color>();
  public readonly colorMode = input.required<ColorSpace>();

  protected cssToCopy = computed(() => {
    switch (this.colorMode()) {
      case "hex":
        return this.color().hex();
      case "rgb":
        return this.color().css("rgb");
      case "hsl":
        return this.color().css("hsl");
      default:
        return this.color().hex();
    }
  });


  protected copyToClipboard() {
    navigator.clipboard.writeText(this.cssToCopy());
  }


  protected setAsCurrentColor() {
    this.#dispatch.colorChanged(this.color());
  }

}
