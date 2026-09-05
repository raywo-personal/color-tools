import {Component} from "@angular/core";
import {PairFields} from "@contrast-type/components/pair-fields/pair-fields";
import {PaletteChips} from "@contrast-type/components/palette-chips/palette-chips";
import {PairActions} from "@contrast-type/components/pair-actions/pair-actions";
import {TypeControls} from "@contrast-type/components/type-controls/type-controls";
import {WebsitePreview} from "@contrast-type/components/website-preview/website-preview";
import {ApcaRating} from "@contrast-type/components/apca-rating/apca-rating";


/**
 * The Contrast & Type grid.
 *
 * The draft's two columns are the **wide** layout and arrive with `lg:`.
 * Unprefixed the screen is one stack, so the narrow column is what the markup
 * describes and the breakpoint widens it.
 *
 * The left column is the whole control stack - the pair, the palette chips,
 * the two gestures, the rating and the type controls. The right column is the
 * website preview, which is why it is the one that grows.
 */
@Component({
  selector: "ct-contrast-type",
  imports: [PairFields, PaletteChips, PairActions, ApcaRating, TypeControls, WebsitePreview],
  templateUrl: "./contrast-type.html",
  host: {
    "class": "grid gap-8 lg:grid-cols-[minmax(15rem,18rem)_minmax(24rem,1fr)] lg:items-start lg:gap-13"
  }
})
export class ContrastType {
}
