import {EventInstance} from "@ngrx/signals/events";
import {AppState} from "@core/models/app-state.model";
import chroma, {Color} from "chroma-js";
import {findTextColor} from "@engine/contrast/optimal-text-color.helper";
import {ContrastColors, createContrastColors} from "@engine/contrast/contrast-colors.model";
import {ChipSource} from "@contrast-type/models/chip-source.model";
import {SAMPLE_PLACEMENTS, SamplePlacement} from "@contrast-type/models/sample-page.model";
import {AddressedType, ContrastTypePage, contrastTypePageFromAddress} from "@contrast-type/models/contrast-type-address.model";
import {restoredPaletteState} from "@core/palettes/palettes.reducers";
import {normalizedTypeSettingsFor, TYPE_ROLES, TypeRole} from "@engine/contrast/type-role.model";
import {WEIGHT_STOPS} from "@engine/contrast/type-settings.model";
import {TypeRoleSettings, TypeRolesMap, weightStopsForRole} from "@common/models/type-role-settings.model";
import {fontNamed, needsCatalogue} from "@common/models/google-font.model";


/**
 * Takes both the committed text colour and the one a drag is still moving.
 *
 * The two events differ in what happens *around* the state change - only
 * `textColorChanged` is persisted - not in the change itself, so a second
 * reducer would be the same body twice.
 */
export function textColorChangedReducer(
  this: void,
  event: EventInstance<"[Contrast] textColorChanged" | "[Contrast] textColorAdjusted", Color>,
  state: AppState
) {
  const textColor = event.payload;
  const bgColor = state.contrastColors.background;
  const contrastColors = createContrastColors(textColor, bgColor);

  return {contrastColors};
}


/** The background half, and its drag, for the reason above. */
export function backgroundColorChangedReducer(
  this: void,
  event: EventInstance<"[Contrast] backgroundColorChanged" | "[Contrast] backgroundColorAdjusted", Color>,
  state: AppState
) {
  const bgColor = event.payload;
  const textColor = state.contrastColors.text;
  const contrastColors = createContrastColors(textColor, bgColor);

  return {contrastColors};
}


export function contrastColorsChangedWithoutNavReducer(
  this: void,
  event: EventInstance<"[Contrast] contrastColorsChangedWithoutNav", ContrastColors>
) {
  return {
    contrastColors: event.payload
  };
}


export function newRandomContrastColorsWithNavReducer(
  this: void
) {
  const bgColor = chroma.random();
  const textColor = findTextColor(bgColor, "harmonic").color;
  const contrastColors = createContrastColors(textColor, bgColor);

  return {
    contrastColors
  };
}


export function switchColorsReducer(
  this: void,
  event: EventInstance<"[Contrast] switchColors", void>,
  state: AppState
) {
  const newTextColor = state.contrastColors.background;
  const newBgColor = state.contrastColors.text;
  const contrastColors = createContrastColors(newTextColor, newBgColor);

  return {contrastColors};
}


/**
 * Restores Contrast & Type from its address - see `contrastTypeAddressFrom()`.
 *
 * As a whole, through `restoredContrastTypeState()`, which the load from
 * local storage uses as well.
 */
export function restoreContrastTypeReducer(
  this: void,
  event: EventInstance<"[Contrast] restoreContrastType", string>,
  state: AppState
) {
  try {
    return restoredContrastTypeState(contrastTypePageFromAddress(event.payload), state);
  } catch (e) {
    console.error("Failed to restore the Contrast & Type address ", e);
    return {};
  }
}


/**
 * Everything a restored page decides: the palette as a whole, the pair, the
 * type of every role and the placements.
 *
 * The one place a page is restored, for the url and the local storage alike.
 * Not the pair alone: a placement is a palette slot, so without the palette
 * the receiver's own colours would fill the sender's placements.
 */
export function restoredContrastTypeState(
  page: ContrastTypePage,
  state: Pick<AppState, "useBezier" | "correctLightness" | "typeRoles">
) {
  return {
    ...restoredPaletteState(page.palette, page.seed, state),
    contrastColors: createContrastColors(page.text, page.background),
    typeRoles: restoredTypeRoles(page.type, state.typeRoles),
    placements: page.placements
  };
}


