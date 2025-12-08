import {EventInstance} from "@ngrx/signals/events";
import {ColorTheme} from "@common/models/color-theme.model";
import {SelectedFont} from "@common/models/google-font.model";


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
