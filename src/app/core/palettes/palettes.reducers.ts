import {EventInstance} from "@ngrx/signals/events";
import {generatePalette, paletteFrom} from "@palettes/helper/palette.helper";
import {Palette, PALETTE_SLOTS, PaletteColors} from "@palettes/models/palette.model";
import {PaletteStyle, randomStyle} from "@palettes/models/palette-style.model";
import {paletteFromId} from "@palettes/helper/palette-id.helper";
import {PaletteColor} from "@palettes/models/palette-color.model";
import {AppState} from "@core/models/app-state.model";


export function newRandomPaletteReducer(
  this: void,
  event: EventInstance<"[Palettes] newRandomPalette", void>,
) {
  const style: PaletteStyle = "random";

  return {
    currentPalette: generatePalette(style),
    paletteStyle: style
  };
}


export function newPaletteReducer(
  this: void,
  event: EventInstance<"[Palettes] newPalette", void>,
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
  event: EventInstance<"[Palettes] restorePalette", string>
) {
  try {
    const paletteId = event.payload;
    const palette = paletteFromId(paletteId);

    return {currentPalette: palette};
  } catch (e) {
    console.error("Failed to restore palette ", e);
    return {};
  }
}


export function updatePaletteColorReducer(
  this: void,
  event: EventInstance<"[Palettes] updatePaletteColor", PaletteColor>,
  state: AppState
) {
  const color = event.payload;
  const {currentPalette} = state;

  const updatedPalette = paletteFrom(
    {
      ...currentPalette,
      [color.slot]: color
    },
    currentPalette.style
  );

  return {currentPalette: updatedPalette};
}


export function paletteChangedReducer(
  this: void,
  event: EventInstance<"[Palettes] paletteChanged", Palette>
) {
  return {currentPalette: event.payload};
}


export function useRandomChangedReducer(
  this: void,
  event: EventInstance<"[Palettes] useRandomChanged", boolean>
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
  const palette = generatePalette(style, paletteColors, hue);

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