/** The page the state shows, as the address carries it. */
export function contrastTypePageOf(
  state: Pick<AppState, "currentPalette" | "paletteSeed" | "contrastColors" | "typeRoles" | "placements">
): ContrastTypePage {
  const type = Object.fromEntries(TYPE_ROLES.map(role => {
    const {font, settings} = state.typeRoles[role];

    return [role, {family: font?.family ?? null, settings}];
  })) as Record<TypeRole, AddressedType>;

  return {
    palette: state.currentPalette,
    seed: state.paletteSeed,
    text: state.contrastColors.text,
    background: state.contrastColors.background,
    type,
    placements: state.placements
  };
}


/**
 * The roles an address names, with the faces the state already knows kept.
 *
 * A family the role is already set in keeps its selection, category and
 * weights included, so a restore of the page the visitor is on loads nothing
 * again. Any other family stands by name until the catalogue completes it.
 *
 * **A face known by name alone keeps the address's weight.** Its own weights
 * are not known yet, and normalizing against the app's type instead would
 * move a weight the face does ship; the catalogue's answer normalizes it.
 */
function restoredTypeRoles(type: ContrastTypePage["type"], current: TypeRolesMap): TypeRolesMap {
  const entries = TYPE_ROLES.map(role => {
    const {family, settings} = type[role];
    const known = current[role].font;
    const font = family === null ? null : known?.family === family ? known : fontNamed(family);
    const stops = needsCatalogue(font) ? WEIGHT_STOPS : weightStopsForRole(role, font);

    return [role, {font, settings: normalizedTypeSettingsFor(role, settings, stops)}];
  });

  return Object.fromEntries(entries) as Record<TypeRole, TypeRoleSettings>;
}


/**
 * The verdict a mark opens, or closes.
 *
 * The same key twice closes: a mark is a disclosure, and a visitor who
 * pressed it to read the verdict presses it again to get the page back. Any
 * other key replaces the open one, so the page never carries two panels.
 */
export function verdictToggledReducer(
  this: void,
  event: EventInstance<"[Contrast] verdictToggled", string>,
  state: AppState
) {
  return {
    openVerdict: state.openVerdict === event.payload ? null : event.payload
  };
}


/**
 * A chip's colour on one element of the sample page.
 *
 * **The placement puts the chip down.** A drag's release places the colour
 * and ends the carry in one gesture, and the chooser on an element's mark
 * places without ever having had one - so the carry is cleared here rather
 * than left to whichever caller happens to notice, and a chooser placement
 * finds nothing to clear. `chipPutDown` is for a gesture that ended without a
 * placement.
 *
 * **This runs before CDK reports the drag ended.** The browser dispatches
 * `pointerup` before the `mouseup`/`touchend` CDK listens to, so the release
 * that raises this event is seen first and the chip's own `cdkDragEnded`
 * guard finds an empty hand. Do not move the clearing there on the strength
 * of it looking like the end of the drag: it is the later of the two, and the
 * chooser never reaches it at all.
 */
export function colorPlacedReducer(
  this: void,
  event: EventInstance<"[Contrast] colorPlaced", {elementKey: string; side: SamplePlacement; source: ChipSource}>,
  state: AppState
) {
  const {elementKey, side, source} = event.payload;

  return {
    // The element's other side is kept: an ink and a ground are two
    // placements, and a visitor who colours a paragraph and then puts a band
    // behind it has made both. Spreading the element's own entry is what says
    // so - replacing it would take the first placement away as a side effect
    // of making the second.
    placements: {
      ...state.placements,
      [elementKey]: {...state.placements[elementKey], [side]: source}
    },
    carriedChip: null
  };
}


export function chipPickedUpReducer(
  this: void,
  event: EventInstance<"[Contrast] chipPickedUp", ChipSource>
) {
  return {carriedChip: event.payload};
}


export function chipPutDownReducer(
  this: void
) {
  return {carriedChip: null};
}


/**
 * One side of one element back to the colour the page gives it by default.
 *
 * The side is dropped rather than set to null: an absent side is what
 * `samplePage()` reads as "nothing placed", so a null would be a second
 * spelling of the same state. The element's key goes with the last of its two
 * sides for the same reason - an entry holding neither would be a third.
 */
export function placementResetReducer(
  this: void,
  event: EventInstance<"[Contrast] placementReset", {elementKey: string; side: SamplePlacement}>,
  state: AppState
) {
  const {elementKey, side} = event.payload;
  const placements = {...state.placements};
  const sides = {...placements[elementKey]};

  delete sides[side];

  if (SAMPLE_PLACEMENTS.some(other => sides[other])) {
    placements[elementKey] = sides;
  } else {
    delete placements[elementKey];
  }

  return {placements};
}


export function placementsResetReducer(
  this: void
) {
  return {placements: {}};
}
