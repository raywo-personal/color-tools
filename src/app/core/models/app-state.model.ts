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
import {ChipSource} from "@contrast-type/models/chip-source.model";
import {ElementPlacements} from "@contrast-type/models/sample-page.model";


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
  /**
   * The chip the visitor put on each element of the sample page, keyed by
   * `SAMPLE_ELEMENTS` key - see `ElementPlacements` for why a source and not
   * a colour.
   *
   * Not persisted: the placements are part of the result, so carrying them
   * across a reload and into a shared link is real work with a shape of its
   * own, and it is #68's. Until then a reload opens on the default
   * assignment, which is the page the palette alone produces.
   */
  placements: ElementPlacements;
  /**
   * The chip the visitor is carrying, or null while nothing is in hand. A
   * drag of a chip sets it; the release clears it, either by placing the
   * colour or by putting the chip down where it found no element.
   *
   * A `ChipSource` rather than a `PaletteSlot`, because the row's last two
   * chips are the pair's own colours - a name that said "slot" would be
   * wrong for two of the seven.
   *
   * **A press must never arm this.** Only a drag can tell a cancel from an
   * accident, because CDK holds the pointer down for its whole length. Below
   * `lg` the preview is stacked under the control column, so a finger has to
   * scroll from a chip to an element and the pan fires `pointercancel` - a
   * carry armed by a press would be thrown away by the very scroll it was
   * made for. A screen reader's activation arrives as a real touch as well,
   * so it would arm one silently and turn the next verdict mark a visitor
   * activates into a drop target instead of a disclosure. The no-drag path
   * for touch, mouse and keyboard alike is the chooser on the element's own
   * mark; `PlacementGesture` carries the rest of the reason.
   *
   * In the store rather than in a component, for `openVerdict`'s reason: the
   * chip that is picked up and the elements that answer the carry are
   * separate component instances, in two columns of the screen. Transient
   * and not persisted - nothing is in hand across a reload.
   */
  carriedChip: ChipSource | null;

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
  placements: {},
  carriedChip: null,

  colorTheme: "system",
  typeRole: "body",
  typeRoles: DEFAULT_TYPE_ROLES
};
