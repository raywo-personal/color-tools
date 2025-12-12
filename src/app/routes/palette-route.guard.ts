import {injectDispatch} from "@ngrx/signals/events";
import {ActivatedRouteSnapshot, CanActivateFn, Router, UrlTree} from "@angular/router";
import {palettesEvents} from "@core/palettes/palettes.events";
import {isRestorable} from "@common/helpers/validate-string-id.helper";
import {PALETTE_ID_BASE62_LENGTH} from "@palettes/helper/palette-id.helper";
import {inject} from "@angular/core";
import {AppStateStore} from "@core/app-state.store";
import {generatePalette} from "@palettes/helper/palette.helper";


/**
 * A route guard function that ensures the necessary palette data is prepared
 * before activation.
 *
 * - If a valid paletteId is present: restores the palette and allows
 *   navigation (returns true)
 * - If no or invalid paletteId: generates new palette and redirects to
 *   the new ID (returns UrlTree)
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
  const restorable = !!routePaletteId && isRestorable(routePaletteId, PALETTE_ID_BASE62_LENGTH);

  if (restorable) {
    dispatch.restorePalette(routePaletteId);
    return true;
  }

  const palette = generatePalette(stateStore.paletteStyle());
  dispatch.paletteChangedWithoutNav(palette);

  return router.createUrlTree(["/palettes", palette.id]);
};
