import {Events} from "@ngrx/signals/events";
import {Router} from "@angular/router";
import {AppStateStore} from "@core/app-state.store";
import {palettesEvents} from "@core/palettes/palettes.events";
import {tap} from "rxjs";
import {transferEvents} from "@core/common/transfer.events";
import {contrastIdFromColors} from "@contrast/helper/contrast-id.helper";
import {contrastEvents} from "@core/contrast/contrast.events";
import {converterEvents} from "@core/converter/converter.events";


export function navigateToPaletteIdEffect(
  this: void,
  events: Events,
  router: Router,
  store: unknown
) {
  const typedStore = store as AppStateStore;

  return events
    .on(
      palettesEvents.newRandomPaletteWithNav,
      palettesEvents.newPaletteWithNav,
      palettesEvents.updatePaletteColor,
      palettesEvents.paletteChanged,
      transferEvents.useColorAsPaletteStarter,
      transferEvents.generatePaletteFromContrast
    )
    .pipe(
      tap(() => {
        const palette = typedStore.currentPalette();
        void router.navigate(["/palettes", palette.id]);
      })
    );
}


export function navigateToContrast(
  this: void,
  events: Events,
  router: Router,
  store: unknown
) {
  const typedStore = store as AppStateStore;

  return events
    .on(
      transferEvents.sendColorToContrast,
      contrastEvents.switchColors,
      contrastEvents.textColorChanged,
      contrastEvents.backgroundColorChanged,
      contrastEvents.newRandomColorsWithNav
    )
    .pipe(
      tap(() => {
        const contrastId = contrastIdFromColors(typedStore.contrastColors());
        void router.navigate(["/contrast", contrastId]);
      })
    );
}


/**
 * The converter lives at a fixed path, so unlike the palette and contrast
 * effects this one needs no id from the store. Navigating while already on
 * /convert is a no-op; the effect exists for the top bar's "New color" button
 * on every other route, the not-found page above all.
 */
export function navigateToConvert(
  this: void,
  events: Events,
  router: Router
) {
  return events
    .on(converterEvents.newRandomColorWithNav)
    .pipe(
      tap(() => {
        void router.navigate(["/convert"]);
      })
    );
}
