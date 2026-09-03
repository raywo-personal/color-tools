import {Component, inject} from "@angular/core";
import {Color} from "chroma-js";
import {injectDispatch} from "@ngrx/signals/events";
import {AppStateStore} from "@core/app-state.store";
import {converterEvents} from "@core/converter/converter.events";
import {ColorField} from "@common/components/color-field/color-field";


/**
 * The three ways to set the base color: the native picker, the value field and
 * a roll of the dice.
 *
 * Picker and field are `ColorField`, which the contrast pair uses twice more;
 * what is left here is the roll and the converter events the two of them
 * dispatch. No caption above the pair - it is the only color the Studio's left
 * column edits, and the swatch above it already says which one that is.
 */
@Component({
  selector: "ct-color-controls",
  imports: [ColorField],
  template: `
    <ct-color-field [color]="currentColor()" (colorChange)="commit($event)">
      <button type="button"
              title="Random color"
              class="h-11 shrink-0 cursor-pointer rounded-xs border border-line px-3 font-mono text-base tracking-widest text-dim hover:text-text focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-current"
              (click)="rollRandomColor()">Random
      </button>
    </ct-color-field>
  `,
  host: {
    "class": "block"
  }
})
export class ColorControls {

  readonly #stateStore = inject(AppStateStore);
  readonly #dispatch = injectDispatch(converterEvents);

  protected readonly currentColor = this.#stateStore.currentColor;


  protected commit(color: Color): void {
    this.#dispatch.colorChanged(color);
  }


  protected rollRandomColor(): void {
    this.#dispatch.newRandomColorWithNav();
  }

}
