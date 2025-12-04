import {EventInstance} from "@ngrx/signals/events";
import {ColorTheme} from "@common/models/color-theme.model";


export function colorThemeChangedReducer(
  this: void,
  event: EventInstance<"[Common] colorThemeChanged", ColorTheme>
) {
  return {
    colorTheme: event.payload
  };
}
