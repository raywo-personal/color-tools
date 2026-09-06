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
import {TypeSettings} from "@engine/contrast/type-settings.model";
import {normalizedTypeSettingsFor, TYPE_ROLES, TypeRole} from "@engine/contrast/type-role.model";
import {SelectedFont} from "@common/models/google-font.model";
import {TypeRoleSettings, TypeRolesMap, weightStopsForRole} from "@common/models/type-role-settings.model";


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

  // Body text falls back to the single typeface and its three axes from
  // before the roles, so a visitor who set their type then keeps it.
  const legacyBody: Partial<TypeRoleSettings> = {
    font: persistence.get("selectedFont") ?? undefined,
    settings: legacySettings(
      persistence.get("fontSize") ?? null,
      persistence.get("fontWeight") ?? null,
      persistence.get("lineHeight") ?? null
    )
  };
  const typeRoles = restoreTypeRoles(persistence.get("typeRoles"), legacyBody, state.typeRoles);

  return {
    colorTheme: persistence.getOrDefault("colorTheme", state.colorTheme),
    currentColor,
    tintColors,
    shadeColors,
    currentPalette,
    paletteStyle: currentPalette.style,
    paletteSeed,
    contrastColors,
    typeRoles
  };
}


/**
 * The three legacy keys as one settings object, or nothing where none of them
 * is stored. Partial values are filled in from the role's defaults by the
 * normalization, the same way a half-written entry would be.
 */
function legacySettings(fontSize: number | null,
                        fontWeight: number | null,
                        lineHeight: number | null): TypeSettings | undefined {
  if (fontSize === null && fontWeight === null && lineHeight === null) return undefined;

  return {
    fontSize: fontSize ?? Number.NaN,
    fontWeight: fontWeight ?? Number.NaN,
    lineHeight: lineHeight ?? Number.NaN
  };
}


/**
 * The stored roles, every one of them made usable.
 *
 * Normalized rather than taken as read: the entry carries plain numbers, and a
 * weight off the `FONT_WEIGHTS` grid has no row in `apcaLookup` to be rated
 * against. Against the restored face's own weights, so a reload lands on the
 * same weight the picker would have allowed. A role the entry does not carry
 * - the storage predates the role, or was edited by hand - opens at the
 * role's defaults, and body text tries the legacy keys first.
 */
function restoreTypeRoles(stored: Partial<Record<TypeRole, Partial<TypeRoleSettings>>> | null,
                          legacyBody: Partial<TypeRoleSettings>,
                          fallback: TypeRolesMap): TypeRolesMap {
  const entries = TYPE_ROLES.map(role => {
    const entry = stored?.[role] ?? (role === "body" ? legacyBody : undefined);
    const font = restoreFont(entry?.font ?? null);
    const settings = normalizedTypeSettingsFor(
      role,
      entry?.settings ?? fallback[role].settings,
      weightStopsForRole(role, font)
    );

    return [role, {font, settings}];
  });

  return Object.fromEntries(entries) as Record<TypeRole, TypeRoleSettings>;
}


/**
 * The stored selection, with its weight list made usable.
 *
 * An entry written before `SelectedFont` carried the weights has none, and the
 * two readers of the field would otherwise see `undefined` where they expect a
 * list. Empty rather than guessed: the catalog is the only place the family's
 * weights come from, and it may not answer at all.
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
