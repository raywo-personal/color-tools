import {EventInstance} from "@ngrx/signals/events";
import {AppState} from "@core/models/app-state.model";
import chroma, {Color} from "chroma-js";
import {findHarmonicTextColor} from "@contrast/helper/optimal-text-color.helper";


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


export function newRandomContrastColorsReducer(
  this: void,
  event: EventInstance<"[Contrast] newRandomColors", void>,
  state: AppState
) {
  const bgColor = chroma.random();
  const textColor = findHarmonicTextColor(bgColor)?.color ?? chroma.random();
  const ratio = chroma.contrastAPCA(textColor, bgColor);

  return {
    contrastTextColor: textColor,
    contrastBgColor: bgColor,
    contrastRatio: ratio
  };
}


export function switchColorsReducer(
  this: void,
  event: EventInstance<"[Contrast] switchColors", void>,
  state: AppState
) {
  const newTextColor = state.contrastBgColor;
  const newBgColor = state.contrastTextColor;
  const ratio = chroma.contrastAPCA(newTextColor, newBgColor);

  return {
    contrastTextColor: newTextColor,
    contrastBgColor: newBgColor,
    contrastRatio: ratio
  };
}
