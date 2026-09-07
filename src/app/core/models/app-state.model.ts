import chroma, {Color} from "chroma-js";
import {ColorSpace} from "@engine/color/color-space.model";
import {PaletteStyle} from "@engine/palette/palette-style.model";
import {Palette} from "@engine/palette/palette.model";
import {ColorTheme} from "@common/models/color-theme.model";
import {createShades, createTints} from "@engine/helpers/tints-and-shades.helper";
import {generatePaletteFrom} from "@engine/palette/palette.helper";
import {contrastingColor} from "@engine/contrast/contrasting-color.helper";
import {DEFAULT_TYPE_ROLES, TypeRolesMap} from "@common/models/type-role-settings.model";
import {ContrastColors} from "@engine/contrast/contrast-colors.model";
import {contrastPairFromPalette} from "@engine/contrast/palette-pair.helper";
import {randomSeed} from "@engine/helpers/random.helper";
import {TypeRole} from "@engine/contrast/type-role.model";


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
  /**
   * The key of the sample-page element whose verdict is open beside the
   * preview, or null while none is. One at a time, so the page grows by one
   * panel rather than by twenty.
   *
   * In the store rather than in the preview, because the mark that opens it
   * and the marks that have to close are separate component instances. Not
   * persisted: it is a look at the page, not part of the result.
   */
  openVerdict: string | null;

  // Common
  colorTheme: ColorTheme;
  /**
   * The role the type controls act on and the rating answers about. Not
   * persisted: a reload opens on body text, the role a first visit does.
   */
  typeRole: TypeRole;
  /**
   * The four kinds of type the website preview is set in - and, from the
   * rating on, the faces, sizes and weights the page is judged at.
   *
   * In the state rather than in the preview's own signals, because the rating
   * reads them from a component of its own, and because a visitor who set a
   * 14px/500 caption and comes back to 13px/400 is being shown a verdict
   * about a page they are not building.
   *
   * Under Common rather than under Contrast: the typeface has always been a
   * Common setting, and the other axes of the same type stack belong with it.
   */
  typeRoles: TypeRolesMap;
};

const initialColor = chroma.random();
const textColor = contrastingColor(initialColor);
const initialSeed = randomSeed();
const initialPalette = generatePaletteFrom(initialColor, "random", initialSeed);

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
  currentPalette: initialPalette,

  // Out of the palette rather than rolled: a rolled pair has nothing to do
  // with the color the visitor is working on, and nothing afterwards ever
  // brings the two together - `PALETTE PAIR` is a gesture, not a reaction.
  contrastColors: contrastPairFromPalette(initialPalette),
  openVerdict: null,

  colorTheme: "system",
  typeRole: "body",
  typeRoles: DEFAULT_TYPE_ROLES
};
