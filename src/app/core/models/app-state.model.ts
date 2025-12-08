import chroma, {Color} from "chroma-js";
import {ColorSpace} from "@common/models/color-space.model";
import {PaletteStyle} from "@palettes/models/palette-style.model";
import {Palette} from "@palettes/models/palette.model";
import {ColorTheme} from "@common/models/color-theme.model";
import {createShades, createTints} from "@common/helpers/tints-and-shades.helper";
import {generatePalette} from "@palettes/helper/palette.helper";
import {contrastingColor} from "@common/helpers/contrasting-color.helper";
import {SelectedFont} from "@common/models/google-font.model";


export type AppState = {
  // Converter related
  currentColor: Color;
  textColor: Color;
  useAsBackground: boolean;
  correctLightness: boolean;
  useBezier: boolean;
  displayColorSpace: ColorSpace;
  tintColors: Color[];
  shadeColors: Color[];

  // Palette related
  paletteStyle: PaletteStyle;
  useRandomStyle: boolean;
  currentPalette: Palette;

  // Contrast related
  contrastTextColor: Color;
  contrastBgColor: Color;
  contrastRatio: number;

  // Common
  colorTheme: ColorTheme;
  selectedFont: SelectedFont | null;
};

const initialColor = chroma.random();
const textColor = contrastingColor(initialColor);

export const initialState: AppState = {
  currentColor: initialColor,
  textColor,
  useAsBackground: false,
  correctLightness: true,
  useBezier: true,
  displayColorSpace: "hsl",
  tintColors: createTints(initialColor, true, true),
  shadeColors: createShades(initialColor, true, true),

  paletteStyle: "random",
  useRandomStyle: false,
  currentPalette: generatePalette("random"),

  contrastTextColor: textColor,
  contrastBgColor: initialColor,
  contrastRatio: chroma.contrastAPCA(textColor, initialColor),

  colorTheme: "system",
  selectedFont: null
};
