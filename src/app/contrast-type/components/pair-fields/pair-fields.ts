import {Component, computed, inject} from "@angular/core";
import {Color} from "chroma-js";
import {injectDispatch} from "@ngrx/signals/events";
import {AppStateStore} from "@core/app-state.store";
import {contrastEvents} from "@core/contrast/contrast.events";
import {ContrastColorRole} from "@contrast/models/contrast-color.model";
import {ColorField} from "@common/components/color-field/color-field";


interface PairRow {
  readonly role: ContrastColorRole;
  readonly label: string;
  readonly color: Color;
  readonly baseName: string;
}


/**
 * The two colors of the pair, each a `ColorField` with the draft's `BASE`
 * button beside it.
 *
 * Nothing here does contrast maths: both events run through
 * `createContrastColors()`, which recomputes the Lc from the pair it stores.
 *
 * Setting a color needs no announcement. The visitor is either in the field
 * they typed into or on the button they pressed, and both carry a name saying
 * what they do - unlike `SWAP` and the random pair, which replace both colors
 * from a control that says nothing about the result.
 */
@Component({
  selector: "ct-pair-fields",
  imports: [ColorField],
  templateUrl: "./pair-fields.html",
  host: {
    "class": "grid gap-5"
  }
})
export class PairFields {

  readonly #stateStore = inject(AppStateStore);
  readonly #dispatch = injectDispatch(contrastEvents);

  protected readonly rows = computed<PairRow[]>(() => {
    const colors = this.#stateStore.contrastColors();

    return [
      {
        role: "text",
        label: "TEXT",
        color: colors.text,
        baseName: "BASE: use as the text color"
      },
      {
        role: "background",
        label: "BACKGROUND",
        color: colors.background,
        baseName: "BASE: use as the background"
      }
    ];
  });


  protected setColor(role: ContrastColorRole, color: Color): void {
    if (role === "text") {
      this.#dispatch.textColorChanged(color);
    } else {
      this.#dispatch.backgroundColorChanged(color);
    }
  }


  /** Takes the color the Studio is working on over into this half of the pair. */
  protected useBaseColor(role: ContrastColorRole): void {
    this.setColor(role, this.#stateStore.currentColor());
  }

}
