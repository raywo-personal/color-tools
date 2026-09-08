import {Component} from "@angular/core";
import {PairFields} from "@contrast-type/components/pair-fields/pair-fields";
import {PaletteChips} from "@contrast-type/components/palette-chips/palette-chips";
import {PairActions} from "@contrast-type/components/pair-actions/pair-actions";
import {PageVerdicts} from "@contrast-type/components/page-verdicts/page-verdicts";
import {TypeRoles} from "@contrast-type/components/type-roles/type-roles";
import {TypeControls} from "@contrast-type/components/type-controls/type-controls";
import {WebsitePreview} from "@contrast-type/components/website-preview/website-preview";
import {ApcaRating} from "@contrast-type/components/apca-rating/apca-rating";
import {PlacedColors} from "@contrast-type/components/placed-colors/placed-colors";
import {ColorVision} from "@contrast-type/components/color-vision/color-vision";


/**
 * The Contrast & Type grid.
 *
 * The draft's two columns are the **wide** layout and arrive with `lg:`.
 * Unprefixed the screen is one stack, so the narrow column is what the markup
 * describes and the breakpoint widens it.
 *
 * The left column is the whole control stack - the pair, the palette chips,
 * the two gestures, the page's tally, the type roles with the rating under
 * them, the type controls, the ledger of placed colours and the colour-vision
 * block. The right column is the website preview, which is why it is the one
 * that grows.
 *
 * **The tally belongs to the pair, the rating to the role.** The tally counts
 * every mark beside the preview, so it closes the pair's block; the rating
 * answers about the role the segments select, so it sits directly under them.
 * The picker and the sliders that tune that role come after, in a block of
 * their own.
 *
 * **The left column is sized by the rating's row.** The row holds its caption
 * and its verdict on one line; narrower, the verdict wraps onto a line of its
 * own and reads as a second badge rather than as the verdict of the row above
 * it. The rating draws one row per role - the `figure` elements of
 * `SAMPLE_ELEMENTS` - and the widest of the four is the UI role's,
 * `FILLED BUTTON` with `Needs Lc 75` beside it. That is the row a narrower
 * `minmax()` has to be measured against; the rest of the page's elements never
 * reach the rating. The preview keeps well over its own minimum at every width
 * the two columns appear at.
 *
 * **The ledger fits that width by wrapping, not by widening it.** The draft
 * drew `PLACED COLOURS` at 400px with seven columns in a row, which 18rem
 * cannot hold - so a row there is two lines and every part of it wraps. Do not
 * raise the `minmax()` for it: the rating's row is what the column is measured
 * against, and a wider left column costs the preview the width it is there
 * for.
 */
@Component({
  selector: "ct-contrast-type",
  imports: [PairFields, PaletteChips, PairActions, PageVerdicts, TypeRoles, ApcaRating, TypeControls, PlacedColors, WebsitePreview, ColorVision],
  templateUrl: "./contrast-type.html",
  host: {
    "class": "grid gap-8 lg:grid-cols-[minmax(18rem,22rem)_minmax(24rem,1fr)] lg:items-start lg:gap-13"
  }
})
export class ContrastType {
}
