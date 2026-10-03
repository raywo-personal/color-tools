import {contrastEvents} from "@core/contrast/contrast.events";
import {injectDispatch} from "@ngrx/signals/events";
import {ActivatedRouteSnapshot, CanActivateFn, Params, Router, UrlTree} from "@angular/router";
import {inject} from "@angular/core";
import {AppStateStore} from "@core/app-state.store";
import {
  ADDRESS_SEPARATOR,
  contrastTypeAddressFrom,
  isRestorableContrastTypeAddress
} from "@contrast-type/models/contrast-type-address.model";
import {contrastTypePageOf} from "@core/contrast/contrast.reducers";


/**
 * The route params that hold the three segments of the address, in order. The
 * route that registers this guard declares them as
 * `contrast/:palette/:view/:faces`.
 */
export const CONTRAST_ADDRESS_PARAMS = ["palette", "view", "faces"] as const;


/**
 * Guard function that restores Contrast & Type from its address.
 *
 * - If the params spell a restorable address: restores the page as a whole
 *   and allows navigation (returns true)
 * - Otherwise: redirects to the address of the state as it stands (returns
 *   UrlTree). The redirect passes this guard again and restores the same
 *   page, so it never loops.
 *
 * @param route - The active route snapshot
 * @returns true to allow navigation, or UrlTree to redirect to an address
 */
export const contrastGuard: CanActivateFn = (route: ActivatedRouteSnapshot): boolean | UrlTree => {
  const dispatch = injectDispatch(contrastEvents);
  const store = inject(AppStateStore);
  const router = inject(Router);

  const address = addressIn(route.params) ?? addressIn(route.firstChild?.params ?? {});

  if (address !== null && isRestorableContrastTypeAddress(address)) {
    dispatch.restoreContrastType(address);
    return true;
  }

  const current = contrastTypeAddressFrom(contrastTypePageOf({
    currentPalette: store.currentPalette(),
    paletteSeed: store.paletteSeed(),
    contrastColors: store.contrastColors(),
    typeRoles: store.typeRoles(),
    placements: store.placements()
  }));

  return router.createUrlTree(["/contrast", ...current.split(ADDRESS_SEPARATOR)]);
};


/** The address the params spell, or null where one of the three is missing. */
function addressIn(params: Params): string | null {
  const segments = CONTRAST_ADDRESS_PARAMS.map(name => params[name] as unknown);

  if (!segments.every(segment => typeof segment === "string")) return null;

  return segments.join(ADDRESS_SEPARATOR);
}
