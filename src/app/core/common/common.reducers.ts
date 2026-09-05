import {EventInstance} from "@ngrx/signals/events";
import {ColorTheme} from "@common/models/color-theme.model";
import {SelectedFont} from "@common/models/google-font.model";
import {normalizedTypeSettings, TypeSettings} from "@engine/contrast/type-settings.model";


export function colorThemeChangedReducer(
  this: void,
  event: EventInstance<"[Common] colorThemeChanged", ColorTheme>
) {
  return {
    colorTheme: event.payload
  };
}

export function fontSelectedReducer(
  this: void,
  event: EventInstance<"[Common] fontSelected", SelectedFont | null>
) {
  return {
    selectedFont: event.payload
  };
}

/**
 * The type settings, normalized on the way in.
 *
 * One reducer for both the drag and its commit: the value is the same either
 * way, and only whether it is persisted differs.
 */
export function typeSettingsReducer(
  this: void,
  event: EventInstance<
    "[Common] typeSettingsAdjusted" | "[Common] typeSettingsChanged",
    TypeSettings
  >
) {
  return {
    typeSettings: normalizedTypeSettings(event.payload)
  };
}
