import {EventInstance} from "@ngrx/signals/events";
import chroma, {Color} from "chroma-js";
import {AppState} from "@core/models/app-state.model";
import {paletteColorFrom} from "@palettes/models/palette-color.model";
import {generatePalette} from "@palettes/helper/palette.helper";
import {ContrastColor} from "@contrast/models/contrast-color.model";
import {ContrastColors} from "@contrast/models/contrast-colors.model";


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
        text: color,
        background: currentBgColor,
        contrast
      };

      return {contrastColors};
    case "background":
      contrast = chroma.contrastAPCA(currentTextColor, color);
      contrastColors = {
        text: currentTextColor,
        background: color,
        contrast
      };

      return {contrastColors};
  }
}

