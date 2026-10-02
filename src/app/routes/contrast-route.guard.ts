import {contrastEvents} from "@core/contrast/contrast.events";
import {injectDispatch} from "@ngrx/signals/events";
import {ActivatedRouteSnapshot, CanActivateFn, Router, UrlTree} from "@angular/router";
import {inject} from "@angular/core";
import {generateRandomContrastColors, isRestorableContrastId} from "@engine/contrast/contrast-id.helper";


/**
 * Guard function that ensures valid contrast IDs in the route.
 *
 * - If a valid contrastId is present: restores the colors and allows
 *   navigation (returns true)
 * - If no contrastId, or one `isRestorableContrastId()` rejects: generates
 *   new random colors and redirects to the new ID (returns UrlTree)
 *
 * @param route - The active route snapshot
 * @returns true to allow navigation, or UrlTree to redirect to a new contrast ID
 */

export const contrastGuard: CanActivateFn = (route: ActivatedRouteSnapshot): boolean | UrlTree => {
  const dispatch = injectDispatch(contrastEvents);
  const router = inject(Router);

  const routeContrastId = route.params["contrastId"]
    ?? route.firstChild?.params["contrastId"];

  const restorable = !!routeContrastId && isRestorableContrastId(routeContrastId);

  if (restorable) {
    dispatch.restoreContrastColors(routeContrastId);
    return true;
  }

  const contrastColors = generateRandomContrastColors();
  dispatch.contrastColorsChangedWithoutNav(contrastColors);

  return router.createUrlTree(["/contrast", contrastColors.id]);
};
