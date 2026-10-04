import {Component, input, model, output} from "@angular/core";
import {FormsModule} from "@angular/forms";


/** Distinguishes the label from the input it names, once per instance. */
let nextInstance = 0;


/**
 * One numeric axis, as a native range input with a label and its value.
 *
 * The draft draws the slider as a `<div>` with a pointer handler. This is an
 * `<input type="range">` instead, because that is the difference between a
 * control the keyboard can reach and one it cannot - arrow keys, Home and End,
 * the value in the accessibility tree, and the touch behaviour all come with
 * the element. The draft's look is put back on top of it: the gradient goes on
 * the track pseudo-element through `--ct-track-image`, which is the only way
 * in - no utility class reaches a vendor pseudo-element.
 *
 * The component knows nothing about what it moves. It takes the range, the
 * text of the value and - where there is one - the gradient from its caller,
 * so the Studio's six color axes and the type controls' three are the same
 * component nine times rather than nine components.
 */
@Component({
  selector: "ct-slider",
  imports: [FormsModule],
  templateUrl: "./slider.html",
  styleUrl: "./slider.css",
  host: {
    "class": "block"
  }
})
export class Slider {

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

  /**
   * A CSS gradient for the track, drawn in the colors the axis passes through.
   *
   * Optional, because only a color axis has one: a size or a weight passes
   * through no colors, and a flat grey gradient handed to a track whose whole
   * point is the ramp would be a ramp claiming to be one. Left out, the track
   * is the `field` token - the plain strip the draft draws under the type
   * controls.
   */
  readonly track = input<string>();

  /**
   * A sentence under the control saying why it stands as it does.
   *
   * Wired to the input through `aria-describedby`, so the reason travels with
   * the control rather than sitting beside it as loose text - which is what a
   * disabled slider needs: without it a screen reader says "dimmed" and stops.
   */
  readonly description = input("");

  /**
   * An axis the visitor cannot move.
   *
   * Only where there is nothing to move it to - a typeface with a single
   * weight. A disabled range input leaves the tab order and is announced as
   * unavailable, which is the honest answer; the reason belongs in
   * `description`.
   */
  readonly disabled = input(false);

  readonly value = model.required<number>();

  /**
   * The end of a gesture - pointer release, or the key that moved the value.
   *
   * Not a second spelling of `valueChange`, which fires per frame: the caller
   * needs both, one to follow the drag and one to know it is over. Every frame
   * of a drag is a value the visitor is still choosing, and only the last of
   * them is worth storing.
   */
  readonly commit = output<void>();

  protected readonly inputId = `ct-slider-${nextInstance++}`;
  protected readonly descriptionId = `${this.inputId}-description`;

}
