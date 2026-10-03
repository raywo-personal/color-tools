import {injectDispatch} from "@ngrx/signals/events";
import {ActivatedRouteSnapshot, CanActivateFn, Router, UrlTree} from "@angular/router";
import {palettesEvents} from "@core/palettes/palettes.events";
import {isRestorablePaletteSegment, paletteSegmentFrom} from "@engine/palette/palette-segment.helper";
import {inject} from "@angular/core";
import {AppStateStore} from "@core/app-state.store";
import {generatePaletteFrom} from "@engine/palette/palette.helper";
import {randomSeed} from "@engine/helpers/random.helper";


/** The route param that holds the palette segment. `studioMatcher` sets it. */
export const PALETTE_SEGMENT_PARAM = "palette";


/**
 * Guard function that restores the Studio from its address.
 *
 * - If the path carries the segment of the state as it stands: allows
 *   navigation and restores nothing (returns true). That is the address
 *   `studioAddressEffect` has just written, and a second restore would set
 *   the colour to the palette's BASE under the visitor's hands
 * - If the path carries a restorable palette segment: restores the palette
 *   with its seed and allows navigation (returns true)
 * - If the path carries no segment: redirects to the segment of the state as
 *   it stands (returns UrlTree). The header's tab and the not-found page link
 *   to a bare `/`; a fresh palette there would roll one on every tab click
 * - If the path carries a segment `isRestorablePaletteSegment()` rejects:
 *   rolls a new palette on the current color and redirects to its segment
 *
 * Either redirect passes this guard again, so it never loops, and keeps the
 * fragment, so a link into one of the Studio's sections still lands there.
 *
 * @param route - The active route snapshot
 * @returns true to allow navigation, or UrlTree to redirect to an address
 */
export const paletteGuard: CanActivateFn = (route: ActivatedRouteSnapshot): boolean | UrlTree => {
  const dispatch = injectDispatch(palettesEvents);
  const store = inject(AppStateStore);
  const router = inject(Router);

  const segment: unknown = route.params[PALETTE_SEGMENT_PARAM]
    ?? route.firstChild?.params[PALETTE_SEGMENT_PARAM];

  const current = paletteSegmentFrom(store.currentPalette(), store.paletteSeed());

  if (segment === current) return true;

  if (typeof segment === "string" && isRestorablePaletteSegment(segment)) {
    dispatch.restorePalette(segment);
    return true;
  }

  let target: string;

  if (segment === undefined) {
    target = current;
  } else {
    const seed = randomSeed();
    target = paletteSegmentFrom(generatePaletteFrom(store.currentColor(), store.paletteStyle(), seed), seed);
  }

  return router.createUrlTree(["/", target], {fragment: route.fragment ?? undefined});
};
