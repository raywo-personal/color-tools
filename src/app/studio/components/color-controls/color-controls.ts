import {Component, inject, linkedSignal} from "@angular/core";
import {FormsModule} from "@angular/forms";
import {injectDispatch} from "@ngrx/signals/events";
import {AppStateStore} from "@core/app-state.store";
import {converterEvents} from "@core/converter/converter.events";
import {colorFrom} from "@common/helpers/color-format-parser.helper";
import {formatColor} from "@common/helpers/color-format.helper";


/**
 * The three ways to set the base color: the native picker, the value field and
 * a roll of the dice.
 *
 * The field takes any of the four formats the conversion list below writes, not
 * only hex. That list hands its rows to the clipboard, so a field that rejected
 * what the app had just copied would be the odd one out; `colorFrom()` already
 * reads all four.
 */
@Component({
  selector: "ct-color-controls",
  imports: [FormsModule],
  templateUrl: "./color-controls.html",
  styleUrl: "./color-controls.css",
  host: {
    "class": "flex items-center gap-2"
  }
})
export class ColorControls {

  readonly #stateStore = inject(AppStateStore);
  readonly #dispatch = injectDispatch(converterEvents);

  /**
   * What the picker shows. The native control only ever holds a valid hex, so
   * this needs no rejection path - it exists so that a color arriving from the
   * field or from `RND` moves the picker with it.
   */
  protected readonly pickerValue = linkedSignal(
    () => formatColor(this.#stateStore.currentColor(), "hex")
  );

  /** What the field shows while the visitor is editing it. */
  protected readonly fieldValue = linkedSignal(
    () => formatColor(this.#stateStore.currentColor(), "hex")
  );


  /**
   * Commits the field, on blur and on Enter.
   *
   * A value that is not a color is rejected by putting the current color back
   * into the field, not by clearing it: the field mirrors the color, so it must
   * never be left showing something the app is not using.
   */
  protected commitField(): void {
    const color = colorFrom(this.fieldValue().trim());

    if (!color) {
      this.fieldValue.set(formatColor(this.#stateStore.currentColor(), "hex"));

      return;
    }

    this.#dispatch.colorChanged(color);

    // Set rather than left to the linked signal: a value that parses to the
    // color already current changes nothing upstream, so nothing would
    // normalise the visitor's spelling of it.
    this.fieldValue.set(formatColor(color, "hex"));
  }


  /**
   * Commits the picker.
   *
   * Bound to `change`, not to `input`: a drag through the native picker fires
   * `input` continuously, and each one would recompute the tints and shades and
   * write the state to localStorage.
   */
  protected commitPicker(): void {
    const color = colorFrom(this.pickerValue());

    if (color) this.#dispatch.colorChanged(color);
  }


  protected rollRandomColor(): void {
    this.#dispatch.newRandomColorWithNav();
  }

}
