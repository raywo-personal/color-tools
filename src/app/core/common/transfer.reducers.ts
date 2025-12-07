import {EventInstance} from "@ngrx/signals/events";
import chroma, {Color} from "chroma-js";
import {AppState} from "@core/models/app-state.model";
import {paletteColorFrom} from "@palettes/models/palette-color.model";
import {generatePalette} from "@palettes/helper/palette.helper";
import {ContrastColor} from "@contrast/models/contrast-color.model";


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
  const currentTextColor = state.contrastTextColor;
  const currentBgColor = state.contrastBgColor;
  let contrastRatio: number;

  switch (role) {
    case "text":
      contrastRatio = chroma.contrastAPCA(color, currentBgColor);

      return {contrastTextColor: color, contrastRatio};
    case "background":
      contrastRatio = chroma.contrastAPCA(currentTextColor, color);
      return {contrastBgColor: color, contrastRatio};
  }
}

