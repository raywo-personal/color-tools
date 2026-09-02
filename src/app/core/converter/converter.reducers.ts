import {EventInstance} from "@ngrx/signals/events";
import chroma, {Color} from "chroma-js";
import {createShades, createTints} from "@common/helpers/tints-and-shades.helper";
import {ColorSpace} from "@common/models/color-space.model";
import {AppState} from "@core/models/app-state.model";
import {contrastingColor} from "@common/helpers/contrasting-color.helper";


export function newRandomColorReducer(
  this: void,
  event: EventInstance<"[Converter] newRandomColorWithNav", void>,
  state: AppState
) {
  const currentColor = chroma.random();
  const textColor = contrastingColor(currentColor);
  const tintColors = createTints(currentColor, state.useBezier, state.correctLightness);
  const shadeColors = createShades(currentColor, state.useBezier, state.correctLightness);

  return {
    currentColor,
    textColor,
    tintColors,
    shadeColors
  };
}


/**
 * Takes both the committed color and the one a drag is still moving.
 *
 * The two events differ in what happens *around* the state change - only
 * `colorChanged` is persisted - not in the change itself, so a second reducer
 * would be the same body twice. The tints and shades are recomputed for the
 * adjusted color as well: they are derived from it, and leaving them behind
 * would freeze the ramps against a color that has already moved.
 */
export function colorChangedReducer(
  this: void,
  event: EventInstance<"[Converter] colorChanged" | "[Converter] colorAdjusted", Color>,
  state: AppState
) {
  const currentColor = event.payload;
  const textColor = contrastingColor(currentColor);
  const tintColors = createTints(currentColor, state.useBezier, state.correctLightness);
  const shadeColors = createShades(currentColor, state.useBezier, state.correctLightness);

  return {
    currentColor,
    textColor,
    tintColors,
    shadeColors
  };
}


export function correctLightnessReducer(
  this: void,
  event: EventInstance<"[Converter] correctLightnessChanged", boolean>,
  state: AppState
) {
  const correctLightness = event.payload;
  const color = state.currentColor;
  const tintColors = createTints(color, state.useBezier, correctLightness);
  const shadeColors = createShades(color, state.useBezier, correctLightness);

  return {
    correctLightness,
    tintColors,
    shadeColors
  };
}


export function useBezierReducer(
  this: void,
  event: EventInstance<"[Converter] useBezierChanged", boolean>,
  state: AppState
) {
  const useBezier = event.payload;
  const color = state.currentColor;
  const tintColors = createTints(color, useBezier, state.correctLightness);
  const shadeColors = createShades(color, useBezier, state.correctLightness);

  return {
    useBezier,
    tintColors,
    shadeColors
  };
}


export function displayColorSpaceReducer(
  this: void,
  event: EventInstance<"[Converter] displayColorSpaceChanged", ColorSpace>
) {
  return {displayColorSpace: event.payload};
}


export function useAsBackgroundReducer(
  this: void,
  event: EventInstance<"[Converter] useAsBackgroundChanged", boolean>
) {
  return {useAsBackground: event.payload};
}
