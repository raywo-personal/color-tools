import {Component, computed, effect, inject, input} from '@angular/core';
import {SinglePaletteColor} from '@palettes/components/single-palette-color/single-palette-color';
import {GeneratorStyleSwitcher} from '@palettes/components/generator-style-switcher/generator-style-switcher';
import {PALETTE_SLOTS} from "@palettes/models/palette.model";
import {AppStateStore} from "@core/app-state.store";
import {isRestorable} from "@palettes/helper/palette-id.helper";
import {injectDispatch} from "@ngrx/signals/events";
import {palettesEvents} from "@core/palettes/palettes.events";
import {styleCaptionFor, styleDescriptionFor} from "@palettes/models/palette-style.model";


@Component({
  selector: 'app-color-palette',
  imports: [
    SinglePaletteColor,
    GeneratorStyleSwitcher
  ],
  templateUrl: './color-palette.html',
  styles: ``,
})
export class ColorPalette {

  readonly #stateStore = inject(AppStateStore);
  readonly #dispatch = injectDispatch(palettesEvents);

  protected readonly PALETTE_SLOTS = PALETTE_SLOTS;
  protected readonly palette = this.#stateStore.currentPalette;
  protected readonly style = this.#stateStore.paletteStyle;

  protected readonly styleName = computed(() => {
    return styleCaptionFor(this.style());
  });

  protected readonly styleDescription = computed(() => {
    return styleDescriptionFor(this.style());
  });

  public readonly paletteId = input.required<string>();


  constructor() {
    effect(() => {
      const paletteId = this.paletteId();
      const restorable = isRestorable(paletteId);

      if (!paletteId || !restorable) {
        console.info("No palette to restore. Creating new one. ID:", paletteId, "Restorable:", restorable);
        this.#dispatch.newRandomPalette();
        return;
      }

      this.#dispatch.restorePalette(paletteId);
    });
  }

}
