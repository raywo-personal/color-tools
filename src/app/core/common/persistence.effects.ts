import {persistenceEvents} from "./persistence.events";
import {tap} from "rxjs";
import {SettingKey, SettingsMap} from "@common/models/local-storage.model";
import {Events} from "@ngrx/signals/events";
import {LocalStorage} from "@common/services/local-storage.service";
import {AppStateStore} from "../app-state.store";
import {GoogleFontLoaderService} from "@common/services/google-font-loader.service";
import {contrastIdFromColors} from "@engine/contrast/contrast-id.helper";


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

        const contrastId = contrastIdFromColors(typedStore.contrastColors());
        const {fontSize, fontWeight, lineHeight} = typedStore.typeSettings();

        const state: SettingsMap = {
          currentColor: typedStore.currentColor().hex(),
          currentPaletteId: typedStore.currentPalette().id,
          paletteSeed: typedStore.paletteSeed(),
          colorTheme: typedStore.colorTheme(),
          selectedFont: typedStore.selectedFont(),
          contrastId,
          fontSize,
          fontWeight,
          lineHeight
        };

        Object.keys(state)
          .forEach(key => {
            const typedKey = key as SettingKey;
            localStorageService.set(typedKey, state[typedKey]);
          });
      })
    );
}


/**
 * Loads the restored typeface once the load reducer has written it.
 *
 * `fontSelectedEffect` answers `commonEvents.fontSelected` alone, and a reload
 * never raises it - `loadAppStateReducer` writes `selectedFont` straight into
 * the state. Without this the preview sets a `font-family` whose stylesheet is
 * not in the head, so the visitor reads a generic fallback and the rating
 * beside it answers about a face nobody is looking at.
 *
 * An effect rather than a call inside the reducer: the reducer is what the
 * specs call directly, and a loader in it would put a Google Fonts request
 * into every one of those runs. The reducer has run by the time an effect sees
 * the event, so the store already holds the restored family.
 */
export function restoreFontEffect(events: Events,
                                  fontLoaderService: GoogleFontLoaderService,
                                  store: unknown) {
  return events
    .on(persistenceEvents.loadAppState)
    .pipe(
      tap(() => {
        // `store` is unknown for the same reason as above.
        const typedStore = store as AppStateStore;
        const font = typedStore.selectedFont();

        fontLoaderService.loadFont(font);
        fontLoaderService.setFontFamily(font);
      })
    );
}
