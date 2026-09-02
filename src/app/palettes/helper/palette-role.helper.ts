import {PaletteStyle} from "@palettes/models/palette-style.model";
import {PALETTE_SLOTS, PaletteSlot} from "@palettes/models/palette.model";


/** One caption per slot, in `PALETTE_SLOTS` order. */
type RoleCaptions = readonly [string, string, string, string, string];


/**
 * What each slot is for, per style.
 *
 * A function of style and slot rather than a field on `PaletteColor`: a field
 * would travel into the palette id, whose payload is fixed at 43 characters
 * and full, while the role is fully determined by what the generator did with
 * the slot. Each set below reads off the generator it describes - a hue offset
 * where the generator rotates, a lightness word where it lifts - so a caption
 * says how the color relates to the base rather than which slot it sits in.
 *
 * The minus is U+2212, which a screen reader speaks as "minus"; a hyphen it
 * reads as a dash or skips.
 */
const ROLE_CAPTIONS: Record<PaletteStyle, RoleCaptions> = {
  // The seed sets the first hue; the other four are independent draws, and
  // saying so is the only honest caption they have.
  "random": ["SEED", "RANDOM", "RANDOM", "RANDOM", "RANDOM"],
  // `analogRange(h, 28, 2)` spans 28 degrees in total, so the two analogs sit
  // 14 degrees either side of the base - not 28.
  "analogous": ["BASE", "−14", "PASTEL", "SPLIT", "+14"],
  "muted-analog-split": ["BASE", "−14", "PASTEL", "SPLIT", "+14"],
  "harmonic": ["BASE", "+30", "+60", "COMP", "+150"],
  "monochromatic": ["BASE", "TINT", "LIGHT", "PALE", "MIST"],
  "vibrant-balanced": ["BASE", "+120", "+240", "LIGHT +60", "LIGHT −20"],
  "high-contrast": ["BASE", "COMP", "INK", "DEEP", "PALE"],
  "triadic": ["BASE", "+120", "+240", "BASE LT", "+120 LT"],
  "complementary": ["BASE", "COMP", "BASE LT", "COMP LT", "PALE"],
  "split-complementary": ["BASE", "SPLIT A", "SPLIT B", "BASE LT", "COMP LT"]
};


export function roleCaptionFor(style: PaletteStyle, slot: PaletteSlot): string {
  return ROLE_CAPTIONS[style][PALETTE_SLOTS.indexOf(slot)];
}
