import {EventInstance} from "@ngrx/signals/events";
import {inject} from "@angular/core";
import {LocalStorage} from "@common/services/local-storage.service";
import {generatePaletteFrom} from "@engine/palette/palette.helper";
import {isRestorablePaletteId, paletteFromId} from "@engine/palette/palette-id.helper";
import chroma, {Color} from "chroma-js";
import {Palette} from "@engine/palette/palette.model";
import {PaletteStyle} from "@engine/palette/palette-style.model";
import {AppState} from "@core/models/app-state.model";
import {contrastColorsFromId, isRestorableContrastId} from "@engine/contrast/contrast-id.helper";
import {contrastPairFromPalette} from "@engine/contrast/palette-pair.helper";
import {normalizedTypeSettingsFor} from "@engine/contrast/type-role.model";
import {SelectedFont} from "@common/models/google-font.model";
import {TypeRolesMap, weightStopsForRole} from "@common/models/type-role-settings.model";
import {restoredPaletteState} from "@core/palettes/palettes.reducers";
import {restoredContrastTypeState} from "@core/contrast/contrast.reducers";
import {contrastTypePageFromAddress, isRestorableContrastTypeAddress} from "@contrast-type/models/contrast-type-address.model";


/**
 * The state from local storage: the stored address, restored the way a link
 * is, or - where no readable address is stored - the v1 keys.
 */
export function loadAppStateReducer(
  this: void,
  event: EventInstance<"[Persistence] loadAppState", void>,
  state: AppState
) {
  console.info("Loading app state from persistence ...");
  const persistence = inject(LocalStorage);
  const colorTheme = persistence.getOrDefault("colorTheme", state.colorTheme);
  const address = persistence.get("address") ?? "";

  // Through the same restore as the url, so a reload and a link cannot open
  // on two different pages. An address the decoder cannot read takes the way
  // of a missing one: the restore throws on it, and nothing on the way to the
  // first paint would catch that.
  if (isRestorableContrastTypeAddress(address)) {
    return {colorTheme, ...restoredContrastTypeState(contrastTypePageFromAddress(address), state)};
  }

  return {colorTheme, ...v1State(persistence, state)};
}


/**
 * What a v1 storage entry carries: a colour, a palette id, a pair and one
 * typeface. A first-time visitor has none of them and gets the fallbacks.
 */
function v1State(persistence: LocalStorage, state: AppState) {
  const colorFromStorage = persistence.get("currentColor");
  const storedColor = colorFromStorage ? chroma(colorFromStorage) : chroma.random();

  const paletteId = persistence.get("currentPaletteId") ?? "";
  const storedPalette = restorePalette(paletteId, storedColor, state.paletteStyle, state.paletteSeed);
  // Through the same function as a restore from the url, so the two cannot
  // drift. The id carries the style, so the restored palette says which chip
  // is pressed; left at the initial value, the style picker would press
  // "random" over a triadic palette.
  const paletteState = restoredPaletteState(storedPalette, state.paletteSeed, state);

  const contrastId = persistence.get("contrastId") ?? "";
  // The stored pair, or one out of the palette that was just restored - see
  // `contrastPairFromPalette()`. A rolled pair would leave a first-time
  // visitor with a page unrelated to the color beside it.
  const contrastColors = isRestorableContrastId(contrastId)
    ? contrastColorsFromId(contrastId)
    : contrastPairFromPalette(paletteState.currentPalette);

  return {
    ...paletteState,
    contrastColors,
    typeRoles: withBodyFont(restoreFont(persistence.get("selectedFont")), state.typeRoles),
    // v1 placed nothing by hand.
    placements: {}
  };
}


/**
 * v1 set its whole preview in one face, which is body text's now. Its
 * settings are put onto a weight the face ships, as a pick would.
 */
function withBodyFont(font: SelectedFont | null, roles: TypeRolesMap): TypeRolesMap {
  if (!font) return roles;

  const settings = normalizedTypeSettingsFor("body", roles.body.settings, weightStopsForRole("body", font));

  return {...roles, body: {font, settings}};
}


/**
 * The stored v1 selection, with its weight list made usable.
 *
 * v1 stored no weights, and the two readers of the field would otherwise see
 * `undefined` where they expect a list. Empty rather than guessed: the
 * catalogue is the only place the family's weights come from, and the effect
 * that asks it completes the face after the load.
 */
function restoreFont(stored: SelectedFont | null | undefined): SelectedFont | null {
  if (!stored || typeof stored.family !== "string") return null;

  const weights = Array.isArray(stored.weights)
    ? stored.weights.filter(weight => Number.isFinite(weight))
    : [];

  return {...stored, weights};
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
 *
 * An id the decoder cannot read is generated over like a missing one, for the
 * reason the address has: `paletteFromId()` throws on it.
 */
function restorePalette(paletteId: string,
                        currentColor: Color,
                        fallbackStyle: PaletteStyle,
                        seed: number): Palette {
  if (!isRestorablePaletteId(paletteId)) return generatePaletteFrom(currentColor, fallbackStyle, seed);

  const stored = paletteFromId(paletteId);

  return stored.color0.color.hex("rgb") === currentColor.hex("rgb")
    ? stored
    : generatePaletteFrom(currentColor, stored.style, seed);
}
