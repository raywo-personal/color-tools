import {EventInstance} from "@ngrx/signals/events";
import {AppState} from "@core/models/app-state.model";
import chroma, {Color} from "chroma-js";
import {findHarmonicTextColor} from "@contrast/helper/optimal-text-color.helper";
import {ContrastColors, createContrastColors} from "@contrast/models/contrast-colors.model";
import {contrastColorsFromId} from "@contrast/helper/contrast-id.helper";


export function textColorChangedReducer(
  this: void,
  event: EventInstance<"[Contrast] textColorChanged", Color>,
  state: AppState
) {
  const textColor = event.payload;
  const bgColor = state.contrastColors.background;
  const contrastColors = createContrastColors(textColor, bgColor);

  return {contrastColors};
}


export function backgroundColorChangedReducer(
  this: void,
  event: EventInstance<"[Contrast] backgroundColorChanged", Color>,
  state: AppState
) {
  const bgColor = event.payload;
  const textColor = state.contrastColors.text;
  const contrastColors = createContrastColors(textColor, bgColor);

  return {contrastColors};
}


export function contrastColorsChangedWithoutNavReducer(
  this: void,
  event: EventInstance<"[Contrast] contrastColorsChangedWithoutNav", ContrastColors>,
  state: AppState
) {
  return {
    contrastColors: event.payload
  };
}


export function newRandomContrastColorsWithNavReducer(
  this: void,
  event: EventInstance<"[Contrast] newRandomColorsWithNav", void>,
  state: AppState
) {
  const bgColor = chroma.random();
  const textColor = findHarmonicTextColor(bgColor)?.color ?? chroma.random();
  const contrastColors = createContrastColors(textColor, bgColor);

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
  const contrastColors = createContrastColors(newTextColor, newBgColor);

  return {contrastColors};
}


export function restoreContrastColorsReducer(
  this: void,
  event: EventInstance<"[Contrast] restoreContrastColors", string>,
  state: AppState
) {
  try {
    const contrastId = event.payload;
    const contrastColors = contrastColorsFromId(contrastId);

    return {contrastColors};
  } catch (e) {
    console.error("Failed to restore contrast colors ", e);
    return {};
  }
}
