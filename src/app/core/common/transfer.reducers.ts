import {EventInstance} from "@ngrx/signals/events";
import chroma, {Color} from "chroma-js";
import {AppState} from "@core/models/app-state.model";
import {paletteColorFrom} from "@palettes/models/palette-color.model";
import {generatePalette} from "@palettes/helper/palette.helper";
import {ContrastColor} from "@contrast/models/contrast-color.model";
import {ContrastColors} from "@contrast/models/contrast-colors.model";
import {contrastIdFromColors} from "@contrast/helper/contrast-id.helper";


export function useColorAsPaletteStarterReducer(
  this: void,
  event: EventInstance<"[Transfer] useColorAsPaletteStarter", Color>,
  state: AppState
) {
  const color = event.payload;
  const style = state.paletteStyle;
  const color0 = paletteColorFrom(color, "color0", color, true);
  const palette = generatePalette(style, {color0});

  return {currentPalette: palette};
}


export function generatePaletteFromContrastReducer(
  this: void,
  event: EventInstance<"[Transfer] generatePaletteFromContrast", ContrastColors>,
  state: AppState
) {
  const contrastColors = event.payload;
  const color0 = paletteColorFrom(contrastColors.background,
    "color0",
    contrastColors.background,
    true);
  const color1 = paletteColorFrom(contrastColors.text,
    "color1",
    contrastColors.text,
    true);
  const palette = generatePalette(state.paletteStyle, {color0, color1});

  return {currentPalette: palette};
}


export function sendColorToContrastReducer(
  this: void,
  event: EventInstance<"[Transfer] sendColorToContrast", ContrastColor>,
  state: AppState
) {
  const color = event.payload.color;
  const role = event.payload.role;
  const currentTextColor = state.contrastColors.text;
  const currentBgColor = state.contrastColors.background;
  let contrast: number;
  let contrastColors: ContrastColors;

  switch (role) {
    case "text":
      contrast = chroma.contrastAPCA(color, currentBgColor);
      contrastColors = {
        id: contrastIdFromColors({text: color, background: currentBgColor}),
        text: color,
        background: currentBgColor,
        contrast
      };

      return {contrastColors};
    case "background":
      contrast = chroma.contrastAPCA(currentTextColor, color);
      contrastColors = {
        id: contrastIdFromColors({text: currentTextColor, background: color}),
        text: currentTextColor,
        background: color,
        contrast
      };

      return {contrastColors};
  }
}

