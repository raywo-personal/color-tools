import {Events} from "@ngrx/signals/events";
import {NavigationBehaviorOptions, Router, UrlTree} from "@angular/router";
import {AppStateStore} from "@core/app-state.store";
import {palettesEvents} from "@core/palettes/palettes.events";
import {filter, merge, tap} from "rxjs";
import {transferEvents} from "@core/common/transfer.events";
import {contrastEvents} from "@core/contrast/contrast.events";
import {converterEvents} from "@core/converter/converter.events";
import {commonEvents} from "@core/common/common.events";
import {paletteSegmentFrom} from "@engine/palette/palette-segment.helper";
import {contrastTypeAddressFrom} from "@contrast-type/models/contrast-type-address.model";
import {contrastTypePageOf} from "@core/contrast/contrast.reducers";


/** The views with an address, as their routes declare them in `data`. */
type View = "studio" | "contrast";


/**
 * Every committed change to the colour or the palette. Both addresses carry
 * the palette, so both effects listen to these.
 *
 * `*Changed` and never `*Adjusted`: those fire per frame of a drag, and the
 * address follows the value the gesture ends on. The `WithoutNav` events stay
 * out, as their name says.
 */
const PALETTE_CHANGES = [
  converterEvents.colorChanged,
  converterEvents.newRandomColorWithNav,
  palettesEvents.newRandomPaletteWithNav,
  palettesEvents.newPaletteWithNav,
  palettesEvents.updatePaletteColor,
  palettesEvents.paletteChanged,
  palettesEvents.styleChanged,
  palettesEvents.seedHueChanged
] as const;


/**
 * Keeps the Studio's address - the palette segment - in step with the state
 * while the Studio is showing.
 */
export function studioAddressEffect(
  this: void,
  events: Events,
  router: Router,
  store: unknown
) {
  const typedStore = store as AppStateStore;

  return events
    .on(...PALETTE_CHANGES)
    .pipe(
      filter(() => viewShowing(router) === "studio"),
      tap(() => {
        const segment = paletteSegmentFrom(typedStore.currentPalette(), typedStore.paletteSeed());

        follow(router, router.createUrlTree(["/", segment]), "studio");
      })
    );
}


/**
 * Keeps the Contrast & Type address in step with everything it carries: the
 * pair, the palette, the type roles and the placements.
 *
 * A change made on the page moves the address only while the page is
 * showing - a palette changed in the Studio must not open Contrast & Type. A
 * transfer is the gesture that sends something there, and navigates from
 * either view.
 */
export function contrastTypeAddressEffect(
  this: void,
  events: Events,
  router: Router,
  store: unknown
) {
  const typedStore = store as AppStateStore;

  const changes = events
    .on(
      ...PALETTE_CHANGES,
      contrastEvents.textColorChanged,
      contrastEvents.backgroundColorChanged,
      contrastEvents.switchColors,
      contrastEvents.newRandomColorsWithNav,
      contrastEvents.colorPlaced,
      contrastEvents.placementReset,
      contrastEvents.placementsReset,
      commonEvents.fontSelected,
      commonEvents.fontsResolved,
      commonEvents.typeSettingsChanged
    )
    .pipe(filter(() => viewShowing(router) === "contrast"));

  const transfers = events
    .on(transferEvents.sendColorToContrast, transferEvents.sendPaletteToContrast)
    .pipe(filter(() => viewShowing(router) !== null));

  return merge(changes, transfers).pipe(
    tap(() => {
      const address = contrastTypeAddressFrom(contrastTypePageOf({
        currentPalette: typedStore.currentPalette(),
        paletteSeed: typedStore.paletteSeed(),
        contrastColors: typedStore.contrastColors(),
        typeRoles: typedStore.typeRoles(),
        placements: typedStore.placements()
      }));

      // Parsed rather than built from commands, as `contrastGuard` does: the
      // family names are already encoded, and `createUrlTree()` would encode
      // them a second time.
      follow(router, router.parseUrl(`/contrast/${address}`), "contrast");
    })
  );
}


/**
 * Navigates to the address of the state.
 *
 * - A change inside the view replaces the history entry, so Back leaves the
 *   view rather than stepping through every colour tried. A gesture that
 *   switches the view pushes, as a tab click does
 * - The fragment is dropped, and `scroll: "manual"` keeps the router's
 *   scroller out of the navigation whatever the url carries. Anchor scrolling
 *   is on, and it scrolls to the section and focuses it: every change would
 *   take the visitor away from the control they just used
 */
function follow(router: Router, url: UrlTree, view: View): void {
  const extras: NavigationBehaviorOptions = {
    replaceUrl: viewShowing(router) === view,
    scroll: "manual"
  };

  void router.navigateByUrl(url, extras);
}


/**
 * The view the activated route declares through `data: {addressOf}`, or null.
 *
 * The activated route and not the url: before the first navigation, and on
 * the not-found page, no view is showing, and a navigation from there would
 * open one the visitor never asked for.
 */
function viewShowing(router: Router): View | null {
  let route = router.routerState.snapshot.root;
  while (route.firstChild) route = route.firstChild;

  const view: unknown = route.data["addressOf"];

  return view === "studio" || view === "contrast" ? view : null;
}
