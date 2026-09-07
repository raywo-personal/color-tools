import chroma, {Color} from "chroma-js";
import {PALETTE_SLOTS, Palette, PaletteSlot} from "@engine/palette/palette.model";


/** A palette member that clears a requirement, and by how much. */
export interface PassingPaletteColor {

  readonly slot: PaletteSlot;
  readonly color: Color;
  /** Absolute Lc against the ground it was measured on. */
  readonly contrast: number;

}


/**
 * The palette member closest to `ink` that clears `requiredLc` against
 * `ground`.
 *
 * This is the answer to "this colour fails here, what in my palette would
 * work" - so the winner is the one nearest the colour the visitor already
 * has, not the one with the most contrast. The strongest member is usually
 * the palette's darkest or lightest, which is a different suggestion: it
 * carries the text and abandons the hue that was being tried.
 *
 * Distance in OKLab, as `vision-collapse.helper.ts` measures it: the answer
 * is shown to an eye, and equal steps in OKLab are the closest thing to
 * equal steps to that eye.
 *
 * `null` where no member clears the requirement, and where there is no
 * requirement to clear: a size the APCA table declines to rate has no bar to
 * name a colour against, and returning the nearest member anyway would put a
 * suggestion under a verdict that never said anything failed.
 *
 * Ties are broken by slot order, so the same palette answers the same way
 * twice - two members can sit at the same distance once a generator has
 * mirrored a hue.
 */
export function nearestPassingPaletteColor(ink: Color,
                                           ground: Color,
                                           requiredLc: number | null,
                                           palette: Palette): PassingPaletteColor | null {
  if (requiredLc === null) return null;

  let nearest: PassingPaletteColor | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const slot of PALETTE_SLOTS) {
    const color = palette[slot].color;
    const contrast = Math.abs(chroma.contrastAPCA(color, ground));

    if (contrast < requiredLc) continue;

    const distance = chroma.distance(color, ink, "oklab");

    // Strictly smaller, so the first of an equally distant set wins and slot
    // order decides.
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = {slot, color, contrast};
    }
  }

  return nearest;
}
