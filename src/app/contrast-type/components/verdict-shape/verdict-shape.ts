import {Component, computed, input} from "@angular/core";
import {VerdictState, verdictMark} from "@contrast-type/models/element-verdict.model";


/**
 * The shape one verdict is drawn as: a tick, an arrow, a dash, a cross.
 *
 * **The shape is the carrier, not the colour.** A verdict on a page the
 * visitor coloured cannot be told by a hue - `danger` belongs to the failed
 * copy alone - and the marks sit on grounds the visitor picked, where a token
 * would vanish. So the state is in the geometry, and every caller puts a word
 * beside it.
 *
 * **Strokes rather than the `✓` and `✗` characters**, for the reason
 * `copy-confirmation.ts` gives for its own sign: at text weight they thin out
 * next to the row they belong to, and inside the preview they would be set in
 * whichever family the visitor picked - a family without the glyph renders a
 * box. Four paths are not an icon set worth a font file.
 *
 * `currentColor`, so the caller decides what it is drawn in: the rating rows
 * inherit a token, the marks in the preview take a colour APCA chose against
 * the element's own ground.
 *
 * `data-marker` is what the specs read. The rule they pin - a pass differs
 * from a fail by more than its colour - is about the shape, and a shape has no
 * other stable handle in the DOM. The size is the caller's: it puts a utility
 * on this host.
 */
@Component({
  selector: "ct-verdict-shape",
  templateUrl: "./verdict-shape.html",
  host: {
    "class": "block shrink-0"
  }
})
export class VerdictShape {

  readonly state = input.required<VerdictState>();

  protected readonly mark = computed(() => verdictMark(this.state()));

}
