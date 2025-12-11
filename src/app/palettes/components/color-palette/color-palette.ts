import {Component, computed, effect, inject, input} from "@angular/core";
import {SinglePaletteColor} from "@palettes/components/single-palette-color/single-palette-color";
import {GeneratorStyleSwitcher} from "@palettes/components/generator-style-switcher/generator-style-switcher";
import {PALETTE_SLOTS, PaletteColors} from "@palettes/models/palette.model";
import {AppStateStore} from "@core/app-state.store";
import {injectDispatch} from "@ngrx/signals/events";
import {palettesEvents} from "@core/palettes/palettes.events";
import {styleCaptionFor, styleDescriptionFor} from "@palettes/models/palette-style.model";
import {CdkDrag, CdkDragDrop, CdkDropList} from "@angular/cdk/drag-drop";
import {paletteFrom} from "@palettes/helper/palette.helper";
import {isRestorable} from "@common/helpers/validate-string-id.helper";
import {PALETTE_ID_BASE62_LENGTH} from "@palettes/helper/palette-id.helper";


@Component({
  selector: 'ct-color-palette',
  imports: [
    SinglePaletteColor,
    GeneratorStyleSwitcher,
    CdkDropList,
    CdkDrag
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
      const restorable = isRestorable(paletteId, PALETTE_ID_BASE62_LENGTH);

      if (!paletteId || !restorable) {
        console.info("No palette to restore. Creating new one. ID:", paletteId, "Restorable:", restorable);
        this.#dispatch.newRandomPalette();
        return;
      }

      this.#dispatch.restorePalette(paletteId);
    });
  }


  protected drop(event: CdkDragDrop<unknown>): void {
    if (event.previousIndex === event.currentIndex) return;

    const paletteColors: PaletteColors = {...this.palette()};
    this.swapColors(event.previousIndex, event.currentIndex, paletteColors);

    const palette = paletteFrom(paletteColors, this.palette().style);
    this.#dispatch.paletteChanged(palette);
  }


  private swapColors(fromIndex: number,
                     toIndex: number,
                     paletteColors: PaletteColors): void {
    const fromSlot = PALETTE_SLOTS[fromIndex];
    const toSlot = PALETTE_SLOTS[toIndex];

    const fromColor = paletteColors[fromSlot];
    const toColor = paletteColors[toSlot];

    paletteColors[toSlot] = {
      ...fromColor,
      isPinned: true
    };
    paletteColors[fromSlot] = toColor;
  }

}
