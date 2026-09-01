import {Component} from "@angular/core";
import {Swatch} from "@studio/components/swatch/swatch";
import {ColorControls} from "@studio/components/color-controls/color-controls";
import {ConversionList} from "@studio/components/conversion-list/conversion-list";


/**
 * The Studio grid.
 *
 * The draft's two columns are the **wide** layout and arrive with `lg:`.
 * Unprefixed the screen is one stack, so the narrow column is what the markup
 * describes and the breakpoint widens it.
 *
 * The left column is wider than the draft's 240 to 300 pixels, because the
 * conversion list decides its width: the longest value, an OKLch triple, needs
 * a good 18rem next to its label, and at the draft's upper bound it wrapped
 * onto a second line at every window size. The right column keeps its own
 * minimum, so both still fit at the breakpoint.
 */
@Component({
  selector: "ct-studio",
  imports: [Swatch, ColorControls, ConversionList],
  templateUrl: "./studio.html",
  host: {
    "class": "grid gap-8 lg:grid-cols-[minmax(17rem,22rem)_minmax(22.5rem,1fr)] lg:items-start lg:gap-13"
  }
})
export class Studio {
}
