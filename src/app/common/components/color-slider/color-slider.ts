import {Component, input, model, output} from "@angular/core";
import {FormsModule} from "@angular/forms";


/** Distinguishes the label from the input it names, once per instance. */
let nextInstance = 0;


/**
 * One axis of a color, as a native range input on a gradient track.
 *
 * The draft draws the slider as a `<div>` with a pointer handler. This is an
 * `<input type="range">` instead, because that is the difference between a
 * control the keyboard can reach and one it cannot - arrow keys, Home and End,
 * the value in the accessibility tree, and the touch behaviour all come with
 * the element. The draft's look is put back on top of it: the gradient goes on
 * the track pseudo-element through `--ct-track-image`, which is the only way
 * in - no utility class reaches a vendor pseudo-element.
 *
 * The component knows nothing about color. It takes the range, the gradient and
 * the text of the value from its caller, so HSL's three axes and OKLch's three
 * are the same component six times rather than six components.
 */
@Component({
  selector: "ct-color-slider",
  imports: [FormsModule],
  templateUrl: "./color-slider.html",
  styleUrl: "./color-slider.css",
  host: {
    "class": "block"
  }
})
export class ColorSlider {

  /** The axis, as the visitor reads it and as a screen reader announces it. */
  readonly label = input.required<string>();

  /**
   * The value with its unit - `210°`, `62%`, `0.104`.
   *
   * It is both the text beside the label and the input's `aria-valuetext`, so
   * the announcement carries the unit the eye gets. Without it a screen reader
   * reads OKLch chroma as a bare `0.1` on a scale whose maximum moves.
   */
  readonly valueText = input.required<string>();

  readonly min = input.required<number>();

  readonly max = input.required<number>();

  readonly step = input.required<number>();

  /** A CSS gradient for the track, drawn in the colors the axis passes through. */
  readonly track = input.required<string>();

  readonly value = model.required<number>();

  /**
   * The end of a gesture - pointer release, or the key that moved the value.
   *
   * Not a second spelling of `valueChange`, which fires per frame: the caller
   * needs both, one to follow the drag and one to know it is over. Every frame
   * of a drag is a color the visitor is still choosing, and only the last of
   * them is worth storing.
   */
  readonly commit = output<void>();

  protected readonly inputId = `ct-color-slider-${nextInstance++}`;

}
