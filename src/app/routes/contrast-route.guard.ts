import {contrastEvents} from "@core/contrast/contrast.events";
import {injectDispatch} from "@ngrx/signals/events";
import {ActivatedRouteSnapshot, CanActivateFn, Router, UrlTree} from "@angular/router";
import {inject} from "@angular/core";
import {AppStateStore} from "@core/app-state.store";
import {CONTRAST_ID_LENGTH, contrastIdFromColors} from "@contrast/helper/contrast-id.helper";
import {isRestorable} from "@common/helpers/validate-string-id.helper";


/**
 * Guard function that ensures valid contrast IDs in the route.
 *
 * - If a valid contrastId is present: restores the colors and allows
 *   navigation (returns true)
 * - If no or invalid contrastId: generates new random colors and redirects to
 *   the new ID (returns UrlTree)
 *
 * @param route - The active route snapshot
 * @returns true to allow navigation, or UrlTree to redirect to a new contrast ID
 */

export const contrastGuard: CanActivateFn = (route: ActivatedRouteSnapshot): boolean | UrlTree => {
  const dispatch = injectDispatch(contrastEvents);
  const stateStore = inject(AppStateStore);
  const router = inject(Router);

  const routeContrastId = route.params["contrastId"]
    ?? route.firstChild?.params["contrastId"];

  const restorable = !!routeContrastId && isRestorable(routeContrastId, CONTRAST_ID_LENGTH);

  if (restorable) {
    dispatch.restoreContrastColors(routeContrastId);
    return true;
  }

  dispatch.newRandomColors();
  const newContrastColors = stateStore.contrastColors();
  const newContrastId = contrastIdFromColors(newContrastColors);

  return router.createUrlTree(["/contrast", newContrastId]);
};
