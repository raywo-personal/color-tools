import {signalStore, withState} from "@ngrx/signals";
import {converterEvents} from "./converter/converter.events";
import {on, withEventHandlers, withReducer} from "@ngrx/signals/events";
import {colorChangedReducer, correctLightnessReducer, displayColorSpaceReducer, newRandomColorReducer, useAsBackgroundReducer, useBezierReducer} from "./converter/converter.reducers";
import {persistenceEvents} from "./common/persistence.events";
import {palettesEvents} from "./palettes/palettes.events";
import {loadAppStateReducer} from "./common/persistence.reducers";
import {commonEvents} from "./common/common.events";
import {colorThemeChangedReducer, fontSelectedReducer, typeRoleSelectedReducer, typeSettingsReducer} from "./common/common.reducers";
import {
  newPaletteWithNavReducer,
  newRandomPaletteWithNavReducer,
  paletteChangedReducer,
  paletteFollowsColorReducer,
  paletteChangedWithoutNavReducer,
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
  chipPickedUpReducer,
  chipPutDownReducer,
  colorPlacedReducer,
  contrastColorsChangedWithoutNavReducer,
  newRandomContrastColorsWithNavReducer,
  placementResetReducer,
  placementsResetReducer,
  restoreContrastColorsReducer,
  switchColorsReducer,
  textColorChangedReducer,
  verdictToggledReducer
} from "@core/contrast/contrast.reducers";
import {transferEvents} from "@core/common/transfer.events";
import {generatePaletteFromContrastReducer, sendColorToContrastReducer, sendPaletteToContrastReducer, useColorAsPaletteStarterReducer} from "@core/common/transfer.reducers";


export const AppStateStore = signalStore(
  {providedIn: "root"},
  withState(initialState),
  withReducer(
    on(persistenceEvents.loadAppState, loadAppStateReducer),
    on(commonEvents.colorThemeChanged, colorThemeChangedReducer),
    on(commonEvents.typeRoleSelected, typeRoleSelectedReducer),
    on(commonEvents.fontSelected, fontSelectedReducer),
    on(
      commonEvents.typeSettingsAdjusted,
      commonEvents.typeSettingsChanged,
      typeSettingsReducer
    ),
    on(transferEvents.useColorAsPaletteStarter, useColorAsPaletteStarterReducer),
    on(transferEvents.sendColorToContrast, sendColorToContrastReducer),
    on(transferEvents.generatePaletteFromContrast, generatePaletteFromContrastReducer),
    on(transferEvents.sendPaletteToContrast, sendPaletteToContrastReducer),
    on(converterEvents.newRandomColorWithNav, newRandomColorReducer),
    on(converterEvents.colorChanged, colorChangedReducer),
    on(converterEvents.colorAdjusted, colorChangedReducer),
    on(converterEvents.useAsBackgroundChanged, useAsBackgroundReducer),
    on(converterEvents.correctLightnessChanged, correctLightnessReducer),
    on(converterEvents.useBezierChanged, useBezierReducer),
    on(converterEvents.displayColorSpaceChanged, displayColorSpaceReducer),
    // After the converter's reducers on purpose: it reads the color they wrote.
    on(
      converterEvents.colorChanged,
      converterEvents.colorAdjusted,
      converterEvents.newRandomColorWithNav,
      paletteFollowsColorReducer
    ),
    on(palettesEvents.paletteChangedWithoutNav, paletteChangedWithoutNavReducer),
    on(palettesEvents.newRandomPaletteWithNav, newRandomPaletteWithNavReducer),
    on(palettesEvents.newPaletteWithNav, newPaletteWithNavReducer),
    on(palettesEvents.restorePalette, restorePaletteReducer),
    on(palettesEvents.updatePaletteColor, updatePaletteColorReducer),
    on(palettesEvents.paletteChanged, paletteChangedReducer),
    on(palettesEvents.useRandomChanged, useRandomChangedReducer),
    on(palettesEvents.styleChanged, styleChangedReducer),
    on(palettesEvents.seedHueChanged, seedHueChangedReducer),
    on(contrastEvents.textColorChanged, textColorChangedReducer),
    on(contrastEvents.textColorAdjusted, textColorChangedReducer),
    on(contrastEvents.backgroundColorChanged, backgroundColorChangedReducer),
    on(contrastEvents.backgroundColorAdjusted, backgroundColorChangedReducer),
    on(contrastEvents.contrastColorsChangedWithoutNav, contrastColorsChangedWithoutNavReducer),
    on(contrastEvents.newRandomColorsWithNav, newRandomContrastColorsWithNavReducer),
    on(contrastEvents.switchColors, switchColorsReducer),
    on(contrastEvents.restoreContrastColors, restoreContrastColorsReducer),
    on(contrastEvents.verdictToggled, verdictToggledReducer),
    // Last, and order-free: nothing else reads the placements or the carried
    // chip, and these read nothing else. Keep them here rather than between
    // reducers whose order is load-bearing.
    on(contrastEvents.colorPlaced, colorPlacedReducer),
    on(contrastEvents.chipPickedUp, chipPickedUpReducer),
    on(contrastEvents.chipPutDown, chipPutDownReducer),
    on(contrastEvents.placementReset, placementResetReducer),
    on(contrastEvents.placementsReset, placementsResetReducer)
  ),
  withEventHandlers(allEffects)
);

export type AppStateStore = InstanceType<typeof AppStateStore>;
