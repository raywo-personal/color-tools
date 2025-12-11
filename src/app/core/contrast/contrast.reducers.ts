import {EventInstance} from "@ngrx/signals/events";
import {AppState} from "@core/models/app-state.model";
import chroma, {Color} from "chroma-js";
import {findHarmonicTextColor} from "@contrast/helper/optimal-text-color.helper";
import {ContrastColors} from "@contrast/models/contrast-colors.model";
import {contrastColorsFromId} from "@contrast/helper/contrast-id.helper";


export function textColorChangedReducer(
  this: void,
  event: EventInstance<"[Contrast] textColorChanged", Color>,
  state: AppState
) {
  const textColor = event.payload;
  const bgColor = state.contrastColors.background;
  const contrast = chroma.contrastAPCA(textColor, bgColor);
  const contrastColors: ContrastColors = {
    text: textColor,
    background: bgColor,
    contrast
  };

  return {contrastColors};
}


export function backgroundColorChangedReducer(
  this: void,
  event: EventInstance<"[Contrast] backgroundColorChanged", Color>,
  state: AppState
) {
  const bgColor = event.payload;
  const textColor = state.contrastColors.text;
  const contrast = chroma.contrastAPCA(textColor, bgColor);
  const contrastColors: ContrastColors = {
    text: textColor,
    background: bgColor,
    contrast
  };

  return {contrastColors};
}


export function newRandomContrastColorsReducer(
  this: void,
  event: EventInstance<"[Contrast] newRandomColors", void>,
  state: AppState
) {
  const bgColor = chroma.random();
  const textColor = findHarmonicTextColor(bgColor)?.color ?? chroma.random();
  const contrast = chroma.contrastAPCA(textColor, bgColor);
  const contrastColors: ContrastColors = {
    text: textColor,
    background: bgColor,
    contrast
  };

  return {
    contrastColors
  };
}


export function switchColorsReducer(
  this: void,
  event: EventInstance<"[Contrast] switchColors", void>,
  state: AppState
) {
  const newTextColor = state.contrastColors.background;
  const newBgColor = state.contrastColors.text;
  const contrast = chroma.contrastAPCA(newTextColor, newBgColor);
  const contrastColors: ContrastColors = {
    text: newTextColor,
    background: newBgColor,
    contrast
  };

  return {contrastColors};
}


export function restoreContrastColorsReducer(
  this: void,
  event: EventInstance<"[Contrast] restoreContrastColors", string>,
  state: AppState
) {
  const contrastId = event.payload;
  const contrastColors = contrastColorsFromId(contrastId);

  console.log("restoreContrastColorsReducer: from ID: ", contrastId,
    contrastColors.text.hex(), contrastColors.background.hex());

  return {contrastColors};
}
