import {persistenceEvents} from "./persistence.events";
import {tap} from "rxjs";
import {Events} from "@ngrx/signals/events";
import {LocalStorage} from "@common/services/local-storage.service";
import {AppStateStore} from "../app-state.store";
import {contrastTypeAddressFrom} from "@contrast-type/models/contrast-type-address.model";
import {contrastTypePageOf} from "@core/contrast/contrast.reducers";


/**
 * Writes the theme and the address of the state. Nothing else: the address
 * carries both views, and the v1 keys are read and never written.
 */
export function saveStateEffect(events: Events,
                                localStorageService: LocalStorage,
                                store: unknown) {
  return events
    .on(persistenceEvents.saveAppState)
    .pipe(
      tap(() => {
        console.info("Saving app state to persistence ...");

        // `store` is unknown, because if it where AppStateStore, we would have
        // a circular referencing. So we cast it to the correct type.
        const typedStore = store as AppStateStore;

        const address = contrastTypeAddressFrom(contrastTypePageOf({
          currentPalette: typedStore.currentPalette(),
          paletteSeed: typedStore.paletteSeed(),
          contrastColors: typedStore.contrastColors(),
          typeRoles: typedStore.typeRoles(),
          placements: typedStore.placements()
        }));

        localStorageService.set("colorTheme", typedStore.colorTheme());
        localStorageService.set("address", address);
      })
    );
}
