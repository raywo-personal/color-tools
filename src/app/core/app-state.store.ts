import {signalStore, withState} from "@ngrx/signals";
import {converterEvents} from "./converter/converter.events";
import {on, withEffects, withReducer} from "@ngrx/signals/events";
import {colorChangedReducer, correctLightnessReducer, displayColorSpaceReducer, newRandomColorReducer, useAsBackgroundReducer, useBezierReducer} from "./converter/converter.reducers";
import {persistenceEvents} from "./common/persistence.events";
import {palettesEvents} from "./palettes/palettes.events";
import {loadAppStateReducer} from "./common/persistence.reducers";
import {commonEvents} from "./common/common.events";
import {colorThemeChangedReducer} from "./common/common.reducers";
import {
  newRandomPaletteReducer,
  paletteChangedReducer,
  restorePaletteReducer,
  seedHueChangedReducer,
  styleChangedReducer,
  updatePaletteColorReducer,
  useRandomChangedReducer
} from "@core/palettes/palettes.reducers";
import {initialState} from "@core/models/app-state.model";
import {allEffects} from "@core/all-effects";


export const AppStateStore = signalStore(
  {providedIn: "root"},
  withState(initialState),
  withReducer(
    on(persistenceEvents.loadAppState, loadAppStateReducer),
    on(commonEvents.colorThemeChanged, colorThemeChangedReducer),
    on(converterEvents.newRandomColor, newRandomColorReducer),
    on(converterEvents.colorChanged, colorChangedReducer),
    on(converterEvents.useAsBackgroundChanged, useAsBackgroundReducer),
    on(converterEvents.correctLightnessChanged, correctLightnessReducer),
    on(converterEvents.useBezierChanged, useBezierReducer),
    on(converterEvents.displayColorSpaceChanged, displayColorSpaceReducer),
    on(palettesEvents.newRandomPalette, newRandomPaletteReducer),
    on(palettesEvents.restorePalette, restorePaletteReducer),
    on(palettesEvents.updatePaletteColor, updatePaletteColorReducer),
    on(palettesEvents.paletteChanged, paletteChangedReducer),
    on(palettesEvents.useRandomChanged, useRandomChangedReducer),
    on(palettesEvents.styleChanged, styleChangedReducer),
    on(palettesEvents.seedHueChanged, seedHueChangedReducer)
  ),
  withEffects(allEffects)
);

export type AppStateStore = InstanceType<typeof AppStateStore>;
