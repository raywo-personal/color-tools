import {injectDispatch} from "@ngrx/signals/events";
import {ActivatedRouteSnapshot, CanActivateFn, Router, UrlTree} from "@angular/router";
import {palettesEvents} from "@core/palettes/palettes.events";
import {isRestorablePaletteSegment, paletteSegmentFrom} from "@engine/palette/palette-segment.helper";
import {inject} from "@angular/core";
import {AppStateStore} from "@core/app-state.store";
import {generatePaletteFrom} from "@engine/palette/palette.helper";
import {randomSeed} from "@engine/helpers/random.helper";


/**
 * A route guard function that ensures the necessary palette data is prepared
 * before activation.
 *
 * - If a valid palette segment is present: restores the palette with its
 *   seed and allows navigation (returns true)
 * - If no segment, or one `isRestorablePaletteSegment()` rejects: rolls a
 *   new palette on the current color and redirects to its segment (returns
 *   UrlTree). The redirect passes this guard again and restores the palette
 *   as a whole; a bare palette id there would be rejected and loop.
 * @param {ActivatedRouteSnapshot} route - The current activated route snapshot
 *                                         containing route parameters.
 * @returns {boolean} Returns `true` to allow route activation.
 */
export const paletteGuard: CanActivateFn = (route: ActivatedRouteSnapshot): boolean | UrlTree => {
  const dispatch = injectDispatch(palettesEvents);
  const stateStore = inject(AppStateStore);
  const router = inject(Router);

  const routePaletteId = route.params["paletteId"]
    ?? route.firstChild?.params["paletteId"];
  const restorable = !!routePaletteId && isRestorablePaletteSegment(routePaletteId);

  if (restorable) {
    dispatch.restorePalette(routePaletteId);
    return true;
  }

  const seed = randomSeed();
  const palette = generatePaletteFrom(stateStore.currentColor(), stateStore.paletteStyle(), seed);

  return router.createUrlTree(["/palettes", paletteSegmentFrom(palette, seed)]);
};
