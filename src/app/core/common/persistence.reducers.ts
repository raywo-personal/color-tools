import {EventInstance} from "@ngrx/signals/events";
import {inject} from "@angular/core";
import {LocalStorage} from "@common/services/local-storage.service";
import {generatePaletteFrom} from "@engine/palette/palette.helper";
import {PALETTE_ID_BASE62_LENGTH, paletteFromId} from "@engine/palette/palette-id.helper";
import chroma, {Color} from "chroma-js";
import {Palette} from "@engine/palette/palette.model";
import {PaletteStyle} from "@engine/palette/palette-style.model";
import {createShades, createTints} from "@engine/helpers/tints-and-shades.helper";
import {AppState} from "@core/models/app-state.model";
import {isRestorable} from "@engine/helpers/validate-string-id.helper";
import {CONTRAST_ID_LENGTH, contrastColorsFromId} from "@engine/contrast/contrast-id.helper";
import {contrastPairFromPalette} from "@engine/contrast/palette-pair.helper";
import {normalizedTypeSettings} from "@engine/contrast/type-settings.model";


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

  // The id carries the style, so the restored palette says which chip is
  // pressed. Left at the initial value, the style picker would press "random"
  // over a triadic palette, and the next regenerate would build a random one.
  const paletteSeed = persistence.getOrDefault("paletteSeed", state.paletteSeed);
  const currentPalette = restorePalette(paletteId, restorableId, currentColor, style, paletteSeed);

  const contrastId = persistence.get("contrastId") ?? "";
  const contrastRestorableId = isRestorable(contrastId, CONTRAST_ID_LENGTH);
  // The stored pair, or one out of the palette that was just restored - see
  // `contrastPairFromPalette()`. A rolled pair would leave a first-time
  // visitor with a page unrelated to the color beside it.
  const contrastColors = contrastRestorableId
    ? contrastColorsFromId(contrastId)
    : contrastPairFromPalette(currentPalette);

  // Normalized rather than taken as read: the three keys carry plain numbers,
  // and a weight off the `FONT_WEIGHTS` grid has no row in `apcaLookup` to be
  // rated against.
  const typeSettings = normalizedTypeSettings({
    fontSize: persistence.getOrDefault("fontSize", state.typeSettings.fontSize),
    fontWeight: persistence.getOrDefault("fontWeight", state.typeSettings.fontWeight),
    lineHeight: persistence.getOrDefault("lineHeight", state.typeSettings.lineHeight)
  });

  return {
    colorTheme: persistence.getOrDefault("colorTheme", state.colorTheme),
    currentColor,
    tintColors,
    shadeColors,
    currentPalette,
    paletteStyle: currentPalette.style,
    paletteSeed,
    selectedFont: persistence.getOrDefault("selectedFont", null),
    contrastColors,
    typeSettings
  };
}


/**
 * The stored palette, provided it is built on the stored color.
 *
 * Color and palette id are written together, so a palette this app stored
 * starts from the color beside it and comes back exactly as it was. One that
 * does not - stored before the palette followed the color, or edited by hand -
 * is rebuilt on the color in its own style, because a palette whose BASE
 * swatch shows a different color than the swatch above it is wrong on its
 * face, and staying wrong until the visitor happens to touch the color.
 */
function restorePalette(paletteId: string,
                        restorable: boolean,
                        currentColor: Color,
                        fallbackStyle: PaletteStyle,
                        seed: number): Palette {
  if (!restorable) return generatePaletteFrom(currentColor, fallbackStyle, seed);

  const stored = paletteFromId(paletteId);

  return stored.color0.color.hex("rgb") === currentColor.hex("rgb")
    ? stored
    : generatePaletteFrom(currentColor, stored.style, seed);
}
