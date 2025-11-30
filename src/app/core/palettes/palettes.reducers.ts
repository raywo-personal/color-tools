import {EventInstance} from "@ngrx/signals/events";
import {generatePalette} from "@palettes/helper/palette.helper";
import {Palette, PALETTE_SLOTS, PaletteColors} from "@palettes/models/palette.model";
import {PaletteStyle, randomStyle} from "@palettes/models/palette-style.model";
import {paletteFromId, paletteIdFromPalette} from "@palettes/helper/palette-id.helper";
import {PaletteColor} from "@palettes/models/palette-color.model";
import {AppState} from "@core/models/app-state.model";


export function newRandomPaletteReducer(
  this: void,
  event: EventInstance<"[Palettes] newRandomPalette", void>,
  state: AppState
) {
  const paletteColors = getPinnedPaletteColors(state);
  const style = state.useRandomStyle ? randomStyle() : state.paletteStyle;

  return {
    currentPalette: generatePalette(style, paletteColors),
    paletteStyle: style
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
  const paletteColors = getPinnedPaletteColors(state);
  const newPalette = generatePalette(newStyle, paletteColors);

  return {paletteStyle: newStyle, currentPalette: newPalette};
}


export function seedHueChangedReducer(
  this: void,
  event: EventInstance<"[Palettes] seedHueChanged", number>,
  state: AppState
) {
  const hue = event.payload;
  const style = state.paletteStyle;
  const paletteColors = getPinnedPaletteColors(state);
  const palette = generatePalette(style, paletteColors);

  return {currentPalette: palette};
}


function getPinnedPaletteColors(state: AppState) {
  const paletteColors: Partial<PaletteColors> = {};

  PALETTE_SLOTS.forEach(slot => {
    const color = state.currentPalette[slot];

    if (color.isPinned) paletteColors[slot] = color;
  });

  return paletteColors;
}
