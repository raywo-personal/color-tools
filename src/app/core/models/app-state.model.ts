import chroma, {Color} from "chroma-js";
import {ColorSpace} from "@engine/color/color-space.model";
import {PaletteStyle} from "@engine/palette/palette-style.model";
import {Palette} from "@engine/palette/palette.model";
import {ColorTheme} from "@common/models/color-theme.model";
import {createShades, createTints} from "@engine/helpers/tints-and-shades.helper";
import {generatePaletteFrom} from "@engine/palette/palette.helper";
import {contrastingColor} from "@engine/contrast/contrasting-color.helper";
import {SelectedFont} from "@common/models/google-font.model";
import {ContrastColors} from "@engine/contrast/contrast-colors.model";
import {generateRandomContrastColors} from "@engine/contrast/contrast-id.helper";
import {randomSeed} from "@engine/helpers/random.helper";


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
  /**
   * The roll the current palette was built with. Kept so the palette can be
   * rebuilt on a moving base color with the same variations - see
   * `generatePaletteFrom()`. Picking a style draws a new one.
   */
  paletteSeed: number;
  currentPalette: Palette;

  // Contrast related
  contrastColors: ContrastColors;

  // Common
  colorTheme: ColorTheme;
  selectedFont: SelectedFont | null;
};

const initialColor = chroma.random();
const textColor = contrastingColor(initialColor);
const initialSeed = randomSeed();

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
  paletteSeed: initialSeed,
  currentPalette: generatePaletteFrom(initialColor, "random", initialSeed),

  contrastColors: generateRandomContrastColors(),

  colorTheme: "system",
  selectedFont: null
};
