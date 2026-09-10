import {EventInstance} from "@ngrx/signals/events";
import {AppState} from "@core/models/app-state.model";
import chroma, {Color} from "chroma-js";
import {findTextColor} from "@engine/contrast/optimal-text-color.helper";
import {ContrastColors, createContrastColors} from "@engine/contrast/contrast-colors.model";
import {contrastColorsFromId} from "@engine/contrast/contrast-id.helper";
import {ChipSource} from "@contrast-type/models/chip-source.model";
import {SAMPLE_PLACEMENTS, SamplePlacement} from "@contrast-type/models/sample-page.model";


export function textColorChangedReducer(
  this: void,
  event: EventInstance<"[Contrast] textColorChanged", Color>,
  state: AppState
) {
  const textColor = event.payload;
  const bgColor = state.contrastColors.background;
  const contrastColors = createContrastColors(textColor, bgColor);

  return {contrastColors};
}


export function backgroundColorChangedReducer(
  this: void,
  event: EventInstance<"[Contrast] backgroundColorChanged", Color>,
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


export function restoreContrastColorsReducer(
  this: void,
  event: EventInstance<"[Contrast] restoreContrastColors", string>
) {
  try {
    const contrastId = event.payload;
    const contrastColors = contrastColorsFromId(contrastId);

    return {contrastColors};
  } catch (e) {
    console.error("Failed to restore contrast colors ", e);
    return {};
  }
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
