import {EventInstance} from "@ngrx/signals/events";
import {AppState} from "@core/models/app-state.model";
import {Color} from "chroma-js";


export function textColorChangedReducer(
  this: void,
  event: EventInstance<"[Contrast] textColorChanged", Color>,
  state: AppState
) {
  const textColor = event.payload;

  // TODO: Update contrast ratio

  return {
    contrastTextColor: textColor,
  };
}


export function backgroundColorChangedReducer(
  this: void,
  event: EventInstance<"[Contrast] backgroundColorChanged", Color>,
  state: AppState
) {
  const backgroundColor = event.payload;

  // TODO: Update contrast ratio

  return {
    contrastBackgroundColor: backgroundColor
  };
}
