import {EventInstance} from "@ngrx/signals/events";
import {AppState} from "@core/models/app-state.model";
import chroma, {Color} from "chroma-js";


export function textColorChangedReducer(
  this: void,
  event: EventInstance<"[Contrast] textColorChanged", Color>,
  state: AppState
) {
  const textColor = event.payload;
  const bgColor = state.contrastBgColor;
  const ratio = chroma.contrastAPCA(textColor, bgColor);

  return {
    contrastTextColor: textColor,
    contrastRatio: ratio
  };
}


export function backgroundColorChangedReducer(
  this: void,
  event: EventInstance<"[Contrast] backgroundColorChanged", Color>,
  state: AppState
) {
  const bgColor = event.payload;
  const textColor = state.contrastTextColor;
  const ratio = chroma.contrastAPCA(textColor, bgColor);

  return {
    contrastBgColor: bgColor,
    contrastRatio: ratio
  };
}
