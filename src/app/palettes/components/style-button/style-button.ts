import {Component, computed, inject, input} from '@angular/core';
import {AppStateStore} from "@core/app-state.store";
import {injectDispatch} from "@ngrx/signals/events";
import {palettesEvents} from "@core/palettes/palettes.events";
import {PaletteStyle, styleCaptionFor} from "@palettes/models/palette-style.model";


@Component({
  selector: 'button[app-style-button]',
  imports: [],
  templateUrl: './style-button.html',
  styles: ``,
  host: {
    "class": "btn btn-outline-secondary",
    "[class.active]": "isSelected()",
    "(click)": "setStyle()",
    "[disabled]": "useRandom()"
  }
})
export class StyleButton {

  readonly #stateStore = inject(AppStateStore);
  readonly #dispatch = injectDispatch(palettesEvents);

  protected readonly style = this.#stateStore.paletteStyle;
  protected readonly useRandom = this.#stateStore.useRandomStyle;

  protected readonly isSelected = computed(() => {
    return this.style() === this.forStyle();
  });

  protected readonly caption = computed(() => {
    return styleCaptionFor(this.forStyle());
  });

  public readonly forStyle = input.required<PaletteStyle>();


  protected setStyle() {
    this.#dispatch.styleChanged(this.forStyle());
  }

}
