import {Component, computed, input, linkedSignal, signal} from "@angular/core";
import {contrastingColor, contrastingMutedColor} from "@engine/contrast/contrasting-color.helper";
import {ToggleButton} from "@common/components/toggle-button/toggle-button";
import {PaletteColor} from "@engine/palette/palette-color.model";
import {PaletteSlot} from "@engine/palette/palette.model";
import {SingleColorShades} from "@palettes/components/single-color-shades/single-color-shades";
import chroma, {Color} from "chroma-js";
import {colorName} from "@engine/color/color-name.helper";
import {injectDispatch} from "@ngrx/signals/events";
import {palettesEvents} from "@core/palettes/palettes.events";
import {HslColorEdit} from "@common/components/hsl-color-edit/hsl-color-edit";
import {CdkDragHandle} from "@angular/cdk/drag-drop";
import {ContrastColor} from "@engine/contrast/contrast-color.model";
import {transferEvents} from "@core/common/transfer.events";


@Component({
  selector: "div[ct-single-palette-color]",
  imports: [
    ToggleButton,
    SingleColorShades,
    HslColorEdit,
    CdkDragHandle
  ],
  templateUrl: "./single-palette-color.html",
  styles: ``,
  host: {
    "class": "palette-color",
    "[class.showing-shades]": "showShades()",
    "[style.--ct-color-bg-color]": "colorHex()",
    "[style.--ct-color-text-color]": "textColor().hex()",
    "[style.--ct-color-muted-text-color]": "mutedTextColor().hex()"
  }
})
export class SinglePaletteColor {

  readonly #dispatch = injectDispatch(palettesEvents);
  readonly #transferDispatch = injectDispatch(transferEvents);

  protected readonly colorName = computed(() => {
    return colorName(this.color().color);
  });

  protected readonly colorHex = computed(() => {
    return this.color().color.hex().toUpperCase();
  });

  protected readonly colorHexCaption = computed(() => {
    return this.colorHex().replace("#", "");
  });

  protected readonly textColor = computed(() => {
    return contrastingColor(this.color().color);
  });

  protected readonly mutedTextColor = computed(() => {
    return contrastingMutedColor(this.color().color);
  });

  protected readonly isPinned = computed(() => {
    return this.color().isPinned;
  });

  protected readonly showShades = signal(false);
  protected readonly isEditing = signal(false);

  protected readonly editingColor = linkedSignal(() => {
    return this.color().color;
  });


  public readonly color = input.required<PaletteColor>();
  public readonly slot = input.required<PaletteSlot>();


  protected copyToClipboard() {
    this.isEditing.set(false);

    void navigator.clipboard.writeText(this.colorHex());
  }


  protected onToggleClick(current: boolean) {
    this.isEditing.set(false);

    this.#dispatch.updatePaletteColor({
      ...this.color(),
      isPinned: current
    });
  }


  protected showTintsAndShades() {
    this.isEditing.set(false);
    this.showShades.set(true);
  }


  protected updateColor(color: Color) {
    this.isEditing.set(false);
    this.showShades.set(false);

    this.#dispatch.updatePaletteColor({
      ...this.color(),
      color
    });
  }


  protected toggleEditing() {
    this.isEditing.set(!this.isEditing());
  }


  protected resetColor() {
    this.isEditing.set(false);

    const color = {
      ...this.color(),
      color: this.color().startingColor
    };

    this.#dispatch.updatePaletteColor(color);
  }


  protected newRandomColor() {
    this.isEditing.set(false);

    const color = {
      ...this.color(),
      color: chroma.random()
    };

    this.#dispatch.updatePaletteColor(color);
  }


  protected sendTextColor() {
    const contrastColor: ContrastColor = {
      color: this.color().color,
      role: "text"
    };

    this.#transferDispatch.sendColorToContrast(contrastColor);
  }


  protected sendBgColor() {
    const contrastColor: ContrastColor = {
      color: this.color().color,
      role: "background"
    };

    this.#transferDispatch.sendColorToContrast(contrastColor);
  }

}
