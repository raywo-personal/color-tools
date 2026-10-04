import {contrastEvents} from "@core/contrast/contrast.events";
import {injectDispatch} from "@ngrx/signals/events";
import {ActivatedRouteSnapshot, CanActivateFn, Params, Router, UrlTree} from "@angular/router";
import {inject} from "@angular/core";
import {AppStateStore} from "@core/app-state.store";
import {
  ADDRESS_SEPARATOR,
  contrastTypeAddressFrom,
  FAMILY_SEPARATOR,
  isRestorableContrastTypeAddress
} from "@contrast-type/models/contrast-type-address.model";
import {contrastTypePageOf} from "@core/contrast/contrast.reducers";
import {AppState} from "@core/models/app-state.model";
import {rolledPalette} from "./palette-route.guard";


/**
 * The route params that hold the three segments of the address, in order. The
 * route that registers this guard declares them as
 * `contrast/:palette/:view/:faces`.
 */
export const CONTRAST_ADDRESS_PARAMS = ["palette", "view", "faces"] as const;


/**
 * Guard function that restores Contrast & Type from its address.
 *
 * - If the params spell the address of the state as it stands: allows
 *   navigation and restores nothing (returns true). That is the address
 *   `contrastTypeAddressEffect` has just written, and every change would
 *   otherwise be restored a second time
 * - If the params spell a restorable address: restores the page as a whole
 *   and allows navigation (returns true)
 * - If the path carries no address: redirects to the address of the state as
 *   it stands (returns UrlTree). The header's tab and the not-found page link
 *   to a bare `/contrast`
 * - If the params spell an address that does not restore: rolls a new
 *   palette on the current color, keeps the pair, the type and the
 *   placements, and redirects to that page's address, as the Studio does for
 *   a segment it cannot read
 *
 * Either redirect passes this guard again, so it never loops, and keeps the
 * fragment.
 *
 * @param route - The active route snapshot
 * @returns true to allow navigation, or UrlTree to redirect to an address
 */
export const contrastGuard: CanActivateFn = (route: ActivatedRouteSnapshot): boolean | UrlTree => {
  const dispatch = injectDispatch(contrastEvents);
  const store = inject(AppStateStore);

  const address = addressIn(route.params) ?? addressIn(route.firstChild?.params ?? {});

  if (address !== null && address === currentAddress(store)) return true;

  if (address !== null && isRestorableContrastTypeAddress(address)) {
    dispatch.restoreContrastType(address);
    return true;
  }

  return contrastTypeUrlTree(address === null ? {} : rolledPalette(store), route.fragment);
};


/** What a redirect into Contrast & Type may set apart from the state. */
export type ContrastTypeChanges = Partial<Pick<AppState, "currentPalette" | "paletteSeed" | "contrastColors" | "placements">>;


/**
 * The url of Contrast & Type on the state as it stands, with the given parts
 * replaced. Runs in an injection context.
 *
 * Parsed rather than built from commands. The family names are already
 * written through `encodeURIComponent`, and `createUrlTree()` would encode
 * them a second time: a shared link would read `Open%2520Sans`. Parsed, the
 * router decodes the segment once and `addressIn()` encodes it again.
 */
export function contrastTypeUrlTree(changes: ContrastTypeChanges, fragment: string | null): UrlTree {
  const store = inject(AppStateStore);
  const router = inject(Router);

  const target = contrastTypeAddressFrom(contrastTypePageOf({
    currentPalette: store.currentPalette(),
    paletteSeed: store.paletteSeed(),
    contrastColors: store.contrastColors(),
    typeRoles: store.typeRoles(),
    placements: store.placements(),
    ...changes
  }));
  const parsed = router.parseUrl(`/contrast/${target}`);

  return new UrlTree(parsed.root, parsed.queryParams, fragment);
}


/** The address of the page the state shows. */
function currentAddress(store: AppStateStore): string {
  return contrastTypeAddressFrom(contrastTypePageOf({
    currentPalette: store.currentPalette(),
    paletteSeed: store.paletteSeed(),
    contrastColors: store.contrastColors(),
    typeRoles: store.typeRoles(),
    placements: store.placements()
  }));
}


/**
 * The address the params spell, or null where one of the three is missing.
 *
 * The router hands the params over decoded, and the address carries its
 * family names encoded, so they are encoded again here. Left decoded, a name
 * with a `%` in it - which a link can carry - is decoded twice: it restores
 * as another name, or not at all, and the redirect to the page as it stands
 * then fails this guard on every pass and never ends.
 */
function addressIn(params: Params): string | null {
  const segments = CONTRAST_ADDRESS_PARAMS.map(name => params[name] as unknown);

  if (!segments.every(segment => typeof segment === "string")) return null;

  const [palette, view, faces] = segments;
  const families = faces.split(FAMILY_SEPARATOR).map(encodeURIComponent).join(FAMILY_SEPARATOR);

  return [palette, view, families].join(ADDRESS_SEPARATOR);
}
