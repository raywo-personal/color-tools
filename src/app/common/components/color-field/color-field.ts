import {Component, computed, inject, input, linkedSignal, model} from "@angular/core";
import {FormsModule} from "@angular/forms";
import {LiveAnnouncer} from "@angular/cdk/a11y";
import {Color} from "chroma-js";
import {colorFrom} from "@common/helpers/color-format-parser.helper";
import {formatColor} from "@common/helpers/color-format.helper";
import {colorName} from "@common/helpers/color-name.helper";


/** Distinguishes the label from the input it names, once per instance. */
let nextInstance = 0;


/**
 * A color as a native picker beside a value field, with room for one button.
 *
 * Three of these are on screen - the Studio's base color, and the contrast
 * pair's text and background - so what has to hold everywhere lives here: the
 * field takes any of the four formats the conversion list writes, not only
 * hex, and a value that is not a color puts the current one back rather than
 * clearing the field.
 *
 * The trailing button is projected, because it is the only part that differs:
 * `Random` in the Studio, `BASE` on the contrast pair. The component knows
 * nothing about where its color comes from or what else can change it.
 */
@Component({
  selector: "ct-color-field",
  imports: [FormsModule],
  templateUrl: "./color-field.html",
  styleUrl: "./color-field.css",
  host: {
    // `min-w-0` because the value field is an `<input type="text">`, whose
    // intrinsic width is its `size` - far wider than the column the field
    // sits in. Wherever this component is a grid or flex item, that width
    // becomes the item's automatic minimum, the track grows to it and the row
    // overflows its column. The utility sits here rather than with the
    // callers: on a plain block parent it does nothing, so no caller has to
    // know. Nothing in the toolchain catches the omission - happy-dom
    // computes no layout, so a row overflowing its column shows in a browser
    // and nowhere else.
    "class": "block min-w-0"
  }
})
export class ColorField {

  readonly #announcer = inject(LiveAnnouncer);

  /**
   * The caption above the two controls, and what they are announced by.
   *
   * Empty where the field is the only one on its screen: the Studio's base
   * color needs no caption to say which color it is, and an empty label leaves
   * the two controls with the generic names they carry there.
   */
  readonly label = input("");

  readonly color = model.required<Color>();

  protected readonly inputId = `ct-color-field-${nextInstance++}`;

  /**
   * What the picker shows. The native control only ever holds a valid hex, so
   * this needs no rejection path - it exists so that a color arriving from the
   * field, from the projected button or from anywhere else moves the picker
   * with it.
   */
  protected readonly pickerValue = linkedSignal(
    () => formatColor(this.color(), "hex")
  );

  /** What the field shows while the visitor is editing it. */
  protected readonly fieldValue = linkedSignal(
    () => formatColor(this.color(), "hex")
  );

  /**
   * The picker carries no visible label of its own - the caption above names
   * the pair - so its name is derived from that caption instead of repeating
   * it in the markup.
   */
  protected readonly pickerLabel = computed(() => {
    const label = this.label();

    return label ? `Pick the ${label.toLowerCase()} color` : "Pick a color";
  });

  /**
   * Only where there is no caption. With one, the `<label>` is the field's
   * name, and an `aria-label` beside it would replace the text on screen.
   */
  protected readonly fieldLabel = computed(() => this.label() ? null : "Color value");


  /**
   * Commits the field, on blur and on Enter.
   *
   * A value that is not a color is rejected by putting the current color back
   * into the field, not by clearing it: the field mirrors the color, so it must
   * never be left showing something the app is not using.
   *
   * The rejection is announced, because it is the one outcome here that moves
   * no focus and changes nothing a screen reader would read on its own: the
   * content is replaced in place while the cursor is still inside it. Without
   * the announcement somebody who typed a typo, pressed Enter and moved on
   * believes the color changed.
   *
   * Announced assertively, like the failed copy in `CopyService`: the visitor
   * is mid-edit, and a polite message queued behind their own typing arrives
   * after they have already left. The color is spoken by name, never as its
   * hex code - a screen reader reads that out one character at a time.
   *
   * The message opens with the caption where there is one, because a commit on
   * `blur` is spoken after the focus has left the field: nothing else then says
   * which of the pair's two fields put its color back, and a rejection heard
   * while standing on whatever was clicked next reads as that control's answer.
   * The Studio's field carries no caption and needs none - it is the only one
   * on its screen.
   *
   * A value that was accepted needs no second write to normalise its spelling.
   * The model changes on every commit, whatever the caller upstream makes of
   * it, and a linked signal re-reads its computation on a changed source
   * rather than comparing what comes out of it - so `rgb(51 102 204)` becomes
   * `#3366CC` even where the color was already that. The spec pins both, with
   * and without a caller writing back.
   */
  protected commitField(): void {
    const current = this.color();
    const color = colorFrom(this.fieldValue().trim());

    if (!color) {
      const caption = this.label();
      const opening = caption ? `${caption}: Not a color` : "Not a color";

      this.fieldValue.set(formatColor(current, "hex"));
      void this.#announcer.announce(
        `${opening}. Keeping ${colorName(current)}`,
        "assertive"
      );

      return;
    }

    this.color.set(color);
  }


  /**
   * Commits the picker.
   *
   * Bound to `change`, not to `input`: a drag through the native picker fires
   * `input` continuously, and each one would travel the whole way through the
   * store - recomputing the tints, shades and palette and writing localStorage.
   */
  protected commitPicker(): void {
    const color = colorFrom(this.pickerValue());

    if (color) this.color.set(color);
  }

}
