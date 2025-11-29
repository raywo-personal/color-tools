import {EventInstance} from "@ngrx/signals/events";
import {generatePalette} from "@palettes/helper/palette.helper";
import {Palette} from "@palettes/models/palette.model";
import {PaletteStyle, randomStyle} from "@palettes/models/palette-style.model";
import {paletteFromId, paletteIdFromPalette} from "@palettes/helper/palette-id.helper";
import {PaletteColor} from "@palettes/models/palette-color.model";
import {AppState} from "@core/models/app-state.model";


export function newRandomPaletteReducer(
  this: void,
  event: EventInstance<"[Palettes] newRandomPalette", void>,
  state: AppState
) {
  if (state.useRandomStyle) {
    const style: PaletteStyle = randomStyle();

    return {
      currentPalette: generatePalette(style),
      paletteStyle: style
    };
  }

  return {
    currentPalette: generatePalette(state.paletteStyle)
  };
}


export function restorePaletteReducer(
  this: void,
  event: EventInstance<"[Palettes] restorePalette", string>,
  state: AppState
) {
  const paletteId = event.payload;
  const palette = paletteFromId(paletteId);

  return {currentPalette: palette};
}


export function updatePaletteColorReducer(
  this: void,
  event: EventInstance<"[Palettes] updatePaletteColor", PaletteColor>,
  state: AppState
) {
  const color = event.payload;
  const palette = {
    ...state.currentPalette,
    [color.slot]: color
  };
  palette.id = paletteIdFromPalette(palette);

  return {currentPalette: palette};
}


export function paletteChangedReducer(
  this: void,
  event: EventInstance<"[Palettes] paletteChanged", Palette>,
  state: AppState
) {
  return {currentPalette: event.payload};
}


export function useRandomChangedReducer(
  this: void,
  event: EventInstance<"[Palettes] useRandomChanged", boolean>,
  state: AppState
) {
  return {useRandomStyle: event.payload};
}


export function styleChangedReducer(
  this: void,
  event: EventInstance<"[Palettes] styleChanged", PaletteStyle>,
  state: AppState
) {
  const newStyle = event.payload;
  const newPalette = generatePalette(newStyle);

  return {paletteStyle: newStyle, currentPalette: newPalette};
}
