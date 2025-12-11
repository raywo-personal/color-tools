import {injectDispatch} from "@ngrx/signals/events";
import {ActivatedRouteSnapshot, CanActivateFn} from "@angular/router";
import {palettesEvents} from "@core/palettes/palettes.events";


/**
 * A route guard function that ensures the necessary palette data is prepared
 * before activation.
 *
 * Checks whether a `paletteId` is present in the route parameters. If not, it
 * dispatches an event to generate a new random palette. This function is
 * typically used to guard routes that depend on palette-related data to ensure
 * proper initialization.
 * Regardless of the presence or absence of "paletteId", the function allows
 * route activation to proceed by returning `true`.
 *
 * @param {ActivatedRouteSnapshot} route - The current activated route snapshot
 *                                         containing route parameters.
 * @returns {boolean} Returns `true` to allow route activation.
 */
export const paletteGuard: CanActivateFn = (route: ActivatedRouteSnapshot): boolean => {
  const dispatch = injectDispatch(palettesEvents);

  const paletteId =
    route.params["paletteId"] ?? route.firstChild?.params["paletteId"];

  if (!paletteId) {
    dispatch.newRandomPalette();
    return true;
  }
  return true;
};
