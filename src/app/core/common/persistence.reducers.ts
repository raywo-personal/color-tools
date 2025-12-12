import {EventInstance} from "@ngrx/signals/events";
import {inject} from "@angular/core";
import {LocalStorage} from "@common/services/local-storage.service";
import {generatePalette} from "@palettes/helper/palette.helper";
import {PALETTE_ID_BASE62_LENGTH, paletteFromId} from "@palettes/helper/palette-id.helper";
import chroma from "chroma-js";
import {createShades, createTints} from "@common/helpers/tints-and-shades.helper";
import {AppState} from "@core/models/app-state.model";
import {isRestorable} from "@common/helpers/validate-string-id.helper";
import {CONTRAST_ID_LENGTH, contrastColorsFromId, generateRandomContrastColors} from "@contrast/helper/contrast-id.helper";


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
  const restorableId = isRestorable(paletteId, PALETTE_ID_BASE62_LENGTH);
  const style = state.paletteStyle;

  const contrastId = persistence.get("contrastId") ?? "";
  const contrastRestorableId = isRestorable(contrastId, CONTRAST_ID_LENGTH);
  const contrastColors = contrastRestorableId
    ? contrastColorsFromId(contrastId)
    : generateRandomContrastColors();

  return {
    colorTheme: persistence.getOrDefault("colorTheme", "dark"),
    currentColor,
    tintColors,
    shadeColors,
    currentPalette: restorableId ? paletteFromId(paletteId) : generatePalette(style),
    selectedFont: persistence.getOrDefault("selectedFont", null),
    contrastColors
  };
}
