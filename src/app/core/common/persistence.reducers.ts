import {EventInstance} from "@ngrx/signals/events";
import {inject} from "@angular/core";
import {LocalStorage} from "@common/services/local-storage.service";
import {generatePalette} from "@palettes/helper/palette.helper";
import {isRestorable, paletteFromId} from "@palettes/helper/palette-id.helper";
import chroma from "chroma-js";
import {createShades, createTints} from "@common/helpers/tints-and-shades.helper";
import {AppState} from "@core/models/app-state.model";


export function loadAppStateReducer(
  this: void,
  event: EventInstance<"[Persistence] loadAppState", void>,
  state: AppState
) {
  console.info("Loading app state from persistence ...");
  const persistence = inject(LocalStorage);

  const colorFromStorage = persistence.get("currentColor");
  const currentColor = colorFromStorage ? chroma(colorFromStorage) : chroma.random();

  const tintColors = createTints(currentColor, state.useBezier, state.correctLightness);
  const shadeColors = createShades(currentColor, state.useBezier, state.correctLightness);

  const paletteId = persistence.get("currentPaletteId") ?? "";
  const restorableId = isRestorable(paletteId);
  const style = state.paletteStyle;

  return {
    colorTheme: persistence.getOrDefault("colorTheme", "dark"),
    currentColor,
    tintColors,
    shadeColors,
    currentPalette: restorableId ? paletteFromId(paletteId) : generatePalette(style),
    selectedFont: persistence.getOrDefault("selectedFont", null)
  }
}
