import {EventInstance} from "@ngrx/signals/events";
import chroma, {Color} from "chroma-js";
import {createShades, createTints} from "@common/helpers/tints-and-shades.helper";
import {ColorSpace} from "@common/models/color-space.model";
import {AppState} from "@core/models/app-state.model";
import {contrastingColor} from "@common/helpers/contrasting-color.helper";
import {paletteColorFrom} from "@palettes/models/palette-color.model";
import {generatePalette} from "@palettes/helper/palette.helper";


export function newRandomColorReducer(
  this: void,
  event: EventInstance<"[Converter] newRandomColor", void>,
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


export function colorChangedReducer(
  this: void,
  event: EventInstance<"[Converter] colorChanged", Color>,
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


export function useColorAsPaletteStarterReducer(
  this: void,
  event: EventInstance<"[Converter] useColorAsPaletteStarter", Color>,
  state: AppState
) {
  const color = event.payload;
  const style = state.paletteStyle;
  const color0 = paletteColorFrom(color, "color0", color, true);
  const palette = generatePalette(style, {color0});

  return {currentPalette: palette};
}
