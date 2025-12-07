import {Events} from "@ngrx/signals/events";
import {persistenceEvents} from "@core/common/persistence.events";
import {commonEvents} from "@core/common/common.events";
import {converterEvents} from "@core/converter/converter.events";
import {palettesEvents} from "@core/palettes/palettes.events";
import {inject} from "@angular/core";
import {LocalStorage} from "@common/services/local-storage.service";
import {ColorThemeService} from "@common/services/color-theme.service";
import {Router} from "@angular/router";
import {colorThemeChangeEffect} from "@core/common/common.effects";
import {colorChangedEffect, useAsBackgroundChangedEffect} from "@core/converter/converter.effects";
import {map} from "rxjs";
import {saveStateEffect} from "@core/common/persistence.effects";
import {navigateToContrast, navigateToPaletteIdEffect} from "@core/common/navigation.effects";


export function allEffects(
  this: void,
  // Must be unknown because otherwise we would have circular referencing
  // between AppStateStore and Effects.
  store: unknown,
  events = inject(Events),
  localStorageService = inject(LocalStorage),
  themeService = inject(ColorThemeService),
  router = inject(Router)
) {
  return {
    setColorTheme$: colorThemeChangeEffect(events, themeService),

    setBackgroundColor$: useAsBackgroundChangedEffect(events, themeService, store),

    navigateToPalette$: navigateToPaletteIdEffect(events, router, store),

    navigateToContrast$: navigateToContrast(events, router, store),

    colorChanged$: colorChangedEffect(events, themeService, store),

    anyPersistableEvents$: events
      .on(
        commonEvents.colorThemeChanged,
        converterEvents.newRandomColor,
        converterEvents.colorChanged,
        palettesEvents.paletteChanged
      )
      .pipe(
        map(() => persistenceEvents.saveAppState())
      ),

    persist$: saveStateEffect(events, localStorageService, store),
  };
}
