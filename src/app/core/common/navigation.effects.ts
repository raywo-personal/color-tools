import {Events} from "@ngrx/signals/events";
import {Router} from "@angular/router";
import {AppStateStore} from "@core/app-state.store";
import {palettesEvents} from "@core/palettes/palettes.events";
import {converterEvents} from "@core/converter/converter.events";
import {tap} from "rxjs";


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
      palettesEvents.updatePaletteColor,
      palettesEvents.paletteChanged,
      converterEvents.useColorAsPaletteStarter
    )
    .pipe(
      tap(() => {
        const palette = typedStore.currentPalette();
        void router.navigate(["/palettes", palette.id]);
      })
    );
}
