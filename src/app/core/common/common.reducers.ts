import {EventInstance} from "@ngrx/signals/events";
import {ColorTheme} from "@common/models/color-theme.model";
import {SelectedFont, weightStopsFor} from "@common/models/google-font.model";
import {normalizedTypeSettings, TypeSettings} from "@engine/contrast/type-settings.model";
import {AppState} from "@core/models/app-state.model";


export function colorThemeChangedReducer(
  this: void,
  event: EventInstance<"[Common] colorThemeChanged", ColorTheme>
) {
  return {
    colorTheme: event.payload
  };
}

/**
 * The chosen typeface, and the weight brought along with it.
 *
 * A family the visitor picks may not ship the weight the slider is standing
 * on. Snapping here rather than in the control keeps the invariant in one
 * place: whatever the state holds is a weight the chosen family actually has,
 * so neither the preview nor the rating ever describes a synthesised one.
 */
export function fontSelectedReducer(
  this: void,
  event: EventInstance<"[Common] fontSelected", SelectedFont | null>,
  state: AppState
) {
  const selectedFont = event.payload;

  return {
    selectedFont,
    typeSettings: normalizedTypeSettings(state.typeSettings, weightStopsFor(selectedFont))
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
  >,
  state: AppState
) {
  return {
    typeSettings: normalizedTypeSettings(event.payload, weightStopsFor(state.selectedFont))
  };
}
