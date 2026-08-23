import {Events} from "@ngrx/signals/events";
import {ColorThemeService} from "@common/services/color-theme.service";
import {tap} from "rxjs";
import {converterEvents} from "./converter.events";
import {AppStateStore} from "../app-state.store";


export function colorChangedEffect(
  this: void,
  events: Events,
  colorThemeService: ColorThemeService,
  store: unknown
) {
  const typedStore = store as AppStateStore;

  return events
    .on(converterEvents.colorChanged, converterEvents.newRandomColorWithNav)
    .pipe(
      tap(() => {
        const color = typedStore.currentColor();
        const useBackground = typedStore.useAsBackground();

        if (useBackground) {
          colorThemeService.setBackgroundColor(color);
        } else {
          colorThemeService.resetBackgroundColor();
        }
      })
    );
}

export function useAsBackgroundChangedEffect(
  this: void,
  events: Events,
  colorThemeService: ColorThemeService,
  store: unknown
) {
  const typedStore = store as AppStateStore;

  return events
    .on(converterEvents.useAsBackgroundChanged)
    .pipe(
      tap(event => {
        if (event.payload) {
          colorThemeService.setBackgroundColor(typedStore.currentColor());
        } else {
          colorThemeService.resetBackgroundColor();
        }
      })
    );
}
