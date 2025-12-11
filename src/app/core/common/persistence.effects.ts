import {persistenceEvents} from "./persistence.events";
import {tap} from "rxjs";
import {SettingKey, SettingsMap} from "@common/models/local-storage.model";
import {Events} from "@ngrx/signals/events";
import {LocalStorage} from "@common/services/local-storage.service";
import {AppStateStore} from "../app-state.store";
import {contrastIdFromColors} from "@contrast/helper/contrast-id.helper";


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

        const contrastId = contrastIdFromColors([
          typedStore.contrastTextColor(),
          typedStore.contrastBgColor()
        ])

        const state: SettingsMap = {
          currentColor: typedStore.currentColor().hex(),
          currentPaletteId: typedStore.currentPalette().id,
          colorTheme: typedStore.colorTheme(),
          selectedFont: typedStore.selectedFont(),
          contrastId
        };

        Object.keys(state)
          .forEach(key => {
            const typedKey = key as SettingKey;
            localStorageService.set(typedKey, state[typedKey]);
          });
      })
    );
}
