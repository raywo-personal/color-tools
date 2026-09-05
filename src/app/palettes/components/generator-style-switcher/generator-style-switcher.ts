import {Component, computed, inject} from "@angular/core";
import {PaletteStyles, styleCaptionFor} from "@engine/palette/palette-style.model";
import {FormsModule} from "@angular/forms";
import {AppStateStore} from "@core/app-state.store";
import {injectDispatch} from "@ngrx/signals/events";
import {palettesEvents} from "@core/palettes/palettes.events";
import {StyleButton} from "@palettes/components/style-button/style-button";


@Component({
  selector: 'ct-generator-style-switcher',
  imports: [
    FormsModule,
    StyleButton
  ],
  templateUrl: './generator-style-switcher.html',
  styles: ``,
  host: {
    "class": "color-palette-style-switcher"
  }
})
export class GeneratorStyleSwitcher {

  readonly #stateStore = inject(AppStateStore);
  readonly #dispatch = injectDispatch(palettesEvents);

  protected readonly style = this.#stateStore.paletteStyle;
  protected readonly useRandom = this.#stateStore.useRandomStyle;
  protected readonly styles = PaletteStyles;

  protected readonly styleCaption = computed(() => {
    return styleCaptionFor(this.style());
  });


  protected useRandomChanged(value: boolean) {
    this.#dispatch.useRandomChanged(value);
  }

}
