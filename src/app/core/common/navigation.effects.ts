import {Events} from "@ngrx/signals/events";
import {Router} from "@angular/router";
import {AppStateStore} from "@core/app-state.store";
import {palettesEvents} from "@core/palettes/palettes.events";
import {tap} from "rxjs";
import {transferEvents} from "@core/common/transfer.events";
import {contrastIdFromColors} from "@contrast/helper/contrast-id.helper";
import {contrastEvents} from "@core/contrast/contrast.events";


export function navigateToPaletteIdEffect(
  this: void,
  events: Events,
  router: Router,
  store: unknown
) {
  const typedStore = store as AppStateStore;

  return events
    .on(
      palettesEvents.newRandomPalette,
      palettesEvents.newPalette,
      palettesEvents.updatePaletteColor,
      palettesEvents.paletteChanged,
      transferEvents.useColorAsPaletteStarter
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
      contrastEvents.newRandomColors
    )
    .pipe(
      tap(() => {
        const contrastId = contrastIdFromColors([
          typedStore.contrastTextColor(),
          typedStore.contrastBgColor()
        ]);
        void router.navigate(["/contrast", contrastId]);
      })
    );
}
