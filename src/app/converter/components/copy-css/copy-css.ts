import {Component, computed, inject, input} from "@angular/core";
import {ColorSpace} from "@engine/color/color-space.model";
import {AppStateStore} from "@core/app-state.store";


@Component({
  selector: 'div[app-copy-css]',
  imports: [],
  templateUrl: './copy-css.html',
  styles: ``,
  host: {
    "class": "input-css-copy"
  }
})
export class CopyCss {

  readonly #stateStore = inject(AppStateStore);

  protected readonly cssToDisplay = computed(() => {
    const color = this.#stateStore.currentColor();

    switch (this.colorMode()) {
      case "hex":
        return color.hex();
      case "rgb":
        return color.css("rgb");
      case "hsl":
        return color.css("hsl");
      case "oklch":
        return color.css("oklch");
      default:
        return color.hex();
    }
  });


  public readonly colorMode = input.required<ColorSpace>();


  protected copyToClipboard(value: string) {
    void navigator.clipboard.writeText(value);
  }

}
