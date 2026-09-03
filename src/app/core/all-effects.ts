import {Events} from "@ngrx/signals/events";
import {persistenceEvents} from "@core/common/persistence.events";
import {commonEvents} from "@core/common/common.events";
import {converterEvents} from "@core/converter/converter.events";
import {palettesEvents} from "@core/palettes/palettes.events";
import {inject} from "@angular/core";
import {LiveAnnouncer} from "@angular/cdk/a11y";
import {LocalStorage} from "@common/services/local-storage.service";
import {ColorThemeService} from "@common/services/color-theme.service";
import {GoogleFontLoaderService} from "@common/services/google-font-loader.service";
import {colorThemeChangeEffect, fontSelectedEffect} from "@core/common/common.effects";
import {colorChangedEffect, randomColorAnnouncedEffect, useAsBackgroundChangedEffect} from "@core/converter/converter.effects";
import {newPaletteAnnouncedEffect} from "@core/palettes/palettes.effects";
import {contrastPairAnnouncedEffect} from "@core/contrast/contrast.effects";
import {map} from "rxjs";
import {saveStateEffect} from "@core/common/persistence.effects";
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
  announcer = inject(LiveAnnouncer)
) {
  return {
    setColorTheme$: colorThemeChangeEffect(events, themeService),

    loadFont$: fontSelectedEffect(events, fontLoaderService),

    setBackgroundColor$: useAsBackgroundChangedEffect(events, themeService, store),

    colorChanged$: colorChangedEffect(events, themeService, store),

    randomColorAnnounced$: randomColorAnnouncedEffect(events, announcer, store),

    newPaletteAnnounced$: newPaletteAnnouncedEffect(events, announcer, store),

    contrastPairAnnounced$: contrastPairAnnouncedEffect(events, announcer, store),

    anyPersistableEvents$: events
      .on(
        commonEvents.colorThemeChanged,
        commonEvents.fontSelected,
        commonEvents.typeSettingsChanged,
        converterEvents.newRandomColorWithNav,
        converterEvents.colorChanged,
        palettesEvents.paletteChanged,
        palettesEvents.paletteChangedWithoutNav,
        palettesEvents.styleChanged,
        contrastEvents.switchColors,
        contrastEvents.textColorChanged,
        contrastEvents.backgroundColorChanged,
        contrastEvents.contrastColorsChangedWithoutNav,
        contrastEvents.newRandomColorsWithNav,
        transferEvents.sendColorToContrast,
        transferEvents.sendPaletteToContrast
      )
      .pipe(
        map(() => persistenceEvents.saveAppState())
      ),

    persist$: saveStateEffect(events, localStorageService, store),
  };
}
