import {contrastEvents} from "@core/contrast/contrast.events";
import {injectDispatch} from "@ngrx/signals/events";
import {ActivatedRouteSnapshot, CanActivateFn} from "@angular/router";


/**
 * Guard function to handle contrast-related logic during route activation.
 *
 * This function checks for the presence of a "contrastId" parameter in the
 * given route. If the "contrastId" is not found, it triggers the generation of
 * new random colors.
 * Regardless of the presence or absence of "contrastId", the function allows
 * route activation to proceed by returning `true`.
 *
 * @type {CanActivateFn}
 * @param {ActivatedRouteSnapshot} route - The active route snapshot containing
 *                                         route parameters and child routes.
 * @returns {boolean} - Returns `true` to allow route activation.
 */
export const contrastGuard: CanActivateFn = (route: ActivatedRouteSnapshot): boolean => {
  const dispatch = injectDispatch(contrastEvents);

  const contrastId =
    route.params["contrastId"] ?? route.firstChild?.params["contrastId"];

  if (!contrastId) {
    dispatch.newRandomColors();
    return true;
  }
  return true;
};
