import {Component, computed, inject} from "@angular/core";
import {Color} from "chroma-js";
import {AppStateStore} from "@core/app-state.store";
import {CopyService} from "@common/services/copy.service";
import {colorName} from "@common/helpers/color-name.helper";


type RampKind = "tint" | "shade";


interface RampStep {
  /** Where the step sits, 0 for the base color through 100 for the ramp's end. */
  readonly position: number;
  readonly color: Color;
  readonly background: string;
  readonly hex: string;
  readonly label: string;
}


interface Ramp {
  readonly kind: RampKind;
  /** The visible caption, set the way the draft writes it. */
  readonly caption: string;
  /** The list's accessible name; the caption's arrow would be read out. */
  readonly name: string;
  readonly steps: RampStep[];
}


/**
 * The two ramps under the palette: tints towards white, shades towards black.
 *
 * Both read the store's `tintColors` and `shadeColors`, so they follow the
 * base color the moment the converter's reducers rebuild them - a drag
 * included. Each ramp holds eleven steps with the base color first, which is
 * what the draft's `--tint-0` to `--tint-100` count.
 *
 * A step is the copy target, so it keeps the accessible minimum rather than
 * shrinking to a slice of a gradient: eleven across a phone would leave 23px
 * per step, so the row wraps there and lines up only from `sm:`. The hex is not
 * written on the step - at that width it does not fit above the type floor -
 * and the toast shows what landed instead. The accessible name says which
 * color and which position, "Copy Lavender, tint 30%": neighbouring steps
 * often share a nearest name, and the position is what tells them apart.
 *
 * A single click only, as on the palette swatches: the draft sets the base
 * color on double-click, and that gesture is spoken for until the pinning
 * decision is made. The Bezier and lightness-correction switches stay out for
 * the same reason; the ramps run on the state's defaults.
 */
@Component({
  selector: "ct-tint-shade-ramps",
  templateUrl: "./tint-shade-ramps.html",
  host: {
    "class": "grid gap-6"
  }
})
export class TintShadeRamps {

  readonly #stateStore = inject(AppStateStore);
  readonly #copy = inject(CopyService);

  protected readonly ramps = computed<Ramp[]>(() => [
    {
      kind: "tint",
      caption: "TINTS → WHITE",
      name: "Tints towards white",
      steps: stepsOf("tint", this.#stateStore.tintColors())
    },
    {
      kind: "shade",
      caption: "SHADES → BLACK",
      name: "Shades towards black",
      steps: stepsOf("shade", this.#stateStore.shadeColors())
    }
  ]);


  /** The text passed along is the hex the toast then shows. */
  protected copy(step: RampStep): void {
    void this.#copy.copyColor(step.color, step.hex);
  }

}


function stepsOf(kind: RampKind, colors: Color[]): RampStep[] {
  const last = Math.max(colors.length - 1, 1);

  return colors.map((color, index) => {
    const position = Math.round(index / last * 100);

    return {
      position,
      color,
      background: color.hex("rgb"),
      hex: color.hex("rgb").toUpperCase(),
      label: `Copy ${colorName(color)}, ${kind} ${position}%`
    };
  });
}
