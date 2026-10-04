import {Component, computed, inject} from "@angular/core";
import {Color} from "chroma-js";
import {AppStateStore} from "@core/app-state.store";
import {CopyService} from "@common/services/copy.service";
import {colorName} from "@engine/color/color-name.helper";
import {PALETTE_SLOTS, PaletteSlot} from "@engine/palette/palette.model";
import {styleDescriptionFor} from "@engine/palette/palette-style.model";
import {roleCaptionFor} from "@engine/palette/palette-role.helper";


interface SwatchRow {
  readonly slot: PaletteSlot;
  readonly color: Color;
  readonly background: string;
  readonly hex: string;
  readonly role: string;
  readonly label: string;
}


/**
 * The five colors of the current palette, each a copy target, with the line
 * that explains the style underneath.
 *
 * The swatch itself is the button and carries nothing but its color; hex and
 * role sit below it as text. That keeps the hex out of the accessible name -
 * a screen reader spells it out one character at a time - while the name still
 * says which color it is and what it is for: "Copy Cornflower Blue, base".
 *
 * A single click only. The draft sets the base color on double-click, and the
 * pinning gesture is still to be decided, so double-click stays free until
 * that decision is made.
 */
@Component({
  selector: "ct-palette-swatches",
  templateUrl: "./palette-swatches.html",
  host: {
    "class": "block"
  }
})
export class PaletteSwatches {

  readonly #stateStore = inject(AppStateStore);
  readonly #copy = inject(CopyService);

  protected readonly swatches = computed<SwatchRow[]>(() => {
    const palette = this.#stateStore.currentPalette();

    return PALETTE_SLOTS.map(slot => {
      const color = palette[slot].color;
      const role = roleCaptionFor(palette.style, slot);

      return {
        slot,
        color,
        background: color.hex("rgb"),
        hex: color.hex("rgb").toUpperCase(),
        role,
        label: `Copy ${colorName(color)}, ${role}`
      };
    });
  });

  protected readonly description = computed(() =>
    styleDescriptionFor(this.#stateStore.currentPalette().style));


  /** The text passed along is the hex on screen, so the toast shows what landed. */
  protected copy(swatch: SwatchRow): void {
    void this.#copy.copyColor(swatch.color, swatch.hex);
  }

}
