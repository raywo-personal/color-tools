import {signalStore, withState} from "@ngrx/signals";
import {converterEvents} from "./converter/converter.events";
import {on, withEffects, withReducer} from "@ngrx/signals/events";
import {colorChangedReducer, correctLightnessReducer, displayColorSpaceReducer, newRandomColorReducer, useAsBackgroundReducer, useBezierReducer,} from "./converter/converter.reducers";
import {persistenceEvents} from "./common/persistence.events";
import {palettesEvents} from "./palettes/palettes.events";
import {loadAppStateReducer} from "./common/persistence.reducers";
import {commonEvents} from "./common/common.events";
import {colorThemeChangedReducer, fontSelectedReducer} from "./common/common.reducers";
import {
  newPaletteReducer,
  newRandomPaletteReducer,
  newRandomPaletteWithNavReducer,
  paletteChangedReducer,
  restorePaletteReducer,
  seedHueChangedReducer,
  styleChangedReducer,
  updatePaletteColorReducer,
  useRandomChangedReducer
} from "@core/palettes/palettes.reducers";
import {initialState} from "@core/models/app-state.model";
import {allEffects} from "@core/all-effects";
import {contrastEvents} from "@core/contrast/contrast.events";
import {
  backgroundColorChangedReducer,
  newRandomContrastColorsReducer,
  newRandomContrastColorsWithNavReducer,
  restoreContrastColorsReducer,
  switchColorsReducer,
  textColorChangedReducer
} from "@core/contrast/contrast.reducers";
import {transferEvents} from "@core/common/transfer.events";
import {sendColorToContrastReducer, useColorAsPaletteStarterReducer} from "@core/common/transfer.reducers";


export const AppStateStore = signalStore(
  {providedIn: "root"},
  withState(initialState),
  withReducer(
    on(persistenceEvents.loadAppState, loadAppStateReducer),
    on(commonEvents.colorThemeChanged, colorThemeChangedReducer),
    on(commonEvents.fontSelected, fontSelectedReducer),
    on(transferEvents.useColorAsPaletteStarter, useColorAsPaletteStarterReducer),
    on(transferEvents.sendColorToContrast, sendColorToContrastReducer),
    on(converterEvents.newRandomColor, newRandomColorReducer),
    on(converterEvents.colorChanged, colorChangedReducer),
    on(converterEvents.useAsBackgroundChanged, useAsBackgroundReducer),
    on(converterEvents.correctLightnessChanged, correctLightnessReducer),
    on(converterEvents.useBezierChanged, useBezierReducer),
    on(converterEvents.displayColorSpaceChanged, displayColorSpaceReducer),
    on(palettesEvents.newRandomPalette, newRandomPaletteReducer),
    on(palettesEvents.newRandomPaletteWithNav, newRandomPaletteWithNavReducer),
    on(palettesEvents.newPalette, newPaletteReducer),
    on(palettesEvents.restorePalette, restorePaletteReducer),
    on(palettesEvents.updatePaletteColor, updatePaletteColorReducer),
    on(palettesEvents.paletteChanged, paletteChangedReducer),
    on(palettesEvents.useRandomChanged, useRandomChangedReducer),
    on(palettesEvents.styleChanged, styleChangedReducer),
    on(palettesEvents.seedHueChanged, seedHueChangedReducer),
    on(contrastEvents.textColorChanged, textColorChangedReducer),
    on(contrastEvents.backgroundColorChanged, backgroundColorChangedReducer),
    on(contrastEvents.newRandomColors, newRandomContrastColorsReducer),
    on(contrastEvents.newRandomColorsWithNav, newRandomContrastColorsWithNavReducer),
    on(contrastEvents.switchColors, switchColorsReducer),
    on(contrastEvents.restoreContrastColors, restoreContrastColorsReducer)
  ),
  withEffects(allEffects)
);

export type AppStateStore = InstanceType<typeof AppStateStore>;
