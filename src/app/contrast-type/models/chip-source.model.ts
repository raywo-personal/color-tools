import {Color} from "chroma-js";
import {ContrastColorRole} from "@engine/contrast/contrast-color.model";
import {ContrastColors} from "@engine/contrast/contrast-colors.model";
import {Palette, PALETTE_SLOTS, PaletteSlot} from "@engine/palette/palette.model";


/**
 * Where a colour on the chip row comes from: one of the palette's five slots,
 * or one half of the pair.
 *
 * **The pair's two halves are sources like any slot.** A visitor can put the
 * text colour on a button or the background on a card, so the thing a
 * placement stores is no longer a palette slot alone - `ElementPlacements`
 * says why it is a source and never a hex.
 *
 * `ContrastColorRole` rather than two literals of this file's own: `text` and
 * `background` are already the words the two fields, the chips' own menus and
 * the sliders' selector use for the pair, and a second spelling of the same
 * two would be the one that drifts.
 *
 * **The type stays out of the engine.** A slot is the palette's own concept
 * and the engine has it; "a chip on the Contrast & Type row" is this screen's,
 * and the MCP server's tools have no use for it.
 */
export type ChipSource = PaletteSlot | ContrastColorRole;


/**
 * The row's order: the palette's five, then the pair's own two.
 *
 * The pair comes last and in the pair's own order - text, then background - so
 * the last two chips stand under the two fields that set them, in the order
 * those fields are in.
 */
export const CHIP_SOURCES: readonly ChipSource[] = [...PALETTE_SLOTS, "text", "background"];


/**
 * The handle each half of the pair carries in the row.
 *
 * **Each one is the initial of the field that sets it** - `TEXT` and
 * `BACKGROUND`, the two words this app uses for the pair everywhere a visitor
 * reads one. The draft draws `G` for "ground", which is a word the app does
 * not use at all: the letter then explained itself nowhere and the chip leant
 * on sitting under the `BACKGROUND` field to be understood. `BG` costs no
 * width - two characters of `text-sm` mono is what `P1` takes - and asks the
 * visitor to bridge nothing. Do not shorten it back for symmetry with `T`.
 */
const PAIR_LABELS: Record<ContrastColorRole, string> = {
  text: "T",
  background: "BG"
};

/** What each half of the pair is called where a sentence names it. */
const PAIR_NAMES: Record<ContrastColorRole, string> = {
  text: "the text color",
  background: "the background"
};


export function isPairSource(source: ChipSource): source is ContrastColorRole {
  return source === "text" || source === "background";
}


/**
 * The handle a source carries wherever the visitor meets it: on its chip in
 * the row, and in the ledger row of a placement made from it.
 *
 * **One vocabulary per screen.** `roleCaptionFor()` names a slot by what the
 * generator did with it - `BASE`, `SPLIT A`, `−14` - which is the Studio's
 * question and the Studio's word. Here the question is which chip a colour
 * came off, and the answer has to be the thing the visitor pressed or dragged.
 * Do not print both: #134 asked for one word per screen and this is it.
 */
export function chipLabelFor(source: ChipSource): string {
  return isPairSource(source)
    ? PAIR_LABELS[source]
    : `P${PALETTE_SLOTS.indexOf(source) + 1}`;
}


/**
 * The handle spelled out, for an accessible name.
 *
 * A handle is not a name: a screen reader speaks `T` as a letter and `BG` as
 * two, and neither says which half of the pair it is. The palette's own five
 * need no such gloss - `P3` is a position and reads as one.
 */
export function chipSourceName(source: ChipSource): string | null {
  return isPairSource(source) ? PAIR_NAMES[source] : null;
}


/**
 * The colour a source holds right now.
 *
 * **The one place a source is resolved.** A slot is read off the palette and a
 * pair half off the pair, which is what makes a placement follow whichever of
 * the two moves: repaint the palette and `P2` hands the element its new
 * colour, type a new background and `BG` hands it that. A reader that resolved
 * a source of its own would be a second answer about the same element.
 */
export function colorOf(source: ChipSource, pair: ContrastColors, palette: Palette): Color {
  return isPairSource(source) ? pair[source] : palette[source].color;
}
