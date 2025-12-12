import {Events} from "@ngrx/signals/events";
import {persistenceEvents} from "@core/common/persistence.events";
import {commonEvents} from "@core/common/common.events";
import {converterEvents} from "@core/converter/converter.events";
import {palettesEvents} from "@core/palettes/palettes.events";
import {inject} from "@angular/core";
import {LocalStorage} from "@common/services/local-storage.service";
import {ColorThemeService} from "@common/services/color-theme.service";
import {GoogleFontLoaderService} from "@common/services/google-font-loader.service";
import {Router} from "@angular/router";
import {colorThemeChangeEffect, fontSelectedEffect} from "@core/common/common.effects";
import {colorChangedEffect, useAsBackgroundChangedEffect} from "@core/converter/converter.effects";
import {map} from "rxjs";
import {saveStateEffect} from "@core/common/persistence.effects";
import {navigateToContrast, navigateToPaletteIdEffect} from "@core/common/navigation.effects";
import {contrastEvents} from "@core/contrast/contrast.events";
import {transferEvents} from "@core/common/transfer.events";


export function allEffects(
  this: void,
  // Must be unknown because otherwise we would have circular referencing
  // between AppStateStore and Effects.
  store: unknown,
  events = inject(Events),
  localStorageService = inject(LocalStorage),
  themeService = inject(ColorThemeService),
  fontLoaderService = inject(GoogleFontLoaderService),
  router = inject(Router)
) {
  return {
    setColorTheme$: colorThemeChangeEffect(events, themeService),

    loadFont$: fontSelectedEffect(events, fontLoaderService),

    setBackgroundColor$: useAsBackgroundChangedEffect(events, themeService, store),

    navigateToPalette$: navigateToPaletteIdEffect(events, router, store),

    navigateToContrast$: navigateToContrast(events, router, store),

    colorChanged$: colorChangedEffect(events, themeService, store),

    anyPersistableEvents$: events
      .on(
        commonEvents.colorThemeChanged,
        commonEvents.fontSelected,
        converterEvents.newRandomColor,
        converterEvents.colorChanged,
        palettesEvents.paletteChanged,
        palettesEvents.paletteChangedWithoutNav,
        contrastEvents.switchColors,
        contrastEvents.textColorChanged,
        contrastEvents.backgroundColorChanged,
        contrastEvents.contrastColorsChangedWithoutNav,
        contrastEvents.newRandomColorsWithNav,
        transferEvents.sendColorToContrast
      )
      .pipe(
        map(() => persistenceEvents.saveAppState())
      ),

    persist$: saveStateEffect(events, localStorageService, store),
  };
}
