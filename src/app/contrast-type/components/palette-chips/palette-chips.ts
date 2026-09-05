import {Component, computed, inject, signal} from "@angular/core";
import {Color} from "chroma-js";
import {injectDispatch} from "@ngrx/signals/events";
import {AppStateStore} from "@core/app-state.store";
import {contrastEvents} from "@core/contrast/contrast.events";
import {ContrastColorRole} from "@engine/contrast/contrast-color.model";
import {PALETTE_SLOTS, PaletteSlot} from "@engine/palette/palette.model";
import {colorName} from "@engine/color/color-name.helper";


interface Chip {
  readonly slot: PaletteSlot;
  readonly color: Color;
  readonly background: string;
  readonly label: string;
}


interface TargetOption {
  readonly role: ContrastColorRole;
  readonly caption: string;
}


const TARGET_OPTIONS: readonly TargetOption[] = [
  {role: "text", caption: "TEXT"},
  {role: "background", caption: "BACKGROUND"}
];


/**
 * The five colors of the current palette, each one a way into the pair.
 *
 * The draft sets the background on a click and the text color on a
 * double-click. A double-click is not reachable from the keyboard, so it
 * cannot be the only way to set the text color, and the alternative here is a
 * target above the row rather than a second control per chip: five chips are
 * five focus stops instead of ten, every action stays one click, and the row
 * needs no overlay.
 *
 * The price of a target is a mode, and what pays for it is the chip's own
 * name: it says which half of the pair the click will set, so the outcome is
 * spoken by the control the visitor is standing on. That is also why setting a
 * color from here is not announced - see `PairFields`.
 *
 * The target is component state, not app state: it is how this row is being
 * used, not something the app has to remember or share.
 */
@Component({
  selector: "ct-palette-chips",
  templateUrl: "./palette-chips.html",
  host: {
    "class": "block"
  }
})
export class PaletteChips {

  readonly #stateStore = inject(AppStateStore);
  readonly #dispatch = injectDispatch(contrastEvents);

  protected readonly options = TARGET_OPTIONS;

  /**
   * The background to begin with, which is the click the draft draws. It is
   * also the half a palette color is usually tried as - the text color then
   * follows from whether it reads on it.
   */
  protected readonly target = signal<ContrastColorRole>("background");

  protected readonly chips = computed<Chip[]>(() => {
    const palette = this.#stateStore.currentPalette();
    const target = this.target();
    const targetName = target === "text" ? "text color" : "background";

    return PALETTE_SLOTS.map(slot => {
      const color = palette[slot].color;

      return {
        slot,
        color,
        background: color.hex("rgb"),
        label: `Use ${colorName(color)} as the ${targetName}`
      };
    });
  });


  protected pickTarget(role: ContrastColorRole): void {
    this.target.set(role);
  }


  protected apply(chip: Chip): void {
    if (this.target() === "text") {
      this.#dispatch.textColorChanged(chip.color);
    } else {
      this.#dispatch.backgroundColorChanged(chip.color);
    }
  }

}
