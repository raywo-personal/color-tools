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
 * The Contrast & Type grid: one stack, then two columns, then three.
 *
 * Unprefixed the screen is one stack, so the narrow column is what the markup
 * describes and the breakpoints widen it. `lg:` puts the preview beside the
 * controls, and `xl:` lifts the type block out of the control column into a
 * third of its own - colours, preview, type.
 *
 * **What the screen answers decides which column a block goes in.** It answers
 * "these two colours, in this role - what is the Lc, what is the verdict, and
 * this is the page". So the pair, the rating, the sliders and the preview are
 * what has to stay in view, and at `xl` they do: the type block starts at the
 * top of its column instead of below nine blocks' worth of colour.
 *
 * The colour column is the pair, the palette chips, the two gestures, the
 * page's tally, the ledger of placed colours and the colour-vision block. The
 * type column is the type roles, the rating, the picker, the three sliders and
 * the other roles. **The tally belongs with the colours, the rating with the
 * role.** The tally counts every mark beside the preview and judges the pair,
 * so it closes the colour column's first run; the rating answers about the
 * role the segments select, so it sits directly under them.
 *
 * **The preview is in the middle at `xl` while the type block follows the
 * colours in the markup.** So a keyboard walks the two control columns one
 * after the other and reaches the page's marks last, which is the order the
 * screen is read in at every other width - `lg` has exactly that order down
 * the left column. Placing the type block third visually costs a jump for the
 * eye; placing it third in the markup would cost the tab order the run of
 * controls.
 *
 * **The type column is sized by the rating's row.** The row holds its caption
 * and its verdict on one line; narrower, the verdict wraps onto a line of its
 * own and reads as a second badge rather than as the verdict of the row above
 * it. The rating draws one row per role - the `figure` elements of
 * `SAMPLE_ELEMENTS` - and the widest of the four is the UI role's,
 * `FILLED BUTTON` with `Needs Lc 75` beside it. That is the row a narrower
 * `minmax()` has to be measured against; the rest of the page's elements never
 * reach the rating. Below `xl` the rating rides in the one control column,
 * which is why that column carries the same minimum.
 *
 * **The colour column fits 18rem by wrapping, not by widening.** The draft
 * drew `PLACED COLOURS` at 400px with seven columns in a row, which 18rem
 * cannot hold - so a row there is two lines and every part of it wraps. Do not
 * raise the `minmax()` for it: a wider side column costs the preview the width
 * it is there for.
 *
 * **The side columns stop at 20rem and the preview takes the rest.** The shell
 * has no cap on its width, so the middle column gets what the viewport has
 * left once the inset, the two gaps and the two side columns are paid for.
 * At the `xl` breakpoint itself there is nothing to spare - the inset is at
 * its widest share of the viewport there, and the three minima plus the gaps
 * very nearly fill the row - so the preview sits at its own 24rem minimum and
 * the side columns stay short of their cap. The cap decides the widths above
 * the breakpoint, and there every rem of growth is the preview's. Do not give
 * the side columns a share of it: the preview is what the screen is about and
 * a control column does not read better wider, while 22rem each would cost
 * the preview several rem at every width past the breakpoint. Below `xl` only
 * one control column is drawn and it does stop at 22rem, because it holds the
 * rating's row and the ledger both.
 *
 * **The row gap is zero and the blocks bring their own.** A ruled break is
 * `mt-5` over `pt-4`, an unruled one `mt-6`; `contrast-type.html` says why the
 * same rhythm runs down both columns. A grid row gap on top of that would
 * space the type block twice as far from the colours as the blocks inside a
 * column are from each other.
 */
@Component({
  selector: "ct-contrast-type",
  imports: [PairFields, PaletteChips, PairActions, PageVerdicts, TypeRoles, ApcaRating, TypeControls, PlacedColors, WebsitePreview, ColorVision],
  templateUrl: "./contrast-type.html",
  host: {
    "class": "grid lg:grid-cols-[minmax(18rem,22rem)_minmax(24rem,1fr)] lg:items-start lg:gap-x-13 xl:grid-cols-[minmax(18rem,20rem)_minmax(24rem,1fr)_minmax(18rem,20rem)]"
  }
})
export class ContrastType {
}
